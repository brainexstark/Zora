// ============================================================
// ROOT LAYOUT
// • loads URL polyfill before Supabase boots
// • loads SpaceGrotesk + Inter fonts
// • controls the splash screen
// • wraps the entire app in ThemeProvider + AuthProvider
// • warns if Supabase env vars are missing
// ============================================================
import "../utils/polyfills"; // must be first import

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";

import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { validateEnv } from "@/utils/env";

// Keep the splash screen visible until fonts + env check finish
SplashScreen.preventAutoHideAsync();

// ---- Font map (bundled from @expo-google-fonts packages) ----
const FONT_MAP = {
  "SpaceGrotesk-Bold": require("@expo-google-fonts/space-grotesk/SpaceGrotesk_700Bold.ttf"),
  "SpaceGrotesk-Regular": require("@expo-google-fonts/space-grotesk/SpaceGrotesk_400Regular.ttf"),
  "Inter": require("@expo-google-fonts/inter/Inter_400Regular.ttf"),
  "Inter-Bold": require("@expo-google-fonts/inter/Inter_700Bold.ttf"),
};

// ---- Env-missing screen ----
function EnvMissingScreen({ missing }: { missing: string[] }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center", padding: 28 }}>
      <Text style={{ color: "#FF0033", fontSize: 28, fontWeight: "900", marginBottom: 16 }}>⚠ ZORA</Text>
      <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700", marginBottom: 12, textAlign: "center" }}>
        Supabase not configured
      </Text>
      <Text style={{ color: "#aaa", fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>
        Create a <Text style={{ color: "#FF0033" }}>.env</Text> file in the project root with:
      </Text>
      {missing.map((k) => (
        <View key={k} style={{ backgroundColor: "#111", borderRadius: 8, padding: 12, width: "100%", marginBottom: 8 }}>
          <Text style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 13 }}>{k}=your_value</Text>
        </View>
      ))}
      <Text style={{ color: "#666", fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 18 }}>
        See <Text style={{ color: "#FF0033" }}>SETUP.md</Text> for the full Supabase walkthrough, then restart Expo.
      </Text>
      <TouchableOpacity
        onPress={() => Linking.openURL("https://supabase.com/dashboard")}
        style={{ marginTop: 24, paddingVertical: 14, paddingHorizontal: 28, backgroundColor: "#FF0033", borderRadius: 12 }}
      >
        <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 14 }}>Open Supabase Dashboard →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---- Themed Stack (needs ThemeProvider in scope) ----
function ThemedStack() {
  const { vibe } = useTheme();
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: vibe.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="dob" />
        <Stack.Screen name="selfie" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="parent-email" />
        <Stack.Screen name="create-post" />
        <Stack.Screen name="story-create" />
        <Stack.Screen name="chat-list" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="group-create" />
        <Stack.Screen name="group-list" />
        <Stack.Screen name="story-viewer" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

// ---- Root ----
export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [envCheck, setEnvCheck] = useState<{ ok: boolean; missing: string[] } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await Font.loadAsync(FONT_MAP);
      } catch (e) {
        console.warn("Font load error (non-fatal):", e);
      }
      const env = validateEnv();
      setEnvCheck(env);
      setFontsLoaded(true);
      await SplashScreen.hideAsync();
    })();
  }, []);

  if (!fontsLoaded || !envCheck) {
    // Keep splash visible
    return null;
  }

  if (!envCheck.ok) {
    return <EnvMissingScreen missing={envCheck.missing} />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedStack />
      </AuthProvider>
    </ThemeProvider>
  );
}
