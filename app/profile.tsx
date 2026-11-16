// ============================================================
// PROFILE - real posts grid, follower count, edit, sign out
// ============================================================
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image as RNImage,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, STORAGE_BUCKET } from "@/utils/supabase";
import { base64ToArrayBuffer } from "@/utils/base64";
import { Avatar, Button, EmptyState, ZoraLogo, ThemedInput } from "@/components/ui";

const COLS = 3;
const CELL = Dimensions.get("window").width / COLS;

export default function ProfileScreen() {
  const { vibe } = useTheme();
  const { profile: me } = useAuth();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  const targetId = idParam || me?.id;

  const load = useCallback(async () => {
    if (!targetId) return;
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", targetId).single();
    setUser(prof);
    setBio(prof?.bio || "");

    const { data: userPosts } = await supabase
      .from("posts")
      .select("id, media_url, media_type, caption, quest_type, created_at")
      .eq("user_id", targetId)
      .order("created_at", { ascending: false });
    setPosts(userPosts || []);

    const { count: fCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", targetId);
    setFollowerCount(fCount || 0);

    const { count: fgCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", targetId);
    setFollowingCount(fgCount || 0);

    if (me?.id && me.id !== targetId) {
      const { data: f } = await supabase.from("follows").select("follower_id").eq("follower_id", me.id).eq("following_id", targetId).limit(1);
      setIsFollowing(!!f && f.length > 0);
    }
  }, [targetId, me?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const isMe = me?.id === targetId;

  async function follow() {
    if (!me?.id || !targetId || isMe) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", me.id).eq("following_id", targetId);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("follows").insert({ follower_id: me.id, following_id: targetId });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
  }

  async function saveBio() {
    setBusy(true);
    if (me?.id) await supabase.from("profiles").update({ bio }).eq("id", me.id);
    setBusy(false);
    setEditing(false);
    load();
  }

  async function changeAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
    if (result.canceled || !result.assets?.length || !me?.id) return;
    setBusy(true);
    try {
      const path = `avatars/${me.id}/${Date.now()}.jpg`;
      const fileBase64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, base64ToArrayBuffer(fileBase64), { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      const publicUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", me.id);
      load();
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message);
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    supabase.auth.signOut().then(() => router.replace("/onboarding"));
  }

  return (
    <View style={{ flex: 1, backgroundColor: vibe.background }}>
      <View style={{ paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <ZoraLogo size={28} />
        {isMe && (
          <TouchableOpacity onPress={signOut}>
            <Text style={{ color: vibe.accent, fontFamily: "SpaceGrotesk-Bold", fontSize: 13 }}>Sign out</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ alignItems: "center", paddingHorizontal: 16, marginBottom: 16 }}>
        <TouchableOpacity onPress={isMe ? changeAvatar : undefined} disabled={busy}>
          <Avatar uri={user?.avatar_url ?? null} size={96} ring />
        </TouchableOpacity>
        {isMe && <Text style={{ color: vibe.accent, fontSize: 11, marginTop: 6 }}>{busy ? "Uploading…" : "Tap avatar to change"}</Text>}
        <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 22, marginTop: 8 }}>{user?.username}</Text>
        <View style={{ flexDirection: "row", gap: 24, marginTop: 12 }}>
          <Stat label="Posts" value={posts.length} />
          <Stat label="Followers" value={followerCount} />
          <Stat label="Following" value={followingCount} />
        </View>
        {user?.bio && !editing && (
          <Text style={{ color: vibe.primary, opacity: 0.7, fontFamily: "Inter", fontSize: 14, textAlign: "center", marginTop: 12, maxWidth: 320 }}>{user.bio}</Text>
        )}
        {editing && (
          <View style={{ width: "100%", marginTop: 12 }}>
            <ThemedInput placeholder="Edit bio…" value={bio} onChangeText={setBio} multiline style={{ minHeight: 60, textAlignVertical: "top", marginBottom: 8 }} />
            <Button title="Save bio" onPress={saveBio} loading={busy} />
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          {isMe ? (
            <Button title={editing ? "Cancel" : "Edit profile"} onPress={() => setEditing((e) => !e)} variant="ghost" style={{ borderWidth: 1, borderColor: vibe.secondary, paddingHorizontal: 24 }} textStyle={{ fontSize: 13 }} />
          ) : (
            <Button title={isFollowing ? "Following" : "Follow"} onPress={follow} variant={isFollowing ? "ghost" : "primary"} style={{ paddingHorizontal: 28 }} textStyle={{ fontSize: 13 }} />
          )}
        </View>
        {user?.age_group && (
          <Text style={{ color: vibe.accent, fontFamily: "Inter", fontSize: 11, marginTop: 8 }}>{user.age_group.replace("_", " ")}</Text>
        )}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={COLS}
        contentContainerStyle={{ paddingHorizontal: 2, paddingBottom: 40 }}
        ListEmptyComponent={<EmptyState message={isMe ? "No posts yet — be first to post." : "No posts yet."} actionLabel={isMe ? "Create Post" : undefined} onAction={isMe ? () => router.push("/create-post") : undefined} />}
        renderItem={({ item }) => (
          <View style={{ width: CELL, height: CELL, padding: 1 }}>
            <RNImage source={{ uri: item.media_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            <View style={[styles.tag, { backgroundColor: item.quest_type === "quest" ? "#00FF88" : "#FF0033" }]}>
              <Text style={{ color: "#000", fontSize: 8, fontFamily: "SpaceGrotesk-Bold" }}>{item.quest_type?.toUpperCase().slice(0, 4)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const { vibe } = useTheme();
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 17 }}>{value}</Text>
      <Text style={{ color: vibe.primary, opacity: 0.5, fontFamily: "Inter", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { position: "absolute", top: 4, left: 4, paddingHorizontal: 3, paddingVertical: 1, borderRadius: 3 },
});
