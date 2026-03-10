import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import ScreenHeader from "@/components/ScreenHeader";

interface Resource {
  id: string;
  title: string;
  slug: string;
  resourceType: string;
  category: string;
  tier: string;
  estimatedMinutes: number | null;
  description: string | null;
  ageGroup: string | null;
}

interface ResourcesResponse {
  items: Resource[];
  total: number;
  page: number;
  totalPages: number;
}

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "sabbath-school", label: "Sabbath School" },
  { key: "family", label: "Family" },
  { key: "prophecy", label: "Prophecy" },
  { key: "doctrine", label: "Doctrine" },
  { key: "spiritual-growth", label: "Growth" },
  { key: "kids", label: "Kids" },
];

const TYPE_LABELS: Record<string, string> = {
  "sabbath-school-companion": "Sabbath School",
  "family-worship": "Family Worship",
  "study-guide": "Study Guide",
  "devotional-series": "Devotional",
  "topical-study": "Topical Study",
};

const TYPE_COLORS: Record<string, string> = {
  "sabbath-school-companion": "#2E7D32",
  "family-worship": "#E65100",
  "study-guide": "#1565C0",
  "devotional-series": "#6A1B9A",
  "topical-study": "#C9933A",
};

function ResourceCard({
  item,
  theme,
}: {
  item: Resource;
  theme: any;
}) {
  const typeLabel = TYPE_LABELS[item.resourceType] || item.resourceType;
  const typeColor = TYPE_COLORS[item.resourceType] || "#C9933A";

  const TYPE_ICONS: Record<string, string> = {
    "sabbath-school-companion": "book",
    "family-worship": "people",
    "study-guide": "document-text",
    "devotional-series": "flame",
    "topical-study": "compass",
  };
  const typeIcon = TYPE_ICONS[item.resourceType] || "library";

  return (
    <Pressable
      onPress={() => router.push(`/resource-detail?slug=${item.slug}` as any)}
      style={({ pressed }) => [
        styles.resourceCard,
        {
          backgroundColor: theme.backgroundCard,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      testID={`resource-card-${item.slug}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${typeLabel}`}
    >
      <View style={[styles.cardAccent, { backgroundColor: typeColor }]} />
      <View style={styles.cardIconContainer}>
        <View style={[styles.cardIconCircle, { backgroundColor: typeColor + "18" }]}>
          <Ionicons name={typeIcon as any} size={18} color={typeColor} />
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + "18" }]}>
            <Text
              style={[styles.typeBadgeText, { color: typeColor, fontFamily: "Inter_600SemiBold" }]}
            >
              {typeLabel}
            </Text>
          </View>
        </View>
        <Text
          style={[styles.cardTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {item.description && (
          <Text
            style={[styles.cardDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}
        <View style={styles.cardFooter}>
          {item.estimatedMinutes && (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={12} color={theme.textMuted} />
              <Text
                style={[styles.metaText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}
              >
                {item.estimatedMinutes} min
              </Text>
            </View>
          )}
          {item.ageGroup && (
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={12} color={theme.textMuted} />
              <Text
                style={[styles.metaText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}
              >
                {item.ageGroup}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
    </Pressable>
  );
}

export default function ResourcesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchText, setSearchText] = useState("");

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const queryParams = new URLSearchParams();
  if (selectedCategory !== "all") queryParams.set("category", selectedCategory);
  if (searchQuery) queryParams.set("search", searchQuery);
  const qs = queryParams.toString();
  const endpoint = `/api/resources${qs ? `?${qs}` : ""}`;

  const { data, isLoading } = useQuery<ResourcesResponse>({
    queryKey: [endpoint],
  });

  const resources = data?.items || [];

  const handleSearch = useCallback(() => {
    setSearchQuery(searchText.trim());
  }, [searchText]);

  const renderItem = useCallback(
    ({ item }: { item: Resource }) => <ResourceCard item={item} theme={theme} />,
    [theme]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Study Resources" testID="resources-header" />

      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <Text style={{ color: theme.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 }}>
          Sabbath School companions, topical studies, and family worship plans rooted in Adventist faith.
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            placeholder="Search resources..."
            placeholderTextColor={theme.textMuted}
            returnKeyType="search"
            style={[styles.searchInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
            testID="resources-search-input"
          />
          {searchText.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchText("");
                setSearchQuery("");
              }}
              hitSlop={8}
              testID="resources-search-clear"
            >
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.chipsContainer}>
        <FlatList
          horizontal
          data={CATEGORIES}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            const isActive = selectedCategory === item.key;
            return (
              <Pressable
                onPress={() => setSelectedCategory(item.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? "#C9933A" : theme.backgroundCard,
                    borderColor: isActive ? "#C9933A" : theme.border,
                  },
                ]}
                testID={`category-chip-${item.key}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isActive ? "#050507" : theme.textSecondary,
                      fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9933A" />
        </View>
      ) : resources.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="library-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
            No Resources Found
          </Text>
          <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {searchQuery
              ? "Try adjusting your search or filters."
              : "Resources will appear here once published."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={resources.length > 0}
          testID="resources-list"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: 44,
  },
  chipsContainer: {
    marginBottom: 8,
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  resourceCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 0,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  cardAccent: {
    width: 3,
    alignSelf: "stretch",
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  cardIconContainer: {
    paddingHorizontal: 12,
  },
  cardIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    gap: 5,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
