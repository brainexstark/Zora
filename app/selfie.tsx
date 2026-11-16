// ============================================================
// SELFIE VERIFICATION - on-device age estimation (Engine A)
// ============================================================
import React, { useState, useRef } from "react";
import { View, Text, Alert, Modal, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { estimateAgeLocal } from "@/utils/ageGuard";
import { Button, SectionHeader, ZoraLogo, Avatar } from "@/components/ui";

export default function SelfieScreen() {
  const { vibe } = useTheme();
  const { profile } = useAuth();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [picture, setPicture] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ estimate: number; range: string; confidence: number } | null>(null);
  const [showMismatch, setShowMismatch] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("front");

  const enteredAge = profile?.age ?? 18;

  async function takePicture() {
    if (!cameraRef.current) return;
    try {
      setAnalyzing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
      });
      const uri: string = photo.uri;
      setPicture(uri);
      const res = await estimateAgeLocal(uri, enteredAge);
      setResult(res);
      setAnalyzing(false);
      const diff = Math.abs(res.estimate - enteredAge);
      if (diff > 5) {
        setShowMismatch(true);
      }
    } catch (e) {
      setAnalyzing(false);
      Alert.alert("Camera error", "Could not capture selfie. Check camera permissions.");
    }
  }

  function retake() {
    setPicture(null);
    setResult(null);
    setShowMismatch(false);
  }

  function proceed() {
    const ageGroup = profile?.age_group;
    if (ageGroup === "18_plus") {
      router.replace("/otp");
    } else if (ageGroup === "under_14") {
      router.replace("/parent-email");
    } else {
      router.replace("/(tabs)");
    }
  }

  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: vibe.background, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ color: vibe.primary }}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: vibe.background, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <SectionHeader title="Camera access needed" />
        <Text style={{ color: vibe.primary, opacity: 0.6, textAlign: "center", marginBottom: 24, fontFamily: "Inter" }}>
          ZORA uses your camera to verify your age on device. Nothing is uploaded for this check.
        </Text>
        <Button title="Grant camera access" onPress={requestPermission} />
        <Button title="Skip for now" onPress={proceed} variant="ghost" style={{ marginTop: 12 }} textStyle={{ fontSize: 14 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: vibe.background }}>
      <View style={{ padding: 24, alignItems: "center", marginTop: 20 }}>
        <ZoraLogo size={36} />
        <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 20, marginTop: 12 }}>
          Verify your age
        </Text>
        <Text style={{ color: vibe.primary, opacity: 0.6, fontFamily: "Inter", fontSize: 13, marginTop: 4 }}>
          You entered age {enteredAge}. We check it on your device.
        </Text>
      </View>

      <View style={{ flex: 1, marginHorizontal: 24, borderRadius: vibe.cornerRadius, overflow: "hidden", backgroundColor: vibe.secondary }}>
        {!picture ? (
          <View style={{ flex: 1 }}>
            <CameraView ref={cameraRef} facing={facing} style={{ flex: 1 }} />
            <View style={{ position: "absolute", bottom: 24, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around", alignItems: "center" }}>
              <TouchableOpacity onPress={() => setFacing(facing === "front" ? "back" : "front")}>
                <Text style={{ color: "#FFF", fontFamily: "SpaceGrotesk-Bold" }}>Flip</Text>
              </TouchableOpacity>
              <Button title={analyzing ? "Analyzing…" : "Take selfie"} onPress={takePicture} loading={analyzing} />
              <TouchableOpacity onPress={proceed}>
                <Text style={{ color: "#FFF", fontFamily: "SpaceGrotesk-Bold" }}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
            <Avatar uri={picture} size={180} />
            {result && (
              <View style={{ marginTop: 24, alignItems: "center" }}>
                <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 18 }}>
                  You entered {enteredAge}, AI sees {result.range}
                </Text>
                <Text style={{ color: vibe.accent, fontFamily: "Inter", fontSize: 13, marginTop: 6 }}>
                  Confidence: {Math.round(result.confidence * 100)}% (on device)
                </Text>
                <View style={{ marginTop: 24, width: "100%" }}>
                  <Button title="Looks good - continue" onPress={proceed} />
                  <Button title="Retake" onPress={retake} variant="ghost" style={{ marginTop: 12 }} textStyle={{ fontSize: 14 }} />
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Age mismatch modal */}
      <Modal visible={showMismatch} transparent animationType="fade" onRequestClose={() => setShowMismatch(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{ backgroundColor: vibe.secondary, borderRadius: vibe.cornerRadius, padding: 24, width: "100%", maxWidth: 360 }}>
            <Text style={{ color: "#FF0033", fontFamily: "SpaceGrotesk-Bold", fontSize: 20, marginBottom: 8 }}>Age mismatch</Text>
            <Text style={{ color: vibe.primary, opacity: 0.8, fontFamily: "Inter", marginBottom: 20 }}>
              The on-device estimate differs from your entered age by more than 5 years. Please verify again.
            </Text>
            <Button title="Retake selfie" onPress={() => { setShowMismatch(false); retake(); }} />
            <Button title="Continue anyway" onPress={() => { setShowMismatch(false); proceed(); }} variant="ghost" style={{ marginTop: 12 }} textStyle={{ fontSize: 14 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
