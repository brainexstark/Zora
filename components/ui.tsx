// ============================================================
// ZORA UI KIT - themed primitives powered by the Vibe Engine
// ============================================================
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Image as RNImage,
  ImageSourcePropType,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

/* ---------- ZORA Logo (Greek Z with glitch effect) ---------- */
export function ZoraLogo({ size = 48, subtitle }: { size?: number; subtitle?: string }) {
  const glitch = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glitch, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(glitch, { toValue: 0, duration: 1200, useNativeDriver: true }),
        Animated.timing(glitch, { toValue: -1, duration: 50, useNativeDriver: true }),
        Animated.timing(glitch, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glitch]);

  const translateX = glitch.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] });

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ position: "relative", height: size, width: size * 0.7, justifyContent: "center" }}>
        <Animated.Text
          style={[
            styles.logoText,
            { fontSize: size, color: "#FF0033", opacity: 0.5, transform: [{ translateX }] },
            { position: "absolute", top: 0, left: 0 },
          ]}
        >
          Ζ
        </Animated.Text>
        <Animated.Text
          style={[
            styles.logoText,
            { fontSize: size, color: "#00FF88", opacity: 0.4, transform: [{ translateX: glitch.interpolate({ inputRange: [-1, 1], outputRange: [4, -4] }) }] },
            { position: "absolute", top: 0, left: 0 },
          ]}
        >
          Ζ
        </Animated.Text>
        <Text style={[styles.logoText, { fontSize: size, color: "#FFFFFF" }]}>Ζ</Text>
      </View>
      <Text style={[styles.logoName, { fontSize: size * 0.5 }]}>{subtitle ?? "ZORA"}</Text>
    </View>
  );
}

/* ---------- Themed Card ---------- */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { vibe } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: vibe.secondary, borderRadius: vibe.cornerRadius, padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ---------- Primary Button ---------- */
type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  textStyle,
}: ButtonProps) {
  const { vibe } = useTheme();
  const bg =
    variant === "ghost"
      ? "transparent"
      : variant === "danger"
      ? "#FF0033"
      : vibe.accent;
  const fg = variant === "ghost" ? vibe.primary : "#FFFFFF";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: bg,
          borderRadius: vibe.cornerRadius,
          paddingVertical: 16,
          paddingHorizontal: 24,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.btnText, { color: fg }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

/* ---------- Themed Input ---------- */
export function ThemedInput(props: TextInputProps & { style?: ViewStyle }) {
  const { vibe } = useTheme();
  const { style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor="#888"
      {...rest}
      style={[
        {
          backgroundColor: vibe.secondary,
          color: vibe.primary,
          borderRadius: vibe.cornerRadius,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          fontFamily: "Inter",
        },
        style as any,
      ]}
    />
  );
}

/* ---------- Section Header ---------- */
export function SectionHeader({ title, accent }: { title: string; accent?: string }) {
  const { vibe } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 12 }}>
      <Text style={[styles.headerText, { color: vibe.primary }]}>{title}</Text>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: accent ?? vibe.accent,
          marginLeft: 8,
        }}
      />
    </View>
  );
}

/* ---------- Empty State ---------- */
export function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { vibe } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
      <Text style={{ color: vibe.primary, fontSize: 16, textAlign: "center", marginBottom: 16, opacity: 0.7 }}>
        {message}
      </Text>
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="primary" />
      )}
    </View>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ uri, size = 44, ring }: { uri: string | null; size?: number; ring?: boolean }) {
  const { vibe } = useTheme();
  if (!uri) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: vibe.secondary,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: ring ? 2 : 0,
          borderColor: vibe.accent,
        }}
      >
        <Text style={{ color: vibe.accent, fontWeight: "700" }}>Ζ</Text>
      </View>
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ring ? 2 : 0,
        borderColor: vibe.accent,
        overflow: "hidden",
      }}
    >
      <RNImage
        source={{ uri } as ImageSourcePropType}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logoText: {
    fontFamily: "SpaceGrotesk-Bold",
    fontWeight: "900",
    textAlign: "center",
  },
  logoName: {
    fontFamily: "SpaceGrotesk-Bold",
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 6,
    marginTop: 4,
  },
  btnText: {
    fontFamily: "SpaceGrotesk-Bold",
    fontWeight: "700",
    fontSize: 15,
  },
  headerText: {
    fontFamily: "SpaceGrotesk-Bold",
    fontWeight: "700",
    fontSize: 22,
  },
});
