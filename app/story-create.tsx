// ============================================================
// STORY CREATE - capture media, upload to zora-media, insert story
// ============================================================
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image as RNImage, StyleSheet, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, STORAGE_BUCKET, getCurrentUserId } from "@/utils/supabase";
import { base64ToArrayBuffer } from "@/utils/base64";
import { Button, ZoraLogo, SectionHeader } from "@/components/ui";

export default function StoryCreateScreen() {
  const { vibe } = useTheme();
  const { profile } = useAuth();
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [busy, setBusy] = useState(false);

  async function pick(isVideo: boolean) {
    setMediaType(isVideo ? "video" : "image");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to add a story.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: isVideo ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      videoMaxDuration: 30,
    });
    if (result.canceled || !result.assets?.length) return;
    setMedia(result.assets[0].uri);
  }

  async function publish() {
    if (!media || !profile?.id) return;
    setBusy(true);
    try {
      const ext = mediaType === "video" ? "mp4" : "jpg";
      const path = `stories/${profile.id}/${Date.now()}.${ext}`;
      const fileBase64 = await FileSystem.readAsStringAsync(media, { encoding: FileSystem.EncodingType.Base64 });
      const contentType = mediaType === "video" ? "video/mp4" : "image/jpeg";
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, base64ToArrayBuffer(fileBase64), { contentType });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: insErr } = await supabase.from("stories").insert({
        user_id: profile.id,
        media_url: publicUrl,
        media_type: mediaType,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (insErr) throw insErr;
      Alert.alert("Story added", "It's live for 24 hours.");
      router.back();
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Could not upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: vibe.background }} contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <ZoraLogo size={28} />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: vibe.primary, fontSize: 22 }}>✕</Text>
        </TouchableOpacity>
      </View>
      <SectionHeader title="Add Story" />

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <Button title="Pick Image" onPress={() => pick(false)} variant="ghost" style={{ flex: 1, borderWidth: 1, borderColor: vibe.secondary }} />
        <Button title="Pick Video" onPress={() => pick(true)} variant="ghost" style={{ flex: 1, borderWidth: 1, borderColor: vibe.secondary }} />
      </View>

      {media && (
        <View style={[styles.preview, { borderRadius: vibe.cornerRadius, backgroundColor: vibe.secondary }]}>
          <RNImage source={{ uri: media }} style={styles.previewImg} resizeMode="cover" />
        </View>
      )}

      <Text style={{ color: vibe.primary, opacity: 0.5, fontFamily: "Inter", fontSize: 12, marginBottom: 16 }}>
        Stories disappear after 24 hours.
      </Text>
      <Button title={busy ? "Publishing…" : "Add Story"} onPress={publish} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  preview: { width: "100%", height: 300, marginBottom: 16, overflow: "hidden" },
  previewImg: { width: "100%", height: "100%" },
});
