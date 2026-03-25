/* eslint-disable */
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webgazer: {
      begin: () => any;
      end: () => any;
      setGazeListener: (
        callback: (data: { x: number; y: number } | null, elapsedTime: number) => void
      ) => any;
      getCurrentPrediction: () => Promise<{ x: number; y: number } | null>;
      recordScreenPosition: (x: number, y: number, eventType?: string) => any;
      removeMouseEventListeners: () => any;
      showPredictionPoints: (show: boolean) => any;
      showVideo: (show: boolean) => any;
      showFaceOverlay: (show: boolean) => any;
      showFaceFeedbackBox: (show: boolean) => any;
      params: Record<string, any>;
    };
  }
}
/* eslint-enable */

export interface GazePoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface RawRepetitionData {
  rep_index: number;
  target_id: string;
  target_position: { x: number; y: number };
  target_size: number;
  target_side: 'left' | 'right' | 'center';
  target_spawn_timestamp: number;
  discovery_timestamp: number | null;
  click_timestamp: number | null;
  click_position: { x: number; y: number };
  hit: boolean;
  gaze_trajectory: Array<{ timestamp: number; x: number; y: number }>;
  hand_trajectory: Array<{ timestamp: number; x: number; y: number }>;
  difficulty_level: number;
}

export interface RepetitionMetrics {
  rep_index: number;
  reaction_time_ms: number;
  discovery_time_ms: number;
  eye_hand_latency_ms: number;
  hand_movement_speed: number;
  click_precision_px: number;
  gaze_stability_variance: number;
  target_side: 'left' | 'right' | 'center';
}

export interface SessionMetrics {
  session_id: string;
  patient_id: string;
  game_type: 'darkness_explorer';
  timestamp_start: string;
  timestamp_end: string;
  duration_seconds: number;
  total_reps: number;
  completed_reps: number;
  end_reason: 'completed' | 'fatigue' | 'timeout' | 'cancelled';
  input_mode: 'gaze' | 'mouse' | 'touch';

  reaction_time: {
    mean_ms: number;
    median_ms: number;
    std_ms: number;
    min_ms: number;
    max_ms: number;
    trend: number;
    per_rep: number[];
  };

  asymmetry: {
    reaction_time_ratio: number;
    discovery_time_ratio: number;
    precision_ratio: number;
    speed_ratio: number;
    left_metrics: {
      mean_reaction_ms: number;
      mean_discovery_ms: number;
      mean_precision_px: number;
      mean_speed: number;
      count: number;
    };
    right_metrics: {
      mean_reaction_ms: number;
      mean_discovery_ms: number;
      mean_precision_px: number;
      mean_speed: number;
      count: number;
    };
  };

  fatigue: {
    detected: boolean;
    onset_rep: number | null;
    degradation_slope: number;
    first_third_mean_reaction: number;
    last_third_mean_reaction: number;
    fatigue_index: number;
  };

  movement_speed: {
    mean_px_per_sec: number;
    std_px_per_sec: number;
    trend: number;
    per_rep: number[];
  };

  tremor: {
    baseline_variance: number;
    during_game_mean_variance: number;
    during_game_trend: number;
    per_rep: number[];
  };

  eye_hand_latency: {
    mean_ms: number;
    median_ms: number;
    std_ms: number;
    trend: number;
    per_rep: number[];
  };

  visual_exploration: {
    heatmap_grid: number[][];
    coverage_percent: number;
    hemispheric_bias: number;
    exploration_entropy: number;
  };

  raw_repetitions: RawRepetitionData[];

  difficulty: {
    start_level: number;
    end_level: number;
    adjustments: Array<{
      at_rep: number;
      from_level: number;
      to_level: number;
      reason: string;
    }>;
  };

  calibration: {
    accuracy_px: number;
    completed: boolean;
  };
}

export type MinerSprite = 'pico' | 'feliz';

export interface Target {
  id: string;
  position: { x: number; y: number };
  radius: number;
  side: 'left' | 'right';
  spawnTime: number;
  discovered: boolean;
  discoveryTime: number | null;
  timeout_ms: number;
  sprite: MinerSprite;
}

export interface DifficultyParams {
  level: number;
  target_radius: number;
  target_timeout_ms: number;
  light_radius: number;
  min_target_distance: number;
}

export interface PatientConfig {
  patient_id: string;
  affected_side: 'left' | 'right';
  difficulty_level: number;
  session_target_reps: number;
  session_max_duration_sec: number;
  games_enabled: string[];
  last_session_date: string | null;
}

export interface CalibrationData {
  accuracy_px: number;
  completed: boolean;
  baselineTremorVariance: number;
}

export type GameState = 'IDLE' | 'CALIBRATING' | 'BASELINE' | 'PLAYING' | 'FINISHED';

export interface GameCallbacks {
  onStateChange: (state: GameState) => void;
  onRepComplete: (rep: RawRepetitionData) => void;
  onSessionEnd: (reason: 'completed' | 'fatigue' | 'timeout' | 'cancelled') => void;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}
