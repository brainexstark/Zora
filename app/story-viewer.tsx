// ============================================================
// STORY VIEWER - full screen with animated progress bar + mark seen
// ============================================================
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Image as RNImage,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase, getCurrentUserId } from "@/utils/supabase";
import { Avatar } from "@/components/ui";
import { Video as ExpoVideo, ResizeMode } from "expo-av";

const { width: W, height: H } = Dimensions.get("window");
const DURATION = 5000; // 5 seconds per story

export default function StoryViewerScreen() {
  const { vibe } = useTheme();
  const { ids: idsParam, index: indexParam } = useLocalSearchParams<{ ids: string; index: string }>();
  const ids: string[] = JSON.parse(decodeURIComponent(idsParam || "[]"));
  const [currentIndex, setCurrentIndex] = useState(Number(indexParam) || 0);
  const [story, setStory] = useState<any | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    getCurrentUserId().then(setMyId);
  }, []);

  useEffect(() => {
    if (!ids.length) return;
    const id = ids[currentIndex];
    if (!id) { router.back(); return; }
    (async () => {
      const { data } = await supabase
        .from("stories")
        .select("id, user_id, media_url, media_type, viewers, profiles(username, avatar_url)")
        .eq("id", id)
        .single();
      setStory(data);
      // Mark as viewed
      const uid = await getCurrentUserId();
      if (uid && data) {
        const viewers = Array.isArray(data.viewers) ? data.viewers : [];
        if (!viewers.includes(uid)) {
          await supabase.from("stories").update({ viewers: [...viewers, uid] }).eq("id", data.id);
        }
      }
    })();
    // Reset + animate progress bar
    progress.setValue(0);
    animation.current?.stop();
    animation.current = Animated.timing(progress, { toValue: 1, duration: DURATION, useNativeDriver: false });
    animation.current.start(({ finished }) => {
      if (finished) goNext();
    });
    return () => animation.current?.stop();
  }, [currentIndex, ids]);

  function goNext() {
    if (currentIndex < ids.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      router.back();
    }
  }

  function goPrev() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  if (!story) return <View style={{ flex: 1, backgroundColor: "#000" }} />;

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={styles.container}>
      {/* Media */}
      {story.media_type === "video" ? (
        <ExpoVideo source={{ uri: story.media_url }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} shouldPlay isLooping={false} />
      ) : (
        <RNImage source={{ uri: story.media_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}

      {/* Progress bars */}
      <View style={styles.bars}>
        {ids.map((_, i) => (
          <View key={i} style={[styles.barTrack, { backgroundColor: "rgba(255,255,255,0.3)" }]}>
            <Animated.View
              style={[styles.barFill, {
                backgroundColor: vibe.accent,
                width: i < currentIndex ? "100%" : i === currentIndex ? barWidth : "0%",
              }]}
            />
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Avatar uri={story.profiles?.avatar_url ?? null} size={36} />
        <Text style={styles.username}>{story.profiles?.username || "zora"}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: "auto" }}>
          <Text style={{ color: "#FFF", fontSize: 24 }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Touch zones: left = prev, right = next */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={{ flex: 1, flexDirection: "row" }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={goPrev} />
          <TouchableOpacity style={{ flex: 1 }} onPress={goNext} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: W, height: H, backgroundColor: "#000" },
  bars: { position: "absolute", top: 50, left: 8, right: 8, flexDirection: "row", gap: 4 },
  barTrack: { flex: 1, height: 2.5, borderRadius: 2, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },
  header: { position: "absolute", top: 60, left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  username: { color: "#FFF", fontFamily: "SpaceGrotesk-Bold", fontSize: 15 },
});
