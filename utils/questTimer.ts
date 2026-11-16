// ============================================================
// ENGINE C3: QUEST TIMER - DB-enforced quest->flex unlock
// ============================================================
import { supabase } from "./supabase";

export type QuestStatus = {
  quest_count: number;
  flex_unlocked_until: string | null;
  completed: boolean;
};

const EMPTY_STATUS: QuestStatus = {
  quest_count: 0,
  flex_unlocked_until: null,
  completed: false,
};

/**
 * Get the latest quest session for a user. Creates one if none exists yet.
 * The DB is the single source of truth so reinstalling the app cannot bypass it.
 */
export async function getQuestStatus(userId: string): Promise<QuestStatus> {
  const { data } = await supabase
    .from("quest_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    // No session yet -> create the first one so the counter persists in the DB.
    const { data: created } = await supabase
      .from("quest_sessions")
      .insert({ user_id: userId, quest_count: 0, completed: false })
      .select()
      .single();
    return created || EMPTY_STATUS;
  }
  return {
    quest_count: data.quest_count ?? 0,
    flex_unlocked_until: data.flex_unlocked_until,
    completed: data.completed ?? false,
  };
}

/**
 * Increment the quest counter. When the user reaches 3 quest actions, the flex
 * feed unlocks for 1 hour. All enforced in the database.
 */
export async function incrementQuest(userId: string): Promise<QuestStatus> {
  const status = await getQuestStatus(userId);
  if (status.completed && status.flex_unlocked_until) {
    // Already completed this session.
    return status;
  }
  const newCount = status.quest_count + 1;
  const reachedThree = newCount >= 3;
  const updates: Partial<QuestStatus> = {
    quest_count: newCount,
    completed: reachedThree,
    flex_unlocked_until: reachedThree
      ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
      : null,
  };
  await supabase
    .from("quest_sessions")
    .update(updates)
    .eq("user_id", userId);
  return {
    quest_count: newCount,
    completed: reachedThree,
    flex_unlocked_until: updates.flex_unlocked_until ?? null,
  };
}

/**
 * Returns whether the flex feed is currently available for the user.
 * Flex is unlocked when completed=true AND flex_unlocked_until is in the future.
 */
export function isFlexUnlocked(status: QuestStatus): boolean {
  if (!status.completed || !status.flex_unlocked_until) return false;
  return new Date(status.flex_unlocked_until).getTime() > Date.now();
}

/** Start a fresh quest session (used when the flex window expires). */
export async function startNewQuestSession(userId: string): Promise<void> {
  await supabase
    .from("quest_sessions")
    .insert({ user_id: userId, quest_count: 0, completed: false });
}
