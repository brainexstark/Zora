// ============================================================
// AI HUB - Vibe preview, Twin training/generation, Social Hub
// ============================================================
import React, { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { WebView } from "react-native-webview";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase";
import { initTwinModel, trainTwinFromMessages, generateTwinDraft, isTwinOnnx, isTwinTrained } from "@/utils/twinEngine";
import { Card, Button, SectionHeader, ZoraLogo } from "@/components/ui";

export default function AIHubScreen() {
  const { vibe } = useTheme();
  const { profile } = useAuth();
  const [onnx, setOnnx] = useState<boolean | null>(null);
  const [trained, setTrained] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [hubUrl, setHubUrl] = useState<string | null>(null);
  const webRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const session = await initTwinModel();
      setOnnx(session ? true : false);
      setTrained(await isTwinTrained());
    })();
  }, []);

  async function handleTrain() {
    if (!profile?.id) return;
    setBusy(true);
    try {
      // Pull this user's sent messages to learn their voice
      const { data } = await supabase
        .from("messages")
        .select("content")
        .eq("sender_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(200);
      const msgs = (data || []).map((m: any) => m.content).filter(Boolean) as string[];
      if (msgs.length === 0) {
        Alert.alert("No messages yet", "Send a few DMs first so your Twin has something to learn from.");
        setBusy(false);
        return;
      }
      await trainTwinFromMessages(msgs);
      setTrained(true);
      Alert.alert("Twin trained", `Learned your voice from ${msgs.length} messages.${onnx ? " Running on ONNX." : " Using on-device slang engine."}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateDraft() {
    if (!trained) {
      Alert.alert("Train your Twin first", "Tap Train Twin from my messages.");
      return;
    }
    setBusy(true);
    try {
      const d = await generateTwinDraft("yo what's good today?");
      setDraft(d);
    } finally {
      setBusy(false);
    }
  }

  const socials = [
    { label: "Instagram", url: "https://instagram.com", color: "#FF0033" },
    { label: "TikTok", url: "https://tiktok.com", color: "#00FF88" },
    { label: "YouTube", url: "https://youtube.com", color: "#FF0033" },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: vibe.background }} contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
      <ZoraLogo size={32} />
      <SectionHeader title="AI Hub" />

      {/* Vibe preview */}
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 16, marginBottom: 12 }}>Today's Vibe</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
          <Swatch label="Accent" color={vibe.accent} />
          <Swatch label="Background" color={vibe.background} />
          <Swatch label="Card" color={vibe.secondary} />
        </View>
        <Text style={{ color: vibe.primary, opacity: 0.6, fontFamily: "Inter", fontSize: 12 }}>
          Corner radius {vibe.cornerRadius}px · Density {vibe.density}
        </Text>
        <Text style={{ color: vibe.accent, fontFamily: "Inter", fontSize: 11, marginTop: 6 }}>
          Generated on device from your behavior. Changes daily.
        </Text>
      </Card>

      {/* Twin */}
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 16, marginBottom: 8 }}>Your Twin</Text>
        <Text style={{ color: vibe.primary, opacity: 0.6, fontFamily: "Inter", fontSize: 13, marginBottom: 12 }}>
          {onnx === null ? "Checking on-device model…" : onnx ? "ONNX local LLM active (on device)" : "On-device slang engine (ONNX model not found on this device)"}
        </Text>
        <Text style={{ color: trained ? "#00FF88" : vibe.accent, fontFamily: "Inter", fontSize: 12, marginBottom: 12 }}>
          {trained ? "Trained — ready to suggest drafts" : "Not trained yet"}
        </Text>
        <Button title="Train Twin from my messages" onPress={handleTrain} loading={busy} />
        <Button title="Generate draft" onPress={handleGenerateDraft} variant="ghost" style={{ marginTop: 10 }} textStyle={{ fontSize: 14 }} />
        {draft && (
          <View style={{ marginTop: 12, padding: 12, backgroundColor: vibe.background, borderRadius: vibe.cornerRadius }}>
            <Text style={{ color: "#00FF88", fontFamily: "Inter", fontSize: 11 }}>Twin suggests:</Text>
            <Text style={{ color: vibe.primary, fontFamily: "Inter", fontSize: 14, marginTop: 4 }}>"{draft}"</Text>
          </View>
        )}
      </Card>

      {/* Social hub */}
      <Card>
        <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 16, marginBottom: 12 }}>Social Hub</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {socials.map((s) => (
            <TouchableOpacity key={s.label} onPress={() => setHubUrl(s.url)} style={[styles.socialBtn, { borderColor: s.color, borderRadius: vibe.cornerRadius }]}>
              <Text style={{ color: s.color, fontFamily: "SpaceGrotesk-Bold", fontSize: 12 }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {hubUrl && (
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, backgroundColor: "#000" }}>
            <WebView ref={webRef} source={{ uri: hubUrl }} style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => setHubUrl(null)} style={{ position: "absolute", top: 50, right: 20, zIndex: 5, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, padding: 8 }}>
              <Text style={{ color: "#FFF", fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Swatch({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: color, borderWidth: 1, borderColor: "#333" }} />
      <Text style={{ color: "#999", fontSize: 10, marginTop: 4, fontFamily: "Inter" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  socialBtn: { flex: 1, borderWidth: 1.5, paddingVertical: 14, alignItems: "center" },
});
