import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { KidsColors } from "@/constants/colors";
import { useKidsMode } from "@/context/KidsModeContext";
import { getApiUrl } from "@/lib/query-client";

interface Collection {
  id: string;
  title: string;
  description: string | null;
  ageGroup: string;
  icon: string | null;
  imageUrl: string | null;
  storyCount: number;
  orderIndex: number;
}

interface Story {
  id: string;
  title: string;
  scriptureRef: string | null;
  ageGroup: string;
  orderInCollection: number;
  estimatedMinutes: number;
  memoryVerseRef: string | null;
  imageUrl: string | null;
}

const COLLECTION_ICONS: Record<string, string> = {
  "earth": "earth",
  "shield": "shield",
  "people": "people",
  "heart": "heart",
  "star": "star",
  "book": "book",
  "flower": "flower",
  "sunny": "sunny",
};

export default function KidsStoriesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? KidsColors.dark : KidsColors.light;
  const insets = useSafeAreaInsets();
  const { ageGroup, setAgeGroup } = useKidsMode();
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: collections, isLoading: loadingCollections } = useQuery<Collection[]>({
    queryKey: [`/api/kids/collections?ageGroup=${ageGroup}`],
  });

  const { data: stories, isLoading: loadingStories } = useQuery<Story[]>({
    queryKey: [`/api/kids/collections/${selectedCollection?.id}/stories`],
    enabled: !!selectedCollection,
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Stories
        </Text>
        <View style={styles.ageToggle}>
          <Pressable
            onPress={() => setAgeGroup("little_lambs")}
            style={[
              styles.ageBtn,
              { backgroundColor: ageGroup === "little_lambs" ? theme.accent : theme.backgroundCard, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.ageBtnText, { color: ageGroup === "little_lambs" ? "#fff" : theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              Little Lambs
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setAgeGroup("young_disciples")}
            style={[
              styles.ageBtn,
              { backgroundColor: ageGroup === "young_disciples" ? (theme as any).purple || theme.accent : theme.backgroundCard, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.ageBtnText, { color: ageGroup === "young_disciples" ? "#fff" : theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              Young Disciples
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {!selectedCollection ? (
          <>
            {loadingCollections ? (
              <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
            ) : collections && collections.length > 0 ? (
              collections.map((col, idx) => (
                <Pressable
                  key={col.id}
                  testID={`collection-${idx}`}
                  onPress={() => setSelectedCollection(col)}
                  style={[styles.collectionCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
                >
                  {col.imageUrl ? (
                    <Image
                      source={{ uri: `${getApiUrl().replace(/\/$/, "")}${col.imageUrl}` }}
                      style={styles.collectionImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.collectionIcon, { backgroundColor: theme.accent + "20" }]}>
                      <Ionicons
                        name={(COLLECTION_ICONS[col.icon || "book"] || "book") as any}
                        size={28}
                        color={theme.accent}
                      />
                    </View>
                  )}
                  <View style={styles.collectionInfo}>
                    <Text style={[styles.collectionTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                      {col.title}
                    </Text>
                    {col.description && (
                      <Text style={[styles.collectionDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                        {col.description}
                      </Text>
                    )}
                    <Text style={[styles.collectionMeta, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                      {col.storyCount} stories
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={48} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                  No stories available yet
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Pressable
              onPress={() => setSelectedCollection(null)}
              style={styles.backRow}
              testID="back-to-collections"
            >
              <Ionicons name="chevron-back" size={16} color={theme.accent} />
              <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                All Collections
              </Text>
            </Pressable>
            {selectedCollection.imageUrl && (
              <Image
                source={{ uri: `${getApiUrl().replace(/\/$/, "")}${selectedCollection.imageUrl}` }}
                style={styles.collectionBanner}
                resizeMode="cover"
              />
            )}
            <Text style={[styles.collectionHeading, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              {selectedCollection.title}
            </Text>
            {selectedCollection.description && (
              <Text style={[styles.collectionSubhead, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {selectedCollection.description}
              </Text>
            )}

            {loadingStories ? (
              <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 20 }} />
            ) : stories && stories.length > 0 ? (
              stories.map((story, idx) => (
                <Pressable
                  key={story.id}
                  testID={`story-${idx}`}
                  onPress={() => router.push(`/kids-story/${story.id}`)}
                  style={[styles.storyCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
                >
                  {story.imageUrl ? (
                    <Image
                      source={{ uri: `${getApiUrl().replace(/\/$/, "")}${story.imageUrl}` }}
                      style={styles.storyThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.storyNumber, { backgroundColor: theme.accent }]}>
                      <Text style={[styles.storyNumberText, { fontFamily: "Inter_700Bold" }]}>
                        {story.orderInCollection}
                      </Text>
                    </View>
                  )}
                  <View style={styles.storyInfo}>
                    <Text style={[styles.storyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                      {story.title}
                    </Text>
                    {story.scriptureRef && (
                      <Text style={[styles.storyRef, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                        {story.scriptureRef}
                      </Text>
                    )}
                    <View style={styles.storyMeta}>
                      <Ionicons name="time-outline" size={12} color={theme.textMuted} />
                      <Text style={[styles.storyMetaText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        ~{story.estimatedMinutes} min
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                  No stories in this collection yet
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, marginBottom: 12 },
  ageToggle: { flexDirection: "row", gap: 8 },
  ageBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  ageBtnText: { fontSize: 13 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  collectionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  collectionImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    marginRight: 14,
  },
  collectionIcon: {
    width: 72,
    height: 72,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  collectionInfo: { flex: 1 },
  collectionTitle: { fontSize: 17, marginBottom: 3 },
  collectionDesc: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  collectionMeta: { fontSize: 12 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8, marginTop: 4 },
  backText: { fontSize: 14 },
  collectionBanner: {
    width: "100%" as any,
    height: 160,
    borderRadius: 14,
    marginBottom: 12,
  },
  collectionHeading: { fontSize: 24, marginBottom: 4 },
  collectionSubhead: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  storyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  storyThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
  },
  storyNumber: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  storyNumberText: { color: "#fff", fontSize: 14 },
  storyInfo: { flex: 1 },
  storyTitle: { fontSize: 15, marginBottom: 2 },
  storyRef: { fontSize: 12, marginBottom: 4 },
  storyMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  storyMetaText: { fontSize: 11 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
