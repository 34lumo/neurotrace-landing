import { SessionMetrics } from '@/components/games/DarknessExplorer/types';
import { SessionSaveResponse } from './types';

export class SessionManager {
  async saveSession(metrics: SessionMetrics): Promise<SessionSaveResponse> {
    try {
      const existing: SessionMetrics[] = JSON.parse(
        localStorage.getItem('darkness_sessions') || '[]'
      );
      existing.push(metrics);
      localStorage.setItem('darkness_sessions', JSON.stringify(existing));
      return { success: true, session_id: metrics.session_id };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  loadSessions(patientId: string): SessionMetrics[] {
    try {
      const all: SessionMetrics[] = JSON.parse(
        localStorage.getItem('darkness_sessions') || '[]'
      );
      return all.filter((s) => s.patient_id === patientId);
    } catch {
      return [];
    }
  }

  getSessionCount(patientId: string): number {
    return this.loadSessions(patientId).length;
  }
}
