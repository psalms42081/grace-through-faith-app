import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";

interface WeeklyStreakData {
  daysRead: boolean[];
  perfectWeeks: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;
}

interface TodayResponse {
  today: { dayNumber: number; title: string; passageLabel: string | null } | null;
  enrollment?: { planId: string };
  completedCount?: number;
  totalDays?: number;
  planComplete?: boolean;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const BADGES = [
  { id: "first-read", title: "First Read", icon: "book" as const, color: "#C9933A", requirement: "Read your first chapter" },
  { id: "week-streak", title: "Week Warrior", icon: "flame" as const, color: "#FF6B35", requirement: "7-day reading streak" },
  { id: "plan-starter", title: "Plan Starter", icon: "flag" as const, color: "#3B6CB5", requirement: "Start a devotional plan" },
  { id: "prayer-warrior", title: "Prayer Warrior", icon: "hand-left" as const, color: "#8B5CF6", requirement: "Add 5 prayer requests" },
  { id: "deep-diver", title: "Deep Diver", icon: "layers" as const, color: "#2E7D32", requirement: "Use all 4 study layers" },
  { id: "perfect-week", title: "Perfect Week", icon: "trophy" as const, color: "#E8456B", requirement: "Read every day for a week" },
];

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: weeklyData } = useQuery<WeeklyStreakData>({
    queryKey: ["/api/reading-streaks/weekly?userId=guest"],
  });

  const { data: recentReads } = useQuery<{ id: string; bookId: number; bookName: string; chapter: number; translation: string; readAt: string }[]>({
    queryKey: ["/api/reading-history/recent?userId=guest"],
  });

  const { data: todayData } = useQuery<TodayResponse>({
    queryKey: ["/api/devotionals/today?userId=guest"],
  });

  const { data: prayerCount } = useQuery<{ id: string }[]>({
    queryKey: ["/api/prayers?userId=guest"],
  });

  const daysRead = weeklyData?.daysRead ?? [false, false, false, false, false, false, false];
  const streak = weeklyData?.currentStreak ?? 0;
  const longestStreak = weeklyData?.longestStreak ?? 0;
  const perfectWeeks = weeklyData?.perfectWeeks ?? 0;
  const totalReads = recentReads?.length ?? 0;
  const todayIdx = new Date().getDay();

  const earnedBadges = new Set<string>();
  if (totalReads > 0) earnedBadges.add("first-read");
  if (streak >= 7) earnedBadges.add("week-streak");
  if (todayData?.enrollment) earnedBadges.add("plan-starter");
  if (prayerCount && prayerCount.length >= 5) earnedBadges.add("prayer-warrior");
  if (perfectWeeks > 0) earnedBadges.add("perfect-week");

  return (
    <ScrollView
      style={[st.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: bottomPad + 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={st.headerSection}>
        <View style={[st.avatarCircle, { backgroundColor: theme.accent }]}>
          <Ionicons name="person" size={36} color="#fff" />
        </View>
        <Text style={[st.userName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Guest
        </Text>
        <Text style={[st.userSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Grace through Faith
        </Text>
      </View>

      <View style={st.statsRow}>
        <View style={[st.statCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
          <Ionicons name="flame" size={22} color="#FF6B35" />
          <Text style={[st.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{streak}</Text>
          <Text style={[st.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Current{"\n"}Streak</Text>
        </View>
        <View style={[st.statCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
          <Ionicons name="trending-up" size={22} color={theme.accent} />
          <Text style={[st.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{longestStreak}</Text>
          <Text style={[st.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Longest{"\n"}Streak</Text>
        </View>
        <View style={[st.statCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
          <Ionicons name="trophy" size={22} color="#E8456B" />
          <Text style={[st.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{perfectWeeks}</Text>
          <Text style={[st.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Perfect{"\n"}Weeks</Text>
        </View>
      </View>

      {weeklyData && (
        <View style={[st.weeklyCard, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
          <Text style={[st.weeklyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            This Week
          </Text>
          <View style={st.weekRow}>
            {DAY_LABELS.map((label, i) => {
              const isToday = i === todayIdx;
              const didRead = daysRead[i];
              return (
                <View key={i} style={st.weekDayCol}>
                  <Text style={[st.weekLabel, { color: isToday ? theme.accent : theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                    {label}
                  </Text>
                  <View
                    style={[
                      st.weekDot,
                      didRead && { backgroundColor: theme.accent },
                      isToday && !didRead && { borderColor: theme.accent, borderWidth: 2 },
                    ]}
                  >
                    {didRead && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={[st.weekSummary, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {daysRead.filter(Boolean).length} of 7 days completed
          </Text>
        </View>
      )}

      <View style={st.sectionPad}>
        <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Badges
        </Text>
        <View style={st.badgeGrid}>
          {BADGES.map((badge) => {
            const earned = earnedBadges.has(badge.id);
            return (
              <View
                key={badge.id}
                style={[
                  st.badgeCard,
                  { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" },
                  !earned && { opacity: 0.45 },
                ]}
              >
                <View style={[st.badgeIcon, { backgroundColor: badge.color + (earned ? "20" : "10") }]}>
                  <Ionicons name={badge.icon} size={22} color={earned ? badge.color : theme.textMuted} />
                </View>
                <Text
                  style={[st.badgeTitle, { color: earned ? theme.text : theme.textMuted, fontFamily: "Inter_600SemiBold" }]}
                  numberOfLines={1}
                >
                  {badge.title}
                </Text>
                <Text style={[st.badgeReq, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                  {badge.requirement}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {recentReads && recentReads.length > 0 && (
        <View style={st.sectionPad}>
          <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Recent Activity
          </Text>
          {recentReads.slice(0, 5).map((read, i) => (
            <Pressable
              key={read.id}
              onPress={() => router.push(`/read/${read.bookId}/${read.chapter}?translation=${read.translation || "KJV"}`)}
              style={({ pressed }) => [
                st.activityRow,
                { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[st.activityIcon, { backgroundColor: theme.accent + "15" }]}>
                <Ionicons name="book" size={16} color={theme.accent} />
              </View>
              <View style={st.activityInfo}>
                <Text style={[st.activityTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {read.bookName} {read.chapter}
                </Text>
                <Text style={[st.activityTime, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {read.readAt ? formatTimeAgo(read.readAt) : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={st.sectionPad}>
        <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Quick Links
        </Text>
        {[
          { title: "Prayer Journal", icon: "journal" as const, color: "#8B5CF6", route: "/prayer-journal" },
          { title: "Christian Music", icon: "musical-notes" as const, color: "#C9933A", route: "/music" },
          { title: "Family & Faith", icon: "people" as const, color: "#3B6CB5", route: "/family" },
          { title: "Bible Maps", icon: "map" as const, color: "#2E7D32", route: "/maps-timeline?tab=maps" },
          { title: "Timeline", icon: "time" as const, color: "#E65100", route: "/maps-timeline?tab=timeline" },
        ].map((link) => (
          <Pressable
            key={link.title}
            onPress={() => router.push(link.route as any)}
            style={({ pressed }) => [
              st.linkRow,
              { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[st.linkIcon, { backgroundColor: link.color + "15" }]}>
              <Ionicons name={link.icon} size={18} color={link.color} />
            </View>
            <Text style={[st.linkTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
              {link.title}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

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

const st = StyleSheet.create({
  container: { flex: 1 },
  headerSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  userName: { fontSize: 24, marginBottom: 4 },
  userSub: { fontSize: 14 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  statNum: { fontSize: 24 },
  statLabel: { fontSize: 11, textAlign: "center", lineHeight: 15 },
  weeklyCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  weeklyTitle: { fontSize: 16, marginBottom: 16 },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 14,
  },
  weekDayCol: {
    alignItems: "center",
    gap: 8,
  },
  weekLabel: { fontSize: 12 },
  weekDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(128,128,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  weekSummary: { fontSize: 13, textAlign: "center" },
  sectionPad: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 22, marginBottom: 14 },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badgeCard: {
    width: "31%" as any,
    flexGrow: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTitle: { fontSize: 12, textAlign: "center" },
  badgeReq: { fontSize: 10, textAlign: "center", lineHeight: 14 },
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
  activityTime: { fontSize: 12, marginTop: 2 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    marginBottom: 6,
  },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  linkTitle: { flex: 1, fontSize: 15 },
});
