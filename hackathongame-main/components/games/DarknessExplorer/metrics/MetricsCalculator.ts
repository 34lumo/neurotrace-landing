import { RawRepetitionData, RepetitionMetrics, SessionMetrics, CalibrationData } from '../types';
import type { InputMode } from '../engine/GazeTracker';

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function linearSlope(values: number[]): number {
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

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function trajectoryLength(points: Array<{ x: number; y: number }>): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += dist(points[i - 1], points[i]);
  }
  return total;
}

export function computeRepMetrics(rep: RawRepetitionData): RepetitionMetrics {
  const reactionTime = rep.click_timestamp
    ? rep.click_timestamp - rep.target_spawn_timestamp
    : -1;

  const discoveryTime = rep.discovery_timestamp
    ? rep.discovery_timestamp - rep.target_spawn_timestamp
    : -1;

  const eyeHandLatency =
    rep.discovery_timestamp && rep.click_timestamp
      ? rep.click_timestamp - rep.discovery_timestamp
      : -1;

  let handSpeed = 0;
  if (rep.hand_trajectory.length >= 2) {
    const totalDist = trajectoryLength(rep.hand_trajectory);
    const totalTime =
      rep.hand_trajectory[rep.hand_trajectory.length - 1].timestamp -
      rep.hand_trajectory[0].timestamp;
    handSpeed = totalTime > 0 ? (totalDist / totalTime) * 1000 : 0;
  }

  const clickPrecision = rep.hit
    ? dist(rep.click_position, rep.target_position)
    : -1;

  let gazeStability = 0;
  if (rep.click_timestamp && rep.gaze_trajectory.length > 0) {
    const window200 = rep.gaze_trajectory.filter(
      (g) => rep.click_timestamp! - g.timestamp <= 200 && rep.click_timestamp! - g.timestamp >= 0
    );
    if (window200.length >= 2) {
      const xs = window200.map((g) => g.x);
      const ys = window200.map((g) => g.y);
      const varX = variance(xs);
      const varY = variance(ys);
      gazeStability = varX + varY;
    }
  }

  return {
    rep_index: rep.rep_index,
    reaction_time_ms: reactionTime,
    discovery_time_ms: discoveryTime,
    eye_hand_latency_ms: eyeHandLatency,
    hand_movement_speed: handSpeed,
    click_precision_px: clickPrecision,
    gaze_stability_variance: gazeStability,
    target_side: rep.target_side,
  };
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
}

