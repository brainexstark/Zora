// ============================================================
// ENGINE B: VIBE ENGINE - Living generative UI, regenerated daily on device
// ============================================================
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, getCurrentUserId } from "./supabase";

export type VibeTheme = {
  primary: string;
  background: string;
  accent: string;
  secondary: string;
  cornerRadius: number;
  fontHeader: string;
  density: "compact" | "airy";
};

export type UserHistory = {
  tags: string[];
  colors: string[];
  nightUsage: number;
};

const DEFAULT_VIBE: VibeTheme = {
  primary: "#FFFFFF",
  background: "#000000",
  secondary: "#1A1A1A",
  accent: "#FF0033",
  cornerRadius: 16,
  fontHeader: "SpaceGrotesk-Bold",
  density: "airy",
};

const VIBE_KEY = "zora_vibe";
const DATE_KEY = "lastVibeDate";
const HISTORY_KEY = "userHistory";

const ACCENT_PALETTE = ["#FF0033", "#00FF88", "#FF00FF", "#3366FF", "#FFB300", "#00E5FF"];

function pick(arr: string[], i: number): string {
  return arr[i % arr.length];
}

/**
 * Generate a fresh daily vibe from the user's local history.
 * No two users will see the same app because the history differs.
 */
export function generateDailyVibe(history: UserHistory): VibeTheme {
  let accent = "#FF0033";
  if (history.tags.filter((t) => t.includes("money")).length > 3) accent = "#00FF88";
  if (history.tags.filter((t) => t.includes("glowup") || t.includes("edit")).length > 3)
    accent = "#FF00FF";
  // Deterministic accent from tag diversity if none of the keyword rules matched
  if (accent === "#FF0033" && history.tags.length > 0) {
    accent = pick(ACCENT_PALETTE, history.tags.length + history.nightUsage);
  }

  const background = history.nightUsage > 60 ? "#000000" : "#0A0A0A";
  const cornerRadius = history.tags.includes("soft") ? 24 : 12;
  const density: "compact" | "airy" = history.tags.length > 10 ? "compact" : "airy";

  return {
    primary: "#FFFFFF",
    background,
    accent,
    secondary: "#1A1A1A",
    cornerRadius,
    fontHeader: "SpaceGrotesk-Bold",
    density,
  };
}

/**
 * Returns today's vibe. If a new calendar day started since the last generation,
 * a new vibe is created from local history, persisted to AsyncStorage and to
 * profiles.vibe_theme on Supabase.
 */
export async function getTodayVibe(): Promise<VibeTheme> {
  const lastDate = await AsyncStorage.getItem(DATE_KEY);
  const today = new Date().toDateString();

  if (lastDate !== today) {
    const history: UserHistory = JSON.parse(
      (await AsyncStorage.getItem(HISTORY_KEY)) ||
        '{"tags":[],"colors":[],"nightUsage":0}'
    );
    const newVibe = generateDailyVibe(history);
    await AsyncStorage.setItem(VIBE_KEY, JSON.stringify(newVibe));
    await AsyncStorage.setItem(DATE_KEY, today);
    // Fire and forget sync to Supabase
    const uid = await getCurrentUserId();
    if (uid) {
      supabase.from("profiles").update({ vibe_theme: newVibe as any }).eq("id", uid).then();
    }
    return newVibe;
  } else {
    const cached = await AsyncStorage.getItem(VIBE_KEY);
    if (cached) return JSON.parse(cached) as VibeTheme;
    // First ever launch -> use default and persist
    await AsyncStorage.setItem(VIBE_KEY, JSON.stringify(DEFAULT_VIBE));
    await AsyncStorage.setItem(DATE_KEY, today);
    return DEFAULT_VIBE;
  }
}

/** Track a tag whenever the user views a post (called from feed). */
export async function trackHistory(tags: string[]) {
  try {
    const history: UserHistory = JSON.parse(
      (await AsyncStorage.getItem(HISTORY_KEY)) || '{"tags":[],"colors":[],"nightUsage":0}'
    );
    history.tags.push(...tags.slice(0, 3));
    if (new Date().getHours() >= 22 || new Date().getHours() < 6) {
      history.nightUsage = (history.nightUsage || 0) + 1;
    }
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.log("trackHistory error:", e);
  }
}

/** Reset the cached vibe so the next app start regenerates it. */
export async function resetVibe() {
  await AsyncStorage.removeItem(VIBE_KEY);
  await AsyncStorage.removeItem(DATE_KEY);
}

export { DEFAULT_VIBE };
