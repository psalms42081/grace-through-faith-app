import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Animated as RNAnimated,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { navigateToScriptureByParts } from "@/lib/scripture-nav";

const GOLD = "#C9933A";

interface DevotionalPlan {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  theme: string | null;
  category: string | null;
  targetGoals: string[] | null;
  difficultyLevel: string | null;
  estimatedMinutesPerDay: number | null;
  isPublished: boolean;
}

const DEVOTIONAL_THEME_GRADIENTS: Record<string, [string, string]> = {
  "Character Studies": ["#8B5CF6", "#5B2EA6"],
  "Kingdom of God": ["#C9933A", "#8A6420"],
  "Core Doctrines": ["#3B6CB5", "#1A3A6E"],
  "Spiritual Growth": ["#4ECCA3", "#2E8B6E"],
  "Christian Living": ["#E8456B", "#A02040"],
  "Prayer Life": ["#6366F1", "#4338CA"],
  "Biblical Wisdom": ["#F59E0B", "#B45309"],
  "God's Love": ["#EC4899", "#BE185D"],
  "End Times": ["#DC2626", "#991B1B"],
  "Prophetic Hope": ["#7C3AED", "#5B21B6"],
};

interface OdbDevotional {
  id: number;
  title: string;
  date: string;
  author: string;
  verse: string;
  verseRef: string;
  passage: string;
  content: string;
  thought: string;
  response: string;
  insights: string;
  bibleInAYear: string;
  url: string;
  imageUrl: string | null;
}

interface ReadingPlan {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  coverImageUrl: string | null;
  durationDays: number;
  type: string;
  status: string;
}

interface PlanDay {
  id: string;
  planId: string;
  dayNumber: number;
  bookId: number | null;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
  completedAt: string | null;
}

interface PlanDetail extends ReadingPlan {
  days: PlanDay[];
}

interface UserPlan {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  currentDay: number;
  completedAt: string | null;
  notificationTime: string | null;
  createdAt: string;
  planTitle: string;
  planDescription: string | null;
  planCategory: string | null;
  planCoverImageUrl: string | null;
  planDurationDays: number;
  planType: string;
  planStatus: string;
}

interface BibleBook {
  id: number;
  name: string;
  abbreviation: string;
  testament: string;
  chapterCount: number;
  orderIndex: number;
}

const TABS = ["Discover", "My Plans", "Today"] as const;
type Tab = (typeof TABS)[number];

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Spiritual Growth": "trending-up",
  "Mental Health": "heart",
  "Identity": "person",
  "Relationships": "people",
  "Young Disciples": "flash",
  "Seasonal": "calendar",
  "Custom": "create",
};

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  "Spiritual Growth": ["#3B6CB5", "#1A3A6E"],
  "Mental Health": ["#4ECCA3", "#2E8B6E"],
  "Identity": ["#8B5CF6", "#5B2EA6"],
  "Relationships": ["#E8456B", "#A02040"],
  "Young Disciples": ["#FF6B35", "#C04A20"],
  "Seasonal": ["#C9933A", "#8A6420"],
  "Custom": ["#5B8DEF", "#3060B0"],
};

function getBookName(books: BibleBook[] | undefined, bookId: number | null): string {
  if (!bookId || !books) return "";
  const book = books.find((b) => b.id === bookId);
  return book?.name ?? `Book ${bookId}`;
}

function formatScriptureRef(
  books: BibleBook[] | undefined,
  day: PlanDay
): string {
  const name = getBookName(books, day.bookId);
  if (!name || !day.chapter) return `Day ${day.dayNumber}`;
  let ref = `${name} ${day.chapter}`;
  if (day.verseStart && day.verseEnd) {
    ref += `:${day.verseStart}-${day.verseEnd}`;
  } else if (day.verseStart) {
    ref += `:${day.verseStart}`;
  }
  return ref;
}

function ProgressRing({
  progress,
  size = 56,
  strokeWidth = 5,
  color = GOLD,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1));
  const pct = Math.round(Math.min(progress, 1) * 100);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <Text
        style={{
          position: "absolute",
          fontSize: 13,
          fontFamily: "Inter_600SemiBold",
          color: "#fff",
        }}
      >
        {pct}%
      </Text>
    </View>
  );
}

