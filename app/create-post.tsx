// ============================================================
// CREATE POST - pick media, classify, upload to zora-media, insert post
// ============================================================
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image as RNImage, StyleSheet, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, STORAGE_BUCKET } from "@/utils/supabase";
import { classifyPost } from "@/utils/contentClassifier";
import { base64ToArrayBuffer } from "@/utils/base64";
import { Button, ThemedInput, ZoraLogo, SectionHeader } from "@/components/ui";

export default function CreatePostScreen() {
  const { vibe } = useTheme();
  const { profile } = useAuth();
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [classifiedAs, setClassifiedAs] = useState<"quest" | "flex" | null>(null);

  async function pickMedia(isVideo: boolean) {
    setMediaType(isVideo ? "video" : "image");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to post.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: isVideo ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      videoMaxDuration: 90,
    });
    if (result.canceled || !result.assets?.length) return;
    setMedia(result.assets[0].uri);
    setClassifiedAs(null);
  }

  async function publish() {
    if (!media) {
      Alert.alert("No media", "Pick an image or video first.");
      return;
    }
    if (!profile?.id) return;
    setBusy(true);
    try {
      // Classify on device
      const questType = await classifyPost(mediaType === "image" ? media : null, caption);
      setClassifiedAs(questType);

      // Upload to zora-media bucket
      const ext = mediaType === "video" ? "mp4" : "jpg";
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const fileBase64 = await FileSystem.readAsStringAsync(media, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const contentType = mediaType === "video" ? "video/mp4" : "image/jpeg";
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, base64ToArrayBuffer(fileBase64), { contentType, upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      // Insert post row
      const { error: insErr } = await supabase.from("posts").insert({
        user_id: profile.id,
        caption: caption.trim() || null,
        media_url: publicUrl,
        media_type: mediaType,
        quest_type: questType,
      });
      if (insErr) throw insErr;

      Alert.alert("Posted!", `Classified as ${questType.toUpperCase()}. It's live in the feed.`);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Could not upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: vibe.background }} contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <ZoraLogo size={28} />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: vibe.primary, fontSize: 22 }}>✕</Text>
        </TouchableOpacity>
      </View>
      <SectionHeader title="New Post" />

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <Button title="Pick Image" onPress={() => pickMedia(false)} variant="ghost" style={{ flex: 1, borderWidth: 1, borderColor: vibe.secondary }} />
        <Button title="Pick Video" onPress={() => pickMedia(true)} variant="ghost" style={{ flex: 1, borderWidth: 1, borderColor: vibe.secondary }} />
      </View>

      {media && (
        <View style={[styles.preview, { borderRadius: vibe.cornerRadius, backgroundColor: vibe.secondary }]}>
          <RNImage source={{ uri: media }} style={styles.previewImg} resizeMode="cover" />
        </View>
      )}

      <ThemedInput placeholder="Write a caption…" value={caption} onChangeText={setCaption} multiline style={{ minHeight: 80, marginBottom: 16, textAlignVertical: "top" }} />

      {classifiedAs && (
        <Text style={{ color: classifiedAs === "quest" ? "#00FF88" : vibe.accent, fontFamily: "SpaceGrotesk-Bold", fontSize: 13, marginBottom: 12 }}>
          Classified on device as: {classifiedAs.toUpperCase()}
        </Text>
      )}

      <Button title={busy ? "Publishing…" : "Publish to feed"} onPress={publish} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  preview: { width: "100%", height: 300, marginBottom: 16, overflow: "hidden" },
  previewImg: { width: "100%", height: "100%" },
});
