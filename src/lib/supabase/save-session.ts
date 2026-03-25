import type { SessionMetrics } from '@/components/games/DarknessExplorer/types';

// Demo stub — no backend in the landing page build
export async function saveSessionToSupabase(
  _metrics: SessionMetrics,
  _sessionId: string,
): Promise<{ ok: boolean; error?: string }> {
  return { ok: true };
}
