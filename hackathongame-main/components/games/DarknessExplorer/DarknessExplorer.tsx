'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalibrationData,
  GameState,
  RawRepetitionData,
  SessionMetrics,
  PatientConfig,
} from './types';
import { GameEngine } from './engine/GameEngine';
import { buildSessionMetrics } from './metrics/MetricsCalculator';
import CalibrationFlow from './calibration/CalibrationFlow';
import { saveSessionToSupabase } from '@/lib/supabase/save-session';

interface DarknessExplorerProps {
  patientConfig: PatientConfig;
  sessionId?: string;
  onExit: () => void;
  onViewDashboard?: () => void;
}

type UIPhase = GameState | 'COUNTDOWN';

export default function DarknessExplorer({ patientConfig, sessionId, onExit, onViewDashboard }: DarknessExplorerProps) {
  const [uiState, setUiState] = useState<UIPhase>('CALIBRATING');
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics | null>(null);
  const [endReason, setEndReason] = useState<string>('');
  const [countdown, setCountdown] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const calibrationRef = useRef<CalibrationData | null>(null);

  const handleCalibrationComplete = useCallback((data: CalibrationData) => {
    calibrationRef.current = data;
    setUiState('COUNTDOWN');
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (uiState !== 'COUNTDOWN') return;
    if (countdown <= 0) {
      setUiState('PLAYING');
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [uiState, countdown]);

  const handleCalibrationCancel = useCallback(() => {
    onExit();
  }, [onExit]);

  useEffect(() => {
    if (uiState !== 'PLAYING' || !canvasRef.current || !calibrationRef.current) return;

    const canvas = canvasRef.current;
    const engine = new GameEngine(
      canvas,
      {
        onStateChange: (s) => setUiState(s),
        onRepComplete: () => {},
        onSessionEnd: (reason) => {
          setEndReason(reason);
          const data = engine.getSessionData();
          const metrics = buildSessionMetrics(
            data.rawReps,
            data.heatmap,
            data.calibration,
            patientConfig.patient_id,
            patientConfig.affected_side,
            data.startTime,
            data.endTime,
            reason,
            data.inputMode,
            data.startLevel,
            data.endLevel,
            data.adjustments
          );
          setSessionMetrics(metrics);
          if (sessionId) {
            saveSessionToSupabase(metrics, sessionId).then((res) => {
              if (!res.ok) console.error('Failed to save session:', res.error);
            });
          }
          setUiState('FINISHED');
        },
      },
      calibrationRef.current,
      patientConfig.difficulty_level,
      patientConfig.session_target_reps,
      patientConfig.session_max_duration_sec
    );

    engineRef.current = engine;
    engine.start();

    const handleClick = (e: MouseEvent) => engine.handleClick(e.clientX, e.clientY);
    const handleResize = () => engine.handleResize();
    canvas.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);

    return () => {
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      engine.destroy();
    };
  }, [uiState, patientConfig, sessionId]);

  const cleanupWebGazer = useCallback(() => {
    try {
      if (window.webgazer) {
        window.webgazer.end();
      }
    } catch { /* ignore */ }
  }, []);

  const handleViewDashboard = () => {
    cleanupWebGazer();
    if (onViewDashboard) onViewDashboard();
    else onExit();
  };

  if (uiState === 'CALIBRATING') {
    return (
      <CalibrationFlow
        onComplete={handleCalibrationComplete}
        onCancel={() => { cleanupWebGazer(); handleCalibrationCancel(); }}
      />
    );
  }

  if (uiState === 'COUNTDOWN') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: '#000' }}
      >
        <div className="text-center animate-fade-in">
          <div
            className="text-8xl font-bold mb-4"
            style={{
              background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'pulseGlow 1s ease-in-out',
            }}
            key={countdown}
          >
            {countdown}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {countdown === 3 ? 'Prepárate...' : countdown === 2 ? 'Atento...' : '¡Busca los mineros!'}
          </p>
        </div>
      </div>
    );
  }

  if (uiState === 'PLAYING') {
    return (
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-40"
        style={{ cursor: 'crosshair', background: '#000' }}
      />
    );
  }

  if (uiState === 'FINISHED' && sessionMetrics) {
    return <ResultsDashboard metrics={sessionMetrics} endReason={endReason} onViewDashboard={handleViewDashboard} onGoHome={() => { cleanupWebGazer(); onExit(); }} />;
  }

  return null;
}

