import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
interface Plan {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  theme: string | null;
  difficultyLevel: string | null;
  estimatedMinutesPerDay: number | null;
}

interface TodayResponse {
  today: { dayNumber: number; title: string; passageLabel: string | null } | null;
  enrollment?: { planId: string };
  completedCount?: number;
  totalDays?: number;
  planComplete?: boolean;
}

const TABS = ["Find Plans", "My Plans"] as const;

const CATEGORIES = [
  { label: "All", icon: "apps" as const },
  { label: "Faith", icon: "shield" as const },
  { label: "Prayer", icon: "hand-left" as const },
  { label: "Wisdom", icon: "bulb" as const },
  { label: "Love", icon: "heart" as const },
  { label: "Hope", icon: "sunny" as const },
];

const PLAN_GRADIENTS: [string, string][] = [
  ["#C9933A", "#A87828"],
  ["#2E7D32", "#1B5E20"],
  ["#3B6CB5", "#2A4F8F"],
  ["#8B5CF6", "#6D3BD4"],
  ["#E8456B", "#C2185B"],
  ["#FF6B35", "#E65100"],
  ["#00796B", "#4DB6AC"],
  ["#1565C0", "#42A5F5"],
];

const PLAN_ICONS: ("book" | "heart" | "leaf" | "star" | "sunny" | "flame" | "sparkles" | "diamond")[] =
  ["book", "heart", "leaf", "star", "sunny", "flame", "sparkles", "diamond"];

