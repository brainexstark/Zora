// ============================================================
// GROUP LIST - list groups + create group entry
// ============================================================
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase";
import { Avatar, EmptyState, ZoraLogo, Button } from "@/components/ui";

export default function GroupListScreen() {
  const { vibe } = useTheme();
  const { profile } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);

  async function load() {
    if (!profile?.id) return;
    // Groups I'm a member of + groups I created
    const { data: memberRows } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", profile.id);
    const memberGroupIds = (memberRows || []).map((m) => m.group_id);
    const { data: createdGroups } = await supabase.from("groups").select("*").eq("created_by", profile.id);
    let all = createdGroups || [];
    if (memberGroupIds.length) {
      const { data: memberGroups } = await supabase.from("groups").select("*").in("id", memberGroupIds);
      const map: Record<string, any> = {};
      [...all, ...(memberGroups || [])].forEach((g) => (map[g.id] = g));
      all = Object.values(map);
    }
    setGroups(all);
  }

  useEffect(() => {
    load();
  }, [profile?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: vibe.background }}>
      <View style={{ paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <ZoraLogo size={28} />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: vibe.primary, fontSize: 22 }}>‹</Text>
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 22 }}>Your Tribes</Text>
        <Button title="+ Create" onPress={() => router.push("/group-create")} textStyle={{ fontSize: 13 }} />
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListEmptyComponent={<EmptyState message="No tribes yet. Create one to start a battle." actionLabel="Create Tribe" onAction={() => router.push("/group-create")} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/profile?id=${item.id}`)}
            style={[styles.row, { backgroundColor: vibe.secondary, borderRadius: vibe.cornerRadius }]}
          >
            <Avatar uri={item.avatar_url} size={52} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: vibe.accent, fontFamily: "Inter", fontSize: 12 }}>Tap to open</Text>
            </View>
            <Text style={{ color: vibe.primary, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", padding: 12, marginBottom: 12 },
});
