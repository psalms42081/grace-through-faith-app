import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
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
  collectionId: string | null;
}

interface ProgressItem {
  id: string;
  storyId: string;
  completed: boolean;
  quizScore: number | null;
  memoryVerseMemorized: boolean;
  completedAt: string | null;
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

function useImageBaseUrl() {
  return React.useMemo(() => {
    try { return getApiUrl().replace(/\/$/, ""); } catch { return ""; }
  }, []);
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ProgressBar({
  completed,
  total,
  theme,
}: {
  completed: number;
  total: number;
  theme: any;
}) {
  const progress = useSharedValue(0);
  const fraction = total > 0 ? completed / total : 0;

  React.useEffect(() => {
    progress.value = withTiming(fraction, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [fraction]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.min(progress.value * 100, 100)}%` as any,
  }));

  return (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarTrack, { backgroundColor: theme.border + "80" }]}>
        <Animated.View
          style={[
            styles.progressBarFill,
            { backgroundColor: fraction >= 1 ? (theme.success || "#4CAF50") : theme.accent },
            barStyle,
          ]}
        />
      </View>
      <Text style={[styles.progressBarLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
        {completed}/{total}
      </Text>
    </View>
  );
}

function AnimatedCollectionCard({
  col,
  idx,
  theme,
  baseUrl,
  completedCount,
  onPress,
}: {
  col: Collection;
  idx: number;
  theme: any;
  baseUrl: string;
  completedCount: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const allDone = completedCount >= col.storyCount && col.storyCount > 0;

  return (
    <Animated.View entering={FadeInDown.delay(idx * 80).duration(400).springify()}>
      <AnimatedPressable
        testID={`collection-${idx}`}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.collectionCard,
          { backgroundColor: theme.backgroundCard, borderColor: allDone ? (theme.success || "#4CAF50") + "60" : theme.border },
          animatedStyle,
        ]}
      >
        {col.imageUrl && baseUrl ? (
          <Image
            source={{ uri: `${baseUrl}${col.imageUrl}` }}
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
          <ProgressBar completed={completedCount} total={col.storyCount} theme={theme} />
          {allDone && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={theme.success || "#4CAF50"} />
              <Text style={[styles.completedText, { color: theme.success || "#4CAF50", fontFamily: "Inter_600SemiBold" }]}>
                Complete
              </Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      </AnimatedPressable>
    </Animated.View>
  );
}

function AnimatedStoryCard({
  story,
  idx,
  theme,
  baseUrl,
  onPress,
}: {
  story: Story;
  idx: number;
  theme: any;
  baseUrl: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  return (
    <Animated.View entering={FadeInDown.delay(idx * 70).duration(400).springify()}>
      <AnimatedPressable
        testID={`story-${idx}`}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.storyCard,
          { backgroundColor: theme.backgroundCard, borderColor: theme.border },
          animatedStyle,
        ]}
      >
        {story.imageUrl && baseUrl ? (
          <Image
            source={{ uri: `${baseUrl}${story.imageUrl}` }}
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
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function KidsStoriesScreen() {
  const { theme, isDark } = useTheme(true);
  const insets = useSafeAreaInsets();
  const { ageGroup, setAgeGroup, activeChildProfileId } = useKidsMode();
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const baseUrl = useImageBaseUrl();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const progressUserId = activeChildProfileId || "guest";

  const { data: collections, isLoading: loadingCollections } = useQuery<Collection[]>({
    queryKey: [`/api/kids/collections?ageGroup=${ageGroup}`],
  });

  const { data: stories, isLoading: loadingStories } = useQuery<Story[]>({
    queryKey: [`/api/kids/collections/${selectedCollection?.id}/stories`],
    enabled: !!selectedCollection,
  });

  const { data: progress } = useQuery<ProgressItem[]>({
    queryKey: [`/api/kids/progress?_uid=${progressUserId}`],
  });

  const completedStoryIds = React.useMemo(() => {
    const ids = new Set<string>();
    progress?.forEach((p) => {
      if (p.completed) ids.add(p.storyId);
    });
    return ids;
  }, [progress]);

  const { data: allStories } = useQuery<Story[]>({
    queryKey: [`/api/kids/collections/all/stories?ageGroup=${ageGroup}`],
    enabled: !!collections && collections.length > 0,
  });

  const collectionCompletedCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (!allStories || !collections) return counts;
    collections.forEach((col) => {
      const colStories = allStories.filter(
        (s) => s.collectionId === col.id
      );
      counts[col.id] = colStories.filter((s) =>
        completedStoryIds.has(s.id)
      ).length;
    });
    return counts;
  }, [allStories, collections, completedStoryIds]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Stories
        </Text>
        <View style={styles.ageToggle}>
          <Pressable
            onPress={() => { setAgeGroup("little_lambs"); setSelectedCollection(null); }}
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
            onPress={() => { setAgeGroup("young_disciples"); setSelectedCollection(null); }}
            style={[
              styles.ageBtn,
              { backgroundColor: ageGroup === "young_disciples" ? (theme as any).purple || theme.accent : theme.backgroundCard, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.ageBtnText, { color: ageGroup === "young_disciples" ? "#fff" : theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              Young Disciples
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { setAgeGroup("young_disciples_plus"); setSelectedCollection(null); }}
            style={[
              styles.ageBtn,
              { backgroundColor: ageGroup === "young_disciples_plus" ? "#1565C0" : theme.backgroundCard, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.ageBtnText, { color: ageGroup === "young_disciples_plus" ? "#fff" : theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              Teens
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
                <AnimatedCollectionCard
                  key={col.id}
                  col={col}
                  idx={idx}
                  theme={theme}
                  baseUrl={baseUrl}
                  completedCount={collectionCompletedCounts[col.id] || 0}
                  onPress={() => setSelectedCollection(col)}
                />
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
            {selectedCollection.imageUrl && baseUrl ? (
              <Image
                source={{ uri: `${baseUrl}${selectedCollection.imageUrl}` }}
                style={styles.collectionBanner}
                resizeMode="cover"
              />
            ) : null}
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
                <AnimatedStoryCard
                  key={story.id}
                  story={story}
                  idx={idx}
                  theme={theme}
                  baseUrl={baseUrl}
                  onPress={() => router.push(`/kids/story/${story.id}`)}
                />
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
  ageBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, borderWidth: 1 },
  ageBtnText: { fontSize: 13 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  collectionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  collectionImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: 14,
  },
  collectionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  collectionInfo: { flex: 1 },
  collectionTitle: { fontSize: 17, marginBottom: 3 },
  collectionDesc: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  collectionMeta: { fontSize: 12 },
  storyCountRow: { flexDirection: "row", alignItems: "center" },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressBarLabel: {
    fontSize: 11,
    minWidth: 24,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  completedText: {
    fontSize: 11,
  },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8, marginTop: 4 },
  backText: { fontSize: 14 },
  collectionBanner: {
    width: "100%" as any,
    height: 160,
    borderRadius: 20,
    marginBottom: 12,
  },
  collectionHeading: { fontSize: 24, marginBottom: 4 },
  collectionSubhead: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  storyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  storyThumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginRight: 12,
  },
  storyNumber: {
    width: 48,
    height: 48,
    borderRadius: 14,
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
