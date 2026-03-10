import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/query-client";
import EmptyState from "@/components/ui/EmptyState";

interface EnrichedNote {
  id: string;
  userId: string;
  verseId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  bookId: number | null;
  chapter: number | null;
  verse: number | null;
  verseText: string | null;
  bookName: string | null;
}

interface EnrichedHighlight {
  id: string;
  userId: string;
  verseId: string;
  color: string;
  createdAt: string;
  bookId: number | null;
  chapter: number | null;
  verse: number | null;
  verseText: string | null;
  bookName: string | null;
}

interface EnrichedBookmark {
  id: string;
  userId: string;
  verseId: string;
  label: string | null;
  createdAt: string;
  bookId: number | null;
  chapter: number | null;
  verse: number | null;
  verseText: string | null;
  bookName: string | null;
}

type TabKey = "notes" | "highlights" | "bookmarks";

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "#FFD700",
  pink: "#FF96C8",
  blue: "#60A5FA",
  green: "#4ADE80",
  purple: "#A78BFA",
  orange: "#FB923C",
};

function formatRef(bookName: string | null, chapter: number | null, verse: number | null): string {
  if (!bookName) return "Unknown";
  if (chapter && verse) return `${bookName} ${chapter}:${verse}`;
  if (chapter) return `${bookName} ${chapter}`;
  return bookName;
}

function formatDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function navigateToVerse(bookId: number | null, chapter: number | null) {
  if (bookId && chapter) {
    router.push(`/read/${bookId}/${chapter}` as any);
  }
}

