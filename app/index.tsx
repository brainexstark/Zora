// ============================================================
// ENTRY - routes the user based on auth + profile + verification state
// ============================================================
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function Entry() {
  const { session, profile, loading } = useAuth();
  const { vibe } = useTheme();

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.replace("/onboarding");
      return;
    }
    // Has a session but no profile row yet -> collect DOB
    if (!profile) {
      router.replace("/dob");
      return;
    }
    // 18+ must verify phone before entering tabs
    if (profile.age_group === "18_plus" && !profile.phone_verified) {
      router.replace("/otp");
      return;
    }
    // under_14 needs a parent email on file
    if (profile.age_group === "under_14" && !profile.phone && !profile.bio) {
      router.replace("/parent-email");
      return;
    }
    // Fully onboarded -> main app
    router.replace("/(tabs)");
  }, [session, profile, loading]);

  return (
    <View style={{ flex: 1, backgroundColor: vibe.background, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color={vibe.accent} />
    </View>
  );
}
