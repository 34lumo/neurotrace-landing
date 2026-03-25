import { DifficultyParams, RepetitionMetrics } from '../types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function linearRegression(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

export class DifficultyAdapter {
  private _level: number;
  private fatigueDetected = false;
  private fatigueOnsetRep: number | null = null;

  constructor(startLevel: number = 3) {
    this._level = Math.max(1, Math.min(10, startLevel));
  }

  get level(): number {
    return this._level;
  }

  get isFatigueDetected(): boolean {
    return this.fatigueDetected;
  }

  get fatigueOnset(): number | null {
    return this.fatigueOnsetRep;
  }

  getParams(dpr: number = 1): DifficultyParams {
    const t = (this._level - 1) / 9;
    return {
      level: this._level,
      target_radius: lerp(55, 25, t) * dpr,
      target_timeout_ms: lerp(10000, 4000, t),
      light_radius: lerp(220, 120, t) * dpr,
      min_target_distance: lerp(80, 260, t) * dpr,
    };
  }

  evaluate(allReps: RepetitionMetrics[]): {
    adjusted: boolean;
    from: number;
    to: number;
    reason: string;
  } | null {
    const recent = allReps.slice(-10);
    if (recent.length < 10) return null;

    const hits = recent.filter(r => r.reaction_time_ms > 0);
    const hitRate = hits.length / recent.length;

    const maxRT = 10000;
    const meanRT = hits.length > 0
      ? hits.reduce((s, r) => s + r.reaction_time_ms, 0) / hits.length
      : maxRT;
    const normalizedRT = Math.min(meanRT / maxRT, 1);

    const score = hitRate * (1 - normalizedRT);
    const prevLevel = this._level;

    if (score > 0.8 && this._level < 10) {
      this._level++;
      return { adjusted: true, from: prevLevel, to: this._level, reason: `score=${score.toFixed(2)} > 0.8` };
    } else if (score < 0.5 && this._level > 1) {
      this._level--;
      return { adjusted: true, from: prevLevel, to: this._level, reason: `score=${score.toFixed(2)} < 0.5` };
    }
    return null;
  }

  checkFatigue(allReps: RepetitionMetrics[], currentRep: number): boolean {
    if (this.fatigueDetected) return true;

    const completedReps = allReps.filter(r => r.reaction_time_ms > 0);
    if (completedReps.length < 6) return false;

    const recentRTs = completedReps.slice(-5).map(r => r.reaction_time_ms);
    const slope = linearRegression(recentRTs);

    if (slope > 50) {
      const thirdLen = Math.floor(completedReps.length / 3);
      if (thirdLen < 1) return false;

      const firstThird = completedReps.slice(0, thirdLen).map(r => r.reaction_time_ms);
      const lastThird = completedReps.slice(-thirdLen).map(r => r.reaction_time_ms);
      const firstMean = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
      const lastMean = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;

      if (firstMean > 0 && lastMean / firstMean > 1.3) {
        this.fatigueDetected = true;
        this.fatigueOnsetRep = currentRep;
        return true;
      }
    }

    return false;
  }

  getFatigueIndex(allReps: RepetitionMetrics[]): number {
    const completedReps = allReps.filter(r => r.reaction_time_ms > 0);
    if (completedReps.length < 3) return 1.0;

    const thirdLen = Math.max(1, Math.floor(completedReps.length / 3));
    const firstThird = completedReps.slice(0, thirdLen).map(r => r.reaction_time_ms);
    const lastThird = completedReps.slice(-thirdLen).map(r => r.reaction_time_ms);
    const firstMean = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
    const lastMean = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;

    return firstMean > 0 ? lastMean / firstMean : 1.0;
  }
}
