// ============================================================
// STORYTRAY - horizontal story rail with vibe-colored rings
// ============================================================
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image as RNImage } from "react-native";
import { router } from "expo-router";
import { supabase, getCurrentUserId } from "@/utils/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar } from "@/components/ui";

export type StoryWithProfile = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video" | null;
  viewers: string[] | null;
  profiles: { username: string; avatar_url: string | null } | null;
};

export function StoryTray() {
  const { vibe } = useTheme();
  const [stories, setStories] = useState<StoryWithProfile[]>([]);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const uid = await getCurrentUserId();
      if (active) setMyId(uid);
      const { data } = await supabase
        .from("stories")
        .select("id, user_id, media_url, media_type, viewers, profiles(username, avatar_url)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (active) setStories((data as any) || []);
    })();
    return () => {
      active = false;
    };
  }, []);

  function hasUnseen(viewers: string[] | null) {
    if (!myId) return true;
    return !viewers || !viewers.includes(myId);
  }

  function openStory(index: number) {
    // Pass the story ids so StoryViewer can page through them
    const ids = stories.map((s) => s.id);
    router.push(`/story-viewer?index=${index}&ids=${encodeURIComponent(JSON.stringify(ids))}`);
  }

  if (stories.length === 0) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ color: vibe.primary, opacity: 0.4, fontFamily: "Inter", fontSize: 13 }}>
          No stories in the last 24h — be the first to add one.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={stories}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => {
        const unseen = hasUnseen(item.viewers);
        return (
          <TouchableOpacity onPress={() => openStory(index)} style={styles.story}>
            <View style={[styles.ring, { borderColor: unseen ? vibe.accent : "#444", borderRadius: 40 }]}>
              <Avatar uri={item.profiles?.avatar_url ?? null} size={64} />
            </View>
            <Text style={{ color: vibe.primary, fontFamily: "Inter", fontSize: 11, marginTop: 4 }} numberOfLines={1}>
              {item.profiles?.username || "zora"}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  story: { alignItems: "center", marginRight: 14, width: 74 },
  ring: { borderWidth: 2.5, padding: 3 },
});
