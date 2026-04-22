import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Resolves the Gemini API key to use for this user's request.
 * Priority: user's saved key in their profile → process.env.GEMINI_API_KEY (dev fallback).
 * Returns null if neither exists.
 */
export async function getGeminiKeyForCurrentUser(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("gemini_api_key")
    .eq("id", user.id)
    .maybeSingle();

  const stored = profile?.gemini_api_key?.trim();
  if (stored) return stored;

  return process.env.GEMINI_API_KEY?.trim() || null;
}
