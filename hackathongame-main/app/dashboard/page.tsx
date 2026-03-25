import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';
import { DashboardVisualLayerProvider } from '@/contexts/DashboardVisualLayerContext';

export interface DashboardSession {
  id: string;
  day: number;
  date: string;
  completed_reps: number;
  duration_minutes: number;
  heatmap_grid: number[][] | null;
  metrics: {
    avg_reaction_time_ms: number;
    neglect_index: number;
    asymmetry_reaction: number;
    coverage_percent: number;
    avg_discovery_time_ms: number;
    avg_eye_hand_latency_ms: number;
    avg_precision_px: number;
    fatigue_detected: boolean;
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: rawSessions } = await supabase
    .from('sessions')
    .select('*, session_metrics(*)')
    .order('started_at', { ascending: true });

  const sessions: DashboardSession[] = (rawSessions ?? [])
    .filter((s) => {
      const metrics = Array.isArray(s.session_metrics) ? s.session_metrics : [];
      return metrics.length > 0;
    })
    .map((s, idx) => {
      const m = Array.isArray(s.session_metrics)
        ? s.session_metrics[0]
        : s.session_metrics;

      let heatmapGrid: number[][] | null = null;
      if (m?.heatmap_grid) {
        try {
          heatmapGrid =
            typeof m.heatmap_grid === 'string'
              ? JSON.parse(m.heatmap_grid)
              : m.heatmap_grid;
        } catch {
          heatmapGrid = null;
        }
      }

      return {
        id: s.id,
        day: idx + 1,
        date: s.started_at,
        completed_reps: s.completed_reps ?? 0,
        duration_minutes: Math.round((s.duration_seconds ?? 0) / 60),
        heatmap_grid: heatmapGrid,
        metrics: {
          avg_reaction_time_ms: m?.avg_reaction_time_ms ?? 0,
          neglect_index: m?.neglect_index ?? 0,
          asymmetry_reaction: m?.asymmetry_reaction ?? 1,
          coverage_percent: m?.coverage_percent ?? 0,
          avg_discovery_time_ms: m?.avg_discovery_time_ms ?? 0,
          avg_eye_hand_latency_ms: m?.avg_eye_hand_latency_ms ?? 0,
          avg_precision_px: m?.avg_precision_px ?? 0,
          fatigue_detected: m?.fatigue_detected ?? false,
        },
      };
    });

  return (
    <DashboardVisualLayerProvider>
      <DashboardClient sessions={sessions} />
    </DashboardVisualLayerProvider>
  );
}
