// ============================================================
// PARENT EMAIL - required for under_14 accounts
// ============================================================
import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button, ThemedInput, SectionHeader, ZoraLogo } from "@/components/ui";

export default function ParentEmailScreen() {
  const { vibe } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const [parentEmail, setParentEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!parentEmail || !parentEmail.includes("@")) {
      Alert.alert("Enter a valid email", "We need a parent or guardian email for under-14 accounts.");
      return;
    }
    setBusy(true);
    // Store the parent email in bio field for under_14 (phone column holds parent contact)
    const { error } = await supabase
      .from("profiles")
      .update({ phone: parentEmail, phone_verified: false })
      .eq("id", profile?.id);
    setBusy(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    await refreshProfile();
    router.replace("/(tabs)");
  }

  return (
    <View style={{ flex: 1, backgroundColor: vibe.background, justifyContent: "center", padding: 24 }}>
      <View style={{ alignItems: "center", marginBottom: 32 }}>
        <ZoraLogo size={40} />
        <SectionHeader title="Parent or guardian" />
        <Text style={{ color: vibe.primary, opacity: 0.6, fontFamily: "Inter", fontSize: 13, textAlign: "center" }}>
          You're under 14, so ZORA needs a parent or guardian email. We'll keep your feed age-appropriate.
        </Text>
      </View>

      <ThemedInput
        placeholder="Parent / guardian email"
        value={parentEmail}
        onChangeText={setParentEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ marginBottom: 20 }}
      />
      <Button title="Enter ZORA" onPress={handleSubmit} loading={busy} />
    </View>
  );
}
