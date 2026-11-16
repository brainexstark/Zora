// ============================================================
// CHAT LIST - conversations + entry to groups
// ============================================================
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, getCurrentUserId } from "@/utils/supabase";
import { Avatar, EmptyState, ZoraLogo, Button } from "@/components/ui";

export default function ChatListScreen() {
  const { vibe } = useTheme();
  const { profile } = useAuth();
  const [convos, setConvos] = useState<any[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [people, setPeople] = useState<any[]>([]);

  async function load() {
    const uid = profile?.id || (await getCurrentUserId());
    setMyId(uid);
    if (!uid) return;
    // Recent conversations with last message
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .order("created_at", { ascending: false });
    // group by conversation_id, take latest per convo, exclude conversations where I only sent
    const byConvo: Record<string, any> = {};
    for (const m of msgs || []) {
      if (!byConvo[m.conversation_id]) byConvo[m.conversation_id] = m;
    }
    const convoIds = Object.keys(byConvo);
    // For each convo, find the "other" person (a sender that isn't me)
    const others: any[] = [];
    for (const cid of convoIds) {
      const m = byConvo[cid];
      const otherId = m.sender_id === uid ? null : m.sender_id;
      others.push({ conversation_id: cid, lastMessage: m.content, lastTime: m.created_at, otherId });
    }
    // Resolve other user profiles
    const needIds = others.map((o) => o.otherId).filter(Boolean) as string[];
    if (needIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", needIds);
      const map: Record<string, any> = {};
      for (const p of profs || []) map[p.id] = p;
      others.forEach((o) => { if (o.otherId) o.profile = map[o.otherId]; });
    }
    // DMs that I started but no reply yet — load a few people to start new chats
    const { data: allPeople } = await supabase.from("profiles").select("id, username, avatar_url, age_group").neq("id", uid).limit(20);
    setPeople(allPeople || []);
    setConvos(others);
  }

  useEffect(() => {
    load();
  }, [profile?.id]);

  async function startChat(otherId: string) {
    // Create a conversation then go to it
    const { data: convo } = await supabase.from("conversations").insert({ is_group: false }).select().single();
    if (!convo) return;
    router.push(`/chat?id=${convo.id}&other=${otherId}`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: vibe.background }}>
      <View style={{ paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <ZoraLogo size={28} />
        <TouchableOpacity onPress={() => router.push("/group-list")}>
          <Text style={{ color: vibe.accent, fontFamily: "SpaceGrotesk-Bold", fontSize: 14 }}>Groups</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={convos}
        keyExtractor={(item) => item.conversation_id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        ListEmptyComponent={<EmptyState message="No conversations yet. Start one below." />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/chat?id=${item.conversation_id}&other=${item.otherId || ""}`)}
            style={[styles.row, { borderBottomColor: vibe.secondary }]}
          >
            <Avatar uri={item.profile?.avatar_url ?? null} size={48} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold" }}>{item.profile?.username || "New chat"}</Text>
              <Text style={{ color: vibe.primary, opacity: 0.5, fontFamily: "Inter", fontSize: 13 }} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View style={{ marginTop: 20 }}>
            <Text style={{ color: vibe.primary, opacity: 0.4, fontFamily: "SpaceGrotesk-Bold", fontSize: 13, marginBottom: 8 }}>Start a new chat</Text>
            {people.map((p) => (
              <TouchableOpacity key={p.id} onPress={() => startChat(p.id)} style={[styles.row, { borderBottomColor: vibe.secondary }]}>
                <Avatar uri={p.avatar_url} size={40} />
                <Text style={{ color: vibe.primary, marginLeft: 12, fontFamily: "Inter" }}>{p.username}</Text>
              </TouchableOpacity>
            ))}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
});
