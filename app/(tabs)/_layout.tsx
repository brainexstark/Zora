// ============================================================
// TABS LAYOUT - 5 bottom tabs, active color = vibe.accent
// ============================================================
import React from "react";
import { Text } from "react-native";
import { Tabs } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";

export default function TabsLayout() {
  const { vibe } = useTheme();
  const barColor = vibe.background;
  const inactive = "#666";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: vibe.accent,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: {
          backgroundColor: barColor,
          borderTopColor: vibe.secondary,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontFamily: "Inter", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color }) => <Glyph color={color} char="⌂" /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Search", tabBarIcon: ({ color }) => <Glyph color={color} char="◎" /> }}
      />
      <Tabs.Screen
        name="reels"
        options={{ title: "Reels", tabBarIcon: ({ color }) => <Glyph color={color} char="▶" /> }}
      />
      <Tabs.Screen
        name="vault"
        options={{ title: "Vault", tabBarIcon: ({ color }) => <Glyph color={color} char="▣" /> }}
      />
      <Tabs.Screen
        name="ai-hub"
        options={{ title: "AI Hub", tabBarIcon: ({ color }) => <Glyph color={color} char="✦" /> }}
      />
    </Tabs>
  );
}

function Glyph({ color, char }: { color: string; char: string }) {
  return <Text style={{ color, fontSize: 18 }}>{char}</Text>;
}
