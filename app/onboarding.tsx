// ============================================================
// ONBOARDING - Welcome + auth options (Google, IG, FB, Email)
// ============================================================
import React, { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase, isSupabaseConfigured } from "@/utils/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { ZoraLogo, Button, ThemedInput } from "@/components/ui";

WebBrowser.maybeCompleteAuthSession();

export default function Onboarding() {
  const { vibe } = useTheme();
  const { refreshProfile } = useAuth();
  const [mode, setMode] = useState<"welcome" | "signin" | "signup">("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const redirectTo = makeRedirectUri({ scheme: "zora" });

  async function handleOAuth(provider: "google" | "facebook" | "instagram") {
    if (!isSupabaseConfigured()) {
      Alert.alert(
        "Supabase not configured",
        "Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env, then restart. See .env.example."
      );
      return;
    }
    setBusy(provider);
    try {
      // 'instagram' is not a first-class Supabase OAuth provider — use a
      // custom OAuth app via 'instagram' provider key (requires setup in Supabase dashboard).
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: { redirectTo },
      });
      if (error) throw error;
      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (res?.type === "success" && res.url) {
          // Parse the hash for access_token etc.
          const params = new URL(res.url).hash || new URL(res.url).search;
          const urlObj = new URL("https://x" + (params.startsWith("#") ? params : "?" + params));
          const access_token = urlObj.searchParams.get("access_token");
          const refresh_token = urlObj.searchParams.get("refresh_token");
          if (access_token) {
            await supabase.auth.setSession({ access_token, refresh_token: refresh_token || "" });
            await refreshProfile();
          }
        }
      }
    } catch (e: any) {
      Alert.alert("Sign in failed", e?.message || "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  async function handleEmailAuth() {
    if (!email || !password) {
      Alert.alert("Missing fields", "Enter your email and password.");
      return;
    }
    setBusy("email");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert("Check your email", "We sent a confirmation link. Open it to activate your account, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await refreshProfile();
      }
    } catch (e: any) {
      Alert.alert("Auth error", e?.message || "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: vibe.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <ZoraLogo size={72} />
          <Text
            style={{
              color: vibe.primary,
              fontSize: 14,
              opacity: 0.6,
              marginTop: 16,
              textAlign: "center",
              fontFamily: "Inter",
            }}
          >
            Instagram steals time.{"\n"}ZORA invests it.
          </Text>
        </View>

        {mode === "welcome" && (
          <View>
            <Button title="Continue with Google" onPress={() => handleOAuth("google")} loading={busy === "google"} variant="ghost" style={{ borderWidth: 1, borderColor: vibe.secondary, marginBottom: 12 }} />
            <Button title="Continue with Instagram" onPress={() => handleOAuth("instagram")} loading={busy === "instagram"} variant="ghost" style={{ borderWidth: 1, borderColor: vibe.secondary, marginBottom: 12 }} />
            <Button title="Continue with Facebook" onPress={() => handleOAuth("facebook")} loading={busy === "facebook"} variant="ghost" style={{ borderWidth: 1, borderColor: vibe.secondary, marginBottom: 24 }} />
            <Button title="Sign up with email" onPress={() => setMode("signup")} />
            <Button title="I already have an account" onPress={() => setMode("signin")} variant="ghost" style={{ marginTop: 12 }} textStyle={{ fontSize: 14 }} />
          </View>
        )}

        {(mode === "signin" || mode === "signup") && (
          <View>
            <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 24, marginBottom: 20, textAlign: "center" }}>
              {mode === "signup" ? "Create account" : "Welcome back"}
            </Text>
            <ThemedInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={{ marginBottom: 12 }} />
            <ThemedInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ marginBottom: 20 }} />
            <Button title={mode === "signup" ? "Create account" : "Sign in"} onPress={handleEmailAuth} loading={busy === "email"} />
            <Button title="Back" onPress={() => setMode("welcome")} variant="ghost" style={{ marginTop: 12 }} textStyle={{ fontSize: 14 }} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
