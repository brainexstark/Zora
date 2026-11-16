// ============================================================
// DOB SCREEN - immutable date of birth capture + profile insert
// ============================================================
import React, { useState } from "react";
import { View, Text, Alert, ScrollView, Platform } from "react-native";
import { router } from "expo-router";
import { supabase, getCurrentUserId } from "@/utils/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { calculateAge, getAgeGroup, createProfile } from "@/utils/ageGuard";
import { Button, ThemedInput, SectionHeader, ZoraLogo } from "@/components/ui";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function DOBScreen() {
  const { vibe } = useTheme();
  const { session, refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState(""); // 1-12
  const [day, setDay] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!username.trim()) {
      Alert.alert("Username required", "Pick a username for your ZORA profile.");
      return;
    }
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
      Alert.alert("Invalid date", "Enter a valid year, month, and day.");
      return;
    }
    const dob = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const age = calculateAge(dob);
    if (age < 0 || age > 120) {
      Alert.alert("Invalid date", "That date of birth doesn't look right.");
      return;
    }
    const ageGroup = getAgeGroup(age);
    const uid = session?.user?.id || (await getCurrentUserId());
    if (!uid) {
      Alert.alert("Not signed in", "Please sign in first.");
      router.replace("/onboarding");
      return;
    }

    setBusy(true);
    // Check username uniqueness
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username.trim())
      .limit(1);
    if (existing && existing.length > 0) {
      setBusy(false);
      Alert.alert("Username taken", "Try a different username.");
      return;
    }

    const ok = await createProfile({
      id: uid,
      username: username.trim(),
      dob,
      age,
      age_group: ageGroup,
      auth_provider: session?.user?.app_metadata?.provider || "email",
    });
    setBusy(false);

    if (!ok) {
      Alert.alert("Could not create profile", "The profile may already exist. Try signing out and back in.");
      return;
    }
    await refreshProfile();

    // Route based on age group
    if (ageGroup === "18_plus") {
      router.replace("/otp");
    } else if (ageGroup === "under_14") {
      router.replace("/parent-email");
    } else {
      // 14_17 -> selfie verification then main app
      router.replace("/selfie");
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: vibe.background }}
      contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: "center" }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ alignItems: "center", marginBottom: 32 }}>
        <ZoraLogo size={48} />
        <SectionHeader title="Your date of birth" />
        <Text style={{ color: vibe.primary, opacity: 0.6, fontFamily: "Inter", fontSize: 13, textAlign: "center" }}>
          This is locked forever after signup. ZORA uses it to keep content age-appropriate.
        </Text>
      </View>

      <ThemedInput placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" style={{ marginBottom: 16 }} />

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
        <ThemedInput placeholder="Month (1-12)" value={month} onChangeText={(t) => setMonth(t.replace(/[^0-9]/g, ""))} keyboardType="numeric" style={{ flex: 1 }} />
        <ThemedInput placeholder="Day (1-31)" value={day} onChangeText={(t) => setDay(t.replace(/[^0-9]/g, ""))} keyboardType="numeric" style={{ flex: 1 }} />
        <ThemedInput placeholder="Year" value={year} onChangeText={(t) => setYear(t.replace(/[^0-9]/g, ""))} keyboardType="numeric" style={{ flex: 1.4 }} />
      </View>

      {month && day && year && (
        <Text style={{ color: vibe.accent, fontFamily: "SpaceGrotesk-Bold", textAlign: "center", marginBottom: 20 }}>
          You'll be marked as {getAgeGroup(calculateAge(`${parseInt(year,10)}-${String(parseInt(month,10)).padStart(2,"0")}-${String(parseInt(day,10)).padStart(2,"0")}`)).replace("_", " ")}
        </Text>
      )}

      <Button title="Continue" onPress={handleSubmit} loading={busy} />
      <Button title="Sign out" onPress={() => supabase.auth.signOut().then(() => router.replace("/onboarding"))} variant="ghost" style={{ marginTop: 12 }} textStyle={{ fontSize: 13 }} />
    </ScrollView>
  );
}
