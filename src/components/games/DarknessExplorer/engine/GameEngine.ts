import type { Target, GameCallbacks, CalibrationData, RepetitionMetrics } from '../types';
import { GazeTracker } from './GazeTracker';
import { TargetManager } from './TargetManager';
import { LightRenderer } from './LightRenderer';
import { DifficultyAdapter } from './DifficultyAdapter';
import { CaveMap } from './CaveMap';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { computeRepMetrics } from '../metrics/MetricsCalculator';

export class GameEngine {
  private gazeTracker: GazeTracker;
  private targetManager: TargetManager;
  private renderer: LightRenderer;
  private difficulty: DifficultyAdapter;
  private caveMap: CaveMap;
  private collector: MetricsCollector;
  private callbacks: GameCallbacks;

  private canvas: HTMLCanvasElement;
  private animFrameId: number | null = null;
  private running = false;
  private paused = false;

  private currentTarget: Target | null = null;
  private repIndex = 0;
  private totalReps: number;
  private maxDurationMs: number;
  private sessionStartTime = 0;
  private pauseStartTime = 0;
  private totalPausedTime = 0;

  private calibrationData: CalibrationData;
  private difficultyAdjustments: Array<{ at_rep: number; from_level: number; to_level: number; reason: string }> = [];
  private repMetricsList: RepetitionMetrics[] = [];
  private startLevel: number;