function shannonEntropy(grid: number[][]): number {
  let total = 0;
  const flat: number[] = [];
  for (const row of grid) {
    for (const v of row) {
      flat.push(v);
      total += v;
    }
  }
  if (total === 0) return 0;
  let entropy = 0;
  for (const v of flat) {
    if (v > 0) {
      const p = v / total;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

interface SideMetrics {
  mean_reaction_ms: number;
  mean_discovery_ms: number;
  mean_precision_px: number;
  mean_speed: number;
  count: number;
}

function computeSideMetrics(reps: RepetitionMetrics[]): SideMetrics {
  const completed = reps.filter((r) => r.reaction_time_ms > 0);
  return {
    mean_reaction_ms: mean(completed.map((r) => r.reaction_time_ms)),
    mean_discovery_ms: mean(
      completed.filter((r) => r.discovery_time_ms > 0).map((r) => r.discovery_time_ms)
    ),
    mean_precision_px: mean(
      completed.filter((r) => r.click_precision_px >= 0).map((r) => r.click_precision_px)
    ),
    mean_speed: mean(completed.map((r) => r.hand_movement_speed)),
    count: completed.length,
  };
}

export function buildSessionMetrics(
  rawReps: RawRepetitionData[],
  heatmap: number[][],
  calibration: CalibrationData,
  patientId: string,
  affectedSide: 'left' | 'right',
  startTime: number,
  endTime: number,
  endReason: 'completed' | 'fatigue' | 'timeout' | 'cancelled',
  inputMode: InputMode,
  startLevel: number,
  endLevel: number,
  adjustments: Array<{ at_rep: number; from_level: number; to_level: number; reason: string }>
): SessionMetrics {
  const repMetrics = rawReps.map(computeRepMetrics);
  const completed = repMetrics.filter((r) => r.reaction_time_ms > 0);
  const rts = completed.map((r) => r.reaction_time_ms);

  const leftReps = repMetrics.filter((r) => r.target_side === 'left');
  const rightReps = repMetrics.filter((r) => r.target_side === 'right');
  const leftM = computeSideMetrics(leftReps);
  const rightM = computeSideMetrics(rightReps);

  const affected = affectedSide === 'left' ? leftM : rightM;
  const healthy = affectedSide === 'left' ? rightM : leftM;

  const safeRatio = (a: number, b: number) => (b > 0 ? a / b : 1);

  const thirdLen = Math.max(1, Math.floor(completed.length / 3));
  const firstThirdRTs = completed.slice(0, thirdLen).map((r) => r.reaction_time_ms);
  const lastThirdRTs = completed.slice(-thirdLen).map((r) => r.reaction_time_ms);
  const firstThirdMean = mean(firstThirdRTs);
  const lastThirdMean = mean(lastThirdRTs);
  const fatigueIndex = firstThirdMean > 0 ? lastThirdMean / firstThirdMean : 1;

  const speeds = completed.map((r) => r.hand_movement_speed);
  const tremorPerRep = completed.map((r) => r.gaze_stability_variance);
  const eyeHandPerRep = completed
    .filter((r) => r.eye_hand_latency_ms > 0)
    .map((r) => r.eye_hand_latency_ms);

  const totalCells = heatmap.length * (heatmap[0]?.length ?? 0);
  let visitedCells = 0;
  let leftHalf = 0;
  let rightHalf = 0;
  const cols = heatmap[0]?.length ?? 8;
  for (const row of heatmap) {
    for (let c = 0; c < row.length; c++) {
      if (row[c] > 0) visitedCells++;
      if (c < cols / 2) leftHalf += row[c];
      else rightHalf += row[c];
    }
  }
  const totalGaze = leftHalf + rightHalf;
  const hemisphericBias = totalGaze > 0 ? (rightHalf - leftHalf) / totalGaze : 0;

  const durationMs = endTime - startTime;

  return {
    session_id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    patient_id: patientId,
    game_type: 'darkness_explorer',
    timestamp_start: new Date(startTime).toISOString(),
    timestamp_end: new Date(endTime).toISOString(),
    duration_seconds: durationMs / 1000,
    total_reps: rawReps.length,
    completed_reps: completed.length,
    end_reason: endReason,
    input_mode: inputMode as 'gaze' | 'mouse' | 'touch',

    reaction_time: {
      mean_ms: mean(rts),
      median_ms: median(rts),
      std_ms: std(rts),
      min_ms: rts.length > 0 ? Math.min(...rts) : 0,
      max_ms: rts.length > 0 ? Math.max(...rts) : 0,
      trend: linearSlope(rts),
      per_rep: rts,
    },

    asymmetry: {
      reaction_time_ratio: safeRatio(affected.mean_reaction_ms, healthy.mean_reaction_ms),
      discovery_time_ratio: safeRatio(affected.mean_discovery_ms, healthy.mean_discovery_ms),
      precision_ratio: safeRatio(affected.mean_precision_px, healthy.mean_precision_px),
      speed_ratio: safeRatio(affected.mean_speed, healthy.mean_speed),
      left_metrics: leftM,
      right_metrics: rightM,
    },

    fatigue: {
      detected: fatigueIndex > 1.3,
      onset_rep: fatigueIndex > 1.3 ? rawReps.length - thirdLen : null,
      degradation_slope: linearSlope(rts),
      first_third_mean_reaction: firstThirdMean,
      last_third_mean_reaction: lastThirdMean,
      fatigue_index: fatigueIndex,
    },

    movement_speed: {
      mean_px_per_sec: mean(speeds),
      std_px_per_sec: std(speeds),
      trend: linearSlope(speeds),
      per_rep: speeds,
    },

    tremor: {
      baseline_variance: calibration.baselineTremorVariance,
      during_game_mean_variance: mean(tremorPerRep),
      during_game_trend: linearSlope(tremorPerRep),
      per_rep: tremorPerRep,
    },

    eye_hand_latency: {
      mean_ms: mean(eyeHandPerRep),
      median_ms: median(eyeHandPerRep),
      std_ms: std(eyeHandPerRep),
      trend: linearSlope(eyeHandPerRep),
      per_rep: eyeHandPerRep,
    },

    visual_exploration: {
      heatmap_grid: heatmap,
      coverage_percent: totalCells > 0 ? (visitedCells / totalCells) * 100 : 0,
      hemispheric_bias: hemisphericBias,
      exploration_entropy: shannonEntropy(heatmap),
    },

    raw_repetitions: rawReps,

    difficulty: {
      start_level: startLevel,
      end_level: endLevel,
      adjustments,
    },

    calibration: {
      accuracy_px: calibration.accuracy_px,
      completed: calibration.completed,
    },
  };
}