function NoteItem({ item, theme, isDark }: { item: EnrichedNote; theme: any; isDark: boolean }) {
  return (
    <Pressable
      onPress={() => navigateToVerse(item.bookId, item.chapter)}
      style={({ pressed }) => [
        styles.itemCard,
        { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.itemHeader}>
        <View style={[styles.itemIconWrap, { backgroundColor: "#8B5CF615" }]}>
          <Ionicons name="document-text" size={16} color="#8B5CF6" />
        </View>
        <View style={styles.itemMeta}>
          <Text style={[styles.itemRef, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {formatRef(item.bookName, item.chapter, item.verse)}
          </Text>
          <Text style={[styles.itemDate, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {formatDate(item.updatedAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </View>
      <Text style={[styles.noteContent, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={3}>
        {item.content}
      </Text>
      {item.verseText && (
        <Text style={[styles.versePreview, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
          {item.verseText}
        </Text>
      )}
    </Pressable>
  );
}

function HighlightItem({ item, theme, isDark }: { item: EnrichedHighlight; theme: any; isDark: boolean }) {
  const dotColor = HIGHLIGHT_COLORS[item.color] || HIGHLIGHT_COLORS.yellow;
  return (
    <Pressable
      onPress={() => navigateToVerse(item.bookId, item.chapter)}
      style={({ pressed }) => [
        styles.itemCard,
        { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.itemHeader}>
        <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
        <View style={styles.itemMeta}>
          <Text style={[styles.itemRef, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {formatRef(item.bookName, item.chapter, item.verse)}
          </Text>
          <Text style={[styles.itemDate, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </View>
      {item.verseText && (
        <Text
          style={[
            styles.highlightText,
            { color: theme.text, fontFamily: "Inter_400Regular", backgroundColor: dotColor + "20" },
          ]}
          numberOfLines={3}
        >
          {item.verseText}
        </Text>
      )}
    </Pressable>
  );
}

function BookmarkItem({
  item,
  theme,
  isDark,
  onDelete,
}: {
  item: EnrichedBookmark;
  theme: any;
  isDark: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <Pressable
      onPress={() => navigateToVerse(item.bookId, item.chapter)}
      style={({ pressed }) => [
        styles.itemCard,
        { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.itemHeader}>
        <View style={[styles.itemIconWrap, { backgroundColor: "#2563EB15" }]}>
          <Ionicons name="bookmark" size={16} color="#2563EB" />
        </View>
        <View style={styles.itemMeta}>
          <Text style={[styles.itemRef, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {formatRef(item.bookName, item.chapter, item.verse)}
          </Text>
          <Text style={[styles.itemDate, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            if (Platform.OS === "web") {
              onDelete(item.id);
            } else {
              Alert.alert("Delete Bookmark", "Remove this bookmark?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => onDelete(item.id) },
              ]);
            }
          }}
          hitSlop={12}
        >
          <Ionicons name="trash-outline" size={18} color={theme.error || "#E57373"} />
        </Pressable>
      </View>
      {item.label && (
        <Text style={[styles.bookmarkLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
          {item.label}
        </Text>
      )}
      {item.verseText && (
        <Text style={[styles.versePreview, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
          {item.verseText}
        </Text>
      )}
    </Pressable>
  );
}

export default function LibraryScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("notes");
  const [search, setSearch] = useState("");

  const uid = userId || "guest";

  const { data: notes = [], isLoading: notesLoading } = useQuery<EnrichedNote[]>({
    queryKey: [`/api/notes/${uid}`],
  });

  const { data: highlights = [], isLoading: highlightsLoading } = useQuery<EnrichedHighlight[]>({
    queryKey: [`/api/highlights/${uid}`],
  });

  const { data: bookmarks = [], isLoading: bookmarksLoading } = useQuery<EnrichedBookmark[]>({
    queryKey: [`/api/bookmarks/${uid}`],
  });

  const deleteBookmark = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/bookmarks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/${uid}`] });
    },
  });

  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter(
      (n) =>
        n.content?.toLowerCase().includes(q) ||
        n.bookName?.toLowerCase().includes(q) ||
        n.verseText?.toLowerCase().includes(q)
    );
  }, [notes, search]);

  const filteredHighlights = useMemo(() => {
    if (!search.trim()) return highlights;
    const q = search.toLowerCase();
    return highlights.filter(
      (h) =>
        h.bookName?.toLowerCase().includes(q) ||
        h.verseText?.toLowerCase().includes(q) ||
        h.color?.toLowerCase().includes(q)
    );
  }, [highlights, search]);

  const filteredBookmarks = useMemo(() => {
    if (!search.trim()) return bookmarks;
    const q = search.toLowerCase();
    return bookmarks.filter(
      (b) =>
        b.label?.toLowerCase().includes(q) ||
        b.bookName?.toLowerCase().includes(q) ||
        b.verseText?.toLowerCase().includes(q)
    );
  }, [bookmarks, search]);

  const highlightsByColor = useMemo(() => {
    const groups: Record<string, EnrichedHighlight[]> = {};
    for (const h of filteredHighlights) {
      const c = h.color || "yellow";
      if (!groups[c]) groups[c] = [];
      groups[c].push(h);
    }
    return groups;
  }, [filteredHighlights]);

  const isLoading =
    activeTab === "notes" ? notesLoading : activeTab === "highlights" ? highlightsLoading : bookmarksLoading;

  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; count: number }[] = [
    { key: "notes", label: "Notes", icon: "document-text", count: notes.length },
    { key: "highlights", label: "Highlights", icon: "color-fill", count: highlights.length },
    { key: "bookmarks", label: "Bookmarks", icon: "bookmark", count: bookmarks.length },
  ];

  const renderEmptyState = () => {
    const config = {
      notes: { icon: "document-text-outline" as const, title: "No Notes Yet", description: "Start capturing your insights. Tap any verse while reading to add a note.", actionLabel: "Open Bible", onAction: () => router.push("/(tabs)/read" as any) },
      highlights: { icon: "color-fill-outline" as const, title: "No Highlights Yet", description: "Long-press any verse while reading to highlight it. Your highlights will appear here.", actionLabel: "Open Bible", onAction: () => router.push("/(tabs)/read" as any) },
      bookmarks: { icon: "bookmark-outline" as const, title: "No Bookmarks Yet", description: "Bookmark verses while reading to save them for later reference.", actionLabel: "Open Bible", onAction: () => router.push("/(tabs)/read" as any) },
    };
    const c = config[activeTab];
    return (
      <EmptyState
        icon={c.icon}
        title={c.title}
        description={c.description}
        actionLabel={c.actionLabel}
        onAction={c.onAction}
      />
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Saved",
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitleStyle: { fontFamily: "Lora_700Bold" },
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setActiveTab(tab.key);
                  setSearch("");
                }}
                style={[
                  styles.tab,
                  active && { borderBottomColor: theme.accent, borderBottomWidth: 2 },
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={active ? theme.accent : theme.textMuted}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: active ? theme.accent : theme.textMuted,
                      fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: active ? theme.accent : theme.textMuted + "30" }]}>
                    <Text style={[styles.tabBadgeText, { color: active ? "#fff" : theme.textMuted }]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.searchBar, { backgroundColor: isDark ? theme.backgroundCard : "#F5F0E6" }]}>
          <Ionicons name="search" size={16} color={theme.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${activeTab}...`}
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </Pressable>
          )}
        </View>

        {isLoading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Loading...</Text>
          </View>
        ) : activeTab === "notes" ? (
          <FlatList
            data={filteredNotes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <NoteItem item={item} theme={theme} isDark={isDark} />}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
            ListEmptyComponent={renderEmptyState}
            scrollEnabled={filteredNotes.length > 0}
          />
        ) : activeTab === "highlights" ? (
          <FlatList
            data={filteredHighlights}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <HighlightItem item={item} theme={theme} isDark={isDark} />}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
            ListEmptyComponent={renderEmptyState}
            scrollEnabled={filteredHighlights.length > 0}
          />
        ) : (
          <FlatList
            data={filteredBookmarks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BookmarkItem item={item} theme={theme} isDark={isDark} onDelete={(id) => deleteBookmark.mutate(id)} />
            )}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
            ListEmptyComponent={renderEmptyState}
            scrollEnabled={filteredBookmarks.length > 0}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontSize: 13,
  },
  tabBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  tabBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  itemCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 10,
  },
  itemMeta: {
    flex: 1,
  },
  itemRef: {
    fontSize: 14,
  },
  itemDate: {
    fontSize: 11,
    marginTop: 1,
  },
  noteContent: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  versePreview: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    fontStyle: "italic",
  },
  highlightText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bookmarkLabel: {
    fontSize: 13,
    marginTop: 6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },
});
