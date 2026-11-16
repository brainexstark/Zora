// ============================================================
// REELS - vertical paging feed of video posts
// ============================================================
import React, { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, Dimensions, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/utils/supabase";
import { Avatar, EmptyState, ZoraLogo } from "@/components/ui";
import { Video as ExpoVideo, ResizeMode, AVPlaybackNativeSource } from "expo-av";

const H = Dimensions.get("window").height;

export default function ReelsScreen() {
  const { vibe } = useTheme();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, user_id, caption, media_url, media_type, quest_type, profiles(username, avatar_url)")
        .eq("media_type", "video")
        .order("created_at", { ascending: false });
      setVideos(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={{ position: "absolute", top: 50, left: 16, zIndex: 10 }}>
        <ZoraLogo size={28} />
      </View>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        pagingEnabled
        horizontal={false}
        showsVerticalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={!loading ? <EmptyState message="No video reels yet — post one to start the feed." actionLabel="Create Post" onAction={() => router.push("/create-post")} /> : null}
        renderItem={({ item }) => <ReelItem item={item} vibe={vibe} />}
      />
    </View>
  );
}

function ReelItem({ item, vibe }: { item: any; vibe: any }) {
  const videoRef = useRef<any>(null);
  return (
    <View style={[styles.reel, { height: H }]}>
      {item.media_url ? (
        <ExpoVideo
          ref={videoRef}
          source={{ uri: item.media_url }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          useNativeControls={false}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111", justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ color: "#888" }}>No video</Text>
        </View>
      )}
      <View style={styles.overlay}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Avatar uri={item.profiles?.avatar_url ?? null} size={40} />
          <Text style={styles.username}>{item.profiles?.username || "zora_user"}</Text>
        </View>
        {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
        <View style={[styles.badge, { backgroundColor: item.quest_type === "quest" ? "#00FF88" : "#FF0033" }]}>
          <Text style={{ color: "#000", fontFamily: "SpaceGrotesk-Bold", fontSize: 10 }}>{item.quest_type?.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reel: { width: "100%", backgroundColor: "#000", justifyContent: "flex-end" },
  overlay: { padding: 16, paddingBottom: 90, gap: 8 },
  username: { color: "#FFF", fontFamily: "SpaceGrotesk-Bold", fontSize: 16, marginLeft: 10 },
  caption: { color: "#FFF", fontFamily: "Inter", fontSize: 14, maxWidth: "80%" },
  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
});
