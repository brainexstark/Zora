// ============================================================
// PHONE OTP - required for 18+ before entering the app
// ============================================================
import React, { useState, useRef, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { sendPhoneOTP, verifyPhoneOTP, setPhoneVerified } from "@/utils/ageGuard";
import { getCurrentUserId } from "@/utils/supabase";
import { Button, ThemedInput, SectionHeader, ZoraLogo } from "@/components/ui";

export default function OTPScreen() {
  const { vibe } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const timer = useRef<any>(null);

  useEffect(() => {
    return () => timer.current && clearInterval(timer.current);
  }, []);

  async function handleSend() {
    if (!phone || phone.length < 6) {
      Alert.alert("Enter phone", "Enter a valid phone number including country code, e.g. +14155550123");
      return;
    }
    setBusy(true);
    const ok = await sendPhoneOTP(phone);
    setBusy(false);
    if (ok) {
      setSent(true);
      setResendIn(60);
      timer.current = setInterval(() => {
        setResendIn((s) => {
          if (s <= 1) {
            clearInterval(timer.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      Alert.alert("OTP sent", `A code was sent to ${phone}`);
    } else {
      Alert.alert("Failed to send", "Could not send an OTP. Make sure phone auth is enabled in Supabase and the number is valid.");
    }
  }

  async function handleVerify() {
    if (!otp || otp.length < 4) {
      Alert.alert("Enter code", "Enter the 6-digit code we sent you.");
      return;
    }
    setBusy(true);
    const ok = await verifyPhoneOTP(phone, otp);
    if (!ok) {
      setBusy(false);
      Alert.alert("Invalid code", "That code is wrong or expired. Try again or resend.");
      return;
    }
    const uid = await getCurrentUserId();
    if (uid) {
      await setPhoneVerified(uid, phone);
      await refreshProfile();
    }
    setBusy(false);
    router.replace("/(tabs)");
  }

  return (
    <View style={{ flex: 1, backgroundColor: vibe.background, justifyContent: "center", padding: 24 }}>
      <View style={{ alignItems: "center", marginBottom: 32 }}>
        <ZoraLogo size={40} />
        <SectionHeader title="Verify your number" />
        <Text style={{ color: vibe.primary, opacity: 0.6, fontFamily: "Inter", fontSize: 13, textAlign: "center" }}>
          Since you're 18+, ZORA needs to confirm your phone. You can't enter the app without this.
        </Text>
      </View>

      <ThemedInput
        placeholder="Phone (+14155550123)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoCapitalize="none"
        editable={!sent}
        style={{ marginBottom: 16 }}
      />
      <Button title={sent ? "OTP sent" : "Send OTP"} onPress={handleSend} loading={busy} disabled={sent} variant={sent ? "ghost" : "primary"} />

      {sent && (
        <View style={{ marginTop: 24 }}>
          <ThemedInput
            placeholder="6-digit code"
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, "").slice(0, 6))}
            keyboardType="numeric"
            style={{ marginBottom: 16 }}
          />
          <Button title="Verify & enter ZORA" onPress={handleVerify} loading={busy} />
          <Button
            title={resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
            onPress={handleSend}
            variant="ghost"
            disabled={resendIn > 0}
            style={{ marginTop: 12 }}
            textStyle={{ fontSize: 14 }}
          />
        </View>
      )}
    </View>
  );
}
