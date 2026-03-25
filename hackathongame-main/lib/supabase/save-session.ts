import { createClient } from "./client";
import type { SessionMetrics, RawRepetitionData } from "@/components/games/DarknessExplorer/types";
import type { Json } from "@/types/database";

function classifyTargetSide(x: number): "left" | "right" | "center" {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const third = vw / 3;
  if (x < third) return "left";
  if (x > third * 2) return "right";
  return "center";
}

function computeRepMetrics(rep: RawRepetitionData) {
  const reaction_time_ms =
    rep.click_timestamp && rep.target_spawn_timestamp
      ? rep.click_timestamp - rep.target_spawn_timestamp
      : null;

  const discovery_time_ms =
    rep.discovery_timestamp && rep.target_spawn_timestamp
      ? rep.discovery_timestamp - rep.target_spawn_timestamp
      : null;

  const eye_hand_latency_ms =
    rep.click_timestamp && rep.discovery_timestamp
      ? rep.click_timestamp - rep.discovery_timestamp
      : null;

  let movement_speed: number | null = null;
  if (rep.hand_trajectory.length >= 2) {
    const first = rep.hand_trajectory[0];
    const last = rep.hand_trajectory[rep.hand_trajectory.length - 1];
    const dt = (last.timestamp - first.timestamp) / 1000;
    if (dt > 0) {
      const dist = Math.hypot(last.x - first.x, last.y - first.y);
      movement_speed = dist / dt;
    }
  }

  const precision_px = rep.hit
    ? Math.hypot(
        rep.click_position.x - rep.target_position.x,
        rep.click_position.y - rep.target_position.y,
      )
    : null;

  let gaze_stability_variance: number | null = null;
  if (rep.gaze_trajectory.length >= 3) {
    const xs = rep.gaze_trajectory.map((p) => p.x);
    const ys = rep.gaze_trajectory.map((p) => p.y);
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
    const varX = xs.reduce((s, v) => s + (v - meanX) ** 2, 0) / xs.length;
    const varY = ys.reduce((s, v) => s + (v - meanY) ** 2, 0) / ys.length;
    gaze_stability_variance = varX + varY;
  }

  return {
    reaction_time_ms,
    discovery_time_ms,
    eye_hand_latency_ms,
    movement_speed,
    precision_px,
    gaze_stability_variance,
  };
}

export async function saveSessionToSupabase(
  metrics: SessionMetrics,
  sessionId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const repRows = metrics.raw_repetitions.map((rep) => {
      const computed = computeRepMetrics(rep);
      return {
        session_id: sessionId,
        rep_index: rep.rep_index,
        target_side: rep.target_side ?? classifyTargetSide(rep.target_position.x),
        target_x: rep.target_position.x,
        target_y: rep.target_position.y,
        target_size: rep.target_size,
        hit: rep.hit,
        difficulty_level: rep.difficulty_level,
        reaction_time_ms: computed.reaction_time_ms,
        discovery_time_ms: computed.discovery_time_ms,
        eye_hand_latency_ms: computed.eye_hand_latency_ms,
        movement_speed: computed.movement_speed,
        precision_px: computed.precision_px,
        gaze_stability_variance: computed.gaze_stability_variance,
        raw_telemetry: {
          cursor: rep.hand_trajectory,
          eyes: rep.gaze_trajectory,
        } as unknown as Json,
      };
    });

    if (repRows.length > 0) {
      const { error: repError } = await supabase
        .from("repetitions")
        .insert(repRows);
      if (repError) {
        console.error("Error inserting repetitions:", repError.message, repError.code, repError.details);
        return { ok: false, error: repError.message };
      }
    }

    const precisionValues = metrics.raw_repetitions
      .filter((r) => r.hit)
      .map((r) =>
        Math.hypot(
          r.click_position.x - r.target_position.x,
          r.click_position.y - r.target_position.y,
        ),
      );
    const avg_precision_px =
      precisionValues.length > 0
        ? precisionValues.reduce((a, b) => a + b, 0) / precisionValues.length
        : null;

    const { error: metricsError } = await supabase
      .from("session_metrics")
      .insert({
        session_id: sessionId,
        avg_reaction_time_ms: metrics.reaction_time.mean_ms,
        avg_discovery_time_ms: metrics.reaction_time.median_ms,
        avg_eye_hand_latency_ms: metrics.eye_hand_latency.mean_ms,
        avg_movement_speed: metrics.movement_speed.mean_px_per_sec,
        avg_precision_px,
        avg_gaze_stability_variance: metrics.tremor.during_game_mean_variance,
        coverage_percent: metrics.visual_exploration.coverage_percent,
        heatmap_grid: metrics.visual_exploration.heatmap_grid as unknown as Json,
        asymmetry_reaction: metrics.asymmetry.reaction_time_ratio,
        asymmetry_precision: metrics.asymmetry.precision_ratio,
        neglect_index: metrics.visual_exploration.hemispheric_bias,
        fatigue_detected: metrics.fatigue.detected,
        fatigue_onset_rep: metrics.fatigue.onset_rep,
        fatigue_index: metrics.fatigue.fatigue_index,
      });

    if (metricsError) {
      console.error("Error inserting session_metrics:", metricsError.message, metricsError.code, metricsError.details);
      return { ok: false, error: metricsError.message };
    }

    const endReason =
      metrics.end_reason === "timeout" ? "completed" : metrics.end_reason;

    const { error: sessionError } = await supabase
      .from("sessions")
      .update({
        ended_at: metrics.timestamp_end,
        duration_seconds: Math.round(metrics.duration_seconds),
        total_reps: metrics.total_reps,
        completed_reps: metrics.completed_reps,
        end_reason: endReason,
        difficulty_start: metrics.difficulty.start_level,
        difficulty_end: metrics.difficulty.end_level,
        eye_tracking_available: metrics.input_mode === "gaze",
      })
      .eq("id", sessionId);

    if (sessionError) {
      console.error("Error updating session:", sessionError.message, sessionError.code, sessionError.details);
      return { ok: false, error: sessionError.message };
    }

    return { ok: true };
  } catch (err) {
    console.error("saveSessionToSupabase error:", err);
    return { ok: false, error: String(err) };
  }
}