  private visibilityHandler: (() => void) | null = null;
  private revealPending = false;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: GameCallbacks,
    calibration: CalibrationData,
    startLevel: number,
    totalReps: number,
    maxDurationSec: number
  ) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.calibrationData = calibration;
    this.totalReps = totalReps;
    this.maxDurationMs = maxDurationSec * 1000;
    this.startLevel = startLevel;

    const w = window.innerWidth;
    const h = window.innerHeight;

    this.gazeTracker = new GazeTracker();
    this.targetManager = new TargetManager(Date.now(), w, h);
    this.renderer = new LightRenderer(canvas);
    this.difficulty = new DifficultyAdapter(startLevel);
    this.caveMap = new CaveMap();
    this.collector = new MetricsCollector(w, h);
  }

  async start(): Promise<void> {
    await this.gazeTracker.init();

    const w = window.innerWidth;
    const h = window.innerHeight;
    await this.caveMap.init(w, h);
    this.targetManager.setCaveMap(this.caveMap);

    this.sessionStartTime = performance.now();
    this.running = true;

    this.setupVisibilityHandler();
    this.spawnNextTarget();
    this.loop();
  }

  private setupVisibilityHandler(): void {
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.paused = true;
        this.pauseStartTime = performance.now();
      } else {
        if (this.pauseStartTime > 0) {
          this.totalPausedTime += performance.now() - this.pauseStartTime;
          this.pauseStartTime = 0;
        }
        this.paused = false;
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private loop = (): void => {
    if (!this.running) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    if (this.paused) return;

    const now = performance.now();
    const elapsed = now - this.sessionStartTime - this.totalPausedTime;

    if (elapsed >= this.maxDurationMs) {
      this.endSession('timeout');
      return;
    }

    const gazePos = this.gazeTracker.getPosition();
    const mousePos = { x: gazePos.x, y: gazePos.y };
    const params = this.difficulty.getParams(window.devicePixelRatio || 1);

    // During reveal animation, just render (no game logic)
    if (this.revealPending) {
      if (this.renderer.isRevealing()) {
        this.renderer.render(
          gazePos.x, gazePos.y, mousePos.x, mousePos.y,
          null, params, this.repIndex, this.totalReps, now, 0
        );
        return;
      }
      this.revealPending = false;
      if (this.repIndex >= this.totalReps) {
        this.endSession('completed');
        return;
      }
      this.spawnNextTarget();
    }

    this.collector.sampleGaze(gazePos.x, gazePos.y, now);
    this.collector.sampleHand(mousePos.x, mousePos.y, now);

    // Check gaze discovery
    if (this.currentTarget && !this.currentTarget.discovered) {
      if (this.targetManager.checkGazeDiscovery(gazePos.x, gazePos.y, this.currentTarget)) {
        this.currentTarget.discovered = true;
        this.currentTarget.discoveryTime = now;
      }
    }

    let timeRemainingRatio = 1;
    if (this.currentTarget) {
      const targetElapsed = now - this.currentTarget.spawnTime - this.totalPausedTime;
      timeRemainingRatio = Math.max(0, 1 - targetElapsed / this.currentTarget.timeout_ms);

      if (targetElapsed > this.currentTarget.timeout_ms) {
        this.handleMiss(now);
        return;
      }
    }

    this.renderer.render(
      gazePos.x,
      gazePos.y,
      mousePos.x,
      mousePos.y,
      this.currentTarget,
      params,
      this.repIndex,
      this.totalReps,
      now,
      timeRemainingRatio
    );
  };

  handleClick(clientX: number, clientY: number): void {
    if (!this.running || this.paused || !this.currentTarget) return;

    const now = performance.now();
    const hit = this.targetManager.checkHit(clientX, clientY, this.currentTarget);

    if (hit) {
      this.renderer.triggerHitEffect(this.currentTarget.position.x, this.currentTarget.position.y);

      // Incremental calibration
      try {
        if (window.webgazer) {
          window.webgazer.recordScreenPosition(
            this.currentTarget.position.x,
            this.currentTarget.position.y
          );
        }
      } catch { /* ignore */ }
    } else {
      this.renderer.triggerMissEffect();
    }

    const rep = this.collector.finishRep(
      this.repIndex,
      this.currentTarget,
      now,
      { x: clientX, y: clientY },
      hit,
      this.difficulty.level
    );

    const repMetrics = computeRepMetrics(rep);
    this.repMetricsList.push(repMetrics);

    this.callbacks.onRepComplete(rep);
    this.repIndex++;

    this.checkAdaptiveDifficulty();

    if (this.repIndex >= this.totalReps) {
      this.endSession('completed');
      return;
    }

    if (this.repIndex % 5 === 0) {
      if (this.difficulty.checkFatigue(this.repMetricsList, this.repIndex)) {
        this.endSession('fatigue');
        return;
      }
    }

    this.spawnNextTarget();
  }

  private handleMiss(_now: number): void {
    if (!this.currentTarget) return;

    this.renderer.triggerMissEffect();
    this.renderer.startReveal(this.currentTarget);
    this.revealPending = true;

    const rep = this.collector.finishRep(
      this.repIndex,
      this.currentTarget,
      null,
      { x: 0, y: 0 },
      false,
      this.difficulty.level
    );

    const repMetrics = computeRepMetrics(rep);
    this.repMetricsList.push(repMetrics);
    this.callbacks.onRepComplete(rep);
    this.repIndex++;

    this.checkAdaptiveDifficulty();

    if (this.repIndex % 5 === 0) {
      if (this.difficulty.checkFatigue(this.repMetricsList, this.repIndex)) {
        this.endSession('fatigue');
        return;
      }
    }

    this.currentTarget = null;
  }

  private checkAdaptiveDifficulty(): void {
    if (this.repIndex % 10 === 0 && this.repIndex > 0) {
      const adjustment = this.difficulty.evaluate(this.repMetricsList);
      if (adjustment) {
        this.difficultyAdjustments.push({
          at_rep: this.repIndex,
          from_level: adjustment.from,
          to_level: adjustment.to,
          reason: adjustment.reason,
        });
      }
    }
  }

  private spawnNextTarget(): void {
    const dpr = window.devicePixelRatio || 1;
    const params = this.difficulty.getParams(dpr);
    this.currentTarget = this.targetManager.spawnTarget(params);
    this.collector.startRep();
  }

  private endSession(reason: 'completed' | 'fatigue' | 'timeout' | 'cancelled'): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.callbacks.onSessionEnd(reason);
  }

  cancel(): void {
    this.endSession('cancelled');
  }

  getSessionData() {
    return {
      rawReps: this.collector.getReps(),
      heatmap: this.collector.getHeatmap(),
      calibration: this.calibrationData,
      inputMode: this.gazeTracker.inputMode,
      startTime: this.sessionStartTime,
      endTime: performance.now(),
      startLevel: this.startLevel,
      endLevel: this.difficulty.level,
      adjustments: this.difficultyAdjustments,
      repMetrics: this.repMetricsList,
    };
  }

  handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize();
    this.targetManager.updateScreenSize(w, h);
    this.caveMap.updateScreenSize(w, h);
    this.collector.updateScreenSize(w, h);
  }

  destroy(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    this.gazeTracker.destroy();
    this.renderer.destroy();
  }
}