export default function PlansScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Find Plans");
  const [activeCategory, setActiveCategory] = useState("All");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/devotionals/plans?traditionKey=all"],
  });

  const { data: todayData } = useQuery<TodayResponse>({
    queryKey: ["/api/devotionals/today?userId=guest"],
  });

  const hasActivePlan = todayData?.today != null;
  const dayNumber = todayData?.today?.dayNumber ?? 0;
  const progress = todayData?.completedCount ?? dayNumber;
  const total = todayData?.totalDays ?? 1;
  const progressPct = total > 0 ? Math.min((progress / total) * 100, 100) : 0;

  const filteredPlans = plans?.filter((p) => {
    if (activeCategory === "All") return true;
    const themes = (p.theme || "").toLowerCase().split(",").map(t => t.trim());
    return themes.some(t => t.includes(activeCategory.toLowerCase()));
  });

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
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
                activeTab === tab && { backgroundColor: theme.accent },
                activeTab !== tab && { backgroundColor: isDark ? theme.backgroundCard : "#F0EBE0" },
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

      {activeTab === "My Plans" ? (
        <ScrollView
          contentContainerStyle={[st.content, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {hasActivePlan ? (
            <Pressable
              onPress={() => router.push(`/devotional-day?planId=${todayData?.enrollment?.planId || ""}`)}
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
            >
              <LinearGradient
                colors={["#C9933A", "#A87828"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.activePlanCard}
              >
                <View style={st.activePlanBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={[st.activePlanBadgeText, { fontFamily: "Inter_500Medium" }]}>IN PROGRESS</Text>
                </View>
                <Text style={[st.activePlanTitle, { fontFamily: "Lora_700Bold" }]}>
                  {todayData?.today?.title || "Current Plan"}
                </Text>
                <Text style={[st.activePlanDay, { fontFamily: "Inter_400Regular" }]}>
                  Day {progress} of {total}
                </Text>
                <View style={st.activePlanProgressTrack}>
                  <View style={[st.activePlanProgressFill, { width: `${progressPct}%` as any }]} />
                </View>
                <View style={st.activePlanFooter}>
                  <Text style={[st.activePlanCta, { fontFamily: "Inter_600SemiBold" }]}>
                    Continue Reading
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={[st.emptyState, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
              <View style={[st.emptyIcon, { backgroundColor: theme.accent + "15" }]}>
                <Ionicons name="book-outline" size={32} color={theme.accent} />
              </View>
              <Text style={[st.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                No Active Plans
              </Text>
              <Text style={[st.emptySub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Start a devotional plan to build a daily reading habit
              </Text>
              <Pressable
                onPress={() => setActiveTab("Find Plans")}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <LinearGradient
                  colors={["#C9933A", "#A87828"]}
                  style={st.emptyBtn}
                >
                  <Text style={[st.emptyBtnText, { fontFamily: "Inter_600SemiBold" }]}>Browse Plans</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[st.content, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.categoryRow}
          >
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.label}
                onPress={() => setActiveCategory(cat.label)}
                style={[
                  st.categoryChip,
                  activeCategory === cat.label
                    ? { backgroundColor: theme.accent }
                    : { backgroundColor: isDark ? theme.backgroundCard : "#F0EBE0" },
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={activeCategory === cat.label ? "#fff" : theme.textSecondary}
                />
                <Text
                  style={[
                    st.categoryText,
                    {
                      color: activeCategory === cat.label ? "#fff" : theme.textSecondary,
                      fontFamily: activeCategory === cat.label ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {filteredPlans && filteredPlans.length > 0 ? (
            <View style={st.planGrid}>
              {filteredPlans.map((plan, i) => (
                <Pressable
                  key={plan.id}
                  onPress={() => router.push("/devotionals")}
                  style={({ pressed }) => [st.planCardWrap, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <LinearGradient
                    colors={PLAN_GRADIENTS[i % PLAN_GRADIENTS.length]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={st.planCard}
                  >
                    <Ionicons
                      name={PLAN_ICONS[i % PLAN_ICONS.length]}
                      size={36}
                      color="rgba(255,255,255,0.15)"
                      style={st.planCardBgIcon}
                    />
                    <View style={st.planCardContent}>
                      <Text style={[st.planCardTitle, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
                        {plan.title}
                      </Text>
                      <Text style={[st.planCardMeta, { fontFamily: "Inter_400Regular" }]}>
                        {plan.totalDays} days
                        {plan.estimatedMinutesPerDay ? ` · ${plan.estimatedMinutesPerDay} min/day` : ""}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={st.noResults}>
              <Text style={[st.noResultsText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                No plans found for this category
              </Text>
            </View>
          )}

          <View style={st.featuredSection}>
            <Text style={[st.featuredTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Why Read a Plan?
            </Text>
            <View style={[st.featuredCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
              {[
                { icon: "calendar" as const, title: "Build consistency", desc: "Daily readings create a habit" },
                { icon: "layers" as const, title: "Go deeper", desc: "Structured study on key topics" },
                { icon: "people" as const, title: "Stay accountable", desc: "Track your progress over time" },
              ].map((item, i) => (
                <View key={i} style={[st.benefitRow, i < 2 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
                  <View style={[st.benefitIcon, { backgroundColor: theme.accent + "15" }]}>
                    <Ionicons name={item.icon} size={18} color={theme.accent} />
                  </View>
                  <View style={st.benefitInfo}>
                    <Text style={[st.benefitTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                      {item.title}
                    </Text>
                    <Text style={[st.benefitDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {item.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 28, marginBottom: 16 },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  tabText: { fontSize: 14 },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  categoryRow: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: { fontSize: 13 },
  planGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  planCardWrap: {
    width: "47%" as any,
    flexGrow: 1,
  },
  planCard: {
    borderRadius: 18,
    padding: 18,
    minHeight: 180,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  planCardBgIcon: {
    position: "absolute",
    top: 18,
    right: 18,
  },
  planCardContent: { gap: 4 },
  planCardTitle: { color: "#fff", fontSize: 16, lineHeight: 22 },
  planCardMeta: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  activePlanCard: {
    borderRadius: 22,
    padding: 24,
    gap: 12,
  },
  activePlanBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activePlanBadgeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    letterSpacing: 1.5,
  },
  activePlanTitle: {
    color: "#fff",
    fontSize: 22,
  },
  activePlanDay: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  activePlanProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  activePlanProgressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  activePlanFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  activePlanCta: {
    color: "#fff",
    fontSize: 15,
  },
  emptyState: {
    borderRadius: 22,
    padding: 32,
    alignItems: "center",
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
  emptyTitle: { fontSize: 20 },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 260 },
  emptyBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontSize: 15 },
  noResults: {
    padding: 40,
    alignItems: "center",
  },
  noResultsText: { fontSize: 14 },
  featuredSection: {
    marginTop: 32,
  },
  featuredTitle: { fontSize: 22, marginBottom: 14 },
  featuredCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitInfo: { flex: 1 },
  benefitTitle: { fontSize: 15, marginBottom: 2 },
  benefitDesc: { fontSize: 13 },
});
