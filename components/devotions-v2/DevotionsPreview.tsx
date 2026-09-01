import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { confirmWebSafe } from "@/components/WebSafeConfirm";
import { navigateToScriptureByParts } from "@/lib/scripture-nav";
import * as Haptics from "expo-haptics";
import { D2, F } from "./tokens";
import { EmptyState, Header, LoadingState, PrimaryButton, SectionHeading } from "./PreviewPrimitives";
import { useTranslation } from "@/context/TranslationContext";
import { withDeviceTimeZone } from "@/lib/device-time-zone";
import {
  DEVOTIONAL_CATALOG_QUERY_KEY,
  isApprovedHumanDevotionalPlan,
  type DevotionalCatalogPlan,
} from "@/lib/devotional-catalog";

type Plan = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  coverImageUrl: string | null;
  durationDays: number;
  type: string;
  status: string;
};
type DevotionalPlan = DevotionalCatalogPlan;
type UserPlan = {
  id: string;
  planId: string;
  currentDay: number;
  completedAt: string | null;
  createdAt: string;
  planTitle: string;
  planDescription: string | null;
  planCategory: string | null;
  planDurationDays: number;
};
type Day = {
  id: string;
  planId: string;
  dayNumber: number;
  bookId: number | null;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
};
type Detail = Plan & { days: Day[] };
type Book = { id: number; name: string; abbreviation: string; testament: string; chapterCount: number };
type Odb = { id: number; title: string; date: string; author: string };
type Egw = { title: string; content: string; bookTitle: string; bookId: number; chapterNumber?: number; date: string; sourceUrl?: string; source?: "local" | "live" };
type DevotionalPlanDay = { id: string; dayNumber: number; title: string; passageLabel: string | null };

function formatPlanDayReference(books: Book[] | undefined, day: Day | undefined) {
  if (!day?.bookId || !day.chapter) return null;
  const book = books?.find((item) => item.id === day.bookId);
  if (!book) return null;
  return `${book.name} ${day.chapter}${
    day.verseStart
      ? `:${day.verseStart}${day.verseEnd ? `–${day.verseEnd}` : ""}`
      : ""
  }`;
}

