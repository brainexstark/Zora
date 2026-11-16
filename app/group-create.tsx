// ============================================================
// GROUP CREATE - name, avatar upload, select members, insert
// ============================================================
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image as RNImage } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, STORAGE_BUCKET } from "@/utils/supabase";
import { base64ToArrayBuffer } from "@/utils/base64";
import { Avatar, Button, ThemedInput, ZoraLogo, SectionHeader } from "@/components/ui";

export default function GroupCreateScreen() {
  const { vibe } = useTheme();
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      const { data } = await supabase.from("profiles").select("id, username, avatar_url").neq("id", profile.id).limit(50);
      setPeople(data || []);
    })();
  }, [profile?.id]);

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
    if (!result.canceled && result.assets?.length) setAvatarUri(result.assets[0].uri);
  }

  function toggleMember(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function create() {
    if (!name.trim() || !profile?.id) {
      Alert.alert("Name required", "Give your tribe a name.");
      return;
    }
    if (selected.length < 1) {
      Alert.alert("Add members", "Select at least one member.");
      return;
    }
    setBusy(true);
    try {
      let avatarUrl: string | null = null;
      if (avatarUri) {
        const path = `groups/${profile.id}/${Date.now()}.jpg`;
        const fileBase64 = await FileSystem.readAsStringAsync(avatarUri, { encoding: FileSystem.EncodingType.Base64 });
        const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, base64ToArrayBuffer(fileBase64), { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        avatarUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
      }
      const { data: group, error } = await supabase.from("groups").insert({ name: name.trim(), avatar_url: avatarUrl, created_by: profile.id }).select().single();
      if (error || !group) throw error || new Error("Group insert failed");

      const members = [...selected, profile.id].map((uid) => ({ group_id: group.id, user_id: uid }));
      const { error: mErr } = await supabase.from("group_members").insert(members);
      if (mErr) throw mErr;

      Alert.alert("Tribe created", `${name} has ${members.length} members.`);
      router.replace("/group-list");
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Could not create group.");
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
      <SectionHeader title="Create Tribe" />

      <TouchableOpacity onPress={pickAvatar} style={{ alignItems: "center", marginBottom: 16 }}>
        {avatarUri ? (
          <RNImage source={{ uri: avatarUri }} style={[styles.avatarBig, { borderRadius: 60 }]} />
        ) : (
          <View style={[styles.avatarBig, { backgroundColor: vibe.secondary, borderRadius: 60, justifyContent: "center", alignItems: "center" }]}>
            <Text style={{ color: vibe.accent, fontSize: 24 }}>+</Text>
            <Text style={{ color: vibe.primary, opacity: 0.6, fontSize: 11, marginTop: 4 }}>Avatar</Text>
          </View>
        )}
      </TouchableOpacity>

      <ThemedInput placeholder="Tribe name" value={name} onChangeText={setName} style={{ marginBottom: 16 }} />

      <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 15, marginBottom: 8 }}>Select members</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {people.map((p) => {
          const isSel = selected.includes(p.id);
          return (
            <TouchableOpacity key={p.id} onPress={() => toggleMember(p.id)} style={[styles.chip, { borderColor: isSel ? vibe.accent : vibe.secondary, backgroundColor: isSel ? vibe.accent : "transparent", borderRadius: vibe.cornerRadius }]}>
              <Avatar uri={p.avatar_url} size={24} />
              <Text style={{ color: isSel ? "#000" : vibe.primary, marginLeft: 6, fontFamily: "Inter", fontSize: 13 }}>{p.username}</Text>
              <Text style={{ color: isSel ? "#000" : vibe.accent, marginLeft: 6, fontSize: 14 }}>{isSel ? "✓" : "+"}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={{ color: vibe.primary, opacity: 0.5, fontFamily: "Inter", fontSize: 12, marginVertical: 14 }}>{selected.length} selected</Text>
      <Button title={busy ? "Creating…" : "Create Tribe"} onPress={create} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarBig: { width: 100, height: 100 },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1.5 },
});
