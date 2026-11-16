// ============================================================
// POSTCARD - feed card with real like, comment, save-offline logic
// ============================================================
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image as RNImage, StyleSheet, Alert, Modal } from "react-native";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system";
import { supabase, getCurrentUserId } from "@/utils/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, Button, ThemedInput } from "@/components/ui";
import { trackHistory } from "@/utils/vibeEngine";

export type PostWithProfile = {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string;
  media_type: "image" | "video" | null;
  quest_type: "quest" | "flex";
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

export function PostCard({ post, onDidThis, showDidThis }: { post: PostWithProfile; onDidThis?: () => void; showDidThis?: boolean }) {
  const { vibe } = useTheme();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<{ id: string; content: string; profiles: { username: string } | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const uid = await getCurrentUserId();
      // like count
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id);
      if (active) setLikeCount(count || 0);
      // did I like?
      if (uid) {
        const { data: mine } = await supabase
          .from("likes")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", uid)
          .limit(1);
        if (active) setLiked(!!mine && mine.length > 0);
      }
      // track history for vibe engine
      if (post.caption) trackHistory(post.caption.split(" ").slice(0, 3));
    })();
    return () => {
      active = false;
    };
  }, [post.id]);

  async function toggleLike() {
    const uid = await getCurrentUserId();
    if (!uid) return;
    if (liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", uid);
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_id: uid });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  }

  async function loadComments() {
    const { data } = await supabase
      .from("comments")
      .select("id, content, user_id, profiles(username)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setComments((data as any) || []);
  }

  async function submitComment() {
    if (!comment.trim()) return;
    const uid = await getCurrentUserId();
    if (!uid) return;
    await supabase.from("comments").insert({ post_id: post.id, user_id: uid, content: comment.trim() });
    setComment("");
    loadComments();
  }

  async function saveOffline() {
    setSaving(true);
    try {
      const uid = await getCurrentUserId();
      if (!uid) return;
      const ext = post.media_type === "video" ? ".mp4" : ".jpg";
      const localPath = FileSystem.documentDirectory + post.id + ext;
      const { uri } = await FileSystem.downloadAsync(post.media_url, localPath);
      await supabase.from("offline_saves").insert({
        user_id: uid,
        post_id: post.id,
        local_path: uri,
      });
      setSaved(true);
      Alert.alert("Saved offline", "This post is now in your Vault and works in airplane mode.");
    } catch (e) {
      Alert.alert("Save failed", "Could not download this post for offline use.");
    } finally {
      setSaving(false);
    }
  }

  function openProfile() {
    if (post.user_id) router.push(`/profile?id=${post.user_id}`);
  }

  return (
    <View style={[styles.card, { backgroundColor: vibe.secondary, borderRadius: vibe.cornerRadius }]}>
      {/* Header */}
      <TouchableOpacity onPress={openProfile} style={styles.header}>
        <Avatar uri={post.profiles?.avatar_url ?? null} size={36} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 14 }}>
            {post.profiles?.username || "zora_user"}
          </Text>
          <Text style={{ color: post.quest_type === "quest" ? "#00FF88" : vibe.accent, fontSize: 11, fontFamily: "Inter" }}>
            {post.quest_type === "quest" ? "QUEST" : "FLEX"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Media - real Supabase media_url */}
      {post.media_type === "video" ? (
        <VideoThumb uri={post.media_url} />
      ) : (
        <RNImage source={{ uri: post.media_url }} style={styles.media} resizeMode="cover" />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={toggleLike} style={styles.actionBtn}>
          <Text style={{ color: liked ? "#FF0033" : vibe.primary, fontSize: 22 }}>{liked ? "♥" : "♡"}</Text>
          <Text style={{ color: vibe.primary, marginLeft: 6, fontFamily: "Inter", fontSize: 13 }}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setCommentOpen(true); loadComments(); }} style={styles.actionBtn}>
          <Text style={{ color: vibe.primary, fontSize: 20 }}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={saveOffline} disabled={saving || saved} style={styles.actionBtn}>
          <Text style={{ color: saved ? "#00FF88" : vibe.primary, fontSize: 18 }}>{saved ? "✓" : "↡"}</Text>
          <Text style={{ color: vibe.primary, marginLeft: 6, fontFamily: "Inter", fontSize: 12 }}>{saving ? "Saving…" : saved ? "Saved" : "Vault"}</Text>
        </TouchableOpacity>
        {showDidThis && onDidThis && (
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <TouchableOpacity onPress={onDidThis} style={[styles.didThis, { borderColor: vibe.accent, borderRadius: vibe.cornerRadius }]}>
              <Text style={{ color: vibe.accent, fontFamily: "SpaceGrotesk-Bold", fontSize: 12 }}>I DID THIS</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Caption */}
      {post.caption ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Text style={{ color: vibe.primary, fontFamily: "Inter", fontSize: 14 }}>
            <Text style={{ fontFamily: "SpaceGrotesk-Bold" }}>{post.profiles?.username || "zora_user"} </Text>
            {post.caption}
          </Text>
        </View>
      ) : null}

      {/* Comments modal */}
      <Modal visible={commentOpen} animationType="slide" onRequestClose={() => setCommentOpen(false)}>
        <View style={{ flex: 1, backgroundColor: vibe.background }}>
          <View style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 18 }}>Comments</Text>
            <TouchableOpacity onPress={() => setCommentOpen(false)}>
              <Text style={{ color: vibe.primary, fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            {comments.length === 0 ? (
              <Text style={{ color: vibe.primary, opacity: 0.5, fontFamily: "Inter", textAlign: "center", marginTop: 40 }}>No comments yet</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={{ paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#333" }}>
                  <Text style={{ color: vibe.primary, fontFamily: "Inter" }}>
                    <Text style={{ fontFamily: "SpaceGrotesk-Bold" }}>{c.profiles?.username || "user"} </Text>
                    {c.content}
                  </Text>
                </View>
              ))
            )}
          </View>
          <View style={{ flexDirection: "row", padding: 16, gap: 8 }}>
            <ThemedInput placeholder="Add a comment…" value={comment} onChangeText={setComment} style={{ flex: 1 }} />
            <Button title="Send" onPress={submitComment} style={{ paddingHorizontal: 18 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function VideoThumb({ uri }: { uri: string }) {
  return (
    <View style={[styles.media, { justifyContent: "center", alignItems: "center" }]}>
      <RNImage source={{ uri }} style={[styles.media, { position: "absolute" }]} resizeMode="cover" />
      <Text style={{ color: "#FFF", fontSize: 40, opacity: 0.9 }}>▶</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 12, marginBottom: 16, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", padding: 12 },
  media: { width: "100%", height: 360, backgroundColor: "#111" },
  actions: { flexDirection: "row", alignItems: "center", padding: 12, gap: 18 },
  actionBtn: { flexDirection: "row", alignItems: "center" },
  didThis: { borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6 },
});