export default function DevotionsPreview() {
  const insets = useSafeAreaInsets();
  const { userId, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { translation } = useTranslation();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ seriesId?: string }>();
  const paramSeriesId = typeof params.seriesId === "string" && params.seriesId.length > 0
    ? params.seriesId
    : Array.isArray(params.seriesId) && params.seriesId[0]
      ? params.seriesId[0]
      : null;
  const [detailId, setDetailId] = useState<string | null>(null);
  const [seriesId, setSeriesId] = useState<string | null>(paramSeriesId);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    if (paramSeriesId) setSeriesId(paramSeriesId);
  }, [paramSeriesId]);

  const plans = useQuery<Plan[]>({ queryKey: ["/api/plans"] });
  const userPlans = useQuery<UserPlan[]>({
    queryKey: ["/api/user-plans", "devotions-preview", userId],
    queryFn: async () => (await apiRequest("GET", "/api/user-plans")).json(),
    enabled: isAuthenticated,
  });
  const books = useQuery<Book[]>({ queryKey: ["/api/books"] });
  const devotionalPlans = useQuery<DevotionalPlan[]>({ queryKey: [...DEVOTIONAL_CATALOG_QUERY_KEY] });
  const odb = useQuery<Odb>({
    queryKey: [withDeviceTimeZone("/api/odb/today")],
    staleTime: 600000,
    refetchOnMount: "always",
  });
  const egw = useQuery<Egw>({ queryKey: [withDeviceTimeZone("/api/egw/devotional/today")], staleTime: 86400000 });
  const today = useQuery<{
    today: any;
    enrollment?: { id: string; planId: string };
    completedCount?: number;
    totalDays?: number;
    planComplete?: boolean;
  }>({ queryKey: [`/api/devotionals/today?userId=${userId}`] });
  const detail = useQuery<Detail>({ queryKey: ["/api/plans", detailId], enabled: !!detailId });
  const seriesDetail = useQuery<DevotionalPlanDay[]>({
    queryKey: [`/api/devotionals/plans/${seriesId}/days`],
    enabled: !!seriesId,
  });

  const active = useMemo(
    () =>
      (userPlans.data || [])
        .filter((p) => !p.completedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [userPlans.data],
  );
  const activeDetails = useQueries({
    queries: active.map((plan) => ({ queryKey: ["/api/plans", plan.planId] })),
  });
  const completed = useMemo(
    () => (userPlans.data || []).filter((p) => !!p.completedAt),
    [userPlans.data],
  );
  const enrolledPlanIds = useMemo(
    () => new Set((userPlans.data || []).map((plan) => plan.planId)),
    [userPlans.data],
  );
  const catalogSeries = useMemo(
    () => (devotionalPlans.data || []).filter(isApprovedHumanDevotionalPlan),
    [devotionalPlans.data],
  );
  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set((plans.data || []).map((plan) => plan.category).filter(Boolean) as string[]),
      ),
    ],
    [plans.data],
  );
  const filteredPlans = useMemo(
    () => (plans.data || []).filter((plan) => category === "All" || plan.category === category),
    [plans.data, category],
  );
  const featuredPlan = useMemo(
    () =>
      (plans.data || []).find((plan) => !enrolledPlanIds.has(plan.id)) ||
      plans.data?.[0] ||
      null,
    [plans.data, enrolledPlanIds],
  );

  const enroll = useMutation({
    mutationFn: async (planId: string) =>
      (await apiRequest("POST", "/api/user-plans", { planId })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/user-plans"] });
      setDetailId(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => showToast("Could not start plan. Please try again in a moment.", "error"),
  });

  const completeDay = useMutation({
    mutationFn: async ({ enrollmentId, day }: { enrollmentId: string; day: number }) =>
      (await apiRequest("PATCH", `/api/user-plans/${enrollmentId}/day/${day}`)).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/user-plans"] });
      qc.invalidateQueries({ queryKey: ["/api/plans"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const enrollSeries = useMutation({
    mutationFn: async (id: string) =>
      (await apiRequest("POST", "/api/devotionals/enroll", { userId, planId: id })).json(),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: [`/api/devotionals/today?userId=${userId}`] });
      qc.invalidateQueries({ queryKey: [`/api/devotionals/today?userId=${userId}&planId=${id}`] });
      setSeriesId(null);
      if (paramSeriesId) router.setParams({ seriesId: undefined });
      router.push(`/devotional-day-preview?planId=${id}&depth=quick` as any);
    },
    onError: () => showToast("Could not start series. Please try again in a moment.", "error"),
  });

  const gate = (
    action: () => void,
    message = "Create a free account to keep a reading rhythm and track your progress.",
  ) => {
    if (!isAuthenticated) {
      void confirmWebSafe({
        title: "Sign In Required",
        message,
        confirmLabel: "Sign In",
        cancelLabel: "Not Now",
      }).then((ok) => {
        if (ok) router.push("/(auth)/login");
      });
      return;
    }
    action();
  };

  const first = active[0];
  const firstDetail = activeDetails[0]?.data as Detail | undefined;
  const firstDay = firstDetail?.days?.find((item) => item.dayNumber === first?.currentDay);
  const readingRef =
    formatPlanDayReference(books.data, firstDay) ||
    first?.planDescription ||
    "Return to today's reading";

  return (
    <View style={s.root}>
      <Header
        title="Devotions"
        eyebrow="Informed Ministries"
        topInset={insets.top}
        testID="devotions-preview-header"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 36 }]}
      >
        <View style={s.welcome} testID="devotions-preview-hero">
          <Text style={s.kicker}>MORNING WATCH</Text>
          <Text style={s.heroTitle}>A little time with God, today.</Text>
          <Text style={s.heroBody}>Make room for Scripture, reflection, and a faithful next step.</Text>
        </View>

        <SectionHeading
          title="Continue Today"
          subtitle="Pick up where your quiet time left off"
          testID="devotions-preview-continue-section"
        />
        {userPlans.isLoading ? (
          <LoadingState label="Finding your reading" />
        ) : first ? (
          <View style={s.continueCard} testID="devotions-preview-continue-card">
            <View style={s.continueTop}>
              <View style={s.continueIcon}>
                <Ionicons name="book-outline" size={22} color={D2.coral} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.meta}>
                  READING PLAN · DAY {first.currentDay} OF {first.planDurationDays}
                </Text>
                <Text style={s.cardTitle}>{first.planTitle}</Text>
                <Text style={s.cardSub}>{readingRef}</Text>
              </View>
              <Text style={s.percent}>
                {Math.round((first.currentDay / Math.max(1, first.planDurationDays)) * 100)}%
              </Text>
            </View>
            <View style={s.continueActions}>
              <PrimaryButton
                label="Continue reading"
                onPress={() => {
                  const current = activeDetails[0]?.data as Detail | undefined;
                  const day = current?.days?.find((item) => item.dayNumber === first.currentDay);
                  if (day?.bookId && day.chapter) {
                    navigateToScriptureByParts(day.bookId, day.chapter, day.verseStart || undefined, translation);
                  } else {
                    setDetailId(first.planId);
                  }
                }}
                testID="devotions-preview-continue-action"
              />
              <Pressable
                accessibilityLabel={`Mark day ${first.currentDay} complete`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: false, disabled: completeDay.isPending }}
                disabled={completeDay.isPending}
                onPress={() => completeDay.mutate({ enrollmentId: first.id, day: first.currentDay })}
                hitSlop={8}
                testID="devotions-preview-primary-complete"
              >
                <Ionicons name="checkmark-circle-outline" size={25} color={D2.violet} />
              </Pressable>
            </View>
          </View>
        ) : (
          <EmptyState
            title="Begin with today"
            body="Choose a guided plan or a daily reading below. There is no need to hurry."
            action="Explore plans"
            onAction={() => setDetailId((plans.data || [])[0]?.id || null)}
            testID="devotions-preview-continue-empty"
          />
        )}

        {active.slice(1).map((item, index) => {
          const info = activeDetails[index + 1]?.data as Detail | undefined;
          const day = info?.days?.find((entry) => entry.dayNumber === item.currentDay);
          return (
            <View
              key={item.id}
              style={s.rowCard}
              testID={`devotions-preview-active-${item.planId}`}
            >
              <View style={s.rowIcon}>
                <Ionicons name="book-outline" size={19} color={D2.violet} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{item.planTitle}</Text>
                <Text style={s.cardSub}>Day {item.currentDay} of {item.planDurationDays}</Text>
              </View>
              <Pressable
                onPress={() =>
                  day?.bookId && day.chapter
                    ? navigateToScriptureByParts(day.bookId, day.chapter, day.verseStart || undefined, translation)
                    : setDetailId(item.planId)
                }
                style={s.quietAction}
              >
                <Text style={s.quietText}>Resume</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Mark day ${item.currentDay} complete`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: false, disabled: completeDay.isPending }}
                disabled={completeDay.isPending}
                onPress={() => completeDay.mutate({ enrollmentId: item.id, day: item.currentDay })}
                hitSlop={8}
              >
                <Ionicons name="checkmark-circle-outline" size={23} color={D2.violet} />
              </Pressable>
            </View>
          );
        })}

        {today.data?.today ? (
          <Pressable
            style={s.devotionalToday}
            onPress={() =>
              router.push(
                `/devotional-day-preview?${planIdParam(today.data.today.planId)}&depth=quick` as any,
              )
            }
            testID="devotions-preview-devotional-today"
          >
            <View style={s.todayMark}>
              <Ionicons name="sunny-outline" size={18} color={D2.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.metaAmber}>CURRENT DEVOTIONAL DAY</Text>
              <Text style={s.cardTitle}>{today.data.today.title}</Text>
              <Text style={s.cardSub}>
                {today.data.today.passageLabel || "A reading for this moment"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={D2.amber} />
          </Pressable>
        ) : null}

        <SectionHeading
          title="Daily Readings"
          subtitle="Two voices to meet you where you are"
          testID="devotions-preview-daily-section"
        />
        <View style={s.dailyRow}>
          <Pressable
            style={[s.dailyCard, { backgroundColor: D2.amberSoft }]}
            onPress={() => router.push("/odb-devotional-preview" as any)}
            testID="devotions-preview-odb-card"
          >
            <Ionicons name="sunny-outline" size={21} color={D2.amber} />
            <Text style={s.metaAmber}>OUR DAILY BREAD</Text>
            <Text style={s.cardTitle} numberOfLines={2}>
              {odb.data?.title || "Today's bread"}
            </Text>
            <Text style={s.cardSub}>
              {odb.data?.date
                ? new Date(`${odb.data.date}T00:00:00`).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "A short pause for the day"}
            </Text>
          </Pressable>
          <Pressable
            style={[s.dailyCard, { backgroundColor: "#F7EBDD" }]}
            onPress={() => router.push("/egw-devotional-preview" as any)}
            testID="devotions-preview-egw-card"
          >
            <Ionicons name="leaf-outline" size={21} color={D2.amber} />
            <Text style={s.metaAmber}>ELLEN G. WHITE</Text>
            <Text style={s.cardTitle} numberOfLines={2}>
              {egw.data?.title || "A daily reflection"}
            </Text>
            <Text style={s.cardSub}>{egw.data?.bookTitle || "Selected devotional reading"}</Text>
          </Pressable>
        </View>

        <SectionHeading
          title="Devotional Series"
          subtitle="Scripture, context, and a prayerful response"
          testID="devotions-preview-series-section"
        />
        {devotionalPlans.isLoading ? (
          <LoadingState />
        ) : catalogSeries.length ? (
          catalogSeries.map((p) => (
            <Pressable
              key={p.id}
              style={s.rowCard}
              onPress={() => setSeriesId(p.id)}
              testID={`devotions-preview-series-${p.id}`}
            >
              <View style={[s.rowIcon, { backgroundColor: D2.amberSoft }]}>
                <Ionicons name="library-outline" size={19} color={D2.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{p.title}</Text>
                <Text style={s.cardSub}>
                  {p.theme || "Guided devotional"} · {p.totalDays} days
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={D2.muted} />
            </Pressable>
          ))
        ) : (
          <EmptyState title="More series soon" body="New guided devotional series will appear here." />
        )}

        <SectionHeading
          title="Reading Plans"
          subtitle="A steady way through Scripture"
          testID="devotions-preview-plans-section"
        />
        {plans.isLoading ? (
          <LoadingState label="Loading the library" />
        ) : (
          <View style={s.planFeature}>
            <LinearGradient colors={[...D2.violetGradient]} style={s.planGradient}>
              <Text style={s.featureMeta}>FEATURED PATH</Text>
              <Text style={s.featureTitle}>{featuredPlan?.title || "A plan for this season"}</Text>
              <Text style={s.featureBody}>
                {featuredPlan?.description ||
                  "Set aside a few minutes and let the Word shape your day."}
              </Text>
              <Pressable
                onPress={() => featuredPlan && setDetailId(featuredPlan.id)}
                style={s.learnButton}
                testID="devotions-preview-featured-action"
              >
                <Text style={s.learnText}>View plan</Text>
              </Pressable>
            </LinearGradient>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryRail}
        >
          {categories.map((item) => (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              style={[s.categoryPill, category === item && s.categoryActive]}
              testID={`devotions-preview-category-${item}`}
            >
              <Text style={[s.categoryText, category === item && s.categoryActiveText]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={s.libraryRow}>
          {filteredPlans.map((p) => (
            <Pressable
              key={p.id}
              style={s.libraryCard}
              onPress={() => setDetailId(p.id)}
              testID={`devotions-preview-plan-${p.id}`}
            >
              <View style={s.libraryDot}>
                <Ionicons name="bookmark-outline" size={16} color={D2.violet} />
              </View>
              <Text style={s.cardTitle} numberOfLines={2}>
                {p.title}
              </Text>
              <Text style={s.cardSub}>{p.category || "Scripture"} · {p.durationDays} days</Text>
            </Pressable>
          ))}
        </View>

        <SectionHeading
          title="Your Shelf"
          subtitle="Finished journeys worth remembering"
          testID="devotions-preview-shelf-section"
        />
        {completed.length ? (
          completed.map((p) => (
            <View
              key={p.id}
              style={s.shelfCard}
              testID={`devotions-preview-shelf-${p.id}`}
            >
              <Ionicons name="checkmark-circle" size={22} color={D2.sage} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{p.planTitle}</Text>
                <Text style={s.cardSub}>Completed · {p.planDurationDays} days</Text>
              </View>
              <Ionicons name="bookmark" size={18} color={D2.sage} />
            </View>
          ))
        ) : (
          <EmptyState
            title="Your shelf is waiting"
            body="Completed plans will settle here as a record of what you have read."
            testID="devotions-preview-shelf-empty"
          />
        )}
      </ScrollView>

      <PlanModal
        plan={detail.data}
        visible={!!detailId}
        loading={detail.isLoading}
        enrolled={!!detail.data && enrolledPlanIds.has(detail.data.id)}
        onClose={() => setDetailId(null)}
        onStart={() => detail.data && gate(() => enroll.mutate(detail.data!.id))}
      />
      <SeriesModal
        plan={catalogSeries.find((item) => item.id === seriesId)}
        days={seriesDetail.data || []}
        visible={!!seriesId}
        loading={seriesDetail.isLoading}
        active={today.data?.enrollment?.planId === seriesId}
        onClose={() => {
          setSeriesId(null);
          if (paramSeriesId) router.setParams({ seriesId: undefined });
        }}
        onStart={() => {
          if (!seriesId) return;
          if (today.data?.enrollment?.planId === seriesId) {
            setSeriesId(null);
            if (paramSeriesId) router.setParams({ seriesId: undefined });
            router.push(`/devotional-day-preview?planId=${seriesId}&depth=quick` as any);
            return;
          }
          gate(() => enrollSeries.mutate(seriesId), "Sign in to start a devotional series.");
        }}
      />
    </View>
  );
}

function PlanModal({
  plan,
  visible,
  loading,
  enrolled,
  onClose,
  onStart,
}: {
  plan?: Detail;
  visible: boolean;
  loading: boolean;
  enrolled: boolean;
  onClose: () => void;
  onStart: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalShade}>
        <View style={s.sheet} testID="devotions-preview-plan-sheet">
          <View style={s.sheetHandle} />
          <Pressable
            accessibilityLabel="Close plan details"
            accessibilityRole="button"
            onPress={onClose}
            style={s.close}
          >
            <Ionicons name="close" size={22} color={D2.ink} />
          </Pressable>
          {loading ? (
            <LoadingState />
          ) : plan ? (
            <ScrollView>
              <Text style={s.sheetEyebrow}>
                {plan.category || "READING PLAN"} · {plan.durationDays} DAYS
              </Text>
              <Text style={s.sheetTitle}>{plan.title}</Text>
              <Text style={s.sheetBody}>{plan.description}</Text>
              <Text style={s.outlineLabel}>DAY-BY-DAY OUTLINE</Text>
              {(plan.days || []).slice(0, 8).map((d) => (
                <View key={d.id} style={s.dayLine}>
                  <Text style={s.dayNum}>{d.dayNumber}</Text>
                  <Text style={s.cardSub}>
                    {d.bookId ? `Scripture reading · chapter ${d.chapter || 1}` : "Reflection and prayer"}
                  </Text>
                </View>
              ))}
              {enrolled ? (
                <View style={s.enrolledNotice} testID="devotions-preview-plan-enrolled">
                  <Ionicons name="checkmark-circle" size={18} color={D2.sage} />
                  <Text style={s.enrolledText}>Already in your plans</Text>
                </View>
              ) : (
                <PrimaryButton
                  label="Start this plan"
                  onPress={onStart}
                  testID="devotions-preview-plan-start"
                />
              )}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function SeriesModal({
  plan,
  days,
  visible,
  loading,
  active,
  onClose,
  onStart,
}: {
  plan?: DevotionalPlan;
  days: { id: string; dayNumber: number; title: string; passageLabel: string | null }[];
  visible: boolean;
  loading: boolean;
  active: boolean;
  onClose: () => void;
  onStart: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalShade}>
        <View style={s.sheet} testID="devotions-preview-series-sheet">
          <View style={s.sheetHandle} />
          <Pressable
            accessibilityLabel="Close series details"
            accessibilityRole="button"
            onPress={onClose}
            style={s.close}
          >
            <Ionicons name="close" size={22} color={D2.ink} />
          </Pressable>
          {loading ? (
            <LoadingState label="Opening the series" />
          ) : plan ? (
            <ScrollView>
              <Text style={s.sheetEyebrow}>
                DEVOTIONAL SERIES · {plan.totalDays} DAYS
              </Text>
              <Text style={s.sheetTitle}>{plan.title}</Text>
              <Text style={s.sheetBody}>{plan.description}</Text>
              <Text style={s.outlineLabel}>SERIES OUTLINE</Text>
              {days.map((day) => (
                <View key={day.id} style={s.dayLine}>
                  <Text style={s.dayNum}>{day.dayNumber}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{day.title}</Text>
                    {day.passageLabel ? (
                      <Text style={s.cardSub}>{day.passageLabel}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
              <PrimaryButton
                label={active ? "Continue this series" : "Start this series"}
                onPress={onStart}
                testID="devotions-preview-series-start"
              />
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: D2.surface,
  },
  content: {
    paddingHorizontal: 20,
  },
  welcome: {
    paddingTop: 10,
    paddingBottom: 6,
  },
  kicker: {
    fontFamily: F.interBold,
    color: D2.coral,
    fontSize: 10,
    letterSpacing: 1.8,
  },
  heroTitle: {
    fontFamily: F.loraBold,
    color: D2.ink,
    fontSize: 31,
    lineHeight: 38,
    marginTop: 8,
    maxWidth: 330,
  },
  heroBody: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    maxWidth: 330,
  },
  continueCard: {
    backgroundColor: D2.card,
    borderRadius: 20,
    padding: 16,
    gap: 17,
    borderWidth: 1,
    borderColor: D2.border,
  },
  continueTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  continueIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: D2.coralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    fontFamily: F.interBold,
    color: D2.coral,
    fontSize: 9,
    letterSpacing: 1,
  },
  cardTitle: {
    fontFamily: F.interSemi,
    color: D2.ink,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 3,
  },
  cardSub: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  percent: {
    fontFamily: F.interBold,
    color: D2.coral,
    fontSize: 12,
  },
  continueActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  devotionalToday: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#FFF8ED",
    borderWidth: 1,
    borderColor: "#EADBC3",
    borderRadius: 16,
    padding: 13,
    marginTop: 9,
  },
  todayMark: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: D2.amberSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  quietAction: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: D2.violetFill,
  },
  quietText: {
    color: D2.violet,
    fontFamily: F.interSemi,
    fontSize: 11,
  },
  dailyRow: {
    flexDirection: "row",
    gap: 10,
  },
  dailyCard: {
    flex: 1,
    borderRadius: 17,
    padding: 14,
    minHeight: 150,
    gap: 7,
  },
  metaAmber: {
    fontFamily: F.interBold,
    color: D2.amber,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 5,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: D2.card,
    borderWidth: 1,
    borderColor: D2.border,
    marginBottom: 9,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  planFeature: {
    borderRadius: 20,
    overflow: "hidden",
  },
  planGradient: {
    padding: 20,
    minHeight: 190,
  },
  featureMeta: {
    color: "rgba(255,255,255,.75)",
    fontFamily: F.interBold,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  featureTitle: {
    color: "#fff",
    fontFamily: F.loraBold,
    fontSize: 24,
    lineHeight: 30,
    marginTop: 12,
  },
  featureBody: {
    color: "rgba(255,255,255,.82)",
    fontFamily: F.inter,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    maxWidth: 290,
  },
  learnButton: {
    alignSelf: "flex-start",
    marginTop: 16,
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 10,
  },
  learnText: {
    fontFamily: F.interSemi,
    color: D2.violet,
    fontSize: 12,
  },
  categoryRail: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: "#F0ECE5",
  },
  categoryActive: {
    backgroundColor: D2.violet,
  },
  categoryText: {
    fontFamily: F.interMed,
    color: D2.muted,
    fontSize: 12,
  },
  categoryActiveText: {
    color: "#fff",
  },
  libraryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 10,
  },
  libraryCard: {
    width: "48%",
    backgroundColor: D2.card,
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: D2.border,
    minHeight: 125,
  },
  libraryDot: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: D2.violetFill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  shelfCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: 16,
    backgroundColor: D2.sageSoft,
    marginBottom: 9,
  },
  modalShade: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(31,26,18,.35)",
  },
  sheet: {
    maxHeight: "86%",
    backgroundColor: D2.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingTop: 15,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#D7D0C5",
    alignSelf: "center",
    marginBottom: 8,
  },
  close: {
    alignSelf: "flex-end",
    padding: 3,
  },
  sheetEyebrow: {
    fontFamily: F.interBold,
    color: D2.violet,
    fontSize: 10,
    letterSpacing: 1.3,
    marginTop: 3,
  },
  sheetTitle: {
    fontFamily: F.loraBold,
    color: D2.ink,
    fontSize: 27,
    lineHeight: 33,
    marginTop: 8,
  },
  sheetBody: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    marginBottom: 20,
  },
  outlineLabel: {
    fontFamily: F.interBold,
    color: D2.muted,
    fontSize: 10,
    letterSpacing: 1.2,
    marginTop: 15,
    marginBottom: 9,
  },
  dayLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: D2.border,
    paddingVertical: 10,
  },
  dayNum: {
    width: 28,
    height: 28,
    borderRadius: 9,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: D2.violetFill,
    color: D2.violet,
    fontFamily: F.interBold,
    paddingTop: 6,
  },
  enrolledNotice: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: D2.sageSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  enrolledText: {
    fontFamily: F.interBold,
    color: D2.sage,
    fontSize: 14,
  },
});

function planIdParam(value?: string) {
  return value ? `planId=${encodeURIComponent(value)}` : "";
}