/* ─── Results Dashboard ─── */

function ResultsDashboard({
  metrics,
  endReason,
  onViewDashboard,
  onGoHome,
}: {
  metrics: SessionMetrics;
  endReason: string;
  onViewDashboard: () => void;
  onGoHome: () => void;
}) {
  const hitCount = metrics.raw_repetitions.filter((r) => r.hit).length;
  const hitRate = metrics.total_reps > 0 ? ((hitCount / metrics.total_reps) * 100).toFixed(0) : '0';

  return (
    <div
      className="min-h-screen p-6 overflow-auto"
      style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Resultados de la Sesión
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Finalizada: {endReason} · {new Date(metrics.timestamp_end).toLocaleString()}
          </p>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Targets Hit" value={`${hitCount}/${metrics.total_reps}`} sub={`${hitRate}%`} />
          <StatCard label="Avg Reaction" value={`${metrics.reaction_time.mean_ms.toFixed(0)}`} sub="ms" />
          <StatCard label="Duración" value={`${metrics.duration_seconds.toFixed(0)}`} sub="seg" />
          <StatCard label="Dificultad Final" value={`${metrics.difficulty.end_level}`} sub={`/ 10`} />
        </div>

        {/* Reaction Time Chart */}
        <div className="card mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
            Tiempo de Reacción por Repetición
          </h3>
          <ReactionTimeChart reps={metrics.raw_repetitions} perRep={metrics.reaction_time.per_rep} />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Asymmetry */}
          <div className="card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
              Asimetría Lateral
            </h3>
            <AsymmetryBars asymmetry={metrics.asymmetry} />
          </div>

          {/* Heatmap */}
          <div className="card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
              Exploración Visual
            </h3>
            <HeatmapGrid grid={metrics.visual_exploration.heatmap_grid} />
            <div className="grid grid-cols-3 gap-2 mt-3">
              <MiniStat label="Cobertura" value={`${metrics.visual_exploration.coverage_percent.toFixed(0)}%`} />
              <MiniStat label="Sesgo" value={metrics.visual_exploration.hemispheric_bias.toFixed(2)} />
              <MiniStat label="Entropía" value={metrics.visual_exploration.exploration_entropy.toFixed(2)} />
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Fatigue Index"
            value={metrics.fatigue.fatigue_index.toFixed(2)}
            sub={metrics.fatigue.detected ? 'Detectada' : 'Normal'}
            warn={metrics.fatigue.detected}
          />
          <StatCard
            label="Eye-Hand Latency"
            value={`${metrics.eye_hand_latency.mean_ms.toFixed(0)}`}
            sub="ms promedio"
          />
          <StatCard
            label="Velocidad Mano"
            value={`${metrics.movement_speed.mean_px_per_sec.toFixed(0)}`}
            sub="px/s"
          />
          <StatCard
            label="Temblor"
            value={`${metrics.tremor.during_game_mean_variance.toFixed(1)}`}
            sub={`baseline: ${metrics.tremor.baseline_variance.toFixed(1)}`}
          />
        </div>

        {/* Session Metadata */}
        <div className="card mb-6 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
            Metadata
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div>
              <span className="block" style={{ color: 'var(--text-secondary)' }}>Session ID</span>
              {metrics.session_id.slice(0, 20)}...
            </div>
            <div>
              <span className="block" style={{ color: 'var(--text-secondary)' }}>Paciente</span>
              {metrics.patient_id}
            </div>
            <div>
              <span className="block" style={{ color: 'var(--text-secondary)' }}>Calibración</span>
              {metrics.calibration.accuracy_px.toFixed(1)}px accuracy
            </div>
            <div>
              <span className="block" style={{ color: 'var(--text-secondary)' }}>Input Mode</span>
              {metrics.input_mode}
            </div>
          </div>
          {metrics.difficulty.adjustments.length > 0 && (
            <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Ajustes de Dificultad
              </span>
              {metrics.difficulty.adjustments.map((a, i) => (
                <span key={i} className="block">
                  Rep {a.at_rep}: {a.from_level} → {a.to_level} ({a.reason})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center pb-8">
          <button className="btn-primary" onClick={onViewDashboard}>
            Ver Dashboard
          </button>
          <button className="btn-secondary" onClick={onGoHome}>
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatCard({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div className="card text-center">
      <div className="stat-value" style={warn ? { background: 'linear-gradient(135deg, var(--warning), var(--danger))', backgroundClip: 'text', WebkitBackgroundClip: 'text' } : undefined}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-0.5" style={{ color: warn ? 'var(--warning)' : 'var(--text-muted)' }}>
          {sub}
        </div>
      )}
      <div className="stat-label">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-base font-bold" style={{ color: 'var(--accent)' }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  );
}

function ReactionTimeChart({
  reps,
  perRep,
}: {
  reps: RawRepetitionData[];
  perRep: number[];
}) {
  const maxRT = Math.max(...perRep, 1);

  return (
    <div className="flex items-end gap-[2px]" style={{ height: 120 }}>
      {reps.map((rep, i) => {
        const rt = perRep[i] ?? 0;
        const heightPct = rt > 0 ? (rt / maxRT) * 100 : 5;
        const color = rep.hit ? 'var(--accent)' : 'var(--danger)';
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all"
            style={{
              height: `${heightPct}%`,
              background: color,
              minWidth: 3,
              maxWidth: 16,
              opacity: rt > 0 ? 0.8 : 0.3,
            }}
            title={`Rep ${i + 1}: ${rt > 0 ? `${rt.toFixed(0)}ms` : 'miss'}`}
          />
        );
      })}
    </div>
  );
}

function AsymmetryBars({
  asymmetry,
}: {
  asymmetry: SessionMetrics['asymmetry'];
}) {
  const bars = [
    { label: 'Reaction Time', value: asymmetry.reaction_time_ratio },
    { label: 'Discovery Time', value: asymmetry.discovery_time_ratio },
    { label: 'Precisión', value: asymmetry.precision_ratio },
    { label: 'Velocidad', value: asymmetry.speed_ratio },
  ];

  return (
    <div className="space-y-3">
      {bars.map((b) => {
        const clamped = Math.min(Math.max(b.value, 0), 2);
        const pct = (clamped / 2) * 100;
        const isGood = b.value >= 0.8 && b.value <= 1.2;
        return (
          <div key={b.label}>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--text-secondary)' }}>{b.label}</span>
              <span style={{ color: isGood ? 'var(--success)' : 'var(--warning)' }}>
                {b.value.toFixed(2)}
              </span>
            </div>
            <div className="progress-bar relative">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${pct}%`,
                  background: isGood
                    ? 'linear-gradient(90deg, var(--success), var(--accent))'
                    : 'linear-gradient(90deg, var(--warning), var(--danger))',
                }}
              />
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: '50%',
                  width: 1,
                  background: 'rgba(255,255,255,0.3)',
                }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex justify-between text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
        <span>Izq ({asymmetry.left_metrics.count})</span>
        <span>1.0 = simétrico</span>
        <span>Der ({asymmetry.right_metrics.count})</span>
      </div>
    </div>
  );
}

function HeatmapGrid({ grid }: { grid: number[][] }) {
  const maxVal = Math.max(...grid.flat(), 1);

  return (
    <div
      className="grid gap-1"
      style={{
        gridTemplateColumns: `repeat(${grid[0]?.length ?? 8}, 1fr)`,
      }}
    >
      {grid.flat().map((val, i) => {
        const intensity = val / maxVal;
        const r = Math.round(56 * intensity);
        const g = Math.round(189 * intensity);
        const b = Math.round(248 * intensity);
        const bg = intensity > 0.8
          ? `rgb(${Math.min(255, r + 200)}, ${Math.min(255, g + 66)}, ${Math.min(255, b + 7)})`
          : `rgba(${r}, ${g}, ${b}, ${Math.max(0.05, intensity)})`;
        return <div key={i} className="heatmap-cell" style={{ background: bg, aspectRatio: '4/3' }} />;
      })}
    </div>
  );
}
