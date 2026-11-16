// ============================================================
// SEARCH - real profile + post search from Supabase
// ============================================================
import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, Image as RNImage, StyleSheet, Dimensions } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/utils/supabase";
import { Avatar, ThemedInput, ZoraLogo, EmptyState } from "@/components/ui";

const COLS = 3;
const CELL = Dimensions.get("window").width / COLS;

export default function SearchScreen() {
  const { vibe } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [tab, setTab] = useState<"people" | "posts">("people");
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (text: string) => {
    if (!text.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearched(true);
    if (tab === "people") {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, age_group")
        .ilike("username", `%${text.trim()}%`)
        .limit(40);
      setResults(data || []);
    } else {
      const { data } = await supabase
        .from("posts")
        .select("id, media_url, media_type, caption, quest_type")
        .ilike("caption", `%${text.trim()}%`)
        .limit(40);
      setResults(data || []);
    }
  }, [tab]);

  function onChange(text: string) {
    setQuery(text);
    runSearch(text);
  }

  return (
    <View style={{ flex: 1, backgroundColor: vibe.background }}>
      <View style={{ paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <ZoraLogo size={28} />
        </View>
        <ThemedInput placeholder="Search people or posts…" value={query} onChangeText={onChange} />
        <View style={{ flexDirection: "row", marginTop: 12, gap: 12 }}>
          <TouchableOpacity onPress={() => { setTab("people"); runSearch(query); }}>
            <Text style={{ color: tab === "people" ? vibe.accent : vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 15 }}>People</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setTab("posts"); runSearch(query); }}>
            <Text style={{ color: tab === "posts" ? vibe.accent : vibe.primary, fontFamily: "SpaceGrotesk-Bold", fontSize: 15 }}>Posts</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item, i) => item.id || String(i)}
        numColumns={tab === "posts" ? COLS : 1}
        key={tab}
        ListEmptyComponent={searched ? <EmptyState message="No results. Try another search." /> : <EmptyState message="Search for people or posts." />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        renderItem={({ item }) =>
          tab === "people" ? (
            <TouchableOpacity
              onPress={() => router.push(`/profile?id=${item.id}`)}
              style={[styles.personRow, { borderBottomColor: vibe.secondary }]}
            >
              <Avatar uri={item.avatar_url} size={48} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: vibe.primary, fontFamily: "SpaceGrotesk-Bold" }}>{item.username}</Text>
                {item.bio ? <Text style={{ color: vibe.primary, opacity: 0.5, fontFamily: "Inter", fontSize: 13 }} numberOfLines={1}>{item.bio}</Text> : null}
              </View>
              <Text style={{ color: vibe.accent, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.push(`/profile?id=${item.user_id}`)} style={styles.gridCell}>
              <RNImage source={{ uri: item.media_url }} style={styles.gridImage} resizeMode="cover" />
              {item.quest_type === "quest" && (
                <View style={[styles.tag, { backgroundColor: "#00FF88" }]}>
                  <Text style={{ color: "#000", fontSize: 9, fontFamily: "SpaceGrotesk-Bold" }}>QUEST</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  personRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  gridCell: { width: CELL, height: CELL, padding: 1 },
  gridImage: { width: "100%", height: "100%", backgroundColor: "#111" },
  tag: { position: "absolute", top: 4, left: 4, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
});