export default function PlansScreen() {
  const { theme, isDark } = useTheme();
  const { userId, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [activeTab, setActiveTab] = useState<Tab>("Discover");
  const [detailPlanId, setDetailPlanId] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showCustomSheet, setShowCustomSheet] = useState(false);
  const [customBookId, setCustomBookId] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState(7);

  const detailSlide = useRef(new RNAnimated.Value(0)).current;
  const addSlide = useRef(new RNAnimated.Value(0)).current;
  const customSlide = useRef(new RNAnimated.Value(0)).current;

  const { data: plans } = useQuery<ReadingPlan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: planDetail } = useQuery<PlanDetail>({
    queryKey: ["/api/plans", detailPlanId],
    enabled: !!detailPlanId,
  });

  const { data: userPlans, refetch: refetchUserPlans } = useQuery<UserPlan[]>({
    queryKey: ["/api/user-plans"],
    enabled: !!userId,
  });

  const { data: books } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  const { data: devotionalPlans } = useQuery<DevotionalPlan[]>({
    queryKey: ["/api/devotionals/plans"],
  });

  const { data: odbRecent } = useQuery<OdbDevotional[]>({
    queryKey: ["/api/odb/recent?count=7"],
    staleTime: 10 * 60 * 1000,
    refetchOnMount: true,
  });

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["/api/user-plans"] });
    qc.invalidateQueries({ queryKey: ["/api/plans"] });
    qc.invalidateQueries({ queryKey: ["/api/spiritual-rings"] });
  }, [qc]);

  const enrollMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest("POST", "/api/user-plans", { planId });
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      closeDetail();
      setActiveTab("My Plans");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message.includes("409") ? "You're already enrolled in this plan." : "Failed to start plan.");
    },
  });

  const dayCompleteMutation = useMutation({
    mutationFn: async ({ enrollmentId, day }: { enrollmentId: string; day: number }) => {
      const res = await apiRequest("PATCH", `/api/user-plans/${enrollmentId}/day/${day}`);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const customPlanMutation = useMutation({
    mutationFn: async ({ bookId, durationDays }: { bookId: number; durationDays: number }) => {
      const res = await apiRequest("POST", "/api/plans/custom", { bookId, durationDays });
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      closeCustom();
      setActiveTab("My Plans");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert("Error", "Failed to create custom plan.");
    },
  });

  const openDetail = useCallback((id: string) => {
    setDetailPlanId(id);
    RNAnimated.spring(detailSlide, {
      toValue: 1,
      damping: 20,
      stiffness: 120,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [detailSlide]);

  const closeDetail = useCallback(() => {
    RNAnimated.timing(detailSlide, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDetailPlanId(null));
  }, [detailSlide]);

  const openAdd = useCallback(() => {
    setShowAddSheet(true);
    RNAnimated.spring(addSlide, {
      toValue: 1,
      damping: 20,
      stiffness: 120,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [addSlide]);

  const closeAdd = useCallback(() => {
    RNAnimated.timing(addSlide, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowAddSheet(false));
  }, [addSlide]);

  const openCustom = useCallback(() => {
    closeAdd();
    setTimeout(() => {
      setShowCustomSheet(true);
      RNAnimated.spring(customSlide, {
        toValue: 1,
        damping: 20,
        stiffness: 120,
        useNativeDriver: true,
      }).start();
    }, 250);
  }, [customSlide, closeAdd]);

  const closeCustom = useCallback(() => {
    RNAnimated.timing(customSlide, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowCustomSheet(false);
      setCustomBookId(null);
      setCustomDuration(7);
    });
  }, [customSlide]);

  const grouped = useMemo(() => {
    if (!plans) return [];
    const map = new Map<string, ReadingPlan[]>();
    plans.forEach((p) => {
      const cat = p.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    });
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }, [plans]);

  const activePlans = useMemo(
    () => (userPlans || []).filter((p) => !p.completedAt),
    [userPlans]
  );

  const todayItems = useMemo(() => {
    if (!activePlans.length) return [];
    return activePlans.map((up) => ({
      enrollment: up,
      dayNumber: up.currentDay,
    }));
  }, [activePlans]);

  const bg = theme.background;
  const cardBg = isDark ? theme.backgroundCard || "#1A1A1A" : "#FFFDF6";

  return (
    <View style={[st.container, { backgroundColor: bg }]}>
      <View style={[st.header, { paddingTop: topPad + 12 }]}>
        <Text style={[st.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Plans
        </Text>
        <View style={st.tabRow}>
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                st.tab,
                activeTab === tab && { backgroundColor: GOLD },
                activeTab !== tab && { backgroundColor: isDark ? "#1A1A1A" : "#F0EBE0" },
              ]}
            >
              <Text
                style={[
                  st.tabText,
                  {
                    color: activeTab === tab ? "#fff" : theme.textSecondary,
                    fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {activeTab === "Discover" && (
        <DiscoverTab
          grouped={grouped}
          books={books}
          theme={theme}
          isDark={isDark}
          bottomPad={bottomPad}
          onPlanPress={openDetail}
          devotionalPlans={devotionalPlans || []}
          odbRecent={odbRecent || []}
        />
      )}

      {activeTab === "My Plans" && (
        <MyPlansTab
          activePlans={activePlans}
          books={books}
          theme={theme}
          isDark={isDark}
          cardBg={cardBg}
          bottomPad={bottomPad}
          onSwitchTab={() => setActiveTab("Discover")}
        />
      )}

      {activeTab === "Today" && (
        <TodayTab
          todayItems={todayItems}
          books={books}
          theme={theme}
          isDark={isDark}
          cardBg={cardBg}
          bottomPad={bottomPad}
          dayCompleteMutation={dayCompleteMutation}
          onSwitchTab={() => setActiveTab("Discover")}
        />
      )}

      {activeTab === "My Plans" && (
        <Pressable
          onPress={openAdd}
          style={({ pressed }) => [
            st.fab,
            { bottom: bottomPad + 100, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="plans-fab"
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      )}

      {detailPlanId && (
        <PlanDetailSheet
          plan={planDetail}
          books={books}
          slide={detailSlide}
          enrolling={enrollMutation.isPending}
          onClose={closeDetail}
          onStart={() => {
            if (!isAuthenticated) {
              Alert.alert(
                "Sign In Required",
                "Create a free account to start reading plans and track your progress.",
                [
                  { text: "Not Now", style: "cancel" },
                  { text: "Sign In", onPress: () => router.push("/(auth)/login") },
                ],
              );
              return;
            }
            enrollMutation.mutate(detailPlanId);
          }}
          theme={theme}
          isDark={isDark}
        />
      )}

      {showAddSheet && (
        <AddPlanSheet
          slide={addSlide}
          onClose={closeAdd}
          onReadyMade={() => {
            closeAdd();
            setActiveTab("Discover");
          }}
          onCustom={openCustom}
          theme={theme}
          isDark={isDark}
        />
      )}

      {showCustomSheet && (
        <CustomPlanSheet
          slide={customSlide}
          books={books}
          selectedBookId={customBookId}
          duration={customDuration}
          creating={customPlanMutation.isPending}
          onSelectBook={setCustomBookId}
          onSelectDuration={setCustomDuration}
          onClose={closeCustom}
          onCreate={() => {
            if (customBookId) {
              customPlanMutation.mutate({ bookId: customBookId, durationDays: customDuration });
            }
          }}
          theme={theme}
          isDark={isDark}
        />
      )}
    </View>
  );
}

function DiscoverTab({
  grouped,
  books,
  theme,
  isDark,
  bottomPad,
  onPlanPress,
  devotionalPlans,
  odbRecent,
}: {
  grouped: { category: string; items: ReadingPlan[] }[];
  books: BibleBook[] | undefined;
  theme: any;
  isDark: boolean;
  bottomPad: number;
  onPlanPress: (id: string) => void;
  devotionalPlans: DevotionalPlan[];
  odbRecent: OdbDevotional[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const categories = useMemo(
    () => ["All", ...grouped.map((g) => g.category)],
    [grouped]
  );

  const allPlans = useMemo(
    () => grouped.flatMap((g) => g.items),
    [grouped]
  );

  const filteredPlans = useMemo(() => {
    let result = allPlans;
    if (selectedTopic) {
      const topic = selectedTopic.toLowerCase();
      result = result.filter(
        (p) =>
          (p.category || "").toLowerCase().includes(topic) ||
          (p.title || "").toLowerCase().includes(topic) ||
          (p.description || "").toLowerCase().includes(topic)
      );
    }
    if (selectedCategory !== "All") {
      result = result.filter((p) => p.category === selectedCategory);
    }
    return result;
  }, [allPlans, selectedTopic, selectedCategory]);

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: bottomPad + 140 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#1A1235", "#0D1B2A", "#050507"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={dt.heroBanner}
      >
        <Text style={[dt.heroLabel, { fontFamily: "Inter_600SemiBold" }]}>READING PLANS</Text>
        <Text style={[dt.heroTitle, { fontFamily: "Lora_700Bold" }]}>Find Your Next Plan</Text>
        <Text style={[dt.heroSubtitle, { fontFamily: "Inter_400Regular" }]}>
          Discover plans for every season of faith
        </Text>
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={dt.topicRow}
      >
        {TOPIC_PILLS.map((topic) => (
          <Pressable
            key={topic.label}
            onPress={() => {
              setSelectedTopic(selectedTopic === topic.label ? null : topic.label);
              setSelectedCategory("All");
            }}
            style={[
              dt.topicPill,
              { backgroundColor: topic.color },
              selectedTopic === topic.label && dt.topicPillSelected,
            ]}
          >
            <Text style={[dt.topicPillText, { fontFamily: "Inter_600SemiBold" }]}>
              {topic.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={dt.categoryRow}
      >
        {categories.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => {
              setSelectedCategory(cat);
              setSelectedTopic(null);
            }}
            style={[
              dt.categoryPill,
              selectedCategory === cat && dt.categoryPillSelected,
            ]}
          >
            <Text
              style={[
                dt.categoryPillText,
                { fontFamily: selectedCategory === cat ? "Inter_600SemiBold" : "Inter_500Medium" },
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={dt.planList}>
        {filteredPlans.map((item) => {
          const grad = CATEGORY_GRADIENTS[item.category || ""] || ["#3B6CB5", "#1A3A6E"];
          return (
            <View key={item.id} style={dt.planRow}>
              {item.coverImageUrl ? (
                <Image
                  source={{ uri: item.coverImageUrl }}
                  style={dt.planCover}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient colors={grad} style={dt.planCover} />
              )}
              <View style={dt.planInfo}>
                <View style={dt.planBadge}>
                  <Text style={[dt.planBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                    {item.durationDays} Days
                  </Text>
                </View>
                <Text style={[dt.planTitle, { fontFamily: "Inter_700Bold" }]} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text style={[dt.planDesc, { fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => onPlanPress(item.id)}
                style={({ pressed }) => [dt.startPill, pressed && { opacity: 0.7 }]}
              >
                <Text style={[dt.startPillText, { fontFamily: "Inter_600SemiBold" }]}>Start</Text>
              </Pressable>
            </View>
          );
        })}
        {filteredPlans.length === 0 && (
          <View style={dt.emptyFilter}>
            <Text style={[dt.emptyFilterText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              No plans match this filter
            </Text>
          </View>
        )}
      </View>

      {devotionalPlans.length > 0 && (
        <View style={dt.devotionalSection}>
          <LinearGradient
            colors={["#1A0A2E", "#0D1B2A", "#050507"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={dt.heroBanner}
          >
            <Text style={[dt.heroLabel, { fontFamily: "Inter_600SemiBold" }]}>DEVOTIONAL PLANS</Text>
            <Text style={[dt.heroTitle, { fontFamily: "Lora_700Bold" }]}>Grow Deeper in Faith</Text>
            <Text style={[dt.heroSubtitle, { fontFamily: "Inter_400Regular" }]}>
              Guided devotionals with Scripture, reflection, and Ellen White insights
            </Text>
          </LinearGradient>

          <View style={dt.planList}>
            {devotionalPlans.map((dp) => {
              const grad = DEVOTIONAL_THEME_GRADIENTS[dp.theme || ""] || ["#6366F1", "#4338CA"];
              return (
                <Pressable
                  key={dp.id}
                  onPress={() => router.push({ pathname: "/devotionals", params: { planId: dp.id } })}
                  style={({ pressed }) => [dt.planRow, pressed && { opacity: 0.8 }]}
                >
                  <LinearGradient colors={grad} style={[dt.planCover, { alignItems: "center", justifyContent: "center" }]}>
                    <Ionicons name="flame" size={24} color="rgba(255,255,255,0.6)" />
                  </LinearGradient>
                  <View style={dt.planInfo}>
                    <View style={[dt.planBadge, { backgroundColor: "#8B5CF6" }]}>
                      <Text style={[dt.planBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                        {dp.totalDays} Days
                      </Text>
                    </View>
                    <Text style={[dt.planTitle, { fontFamily: "Inter_700Bold" }]} numberOfLines={2}>
                      {dp.title}
                    </Text>
                    {dp.theme ? (
                      <Text style={[dt.planDesc, { fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                        {dp.theme}
                      </Text>
                    ) : null}
                  </View>
                  <View style={dt.startPill}>
                    <Text style={[dt.startPillText, { fontFamily: "Inter_600SemiBold" }]}>View</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {odbRecent.length > 0 && (
        <View style={dt.devotionalSection}>
          <LinearGradient
            colors={["#0A2A1A", "#0D1B2A", "#050507"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={dt.heroBanner}
          >
            <Text style={[dt.heroLabel, { fontFamily: "Inter_600SemiBold" }]}>OUR DAILY BREAD</Text>
            <Text style={[dt.heroTitle, { fontFamily: "Lora_700Bold" }]}>Daily Devotionals</Text>
            <Text style={[dt.heroSubtitle, { fontFamily: "Inter_400Regular" }]}>
              Timeless devotional readings from Our Daily Bread
            </Text>
          </LinearGradient>

          <View style={dt.planList}>
            {odbRecent.map((odb) => {
              const dateLabel = (() => {
                try {
                  const d = new Date(odb.date + "T00:00:00");
                  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                } catch {
                  return odb.date;
                }
              })();
              return (
                <Pressable
                  key={odb.id}
                  onPress={() => router.push({ pathname: "/odb-devotional", params: { id: String(odb.id) } })}
                  style={({ pressed }) => [dt.planRow, pressed && { opacity: 0.8 }]}
                >
                  <LinearGradient
                    colors={["#2D6A4F", "#1B4332"]}
                    style={[dt.planCover, { alignItems: "center", justifyContent: "center" }]}
                  >
                    <Ionicons name="sunny-outline" size={24} color="rgba(255,255,255,0.6)" />
                  </LinearGradient>
                  <View style={dt.planInfo}>
                    <View style={[dt.planBadge, { backgroundColor: "#2D6A4F" }]}>
                      <Text style={[dt.planBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                        {dateLabel}
                      </Text>
                    </View>
                    <Text style={[dt.planTitle, { fontFamily: "Inter_700Bold" }]} numberOfLines={2}>
                      {odb.title}
                    </Text>
                    {odb.author ? (
                      <Text style={[dt.planDesc, { fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                        {odb.author}
                      </Text>
                    ) : null}
                  </View>
                  <View style={dt.startPill}>
                    <Text style={[dt.startPillText, { fontFamily: "Inter_600SemiBold" }]}>Read</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function MyPlansTab({
  activePlans,
  books,
  theme,
  isDark,
  cardBg,
  bottomPad,
  onSwitchTab,
}: {
  activePlans: UserPlan[];
  books: BibleBook[] | undefined;
  theme: any;
  isDark: boolean;
  cardBg: string;
  bottomPad: number;
  onSwitchTab: () => void;
}) {
  const qc2 = useQueryClient();
  const planDetails = useMemo(() => {
    const map: Record<string, PlanDetail | undefined> = {};
    activePlans.forEach((up) => {
      const cached = qc2.getQueryData<PlanDetail>(["/api/plans", up.planId]);
      if (cached) map[up.planId] = cached;
    });
    return map;
  }, [activePlans, qc2]);

  if (activePlans.length === 0) {
    return (
      <View style={st.emptyContainer}>
        <View style={[st.emptyIcon, { backgroundColor: GOLD + "15" }]}>
          <Ionicons name="book-outline" size={32} color={GOLD} />
        </View>
        <Text style={[st.emptyTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          No Active Plans
        </Text>
        <Text style={[st.emptySub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Start a reading plan to build a daily Scripture habit
        </Text>
        <Pressable
          onPress={onSwitchTab}
          style={[st.emptyBtn, { backgroundColor: GOLD }]}
        >
          <Text style={[st.emptyBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            Browse Plans
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 140, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {activePlans.map((up) => {
        const progress = up.currentDay / up.planDurationDays;
        const detail = planDetails?.[up.planId];
        const currentDayData = detail?.days?.find((d) => d.dayNumber === up.currentDay);
        const todayRef = currentDayData
          ? formatScriptureRef(books, currentDayData)
          : `Day ${up.currentDay}`;

        return (
          <View key={up.id} style={[st.myPlanCard, { backgroundColor: cardBg }]}>
            <View style={st.myPlanTop}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[st.myPlanTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}
                  numberOfLines={2}
                >
                  {up.planTitle}
                </Text>
                <Text style={[st.myPlanMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Day {up.currentDay} of {up.planDurationDays}
                </Text>
              </View>
              <ProgressRing progress={progress} />
            </View>
            <View style={[st.myPlanDivider, { backgroundColor: theme.border }]} />
            <View style={st.myPlanBottom}>
              <View style={{ flex: 1 }}>
                <Text style={[st.todayLabel, { color: GOLD, fontFamily: "Inter_500Medium" }]}>
                  Today's Reading
                </Text>
                <Text
                  style={[st.todayRef, { color: theme.text, fontFamily: "Inter_400Regular" }]}
                  numberOfLines={1}
                >
                  {todayRef}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (currentDayData?.bookId && currentDayData?.chapter) {
                    navigateToScriptureByParts(
                      currentDayData.bookId,
                      currentDayData.chapter,
                      currentDayData.verseStart || undefined
                    );
                  }
                }}
                style={[st.resumeBtn, { backgroundColor: GOLD }]}
              >
                <Text style={[st.resumeBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Resume
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function TodayTab({
  todayItems,
  books,
  theme,
  isDark,
  cardBg,
  bottomPad,
  dayCompleteMutation,
  onSwitchTab,
}: {
  todayItems: { enrollment: UserPlan; dayNumber: number }[];
  books: BibleBook[] | undefined;
  theme: any;
  isDark: boolean;
  cardBg: string;
  bottomPad: number;
  dayCompleteMutation: any;
  onSwitchTab: () => void;
}) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const rollbackCompletion = useCallback((id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const qc3 = useQueryClient();
  const allDetails = useMemo(() => {
    const map: Record<string, PlanDetail | undefined> = {};
    todayItems.forEach((item) => {
      const cached = qc3.getQueryData<PlanDetail>(["/api/plans", item.enrollment.planId]);
      if (cached) map[item.enrollment.planId] = cached;
    });
    return map;
  }, [todayItems, qc3]);

  if (todayItems.length === 0) {
    return (
      <View style={st.emptyContainer}>
        <View style={[st.emptyIcon, { backgroundColor: GOLD + "15" }]}>
          <Ionicons name="today-outline" size={32} color={GOLD} />
        </View>
        <Text style={[st.emptyTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Nothing for Today
        </Text>
        <Text style={[st.emptySub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Enroll in a reading plan to see daily readings here
        </Text>
        <Pressable
          onPress={onSwitchTab}
          style={[st.emptyBtn, { backgroundColor: GOLD }]}
        >
          <Text style={[st.emptyBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            Discover Plans
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 140, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {todayItems.map((item) => {
        const detail = allDetails?.[item.enrollment.planId];
        const dayData = detail?.days?.find((d) => d.dayNumber === item.dayNumber);
        const ref = dayData ? formatScriptureRef(books, dayData) : `Day ${item.dayNumber}`;
        const isDone = completedIds.has(item.enrollment.id);

        return (
          <View key={item.enrollment.id} style={[st.todayCard, { backgroundColor: cardBg }]}>
            <Pressable
              onPress={() => {
                if (isDone) return;
                const eid = item.enrollment.id;
                setCompletedIds((prev) => new Set(prev).add(eid));
                dayCompleteMutation.mutate(
                  { enrollmentId: eid, day: item.dayNumber },
                  { onError: () => rollbackCompletion(eid) }
                );
              }}
              style={[
                st.checkCircle,
                isDone && { backgroundColor: GOLD, borderColor: GOLD },
                !isDone && { borderColor: theme.textMuted },
              ]}
              testID={`today-check-${item.enrollment.id}`}
            >
              {isDone && <Ionicons name="checkmark" size={16} color="#fff" />}
            </Pressable>
            <Pressable
              onPress={() => {
                if (dayData?.bookId && dayData?.chapter) {
                  navigateToScriptureByParts(
                    dayData.bookId,
                    dayData.chapter,
                    dayData.verseStart || undefined
                  );
                }
              }}
              style={{ flex: 1 }}
            >
              <Text
                style={[
                  st.todayPlanName,
                  { color: theme.textMuted, fontFamily: "Inter_500Medium" },
                ]}
                numberOfLines={1}
              >
                {item.enrollment.planTitle}
              </Text>
              <Text
                style={[
                  st.todayScripture,
                  { color: theme.text, fontFamily: "Inter_600SemiBold" },
                  isDone && { textDecorationLine: "line-through", opacity: 0.5 },
                ]}
                numberOfLines={1}
              >
                {ref}
              </Text>
              <Text
                style={[st.todayDayLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}
              >
                Day {item.dayNumber} of {item.enrollment.planDurationDays}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

function PlanDetailSheet({
  plan,
  books,
  slide,
  enrolling,
  onClose,
  onStart,
  theme,
  isDark,
}: {
  plan: PlanDetail | undefined;
  books: BibleBook[] | undefined;
  slide: RNAnimated.Value;
  enrolling: boolean;
  onClose: () => void;
  onStart: () => void;
  theme: any;
  isDark: boolean;
}) {
  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });
  const backdropOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });
  const cardBg = isDark ? "#1A1A1A" : "#FFFDF6";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <RNAnimated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </RNAnimated.View>
      <RNAnimated.View
        style={[
          st.detailSheet,
          { backgroundColor: cardBg, transform: [{ translateY }] },
        ]}
      >
        <View style={st.sheetHandle} />
        {!plan ? (
          <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <Text
              style={[st.detailTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}
            >
              {plan.title}
            </Text>
            <View style={st.detailMeta}>
              <View style={[st.detailBadge, { backgroundColor: GOLD + "20" }]}>
                <Ionicons name="calendar" size={14} color={GOLD} />
                <Text style={[st.detailBadgeText, { color: GOLD, fontFamily: "Inter_500Medium" }]}>
                  {plan.durationDays} days
                </Text>
              </View>
              {plan.category && (
                <View style={[st.detailBadge, { backgroundColor: GOLD + "20" }]}>
                  <Ionicons
                    name={CATEGORY_ICONS[plan.category] || "library"}
                    size={14}
                    color={GOLD}
                  />
                  <Text style={[st.detailBadgeText, { color: GOLD, fontFamily: "Inter_500Medium" }]}>
                    {plan.category}
                  </Text>
                </View>
              )}
            </View>
            {plan.description && (
              <Text style={[st.detailDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {plan.description}
              </Text>
            )}
            <Text style={[st.dayListTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Daily Readings
            </Text>
            {plan.days.map((day) => (
              <View key={day.id} style={[st.dayRow, { borderBottomColor: theme.border }]}>
                <View style={[st.dayNum, { backgroundColor: GOLD + "15" }]}>
                  <Text style={[st.dayNumText, { color: GOLD, fontFamily: "Inter_600SemiBold" }]}>
                    {day.dayNumber}
                  </Text>
                </View>
                <Text style={[st.dayRef, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                  {formatScriptureRef(books, day)}
                </Text>
              </View>
            ))}
            <Pressable
              onPress={onStart}
              disabled={enrolling}
              style={[st.startBtn, { backgroundColor: GOLD, opacity: enrolling ? 0.7 : 1 }]}
              testID="plan-start-btn"
            >
              {enrolling ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[st.startBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Start Plan
                </Text>
              )}
            </Pressable>
          </ScrollView>
        )}
      </RNAnimated.View>
    </View>
  );
}

function AddPlanSheet({
  slide,
  onClose,
  onReadyMade,
  onCustom,
  theme,
  isDark,
}: {
  slide: RNAnimated.Value;
  onClose: () => void;
  onReadyMade: () => void;
  onCustom: () => void;
  theme: any;
  isDark: boolean;
}) {
  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });
  const backdropOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });
  const cardBg = isDark ? "#1A1A1A" : "#FFFDF6";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <RNAnimated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </RNAnimated.View>
      <RNAnimated.View
        style={[st.addSheet, { backgroundColor: cardBg, transform: [{ translateY }] }]}
      >
        <View style={st.sheetHandle} />
        <Text style={[st.addSheetTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Add a Plan
        </Text>
        <Pressable
          onPress={onReadyMade}
          style={[st.addOption, { backgroundColor: isDark ? "#222" : "#F5F0E8" }]}
        >
          <View style={[st.addOptionIcon, { backgroundColor: GOLD + "20" }]}>
            <Ionicons name="library" size={22} color={GOLD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.addOptionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Ready-Made Plans
            </Text>
            <Text style={[st.addOptionDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Browse curated plans on key topics
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
        <Pressable
          onPress={onCustom}
          style={[st.addOption, { backgroundColor: isDark ? "#222" : "#F5F0E8" }]}
        >
          <View style={[st.addOptionIcon, { backgroundColor: GOLD + "20" }]}>
            <Ionicons name="create" size={22} color={GOLD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.addOptionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Custom Plan
            </Text>
            <Text style={[st.addOptionDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Pick a Bible book and set your own pace
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
      </RNAnimated.View>
    </View>
  );
}

function CustomPlanSheet({
  slide,
  books,
  selectedBookId,
  duration,
  creating,
  onSelectBook,
  onSelectDuration,
  onClose,
  onCreate,
  theme,
  isDark,
}: {
  slide: RNAnimated.Value;
  books: BibleBook[] | undefined;
  selectedBookId: number | null;
  duration: number;
  creating: boolean;
  onSelectBook: (id: number) => void;
  onSelectDuration: (d: number) => void;
  onClose: () => void;
  onCreate: () => void;
  theme: any;
  isDark: boolean;
}) {
  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [700, 0],
  });
  const backdropOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });
  const cardBg = isDark ? "#1A1A1A" : "#FFFDF6";
  const DURATIONS = [7, 14, 21, 30];
  const sortedBooks = useMemo(
    () => [...(books || [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [books]
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <RNAnimated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </RNAnimated.View>
      <RNAnimated.View
        style={[
          st.customSheet,
          { backgroundColor: cardBg, transform: [{ translateY }] },
        ]}
      >
        <View style={st.sheetHandle} />
        <Text style={[st.addSheetTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Create Custom Plan
        </Text>

        <Text style={[st.customLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
          Choose a Book
        </Text>
        <ScrollView
          style={{ maxHeight: 260 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 4 }}
        >
          {sortedBooks.map((book) => (
            <Pressable
              key={book.id}
              onPress={() => {
                onSelectBook(book.id);
                Haptics.selectionAsync();
              }}
              style={[
                st.bookRow,
                selectedBookId === book.id && { backgroundColor: GOLD + "20" },
                selectedBookId !== book.id && {
                  backgroundColor: isDark ? "#222" : "#F5F0E8",
                },
              ]}
            >
              <Text
                style={[
                  st.bookName,
                  {
                    color: selectedBookId === book.id ? GOLD : theme.text,
                    fontFamily: selectedBookId === book.id ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {book.name}
              </Text>
              <Text style={[st.bookChapters, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {book.chapterCount} ch
              </Text>
              {selectedBookId === book.id && (
                <Ionicons name="checkmark-circle" size={18} color={GOLD} />
              )}
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[st.customLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium", marginTop: 16 }]}>
          Duration
        </Text>
        <View style={st.durationRow}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => {
                onSelectDuration(d);
                Haptics.selectionAsync();
              }}
              style={[
                st.durationPill,
                duration === d
                  ? { backgroundColor: GOLD }
                  : { backgroundColor: isDark ? "#222" : "#F5F0E8" },
              ]}
            >
              <Text
                style={[
                  st.durationPillText,
                  {
                    color: duration === d ? "#fff" : theme.text,
                    fontFamily: duration === d ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {d} days
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={onCreate}
          disabled={!selectedBookId || creating}
          style={[
            st.startBtn,
            {
              backgroundColor: GOLD,
              opacity: !selectedBookId || creating ? 0.5 : 1,
              marginTop: 20,
            },
          ]}
          testID="custom-plan-create-btn"
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[st.startBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              Generate Plan
            </Text>
          )}
        </Pressable>
      </RNAnimated.View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, marginBottom: 16 },
  tabRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 },
  tabText: { fontSize: 14 },

  myPlanCard: {
    borderRadius: 20,
    padding: 20,
  },
  myPlanTop: { flexDirection: "row", alignItems: "center", gap: 16 },
  myPlanTitle: { fontSize: 18, marginBottom: 4 },
  myPlanMeta: { fontSize: 13 },
  myPlanDivider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  myPlanBottom: { flexDirection: "row", alignItems: "center", gap: 12 },
  todayLabel: { fontSize: 11, letterSpacing: 0.5, marginBottom: 2 },
  todayRef: { fontSize: 15 },
  resumeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resumeBtnText: { color: "#fff", fontSize: 14 },

  todayCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 16,
  },
  checkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  todayPlanName: { fontSize: 12, marginBottom: 2 },
  todayScripture: { fontSize: 16, marginBottom: 2 },
  todayDayLabel: { fontSize: 12 },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontSize: 15 },

  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  detailSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 100,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    alignSelf: "center",
    marginBottom: 16,
  },
  detailTitle: { fontSize: 24, marginBottom: 12 },
  detailMeta: { flexDirection: "row", gap: 10, marginBottom: 16 },
  detailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  detailBadgeText: { fontSize: 13 },
  detailDesc: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  dayListTitle: { fontSize: 16, marginBottom: 12 },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumText: { fontSize: 13 },
  dayRef: { fontSize: 15, flex: 1 },
  startBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 24,
    marginTop: 24,
  },
  startBtnText: { color: "#fff", fontSize: 16 },

  addSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 100,
  },
  addSheetTitle: { fontSize: 22, marginBottom: 20 },
  addOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  addOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addOptionTitle: { fontSize: 16, marginBottom: 2 },
  addOptionDesc: { fontSize: 13 },

  customSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "90%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 100,
  },
  customLabel: { fontSize: 13, letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  bookName: { flex: 1, fontSize: 15 },
  bookChapters: { fontSize: 13 },
  durationRow: { flexDirection: "row", gap: 10 },
  durationPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
  },
  durationPillText: { fontSize: 14 },
});

const TOPIC_PILLS = [
  { label: "Salvation", color: "#8B5CF6" },
  { label: "Prayer", color: "#2563EB" },
  { label: "Sabbath", color: "#C9933A" },
  { label: "Prophecy", color: "#DC2626" },
  { label: "Identity", color: "#059669" },
  { label: "Anxiety", color: "#0891B2" },
];

const dt = StyleSheet.create({
  heroBanner: {
    width: "100%",
    height: 180,
    justifyContent: "flex-end",
    padding: 20,
  },
  heroLabel: {
    color: GOLD,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  topicRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  topicPill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  topicPillSelected: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  topicPillText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  categoryRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  categoryPill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  categoryPillSelected: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  categoryPillText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  planList: {
    paddingHorizontal: 20,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  planCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  planInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },
  planBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  planBadgeText: {
    color: GOLD,
    fontSize: 11,
  },
  planTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    marginBottom: 2,
  },
  planDesc: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  startPill: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  startPillText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  emptyFilter: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyFilterText: {
    fontSize: 14,
  },
  devotionalSection: {
    marginTop: 8,
  },
});
