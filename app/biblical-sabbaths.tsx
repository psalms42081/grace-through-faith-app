import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { safeGoBack } from "@/lib/safe-back";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GOLD = "#C9933A";
const FILTERS = ["All", "Weekly", "Annual", "Sabbatical & Jubilee"] as const;

type SabbathScripture = {
  id: string;
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  label: string;
  orderIndex: number;
};

type SabbathType = {
  id: string;
  name: string;
  hebrewName: string;
  type: string;
  anchorScripture: string;
  description: string;
  historicalContext: string;
  propheticSignificance: string;
  frequencyDescription: string;
  orderIndex: number;
  scriptures: SabbathScripture[];
};

const BOOK_NAMES: Record<number, string> = {
  1: "Genesis", 2: "Exodus", 3: "Leviticus", 4: "Numbers", 5: "Deuteronomy",
  14: "2 Chronicles", 16: "Nehemiah", 23: "Isaiah", 41: "Mark", 42: "Luke",
  43: "John", 44: "Acts", 45: "Romans", 46: "1 Corinthians", 58: "Hebrews",
};

function formatScriptureRef(s: SabbathScripture): string {
  const book = BOOK_NAMES[s.bookId] || `Book ${s.bookId}`;
  if (s.verseEnd && s.verseEnd !== s.verseStart) {
    return `${book} ${s.chapter}:${s.verseStart}-${s.verseEnd}`;
  }
  return `${book} ${s.chapter}:${s.verseStart}`;
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    weekly: "#2A8B8B",
    annual: "#C9933A",
    sabbatical: "#7B68EE",
    jubilee: "#E06B75",
  };
  const color = colors[type] || GOLD;
  return (
    <View style={[styles.typeBadge, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
      <Text style={[styles.typeBadgeText, { color }]}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Text>
    </View>
  );
}

function SabbathCard({ item, isExpanded, onToggle, onScripturePress }: {
  item: SabbathType;
  isExpanded: boolean;
  onToggle: () => void;
  onScripturePress: (s: SabbathScripture) => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      testID={`sabbath-card-${item.type}`}
      style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: `${GOLD}15` }]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.hebrewName, { color: GOLD, fontFamily: "Lora_700Bold" }]}>
          {item.hebrewName}
        </Text>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          {item.name}
        </Text>
        <View style={styles.cardMeta}>
          <TypeBadge type={item.type} />
          <View style={styles.frequencyBadge}>
            <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
            <Text style={[styles.frequencyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {item.frequencyDescription}
            </Text>
          </View>
        </View>
        <Text style={[styles.anchorRef, { color: GOLD, fontFamily: "Lora_400Regular" }]}>
          {item.anchorScripture}
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {item.description}
        </Text>
      </View>

      {isExpanded && (
        <View style={styles.expandedSection}>
          <View style={[styles.divider, { backgroundColor: `${GOLD}20` }]} />

          <Text style={[styles.sectionLabel, { color: GOLD, fontFamily: "Inter_600SemiBold" }]}>
            Historical Context
          </Text>
          <Text style={[styles.sectionBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {item.historicalContext}
          </Text>

          <Text style={[styles.sectionLabel, { color: GOLD, fontFamily: "Inter_600SemiBold", marginTop: 20 }]}>
            Points to Christ
          </Text>
          <Text style={[styles.sectionBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {item.propheticSignificance}
          </Text>

          <Text style={[styles.sectionLabel, { color: GOLD, fontFamily: "Inter_600SemiBold", marginTop: 20 }]}>
            Scriptures
          </Text>
          <View style={styles.scriptureChips}>
            {item.scriptures.map((s) => (
              <Pressable
                key={s.id}
                testID={`scripture-chip-${s.bookId}-${s.chapter}`}
                onPress={() => onScripturePress(s)}
                style={({ pressed }) => [
                  styles.scriptureChip,
                  { backgroundColor: `${GOLD}12`, borderColor: `${GOLD}30`, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View>
                  <Text style={[styles.chipLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                    {s.label}
                  </Text>
                  <Text style={[styles.chipRef, { color: GOLD, fontFamily: "Lora_400Regular" }]}>
                    {formatScriptureRef(s)}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={14} color={GOLD} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.expandIndicator}>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.textMuted}
        />
      </View>
    </Pressable>
  );
}

export default function BiblicalSabbathsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: sabbathData = [], isLoading, isError, refetch } = useQuery<SabbathType[]>({
    queryKey: ["/api/sabbath-types"],
    staleTime: 1000 * 60 * 30,
  });

  const filteredData = sabbathData.filter((item) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Weekly") return item.type === "weekly";
    if (activeFilter === "Annual") return item.type === "annual";
    if (activeFilter === "Sabbatical & Jubilee") return item.type === "sabbatical" || item.type === "jubilee";
    return true;
  });

  const handleToggle = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleScripturePress = useCallback((s: SabbathScripture) => {
    router.push(`/read/${s.bookId}/${s.chapter}` as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} testID="biblical-sabbaths-screen">
      <View style={[styles.headerBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => safeGoBack(router, "/(tabs)/explore")} hitSlop={12} testID="back-button">
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: `${GOLD}08`, borderColor: `${GOLD}20` }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: `${GOLD}15` }]}>
            <Ionicons name="sunny" size={28} color={GOLD} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            The Biblical Sabbaths
          </Text>
          <Text style={[styles.heroSubtitle, { color: GOLD, fontFamily: "Lora_400Regular" }]}>
            From Creation to Eternity — God's Rhythm of Rest and Restoration
          </Text>
          <Text style={[styles.heroIntro, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            The Bible reveals multiple types of Sabbaths — weekly, annual, sabbatical, and jubilee — each
            one embedded in the fabric of Israel's worship and each one pointing forward to the rest,
            redemption, and restoration found in Christ.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((f) => {
            const isActive = activeFilter === f;
            return (
              <Pressable
                key={f}
                testID={`filter-${f.toLowerCase().replace(/\s+/g, "-")}`}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setActiveFilter(f);
                  setExpandedId(null);
                }}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive ? GOLD : `${GOLD}10`,
                    borderColor: isActive ? GOLD : `${GOLD}30`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isActive ? "#0A0A0A" : theme.textSecondary,
                      fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isError ? (
          <View style={styles.loadingWrap}>
            <Ionicons name="alert-circle-outline" size={32} color={GOLD} style={{ marginBottom: 12 }} />
            <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular", marginBottom: 12 }]}>
              Failed to load sabbath types.
            </Text>
            <Pressable
              onPress={() => refetch()}
              style={[styles.retryBtn, { borderColor: `${GOLD}40` }]}
            >
              <Text style={[styles.retryText, { color: GOLD, fontFamily: "Inter_600SemiBold" }]}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingWrap}>
            <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Loading sabbath types...
            </Text>
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.loadingWrap}>
            <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              No sabbath types found for this filter.
            </Text>
          </View>
        ) : (
          filteredData.map((item) => (
            <SabbathCard
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={() => handleToggle(item.id)}
              onScripturePress={handleScripturePress}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 14,
    fontStyle: "italic",
  },
  heroIntro: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    opacity: 0.85,
  },

  filterRow: { marginBottom: 20 },
  filterContent: { gap: 8, paddingRight: 20 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 13 },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    marginBottom: 14,
  },
  cardHeader: {},
  hebrewName: {
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    marginBottom: 10,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  frequencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  frequencyText: {
    fontSize: 12,
  },
  anchorRef: {
    fontSize: 14,
    marginBottom: 8,
    fontStyle: "italic",
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
  },

  expandedSection: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  scriptureChips: {
    gap: 8,
    marginTop: 4,
  },
  scriptureChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  chipRef: {
    fontSize: 12,
  },

  expandIndicator: {
    alignItems: "center",
    marginTop: 10,
  },

  loadingWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 14,
  },
});
