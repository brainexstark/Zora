// ============================================================
// HOME - Quest/Flex feed gated by the quest timer (DB enforced)
// ============================================================
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase, getCurrentUserId } from "@/utils/supabase";
import { getQuestStatus, incrementQuest, isFlexUnlocked, QuestStatus } from "@/utils/questTimer";
import { PostCard, PostWithProfile } from "@/components/PostCard";
import { StoryTray } from "@/components/StoryTray";
import { ZoraLogo, EmptyState, Button } from "@/components/ui";

export default function HomeFeed() {
  const { vibe } = useTheme();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [status, setStatus] = useState<QuestStatus | null>(null);
  const [flexUnlocked, setFlexUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    if (!profile?.id) return;
    const st = await getQuestStatus(profile.id);
    setStatus(st);
    const unlocked = isFlexUnlocked(st);
    setFlexUnlocked(unlocked);

    const { data } = await supabase
      .from("posts")
      .select("id, user_id, caption, media_url, media_type, quest_type, created_at, profiles!inner(username, avatar_url, age_group)")
      .eq("quest_type", unlocked ? "flex" : "quest")
      .order("created_at", { ascending: false });

    // Filter by the viewer's age group (client-side since Supabase can't filter on joined columns inline)
    let rows = (data as any) || [];
    if (profile.age_group) {
      rows = rows.filter((p: any) => p.profiles?.age_group === profile.age_group || p.user_id === profile.id);
    }
    setPosts(rows as unknown as PostWithProfile[]);
    setLoading(false);
    setRefreshing(false);
  }, [profile?.id, profile?.age_group]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleDidThis() {
    if (!profile?.id) return;
    const st = await incrementQuest(profile.id);
    setStatus(st);
    if (isFlexUnlocked(st)) {
      setFlexUnlocked(true);
      // reload to show flex feed
      setLoading(true);
      loadAll();
    } else {
      // refresh to update progress + possibly load new quest posts
      loadAll();
    }
  }

  function renderHeader() {
    if (flexUnlocked && status) {
      return (
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ color: "#00FF88", fontFamily: "SpaceGrotesk-Bold", fontSize: 16 }}>
            FLEX UNLOCKED — enjoy for {(status.flex_unlocked_until ? Math.max(0, Math.ceil((new Date(status.flex_unlocked_until).getTime() - Date.now()) / 60000)) : 0)} min
          </Text>
        </View>
      );
    }
    const done = Math.min(3, status?.quest_count ?? 0);
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 18 }}>
            Quest {done}/3 — Unlock Flex
          </Text>
          <Text style={{ color: vibe.accent, fontFamily: "Inter", fontSize: 12 }}>
            Value content only
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: vibe.secondary, borderRadius: vibe.cornerRadius }]}>
          <View style={[styles.progressFill, { width: `${(done / 3) * 100}%`, backgroundColor: vibe.accent }]} />
        </View>
        <Text style={{ color: vibe.primary, opacity: 0.5, fontFamily: "Inter", fontSize: 12, marginTop: 8 }}>
          Tap "I Did This" on a Quest post 3 times to unlock Flex for 1 hour.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: vibe.background }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8 }}>
        <ZoraLogo size={32} />
        <View style={{ flexDirection: "row", gap: 18 }}>
          <TouchableOpacity onPress={() => router.push("/chat-list")}>
            <Text style={{ color: vibe.primary, fontSize: 20 }}>✉</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/create-post")}>
            <Text style={{ color: vibe.accent, fontSize: 22, fontFamily: "SpaceGrotesk-Bold" }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} tintColor={vibe.accent} />}
        ListHeaderComponent={
          <>
            <StoryTray />
            {renderHeader()}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              message={flexUnlocked ? "No flex posts yet — be the first to flex." : "No quest posts yet — be the first to post value."}
              actionLabel="Create Post"
              onAction={() => router.push("/create-post")}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <PostCard post={item} showDidThis={!flexUnlocked} onDidThis={handleDidThis} />
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 8, marginTop: 10, overflow: "hidden" },
  progressFill: { height: 8 },
});
