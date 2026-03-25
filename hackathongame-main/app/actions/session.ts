"use server";

import { createClient } from "@/lib/supabase/server";

export type StartSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string };

export async function startSession(
  difficultyStart: number,
  eyeTrackingAvailable: boolean,
): Promise<StartSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autenticado." };
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      patient_id: user.id,
      started_at: new Date().toISOString(),
      difficulty_start: difficultyStart,
      eye_tracking_available: eyeTrackingAvailable,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, sessionId: data.id };
}
