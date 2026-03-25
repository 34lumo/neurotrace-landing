"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AuthActionState = { error?: string } | null;

export async function signInAsDemo(): Promise<AuthActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: "ana@demo.com",
    password: "demo1234",
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/game");
}
