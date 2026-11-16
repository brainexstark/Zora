// ============================================================
// ENV VALIDATOR - runs at boot, warns clearly if keys are missing
// ============================================================
import Constants from "expo-constants";

export function getSupabaseUrl(): string {
  const v =
    Constants.expoConfig?.extra?.supabaseUrl ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    "";
  return v;
}

export function getSupabaseAnonKey(): string {
  const v =
    Constants.expoConfig?.extra?.supabaseAnonKey ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return v;
}

export function validateEnv(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!getSupabaseUrl()) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!getSupabaseAnonKey()) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  return { ok: missing.length === 0, missing };
}
