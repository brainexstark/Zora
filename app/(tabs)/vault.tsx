// ============================================================
// VAULT - offline saves that play in airplane mode
// ============================================================
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system";
import { Video as ExpoVideo, ResizeMode } from "expo-av";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase";
import { Avatar, EmptyState, ZoraLogo } from "@/components/ui";

export default function VaultScreen() {
  const { vibe } = useTheme();
  const { profile } = useAuth();
  const [saves, setSaves] = useState<any[]>([]);
  const [playing, setPlaying] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!profile?.id) return;
    const { data } = await supabase
      .from("offline_saves")
      .select("id, local_path, post_id, posts(media_url, media_type, caption), created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    // Filter to only files that still exist on disk (works offline)
    const existing: any[] = [];
    for (const s of (data || [])) {
      const info = await FileSystem.getInfoAsync(s.local_path);
      if (info.exists) existing.push(s);
    }
    setSaves(existing);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [profile?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: vibe.background }}>
      <View style={{ paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 }}>
        <ZoraLogo size={28} />
        <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 22, marginTop: 8 }}>Vault</Text>
        <Text style={{ color: vibe.primary, opacity: 0.5, fontFamily: "Inter", fontSize: 13 }}>Saved for offline — plays in airplane mode.</Text>
      </View>

      <FlatList
        data={saves}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
        ListEmptyComponent={!loading ? <EmptyState message="Your Vault is empty. Tap the ↡ button on any post to save it offline." /> : null}
        renderItem={({ item }) => {
          const isVideo = item.local_path.endsWith(".mp4") || item.posts?.media_type === "video";
          return (
            <TouchableOpacity
              onPress={() => setPlaying(item)}
              style={[styles.saveCard, { backgroundColor: vibe.secondary, borderRadius: vibe.cornerRadius }]}
            >
              <View style={styles.thumbRow}>
                <View style={[styles.thumb, { backgroundColor: "#111" }]}>
                  <Text style={{ color: isVideo ? "#00FF88" : "#FF0033", fontSize: 24 }}>{isVideo ? "▶" : "🖼"}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: vibe.primary, fontFamily: "Inter", fontSize: 14 }} numberOfLines={2}>
                    {item.posts?.caption || "Saved post"}
                  </Text>
                  <Text style={{ color: vibe.accent, fontFamily: "Inter", fontSize: 11, marginTop: 4 }}>
                    {isVideo ? "Video" : "Image"} · Offline ready
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {playing && (
        <View style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}>
            {playing.local_path.endsWith(".mp4") || playing.posts?.media_type === "video" ? (
              <ExpoVideo source={{ uri: playing.local_path }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.CONTAIN} shouldPlay isLooping useNativeControls />
            ) : (
              <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center" }]}>
                <Text style={{ color: "#FFF" }}>{playing.posts?.caption || "Saved image"}</Text>
                <Text style={{ color: "#888", fontSize: 12, marginTop: 8 }}>Image saved at {playing.local_path}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => setPlaying(null)} style={{ position: "absolute", top: 50, right: 20 }}>
              <Text style={{ color: "#FFF", fontSize: 28 }}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  saveCard: { padding: 12, marginBottom: 12 },
  thumbRow: { flexDirection: "row", alignItems: "center" },
  thumb: { width: 56, height: 56, borderRadius: 10, justifyContent: "center", alignItems: "center" },
});
