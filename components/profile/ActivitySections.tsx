import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";

function formatTimeAgo(dateStr: string): string {
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

interface RecentRead {
  id: string;
  bookId: number;
  bookName: string;
  chapter: number;
  translation: string;
  readAt: string;
}

interface RevisitEntry {
  bookId: number;
  chapter: number;
  bookName: string;
  lastEdited: string;
  excerpt: string;
  layer: string;
  sectionKey: string;
}

interface ActivitySectionsProps {
  recentReads: RecentRead[] | undefined;
  revisitEntries: RevisitEntry[] | undefined;
  theme: typeof Colors.dark;
  isDark: boolean;
  recentActivityTitle: string;
  revisitTitle: string;
  revisitSubtitle: string;
}

const LAYER_DISPLAY: Record<string, string> = { word: "Text", context: "Context", voices: "Insight", application: "Transformation" };

export default function ActivitySections({
  recentReads,
  revisitEntries,
  theme,
  isDark,
  recentActivityTitle,
  revisitTitle,
  revisitSubtitle,
}: ActivitySectionsProps) {
  return (
    <>
      {recentReads && recentReads.length > 0 && (
        <View style={styles.sectionPad}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {recentActivityTitle}
          </Text>
          {recentReads.slice(0, 5).map((read) => (
            <Pressable
              key={read.id}
              onPress={() => router.push(`/read/${read.bookId}/${read.chapter}?translation=${read.translation || "KJV"}`)}
              style={({ pressed }) => [
                styles.activityRow,
                { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.activityIcon, { backgroundColor: theme.accent + "15" }]}>
                <Ionicons name="book" size={16} color={theme.accent} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {read.bookName} {read.chapter}
                </Text>
                <Text style={[styles.activityTime, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {read.readAt ? formatTimeAgo(read.readAt) : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      {revisitEntries && revisitEntries.length > 0 && (
        <>
          <View style={[styles.sectionDivider, { backgroundColor: theme.divider }]} />
          <View style={styles.sectionPad}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              {revisitTitle}
            </Text>
            <Text style={[styles.revisitSubtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {revisitSubtitle}
            </Text>
            {revisitEntries.slice(0, 5).map((entry, i) => (
              <Pressable
                key={`${entry.bookId}-${entry.chapter}-${i}`}
                onPress={() => router.push(`/study?bookId=${entry.bookId}&chapter=${entry.chapter}&tab=${entry.layer}&bookName=${encodeURIComponent(entry.bookName)}` as any)}
                style={({ pressed }) => [
                  styles.revisitRow,
                  { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={[styles.revisitIcon, { backgroundColor: theme.accent + "15" }]}>
                  <Ionicons name="document-text-outline" size={16} color={theme.accent} />
                </View>
                <View style={styles.revisitInfo}>
                  <View style={styles.revisitHeader}>
                    <Text style={[styles.revisitTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                      {entry.bookName} {entry.chapter}
                    </Text>
                    <Text style={[styles.revisitLayer, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                      {LAYER_DISPLAY[entry.layer] || entry.layer}
                    </Text>
                  </View>
                  {entry.excerpt ? (
                    <Text style={[styles.revisitExcerpt, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                      {entry.excerpt}{entry.excerpt.length >= 120 ? "..." : ""}
                    </Text>
                  ) : null}
                  <Text style={[styles.revisitDate, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {entry.lastEdited ? formatTimeAgo(entry.lastEdited) : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionPad: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 22, marginBottom: 14 },
  sectionDivider: {
    height: 1,
    marginHorizontal: 32,
    marginVertical: 8,
    opacity: 0.5,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 6,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 15 },
  activityTime: { fontSize: 12, marginTop: 2, lineHeight: 18 },
  revisitSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 20,
  },
  revisitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 6,
  },
  revisitIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  revisitInfo: { flex: 1 },
  revisitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  revisitTitle: { fontSize: 15 },
  revisitLayer: { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.3 },
  revisitExcerpt: { fontSize: 12, lineHeight: 18, marginBottom: 2 },
  revisitDate: { fontSize: 11, marginTop: 2 },
});
