// ============================================================
// CHAT - realtime messaging + Twin draft suggestions
// ============================================================
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image as RNImage,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, getCurrentUserId } from "@/utils/supabase";
import { generateTwinDraft, isTwinTrained, initTwinModel } from "@/utils/twinEngine";
import { Avatar } from "@/components/ui";

export default function ChatScreen() {
  const { vibe } = useTheme();
  const { profile } = useAuth();
  const { id, other } = useLocalSearchParams<{ id: string; other: string }>();
  const conversationId = id;
  const otherId = other;

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [twinDraft, setTwinDraft] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [trained, setTrained] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      setMyId(uid);
      await initTwinModel();
      setTrained(await isTwinTrained());
      if (otherId) {
        const { data } = await supabase.from("profiles").select("id, username, avatar_url").eq("id", otherId).single();
        setOtherProfile(data);
      }
    })();
  }, [otherId]);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, twin_draft, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
    if (!conversationId) return;

    // Realtime: listen for new messages in this conversation
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, loadMessages]);

  async function send(content: string, isTwin = false) {
    if (!content.trim() || !conversationId || !profile?.id) return;
    setText("");
    setTwinDraft(null);
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: profile.id,
      content: content.trim(),
      twin_draft: isTwin,
    });
    // optimistic: realtime will add it, but add now too in case
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, sender_id: profile.id, content: content.trim(), created_at: new Date().toISOString(), twin_draft: isTwin }]);
  }

  async function suggestDraft() {
    if (!trained) {
      setTwinDraft("Train your Twin in the AI Hub first.");
      return;
    }
    setGenerating(true);
    try {
      const incoming = messages.filter((m) => m.sender_id !== profile?.id).slice(-1)[0]?.content || "hey";
      const d = await generateTwinDraft(incoming);
      setTwinDraft(d);
    } finally {
      setGenerating(false);
    }
  }

  function renderBubble(item: any) {
    const mine = item.sender_id === myId;
    return (
      <View style={[styles.bubbleWrap, { alignItems: mine ? "flex-end" : "flex-start" }]}>
        {!mine && <Avatar uri={otherProfile?.avatar_url ?? null} size={28} />}
        <View style={[styles.bubble, { backgroundColor: mine ? vibe.accent : vibe.secondary, borderRadius: vibe.cornerRadius, marginLeft: mine ? 0 : 8 }]}>
          <Text style={{ color: mine ? "#000" : "#FFF", fontFamily: "Inter", fontSize: 15 }}>
            {item.content}
          </Text>
          {item.twin_draft && <Text style={{ color: mine ? "#000" : "#00FF88", fontSize: 9, marginTop: 2 }}>twin</Text>}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: vibe.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Text style={{ color: vibe.primary, fontSize: 22 }}>‹</Text>
        </TouchableOpacity>
        <Avatar uri={otherProfile?.avatar_url ?? null} size={36} />
        <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold", marginLeft: 10 }}>{otherProfile?.username || "Chat"}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => renderBubble(item)}
        ListEmptyComponent={<Text style={{ color: vibe.primary, opacity: 0.4, textAlign: "center", marginTop: 40 }}>Say hello 👋</Text>}
      />

      {/* Twin suggestion */}
      {twinDraft && (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <View style={[styles.twinBox, { backgroundColor: vibe.secondary, borderRadius: vibe.cornerRadius }]}>
            <Text style={{ color: "#00FF88", fontSize: 11, fontFamily: "Inter" }}>Twin suggests:</Text>
            <Text style={{ color: vibe.primary, fontFamily: "Inter", fontSize: 14, marginTop: 4 }}>"{twinDraft}"</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity onPress={() => send(twinDraft, true)} style={[styles.twinBtn, { backgroundColor: "#00FF88" }]}>
                <Text style={{ color: "#000", fontFamily: "SpaceGrotesk-Bold", fontSize: 12 }}>Approve & Send</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTwinDraft(null)} style={[styles.twinBtn, { borderColor: "#666", borderWidth: 1 }]}>
                <Text style={{ color: "#999", fontFamily: "Inter", fontSize: 12 }}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.inputRow, { paddingBottom: 6 }]}>
        <TouchableOpacity onPress={suggestDraft} style={{ paddingHorizontal: 6 }}>
          <Text style={{ color: generating ? "#666" : "#00FF88", fontSize: 18 }}>✦</Text>
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message…"
          placeholderTextColor="#888"
          style={[styles.input, { backgroundColor: vibe.secondary, color: "#FFF", borderRadius: vibe.cornerRadius }]}
          onSubmitEditing={() => send(text)}
        />
        <TouchableOpacity onPress={() => send(text)} style={styles.sendBtn}>
          <Text style={{ color: vibe.accent, fontFamily: "SpaceGrotesk-Bold", fontSize: 15 }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  bubbleWrap: { flexDirection: "row", marginBottom: 10, maxWidth: "80%" },
  bubble: { paddingVertical: 10, paddingHorizontal: 14, maxWidth: "100%" },
  twinBox: { padding: 12 },
  twinBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderTopColor: "#222", borderTopWidth: 1 },
  input: { flex: 1, paddingVertical: 10, paddingHorizontal: 14, fontSize: 15 },
  sendBtn: { paddingHorizontal: 10, paddingVertical: 10 },
});
