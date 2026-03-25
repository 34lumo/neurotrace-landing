import { RawRepetitionData, Target, GazePoint } from '../types';

export class MetricsCollector {
  private reps: RawRepetitionData[] = [];
  private currentGazeTrajectory: GazePoint[] = [];
  private currentHandTrajectory: GazePoint[] = [];
  private lastGazeSampleTime = 0;
  private lastHandSampleTime = 0;
  private gazeSampleIntervalMs = 50; // 20fps
  private heatmapGrid: number[][] = [];
  private gridCols = 8;
  private gridRows = 6;
  private screenWidth: number;
  private screenHeight: number;

  constructor(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.resetHeatmap();
  }

  private resetHeatmap(): void {
    this.heatmapGrid = Array.from({ length: this.gridRows }, () =>
      new Array(this.gridCols).fill(0)
    );
  }

  updateScreenSize(w: number, h: number): void {
    this.screenWidth = w;
    this.screenHeight = h;
  }

  sampleGaze(x: number, y: number, now: number): void {
    if (now - this.lastGazeSampleTime >= this.gazeSampleIntervalMs) {
      this.currentGazeTrajectory.push({ x, y, timestamp: now });
      this.lastGazeSampleTime = now;

      const col = Math.min(this.gridCols - 1, Math.max(0, Math.floor((x / this.screenWidth) * this.gridCols)));
      const row = Math.min(this.gridRows - 1, Math.max(0, Math.floor((y / this.screenHeight) * this.gridRows)));
      this.heatmapGrid[row][col]++;
    }
  }

  sampleHand(x: number, y: number, now: number): void {
    if (now - this.lastHandSampleTime >= this.gazeSampleIntervalMs) {
      this.currentHandTrajectory.push({ x, y, timestamp: now });
      this.lastHandSampleTime = now;
    }
  }

  startRep(): void {
    this.currentGazeTrajectory = [];
    this.currentHandTrajectory = [];
    this.lastGazeSampleTime = 0;
    this.lastHandSampleTime = 0;
  }

  finishRep(
    repIndex: number,
    target: Target,
    clickTimestamp: number | null,
    clickPosition: { x: number; y: number },
    hit: boolean,
    difficultyLevel: number
  ): RawRepetitionData {
    const rep: RawRepetitionData = {
      rep_index: repIndex,
      target_id: target.id,
      target_position: { ...target.position },
      target_size: target.radius,
      target_side: target.side,
      target_spawn_timestamp: target.spawnTime,
      discovery_timestamp: target.discoveryTime,
      click_timestamp: clickTimestamp,
      click_position: { ...clickPosition },
      hit,
      gaze_trajectory: [...this.currentGazeTrajectory],
      hand_trajectory: [...this.currentHandTrajectory],
      difficulty_level: difficultyLevel,
    };
    this.reps.push(rep);
    return rep;
  }

  getReps(): RawRepetitionData[] {
    return this.reps;
  }

  getHeatmap(): number[][] {
    return this.heatmapGrid;
  }

  reset(): void {
    this.reps = [];
    this.currentGazeTrajectory = [];
    this.currentHandTrajectory = [];
    this.resetHeatmap();
  }
}
