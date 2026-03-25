'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalibrationData, GazePoint } from '../types';

const GRID_POSITIONS = [0.05, 0.275, 0.5, 0.725, 0.95];
const TOTAL_POINTS = 25;
const BASELINE_DURATION_MS = 3000;

interface CalibrationFlowProps {
  onComplete: (data: CalibrationData) => void;
  onCancel: () => void;
}

type FlowPhase = 'welcome' | 'init_webgazer' | 'calibration' | 'baseline';

export default function CalibrationFlow({ onComplete, onCancel }: CalibrationFlowProps) {
  const [phase, setPhase] = useState<FlowPhase>('welcome');
  const [pointIndex, setPointIndex] = useState(0);
  const [baselineProgress, setBaselineProgress] = useState(0);
  const [initStatus, setInitStatus] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [webgazerReady, setWebgazerReady] = useState(false);
  const baselineDataRef = useRef<GazePoint[]>([]);
  const baselineStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const initAbortRef = useRef(false);

  const points = useRef<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    const pts: Array<{ x: number; y: number }> = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        pts.push({
          x: GRID_POSITIONS[col] * window.innerWidth,
          y: GRID_POSITIONS[row] * window.innerHeight,
        });
      }
    }
    points.current = pts;
  }, []);

  const startWebGazer = useCallback(async () => {
    setPhase('init_webgazer');
    setCameraError('');
    initAbortRef.current = false;

    // Step 1: Wait for WebGazer script to load
    setInitStatus('Cargando WebGazer...');
    for (let i = 0; i < 50 && !window.webgazer; i++) {
      await new Promise(r => setTimeout(r, 200));
    }

    if (!window.webgazer) {
      setInitStatus('WebGazer no disponible. Usando ratón.');
      await new Promise(r => setTimeout(r, 1200));
      if (!initAbortRef.current) {
        onComplete({ accuracy_px: 50, completed: false, baselineTremorVariance: 0 });
      }
      return;
    }

    // Step 2: Request camera permission directly first
    setInitStatus('Solicitando permiso de cámara...');
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Permission granted — release immediately so WebGazer can use it
      testStream.getTracks().forEach(t => t.stop());
      // Brief pause to ensure the camera is fully released
      await new Promise(r => setTimeout(r, 500));
    } catch (err: unknown) {
      const mediaErr = err as { name?: string; message?: string };
      console.error('Camera permission error:', err);
      if (mediaErr.name === 'NotAllowedError') {
        setCameraError(
          'Permiso de cámara denegado. Haz click en el icono de candado (🔒) en la barra de direcciones → Permisos del sitio → Cámara → Permitir → Recarga.'
        );
      } else if (mediaErr.name === 'NotFoundError' || mediaErr.name === 'DevicesNotFoundError') {
        setCameraError('No se detectó ninguna cámara conectada al equipo.');
      } else if (mediaErr.name === 'NotReadableError' || mediaErr.message?.includes('in use')) {
        setCameraError('La cámara está en uso por otra aplicación. Cierra otras apps que usen la cámara (Zoom, Teams, etc.) y reintenta.');
      } else {
        setCameraError(`Error de cámara: ${mediaErr.name} — ${mediaErr.message}`);
      }
      return;
    }

    // Step 3: Initialize WebGazer with camera confirmed available
    try {
      setInitStatus('Iniciando modelo de eye tracking...');

      const wg = window.webgazer;

      // Configure before begin — v2.x API (all defensive)
      try { wg.showPredictionPoints(false); } catch { /* method may not exist */ }
      try {
        if (wg.params) wg.params.showVideoPreview = false;
      } catch { /* ignore */ }

      // begin() returns webgazer instance in v2.x, wrapping with Promise.resolve for safety
      await Promise.resolve(wg.begin());

      // Wait for model warmup
      setInitStatus('Modelo cargado. Calentando...');
      await new Promise(r => setTimeout(r, 1500));

      if (!initAbortRef.current) {
        setInitStatus('¡Listo! Comenzando calibración...');
        setWebgazerReady(true);
        await new Promise(r => setTimeout(r, 600));
        if (!initAbortRef.current) setPhase('calibration');
      }
    } catch (err) {
      console.error('WebGazer begin() error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (!initAbortRef.current) {
        setCameraError(`Error al iniciar eye tracking: ${errMsg}`);
      }
    }
  }, []);

  const handleCalibrationClick = useCallback(() => {
    if (phase !== 'calibration' || points.current.length === 0) return;

    const pt = points.current[pointIndex];
    try {
      if (window.webgazer && webgazerReady) {
        window.webgazer.recordScreenPosition(pt.x, pt.y);
      }
    } catch { /* ignore */ }

    const next = pointIndex + 1;
    if (next >= TOTAL_POINTS) {
      try {
        if (window.webgazer && webgazerReady) {
          window.webgazer.removeMouseEventListeners();
        }
      } catch { /* ignore */ }
      setPhase('baseline');
    } else {
      setPointIndex(next);
    }
  }, [phase, pointIndex, webgazerReady]);

  // Phase: baseline
  useEffect(() => {
    if (phase !== 'baseline') return;

    baselineStartRef.current = performance.now();
    baselineDataRef.current = [];

    const collectBaseline = async () => {
      const now = performance.now();
      const elapsed = now - baselineStartRef.current;
      setBaselineProgress(Math.min(elapsed / BASELINE_DURATION_MS, 1));

      try {
        if (window.webgazer && webgazerReady) {
          const pred = await window.webgazer.getCurrentPrediction();
          if (pred) {
            baselineDataRef.current.push({ x: pred.x, y: pred.y, timestamp: now });
          }
        }
      } catch { /* ignore */ }

      if (elapsed < BASELINE_DURATION_MS) {
        rafRef.current = requestAnimationFrame(collectBaseline);
      } else {
        const data = baselineDataRef.current;
        let tremorVariance = 0;
        if (data.length >= 2) {
          const xs = data.map((d) => d.x);
          const ys = data.map((d) => d.y);
          const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
          const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
          const varX = xs.reduce((s, v) => s + (v - meanX) ** 2, 0) / (xs.length - 1);
          const varY = ys.reduce((s, v) => s + (v - meanY) ** 2, 0) / (ys.length - 1);
          tremorVariance = varX + varY;
        }

        onComplete({
          accuracy_px: data.length > 0 ? Math.sqrt(tremorVariance) : 50,
          completed: webgazerReady,
          baselineTremorVariance: tremorVariance,
        });
      }
    };

    rafRef.current = requestAnimationFrame(collectBaseline);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, onComplete, webgazerReady]);

  const currentPoint = points.current[pointIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--bg-deep)', cursor: phase === 'calibration' ? 'crosshair' : 'default' }}
      onClick={phase === 'calibration' ? handleCalibrationClick : undefined}
    >
      {/* Phase: Welcome */}
      {phase === 'welcome' && (
        <div className="text-center animate-fade-in max-w-md px-6">
          <div
            className="animate-pulse-glow mx-auto mb-8"
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56,189,248,0.3) 0%, rgba(56,189,248,0.05) 60%, transparent)',
            }}
          />
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Preparar Eye Tracking
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Se necesita acceso a tu webcam para rastrear la mirada.
            El navegador te pedirá permiso — haz click en <strong>&quot;Permitir&quot;</strong>.
          </p>
          <button
            className="btn-primary text-lg px-8 py-4"
            onClick={startWebGazer}
          >
            Activar Cámara y Calibrar
          </button>
          <div className="mt-4">
            <button
              className="text-xs underline"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => {
                onComplete({ accuracy_px: 50, completed: false, baselineTremorVariance: 0 });
              }}
            >
              Saltar (usar solo ratón)
            </button>
          </div>
          <button
            onClick={onCancel}
            className="absolute bottom-8 right-8 text-sm px-4 py-2 rounded-lg"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Phase: Initializing WebGazer */}
      {phase === 'init_webgazer' && (
        <div className="text-center animate-fade-in max-w-md px-6">
          {!cameraError ? (
            <>
              <div
                className="animate-breathe mx-auto mb-6"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #38bdf8 30%, rgba(56,189,248,0.2) 70%, transparent)',
                  boxShadow: '0 0 30px rgba(56,189,248,0.4)',
                }}
              />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {initStatus}
              </p>
              <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                Si el navegador pide permiso, haz click en &quot;Permitir&quot;
              </p>
            </>
          ) : (
            <>
              <div
                className="mx-auto mb-6 flex items-center justify-center"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'rgba(248,113,113,0.15)',
                  fontSize: 28,
                }}
              >
                ⚠
              </div>
              <p className="text-sm mb-4 font-semibold" style={{ color: 'var(--danger)' }}>
                No se pudo acceder a la cámara
              </p>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {cameraError}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  className="btn-primary"
                  onClick={() => {
                    setCameraError('');
                    startWebGazer();
                  }}
                >
                  Reintentar
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    onComplete({ accuracy_px: 50, completed: false, baselineTremorVariance: 0 });
                  }}
                >
                  Continuar sin cámara
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Phase: Calibration points */}
      {phase === 'calibration' && currentPoint && (
        <>
          <div
            className="animate-breathe"
            style={{
              position: 'absolute',
              left: currentPoint.x - 12,
              top: currentPoint.y - 12,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #ffffff 30%, #38bdf8 70%, transparent)',
              boxShadow: '0 0 20px rgba(56,189,248,0.5)',
            }}
          />

          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center animate-fade-in">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Mira el punto y haz click
            </p>
            <p className="text-lg font-semibold mt-1" style={{ color: 'var(--accent)' }}>
              {pointIndex + 1} / {TOTAL_POINTS}
            </p>
            {!webgazerReady && (
              <p className="text-xs mt-1" style={{ color: 'var(--warning)' }}>
                Modo ratón (sin webcam)
              </p>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              initAbortRef.current = true;
              onCancel();
            }}
            className="absolute bottom-8 right-8 text-sm px-4 py-2 rounded-lg"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Cancelar
          </button>
        </>
      )}

      {/* Phase: Baseline */}
      {phase === 'baseline' && (
        <div className="text-center animate-fade-in">
          <div
            className="animate-breathe mx-auto mb-6"
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #ffffff 30%, #34d399 70%, transparent)',
              boxShadow: '0 0 20px rgba(52,211,153,0.5)',
            }}
          />
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Mantén la mirada en el punto central
          </p>
          <div className="progress-bar mx-auto" style={{ width: 200 }}>
            <div
              className="progress-bar-fill"
              style={{
                width: `${baselineProgress * 100}%`,
                background: 'linear-gradient(90deg, var(--success), var(--accent))',
              }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Midiendo baseline...
          </p>
        </div>
      )}
    </div>
  );
}
