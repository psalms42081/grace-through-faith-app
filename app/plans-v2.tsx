// Path B Brief 04 Phase A — Plans v2 (hidden route).
// Light-first rebuild of app/(tabs)/plans.tsx. NO route swap yet: reached only
// via the preview pill on the current Plans tab. Presentation only — plan
// start/resume/progress logic and the guest sign-in gate are unchanged.
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { navigateToScriptureByParts } from "@/lib/scripture-nav";
import { HV2, F } from "@/components/home-v2/theme";

// ---- Screen tokens (violet = Plans; coral = ONE Continue CTA + active segment;
// gold = streak flame emoji only; category tints carry Browse) ----
const P2 = {
  surface: "#FBF7EE",
  card: "#FFFFFF",
  ink: "#1F1A12",
  inkMuted: HV2.inkMutedText, // #6B6660
  coralInk: "#C24431", // the ONE Continue CTA fill + active segment only
  violet: "#6A4FD0",
  violetInk: "#5A41B8",
  violetTint: "#EAE6FA",
  teal: "#1F7A70",
  tealTint: "rgba(31,122,112,0.10)",
  ringTrack: "#EFEBE5",
  border: "rgba(31,26,18,0.08)",
  done: "#3E7A4E", // completed check
};
const FEATURED_GRADIENT = ["#4C3AA8", "#6A4FD0"] as const; // white AA on both ends

// Category token system: tint (tile bg), ink (small meta text, ≥4.5:1 on white),
// illustration from assets/illustrations.
const CATEGORY_TOKENS: Record<string, { tint: string; ink: string; art: any }> = {
  Prayer: { tint: "#FFF0D9", ink: "#8A5A10", art: require("@/assets/illustrations/plan-prayer.png") },
  Prophecy: { tint: "#DDF0FB", ink: "#175F94", art: require("@/assets/illustrations/plan-prophecy.png") },
  Youth: { tint: "#EAE6FA", ink: "#5A41B8", art: require("@/assets/illustrations/plan-youth.png") },
  "New Believers": { tint: "#FCE1EC", ink: "#A02A62", art: require("@/assets/illustrations/plan-new-believers.png") },
  Sabbath: { tint: "#DFF6F2", ink: "#14655D", art: require("@/assets/illustrations/plan-sabbath.png") },
  Health: { tint: "#FDE8E4", ink: "#A63A28", art: require("@/assets/illustrations/plan-health.png") },
  Family: { tint: "#E7F2DF", ink: "#3E6B2A", art: require("@/assets/illustrations/plan-family.png") },
  Doctrine: { tint: "#E4E9F5", ink: "#3A4E8C", art: require("@/assets/illustrations/plan-doctrine.png") },
  "End Times": { tint: "#F3E4E4", ink: "#8C3030", art: require("@/assets/illustrations/plan-end-times.png") },
  Forgiveness: { tint: "#F0E6F2", ink: "#7A3E86", art: require("@/assets/illustrations/plan-forgiveness.png") },
};
const DEFAULT_TOKEN = { tint: "#EAE6FA", ink: "#5A41B8", art: require("@/assets/illustrations/plan-prayer.png") };
const tokenFor = (category: string | null | undefined) => CATEGORY_TOKENS[category || ""] || DEFAULT_TOKEN;

// ---- Types (mirrors app/(tabs)/plans.tsx) ----
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
}
interface DevotionalPlan {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  theme: string | null;
  category: string | null;
}
interface OdbDevotional {
  id: number;
  title: string;
  date: string;
  author: string;
}

const SEGMENTS = ["My Plans", "Browse", "Completed"] as const;
type Segment = (typeof SEGMENTS)[number];

function formatRef(books: BibleBook[] | undefined, d: PlanDay | undefined): string | null {
  if (!d || !d.bookId || !d.chapter) return null;
  const book = books?.find((b) => b.id === d.bookId);
  if (!book) return null;
  let ref = `${book.name} ${d.chapter}`;
  if (d.verseStart) ref += `:${d.verseStart}${d.verseEnd ? `–${d.verseEnd}` : ""}`;
  return ref;
}

