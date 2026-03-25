import { PatientConfig, SessionMetrics } from '@/components/games/DarknessExplorer/types';

export type { PatientConfig };

export interface SessionSaveResponse {
  success: boolean;
  session_id?: string;
  error?: string;
}

export interface PatientSummary {
  patient_id: string;
  total_sessions: number;
  last_session_date: string | null;
  avg_reaction_time_ms: number;
  avg_hit_rate: number;
  current_difficulty: number;
}

export function getDefaultPatientConfig(): PatientConfig {
  return {
    patient_id: 'patient_001',
    affected_side: 'right',
    difficulty_level: 3,
    session_target_reps: 30,
    session_max_duration_sec: 300,
    games_enabled: ['darkness_explorer'],
    last_session_date: null,
  };
}

export function getDemoConfig(): PatientConfig {
  return {
    patient_id: 'demo',
    affected_side: 'right',
    difficulty_level: 5,
    session_target_reps: 15,
    session_max_duration_sec: 180,
    games_enabled: ['darkness_explorer'],
    last_session_date: null,
  };
}

export function loadPatientConfig(): PatientConfig {
  try {
    const stored = localStorage.getItem('patient_config');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return getDefaultPatientConfig();
}

export function savePatientConfig(config: PatientConfig): void {
  try {
    localStorage.setItem('patient_config', JSON.stringify(config));
  } catch { /* ignore */ }
}

export function saveSession(metrics: SessionMetrics): SessionSaveResponse {
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

export function loadSessions(patientId: string): SessionMetrics[] {
  try {
    const all: SessionMetrics[] = JSON.parse(
      localStorage.getItem('darkness_sessions') || '[]'
    );
    return all.filter((s) => s.patient_id === patientId);
  } catch {
    return [];
  }
}