function ProgressRing({ progress, color }: { progress: number; color: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
      <Svg width={52} height={52} viewBox="0 0 52 52" style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={26} cy={26} r={r} fill="none" stroke={P2.ringTrack} strokeWidth={5} />
        <Circle
          cx={26}
          cy={26}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${c}`}
          strokeDashoffset={c * (1 - pct)}
        />
      </Svg>
      <Text style={{ fontFamily: F.interBold, fontSize: 11.5, color: P2.ink }}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

export default function PlansV2Screen() {
  const insets = useSafeAreaInsets();
  const { userId, isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [segment, setSegment] = useState<Segment>("My Plans");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [detailPlanId, setDetailPlanId] = useState<string | null>(null);
  const [showCustomSheet, setShowCustomSheet] = useState(false);
  const [customBookId, setCustomBookId] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState(7);
  const [enrollingDevotionalId, setEnrollingDevotionalId] = useState<string | null>(null);

  // ---- Data (identical endpoints to the canonical screen) ----
  const { data: plans } = useQuery<ReadingPlan[]>({ queryKey: ["/api/plans"] });
  const { data: userPlans, isLoading: loadingUserPlans } = useQuery<UserPlan[]>({
    queryKey: ["/api/user-plans"],
    enabled: !!userId,
  });
  const { data: books } = useQuery<BibleBook[]>({ queryKey: ["/api/books"] });
  const { data: devotionalPlans } = useQuery<DevotionalPlan[]>({ queryKey: ["/api/devotionals/plans"] });
  const { data: odbRecent } = useQuery<OdbDevotional[]>({
    queryKey: ["/api/odb/recent?count=7"],
    staleTime: 10 * 60 * 1000,
  });
  const { data: weeklyStreak } = useQuery<{ currentStreak: number }>({
    queryKey: [`/api/reading-streaks/weekly?userId=${userId}`],
    enabled: !!userId,
  });
  const { data: ssData } = useQuery<{
    currentLesson: { title: string; days?: { dayNumber: number; title: string | null }[] } | null;
    todayDayNumber: number | null;
  }>({
    queryKey: [`/api/sabbath-school/current?userId=${userId}&curriculum=adult`],
    staleTime: 10 * 60 * 1000,
  });

  // Most-recent enrollment first (brief: the primary/most-recent plan carries
  // the one coral CTA). Deliberate departure from canonical API order.
  const activePlans = useMemo(
    () =>
      (userPlans || [])
        .filter((p) => !p.completedAt)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [userPlans]
  );
  const completedPlans = useMemo(
    () =>
      (userPlans || [])
        .filter((p) => !!p.completedAt)
        .sort((a, b) => ((b.completedAt || "") > (a.completedAt || "") ? 1 : -1)),
    [userPlans]
  );

  // Today's reading refs for active plans (detail per plan, same endpoint the sheet uses)
  const detailQueries = useQueries({
    queries: activePlans.map((up) => ({
      queryKey: ["/api/plans", up.planId] as const,
      enabled: !!up.planId,
    })),
  });
  const detailByPlanId = useMemo(() => {
    const map: Record<string, PlanDetail | undefined> = {};
    activePlans.forEach((up, i) => {
      map[up.planId] = detailQueries[i]?.data as PlanDetail | undefined;
    });
    return map;
  }, [activePlans, detailQueries]);

  const { data: sheetDetail } = useQuery<PlanDetail>({
    queryKey: ["/api/plans", detailPlanId],
    enabled: !!detailPlanId,
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
      setDetailPlanId(null);
      setSegment("My Plans");
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
      setShowCustomSheet(false);
      setCustomBookId(null);
      setCustomDuration(7);
      setSegment("My Plans");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert("Error", "Failed to create custom plan.");
    },
  });

  // Same guest gate as the canonical screen — unchanged wording and flow.
  const startPlan = useCallback(
    (planId: string) => {
      if (!isAuthenticated) {
        Alert.alert("Sign In Required", "Create a free account to start reading plans and track your progress.", [
          { text: "Not Now", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/(auth)/login") },
        ]);
        return;
      }
      enrollMutation.mutate(planId);
    },
    [isAuthenticated, enrollMutation]
  );

  const enrolledPlanIds = useMemo(() => new Set((userPlans || []).map((p) => p.planId)), [userPlans]);
  const featuredPlan = useMemo(
    () => (plans || []).find((p) => !enrolledPlanIds.has(p.id)) || null,
    [plans, enrolledPlanIds]
  );

  const browseCategories = useMemo(() => {
    const cats = new Set<string>();
    (plans || []).forEach((p) => p.category && cats.add(p.category));
    return ["All", ...Array.from(cats)];
  }, [plans]);
  const browsePlans = useMemo(
    () => (plans || []).filter((p) => activeCategory === "All" || p.category === activeCategory),
    [plans, activeCategory]
  );

  const ssTodayLabel = useMemo(() => {
    const dn = ssData?.todayDayNumber;
    const day = dn != null ? ssData?.currentLesson?.days?.find((d) => d.dayNumber === dn) : null;
    return day?.title || "Today";
  }, [ssData]);

  const streak = weeklyStreak?.currentStreak ?? 0;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const renderActiveCard = (up: UserPlan, isPrimary: boolean) => {
    const token = tokenFor(up.planCategory);
    const detail = detailByPlanId[up.planId];
    const todayDay = detail?.days?.find((d) => d.dayNumber === up.currentDay);
    const todayRef = formatRef(books, todayDay);
    const resume = () => {
      if (todayDay?.bookId && todayDay?.chapter) {
        navigateToScriptureByParts(todayDay.bookId, todayDay.chapter, todayDay.verseStart || undefined);
      } else {
        setDetailPlanId(up.planId);
      }
    };
    return (
      <View key={up.id} style={s.activeCard} testID={`plans2-active-${up.planId}`}>
        <View style={s.activeTop}>
          <View style={[s.artTile, { backgroundColor: token.tint }]}>
            <Image source={token.art} style={s.artImg} resizeMode="cover" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.activeEyebrow}>READING PLAN · DAY {up.currentDay} OF {up.planDurationDays}</Text>
            <Text style={s.activeTitle} numberOfLines={1}>{up.planTitle}</Text>
            <Text style={s.activeMeta} numberOfLines={1}>
              {up.planCategory || "Reading Plan"} · {up.planDurationDays} days
            </Text>
          </View>
          <ProgressRing progress={up.currentDay / Math.max(up.planDurationDays, 1)} color={P2.violet} />
        </View>
        {isPrimary && (
          <View style={s.todayRow}>
            <Ionicons name="sunny-outline" size={18} color={P2.violetInk} />
            <View style={{ flex: 1 }}>
              <Text style={s.todayRowTitle}>Today — Day {up.currentDay}</Text>
              <Text style={s.todayRowSub} numberOfLines={1}>{todayRef || up.planDescription || "Open your reading"}</Text>
            </View>
            {/* Day-complete PATCH — same flow as the canonical Today tab */}
            <Pressable
              onPress={() => dayCompleteMutation.mutate({ enrollmentId: up.id, day: up.currentDay })}
              disabled={dayCompleteMutation.isPending}
              hitSlop={8}
              accessibilityLabel="Mark today complete"
              testID={`plans2-daydone-${up.planId}`}
            >
              <Ionicons name="checkmark-circle-outline" size={26} color={dayCompleteMutation.isPending ? P2.inkMuted : P2.violetInk} />
            </Pressable>
          </View>
        )}
        {isPrimary ? (
          <Pressable onPress={resume} style={({ pressed }) => [s.continueBtn, { opacity: pressed ? 0.85 : 1 }]} testID="plans2-continue">
            <Text style={s.continueBtnText}>Continue Reading</Text>
          </Pressable>
        ) : (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Pressable onPress={resume} style={({ pressed }) => [s.quietBtn, { flex: 1, opacity: pressed ? 0.8 : 1 }]}>
              <Text style={s.quietBtnText}>Resume{todayRef ? ` — ${todayRef}` : ""}</Text>
            </Pressable>
            <Pressable
              onPress={() => dayCompleteMutation.mutate({ enrollmentId: up.id, day: up.currentDay })}
              disabled={dayCompleteMutation.isPending}
              hitSlop={8}
              accessibilityLabel="Mark today complete"
            >
              <Ionicons name="checkmark-circle-outline" size={26} color={dayCompleteMutation.isPending ? P2.inkMuted : P2.violetInk} />
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/plans" as any))}
          style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={P2.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerMeta}>
            {activePlans.length} active{streak > 0 ? ` · ${streak}-day streak 🔥` : ""}
          </Text>
          <Text style={s.headerTitle}>Plans</Text>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/search" as any)}
          style={({ pressed }) => [s.searchBtn, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityLabel="Search"
        >
          <Ionicons name="search" size={18} color={P2.ink} />
        </Pressable>
      </View>

      {/* Segments */}
      <View style={s.segmentRow}>
        {SEGMENTS.map((seg) => {
          const active = segment === seg;
          return (
            <Pressable
              key={seg}
              onPress={() => setSegment(seg)}
              style={[s.segment, active && s.segmentActive]}
              testID={`plans2-seg-${seg.replace(" ", "-").toLowerCase()}`}
            >
              <Text style={[s.segmentText, active && s.segmentTextActive]}>{seg}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {segment === "My Plans" && (
          <>
            {loadingUserPlans ? (
              <ActivityIndicator size="large" color={P2.violet} style={{ marginTop: 40 }} />
            ) : activePlans.length === 0 ? (
              <View style={s.emptyBox}>
                <View style={[s.emptyIcon, { backgroundColor: P2.violetTint }]}>
                  <Ionicons name="book-outline" size={28} color={P2.violetInk} />
                </View>
                <Text style={s.emptyTitle}>No Active Plans</Text>
                <Text style={s.emptySub}>Start a reading plan to build a daily Scripture habit</Text>
                <Pressable onPress={() => setSegment("Browse")} style={({ pressed }) => [s.quietBtn, { alignSelf: "center", paddingHorizontal: 28, opacity: pressed ? 0.8 : 1 }]}>
                  <Text style={s.quietBtnText}>Browse Plans</Text>
                </Pressable>
              </View>
            ) : (
              activePlans.map((up, i) => renderActiveCard(up, i === 0))
            )}

            {/* Sabbath School cross-card — a pointer, not a duplicate surface */}
            <View style={s.ssCard} testID="plans2-ss-card">
              <View style={s.ssTop}>
                <View style={[s.artTile, { backgroundColor: "#DFF6F2" }]}>
                  <Image source={require("@/assets/illustrations/rhythm-sabbath-school.png")} style={s.artImg} resizeMode="contain" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.ssEyebrow}>SABBATH SCHOOL</Text>
                  <Text style={s.activeTitle} numberOfLines={2}>
                    {ssData?.currentLesson?.title || "This week's lesson"}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push("/sabbath-school" as any)}
                style={({ pressed }) => [s.ssBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={s.ssBtnText} numberOfLines={1}>Open {ssTodayLabel}'s Study</Text>
              </Pressable>
            </View>

            {/* Featured plan — the screen's ONE gradient (violet) */}
            {featuredPlan && (
              <View style={s.featuredWrap}>
                <LinearGradient colors={[...FEATURED_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.featuredInner}>
                  <View style={s.featuredTopRow}>
                    <Text style={s.featuredEyebrow}>FEATURED PLAN</Text>
                    <View style={s.featuredChip}>
                      <Text style={s.featuredChipText}>{featuredPlan.durationDays} days</Text>
                    </View>
                  </View>
                  <Text style={s.featuredTitle} numberOfLines={2}>{featuredPlan.title}</Text>
                  {featuredPlan.description && (
                    <Text style={s.featuredDesc} numberOfLines={2}>{featuredPlan.description}</Text>
                  )}
                  <View style={s.featuredBtns}>
                    <Pressable onPress={() => startPlan(featuredPlan.id)} style={({ pressed }) => [s.featuredStart, { opacity: pressed ? 0.85 : 1 }]}>
                      <Text style={s.featuredStartText}>Start Plan</Text>
                    </Pressable>
                    <Pressable onPress={() => setDetailPlanId(featuredPlan.id)} style={({ pressed }) => [s.featuredLearn, { opacity: pressed ? 0.85 : 1 }]}>
                      <Text style={s.featuredLearnText}>Learn More</Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </View>
            )}
          </>
        )}

        {segment === "Browse" && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRail}>
              {browseCategories.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <Pressable key={cat} onPress={() => setActiveCategory(cat)} style={[s.chip, active && s.chipActive]}>
                    <Text style={[s.chipText, active && s.chipTextActive]}>{cat}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={s.grid}>
              {browsePlans.map((plan) => {
                const token = tokenFor(plan.category);
                const enrolled = enrolledPlanIds.has(plan.id);
                return (
                  <Pressable
                    key={plan.id}
                    onPress={() => setDetailPlanId(plan.id)}
                    style={({ pressed }) => [s.tile, { opacity: pressed ? 0.85 : 1 }]}
                    testID={`plans2-tile-${plan.id}`}
                  >
                    <View style={[s.tileArt, { backgroundColor: token.tint }]}>
                      <Image source={token.art} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    </View>
                    <View style={s.tileBody}>
                      <Text style={s.tileTitle} numberOfLines={2}>{plan.title}</Text>
                      <Text style={[s.tileMeta, { color: token.ink }]} numberOfLines={1}>
                        {plan.category || "Plan"} · {plan.durationDays} days
                      </Text>
                      <Text style={s.tileAction}>{enrolled ? "Open" : "Start"}</Text>
                      {/* action colour is violet — coral is reserved for the one Continue CTA */}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Devotional plans (kept — do-not-regress) */}
            {(devotionalPlans || []).length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={s.sectionTitle}>Devotional Plans</Text>
                {(devotionalPlans || []).map((dp) => (
                  <Pressable
                    key={dp.id}
                    disabled={enrollingDevotionalId === dp.id}
                    onPress={() => {
                      if (!isAuthenticated) {
                        Alert.alert("Sign In Required", "Create a free account to access devotional plans.", [
                          { text: "Not Now", style: "cancel" },
                          { text: "Sign In", onPress: () => router.push("/(auth)/login") },
                        ]);
                        return;
                      }
                      if (enrollingDevotionalId) return;
                      setEnrollingDevotionalId(dp.id);
                      apiRequest("POST", "/api/devotionals/enroll", { userId, planId: dp.id })
                        .catch(() => {})
                        .finally(() => {
                          setEnrollingDevotionalId(null);
                          qc.invalidateQueries({ queryKey: ["/api/devotionals/today"] });
                          router.push(`/devotional-day?planId=${dp.id}&depth=quick` as any);
                        });
                    }}
                    style={({ pressed }) => [s.rowCard, { opacity: pressed || enrollingDevotionalId === dp.id ? 0.6 : 1 }]}
                  >
                    <View style={[s.rowIcon, { backgroundColor: P2.violetTint }]}>
                      <Ionicons name="sparkles-outline" size={18} color={P2.violetInk} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle} numberOfLines={1}>{dp.title}</Text>
                      <Text style={s.rowSub} numberOfLines={1}>{dp.theme || "Devotional"} · {dp.totalDays} days</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={P2.inkMuted} />
                  </Pressable>
                ))}
              </View>
            )}

            {/* Our Daily Bread (kept — do-not-regress) */}
            {(odbRecent || []).length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={s.sectionTitle}>Our Daily Bread</Text>
                {(odbRecent || []).slice(0, 3).map((d) => (
                  <Pressable
                    key={d.id}
                    onPress={() => router.push({ pathname: "/odb-devotional" as any, params: { id: String(d.id) } })}
                    style={({ pressed }) => [s.rowCard, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    <View style={[s.rowIcon, { backgroundColor: "#FFF0D9" }]}>
                      <Ionicons name="cafe-outline" size={18} color="#8A5A10" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle} numberOfLines={1}>{d.title}</Text>
                      <Text style={s.rowSub} numberOfLines={1}>{d.date} · {d.author}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={P2.inkMuted} />
                  </Pressable>
                ))}
              </View>
            )}
            {/* Custom plan creation (kept — do-not-regress; replaces canonical FAB) */}
            <Pressable
              onPress={() => {
                if (!isAuthenticated) {
                  Alert.alert("Sign In Required", "Create a free account to build custom reading plans.", [
                    { text: "Not Now", style: "cancel" },
                    { text: "Sign In", onPress: () => router.push("/(auth)/login") },
                  ]);
                  return;
                }
                setShowCustomSheet(true);
              }}
              style={({ pressed }) => [s.rowCard, { opacity: pressed ? 0.8 : 1 }]}
              testID="plans2-custom-row"
            >
              <View style={[s.rowIcon, { backgroundColor: P2.violetTint }]}>
                <Ionicons name="add" size={20} color={P2.violetInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>Create a Custom Plan</Text>
                <Text style={s.rowSub}>Pick a book of the Bible and a pace</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={P2.inkMuted} />
            </Pressable>
          </>
        )}

        {segment === "Completed" && (
          <>
            {completedPlans.length === 0 ? (
              <View style={s.emptyBox}>
                <View style={[s.emptyIcon, { backgroundColor: "#E7F2DF" }]}>
                  <Ionicons name="trophy-outline" size={28} color={P2.done} />
                </View>
                <Text style={s.emptyTitle}>Nothing Finished Yet</Text>
                <Text style={s.emptySub}>Plans you complete will live here — your shelf of finished journeys.</Text>
              </View>
            ) : (
              completedPlans.map((up) => {
                const token = tokenFor(up.planCategory);
                const finishedDate = up.completedAt ? new Date(up.completedAt) : null;
                const finished =
                  finishedDate && !isNaN(finishedDate.getTime())
                    ? finishedDate.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
                    : null;
                return (
                  <View key={up.id} style={s.completedCard} testID={`plans2-completed-${up.planId}`}>
                    <View style={[s.rowIcon, { backgroundColor: token.tint, overflow: "hidden" }]}>
                      <Image source={token.art} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle} numberOfLines={1}>{up.planTitle}</Text>
                      <Text style={s.rowSub} numberOfLines={1}>
                        {finished ? `Finished ${finished} · ` : ""}{up.planDurationDays} days
                      </Text>
                    </View>
                    <View style={s.doneBadge}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Plan detail sheet (light) — same data + Start gate as canonical */}
      <Modal visible={!!detailPlanId} transparent animationType="slide" onRequestClose={() => setDetailPlanId(null)}>
        <Pressable style={s.sheetBackdrop} onPress={() => setDetailPlanId(null)} />
        <View style={[s.sheet, { paddingBottom: bottomPad + 20 }]}>
          <View style={s.sheetHandle} />
          {!sheetDetail ? (
            <ActivityIndicator size="large" color={P2.violet} style={{ marginVertical: 40 }} />
          ) : (
            <>
              <Text style={s.sheetEyebrow}>{(sheetDetail.category || "Reading Plan").toUpperCase()} · {sheetDetail.durationDays} DAYS</Text>
              <Text style={s.sheetTitle}>{sheetDetail.title}</Text>
              {sheetDetail.description && <Text style={s.sheetDesc}>{sheetDetail.description}</Text>}
              <ScrollView style={{ maxHeight: 260, marginTop: 12 }} showsVerticalScrollIndicator={false}>
                {(sheetDetail.days || []).map((d) => (
                  <View key={d.id} style={s.sheetDayRow}>
                    <Text style={s.sheetDayNum}>Day {d.dayNumber}</Text>
                    <Text style={s.sheetDayRef} numberOfLines={1}>{formatRef(books, d) || "—"}</Text>
                  </View>
                ))}
              </ScrollView>
              {enrolledPlanIds.has(sheetDetail.id) ? (
                <View style={[s.continueBtn, { backgroundColor: P2.violetTint }]}>
                  <Text style={[s.continueBtnText, { color: P2.violetInk }]}>Already in My Plans</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => startPlan(sheetDetail.id)}
                  disabled={enrollMutation.isPending}
                  style={({ pressed }) => [s.continueBtn, { backgroundColor: P2.violetInk, opacity: pressed || enrollMutation.isPending ? 0.7 : 1 }]}
                  testID="plans2-sheet-start"
                >
                  <Text style={s.continueBtnText}>{enrollMutation.isPending ? "Starting…" : "Start Plan"}</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* Custom plan sheet (light) — same POST /api/plans/custom as canonical */}
      <Modal visible={showCustomSheet} transparent animationType="slide" onRequestClose={() => setShowCustomSheet(false)}>
        <Pressable style={s.sheetBackdrop} onPress={() => setShowCustomSheet(false)} />
        <View style={[s.sheet, { paddingBottom: bottomPad + 20 }]}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetEyebrow}>CUSTOM PLAN</Text>
          <Text style={s.sheetTitle}>Build Your Own</Text>
          <Text style={s.sheetDesc}>Choose a book, then how many days to read it in.</Text>
          <ScrollView style={{ maxHeight: 220, marginTop: 12 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(books || []).map((b) => {
                const active = customBookId === b.id;
                return (
                  <Pressable key={b.id} onPress={() => setCustomBookId(b.id)} style={[s.chip, active && { backgroundColor: P2.violet, borderColor: P2.violet }]}>
                    <Text style={[s.chipText, active && { color: "#FFFFFF" }]}>{b.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            {[7, 14, 30, 60].map((d) => {
              const active = customDuration === d;
              return (
                <Pressable key={d} onPress={() => setCustomDuration(d)} style={[s.chip, { flex: 1, alignItems: "center" }, active && { backgroundColor: P2.violet, borderColor: P2.violet }]}>
                  <Text style={[s.chipText, active && { color: "#FFFFFF" }]}>{d} days</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => customBookId && customPlanMutation.mutate({ bookId: customBookId, durationDays: customDuration })}
            disabled={!customBookId || customPlanMutation.isPending}
            style={({ pressed }) => [s.continueBtn, { backgroundColor: P2.violetInk, marginTop: 16, opacity: !customBookId || pressed || customPlanMutation.isPending ? 0.6 : 1 }]}
            testID="plans2-custom-create"
          >
            <Text style={s.continueBtnText}>{customPlanMutation.isPending ? "Creating…" : "Create Plan"}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: P2.surface },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 6 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerMeta: { fontFamily: F.interMed, fontSize: 13, color: P2.inkMuted },
  headerTitle: { fontFamily: F.loraSemi, fontSize: 26, color: P2.ink, marginTop: 1 },
  searchBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: P2.card, alignItems: "center", justifyContent: "center", ...HV2.rowShadow },

  segmentRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  segment: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: P2.card, borderWidth: 1, borderColor: P2.border },
  segmentActive: { backgroundColor: P2.coralInk, borderColor: P2.coralInk },
  segmentText: { fontFamily: F.interSemi, fontSize: 13, color: P2.inkMuted },
  segmentTextActive: { color: "#FFFFFF" },

  scrollContent: { paddingHorizontal: 20, gap: 14 },

  activeCard: { backgroundColor: P2.card, borderRadius: 24, padding: 16, gap: 12, ...HV2.cardShadow },
  activeTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  artTile: { width: 52, height: 52, borderRadius: 16, overflow: "hidden" },
  artImg: { width: "100%", height: "100%" },
  activeEyebrow: { fontFamily: F.interBold, fontSize: 10.5, letterSpacing: 1.3, color: P2.violetInk },
  activeTitle: { fontFamily: F.interSemi, fontSize: 15.5, color: P2.ink, marginTop: 2 },
  activeMeta: { fontFamily: F.inter, fontSize: 12.5, color: P2.inkMuted, marginTop: 2 },
  todayRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F8F6FD", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  todayRowTitle: { fontFamily: F.interSemi, fontSize: 13, color: P2.ink },
  todayRowSub: { fontFamily: F.inter, fontSize: 12.5, color: P2.inkMuted, marginTop: 1 },
  continueBtn: { backgroundColor: P2.coralInk, borderRadius: 999, paddingVertical: 13, alignItems: "center" },
  continueBtnText: { fontFamily: F.interSemi, fontSize: 14.5, color: "#FFFFFF" },
  quietBtn: { backgroundColor: P2.violetTint, borderRadius: 999, paddingVertical: 11, alignItems: "center" },
  quietBtnText: { fontFamily: F.interSemi, fontSize: 13.5, color: P2.violetInk },

  ssCard: { backgroundColor: P2.card, borderRadius: 24, padding: 16, gap: 12, borderLeftWidth: 3, borderLeftColor: P2.teal, ...HV2.cardShadow },
  ssTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  ssEyebrow: { fontFamily: F.interBold, fontSize: 10.5, letterSpacing: 1.3, color: P2.teal },
  ssBtn: { backgroundColor: P2.tealTint, borderRadius: 999, paddingVertical: 11, alignItems: "center" },
  ssBtnText: { fontFamily: F.interSemi, fontSize: 13.5, color: "#14655D" },

  featuredWrap: { borderRadius: 28, overflow: "hidden", ...HV2.cardShadow },
  featuredInner: { padding: 22 },
  featuredTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  featuredEyebrow: { fontFamily: F.interBold, fontSize: 11, letterSpacing: 1.5, color: "#FFFFFF" },
  featuredChip: { backgroundColor: "rgba(0,0,0,0.22)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  featuredChipText: { fontFamily: F.interSemi, fontSize: 11, color: "#FFFFFF" },
  featuredTitle: { fontFamily: F.loraSemi, fontSize: 21, lineHeight: 28, color: "#FFFFFF", marginTop: 12 },
  featuredDesc: { fontFamily: F.inter, fontSize: 13, lineHeight: 19, color: "#FFFFFF", marginTop: 8 },
  featuredBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  featuredStart: { backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 },
  featuredStartText: { fontFamily: F.interSemi, fontSize: 13.5, color: "#4C3AA8" },
  featuredLearn: { backgroundColor: "rgba(0,0,0,0.22)", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  featuredLearnText: { fontFamily: F.interSemi, fontSize: 13.5, color: "#FFFFFF" },

  chipRail: { gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: P2.card, borderWidth: 1, borderColor: P2.border },
  chipActive: { backgroundColor: P2.violet, borderColor: P2.violet },
  chipText: { fontFamily: F.interSemi, fontSize: 13, color: P2.inkMuted },
  chipTextActive: { color: "#FFFFFF" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "47.5%", backgroundColor: P2.card, borderRadius: 20, overflow: "hidden", ...HV2.rowShadow },
  tileArt: { height: 92 },
  tileBody: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 3 },
  tileTitle: { fontFamily: F.interSemi, fontSize: 13.5, lineHeight: 18, color: P2.ink },
  tileMeta: { fontFamily: F.interSemi, fontSize: 11.5 },
  tileAction: { fontFamily: F.interSemi, fontSize: 12.5, color: P2.violetInk, marginTop: 3 },

  sectionTitle: { fontFamily: F.loraSemi, fontSize: 17, color: P2.ink, marginTop: 6 },
  rowCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: P2.card, borderRadius: 16, padding: 14, ...HV2.rowShadow },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: F.interSemi, fontSize: 14, color: P2.ink },
  rowSub: { fontFamily: F.inter, fontSize: 12, color: P2.inkMuted, marginTop: 1 },

  completedCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: P2.card, borderRadius: 16, padding: 14, ...HV2.rowShadow },
  doneBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: P2.done, alignItems: "center", justifyContent: "center" },

  emptyBox: { alignItems: "center", gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: F.loraSemi, fontSize: 18, color: P2.ink },
  emptySub: { fontFamily: F.inter, fontSize: 13.5, lineHeight: 20, color: P2.inkMuted, textAlign: "center" },

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(31,26,18,0.35)" },
  sheet: { backgroundColor: P2.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 10 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: P2.border, alignSelf: "center", marginBottom: 14 },
  sheetEyebrow: { fontFamily: F.interBold, fontSize: 10.5, letterSpacing: 1.3, color: P2.violetInk },
  sheetTitle: { fontFamily: F.loraSemi, fontSize: 21, color: P2.ink, marginTop: 6, lineHeight: 28 },
  sheetDesc: { fontFamily: F.inter, fontSize: 13.5, lineHeight: 20, color: P2.inkMuted, marginTop: 8 },
  sheetDayRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: P2.border },
  sheetDayNum: { fontFamily: F.interSemi, fontSize: 12.5, color: P2.violetInk, width: 56 },
  sheetDayRef: { fontFamily: F.inter, fontSize: 13.5, color: P2.ink, flex: 1 },
});
