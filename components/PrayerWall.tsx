import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  FadeInDown,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useProStatus } from "@/contexts/ProContext";
import { useAuth } from "@/contexts/AuthContext";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

interface FamilyPrayer {
  id: string;
  userId: string;
  familyId: string | null;
  title: string;
  content: string | null;
  category: string;
  authorName: string | null;
  answered: boolean;
  answeredAt: string | null;
  supportCount: number;
  supportedBy: string[];
  scripturalVerse: string | null;
  scripturalNote: string | null;
  createdAt: string;
}

function GlowCard({
  prayer,
  theme,
  isDark,
  onSupport,
  onToggleAnswered,
  supportPending,
}: {
  prayer: FamilyPrayer;
  theme: any;
  isDark: boolean;
  onSupport: (id: string) => void;
  onToggleAnswered: (id: string, answered: boolean) => void;
  supportPending: boolean;
}) {
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);

  const handleSupport = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    glowOpacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(600, withTiming(0, { duration: 800 }))
    );
    glowScale.value = withSequence(
      withTiming(1.03, { duration: 300, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 500 })
    );
    onSupport(prayer.id);
  }, [prayer.id, onSupport]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const cardBg = prayer.answered
    ? isDark ? "#2A2418" : "#FFF8E7"
    : isDark ? "#1A1A22" : "#FEFDFB";

  const cardBorder = prayer.answered
    ? "#C9933A40"
    : isDark ? "#2A2A3A" : "#E8E0D0";

  const timeSince = getTimeSince(prayer.createdAt);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
    >
      <Animated.View
        style={[
          styles.glowOverlay,
          {
            borderColor: "#C9933A",
            borderRadius: 14,
          },
          glowStyle,
        ]}
        pointerEvents="none"
      />

      <View style={styles.cardHeader}>
        <View style={styles.authorRow}>
          <Ionicons
            name={prayer.answered ? "checkmark-circle" : "flame-outline"}
            size={16}
            color={prayer.answered ? "#C9933A" : theme.accent}
          />
          <Text style={[styles.authorName, { color: theme.textSecondary }]}>
            {prayer.authorName || "Family Member"}
          </Text>
          <Text style={[styles.timeAgo, { color: theme.textMuted }]}>{timeSince}</Text>
        </View>
      </View>

      <Text style={[styles.prayerTitle, { color: theme.text }]}>{prayer.title}</Text>

      {prayer.content && (
        <Text style={[styles.prayerContent, { color: theme.textSecondary }]} numberOfLines={3}>
          {prayer.content}
        </Text>
      )}

      {prayer.scripturalVerse && (
        <View style={[styles.scriptureBox, { backgroundColor: isDark ? "#0F0F18" : "#F5F0E5" }]}>
          <Ionicons name="book-outline" size={14} color={theme.accent} />
          <View style={styles.scriptureTextContainer}>
            <Text style={[styles.scriptureVerse, { color: theme.text }]}>
              {prayer.scripturalVerse}
            </Text>
            {prayer.scripturalNote && (
              <Text style={[styles.scriptureNote, { color: theme.textSecondary }]}>
                {prayer.scripturalNote}
              </Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.cardActions}>
        <Pressable
          style={[styles.supportButton, { backgroundColor: isDark ? "#1F1F2E" : "#F0EBE0" }]}
          onPress={handleSupport}
          disabled={supportPending}
          testID={`prayer-support-${prayer.id}`}
        >
          <Ionicons name="heart" size={16} color="#C9933A" />
          <Text style={[styles.supportText, { color: theme.text }]}>
            {prayer.supportCount > 0 ? `${prayer.supportCount} Prayed` : "Pray for This"}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.answeredToggle,
            prayer.answered && { backgroundColor: "#C9933A20" },
          ]}
          onPress={() => onToggleAnswered(prayer.id, !prayer.answered)}
          testID={`prayer-answered-${prayer.id}`}
        >
          <Ionicons
            name={prayer.answered ? "trophy" : "trophy-outline"}
            size={15}
            color={prayer.answered ? "#C9933A" : theme.textMuted}
          />
          <Text
            style={[
              styles.answeredText,
              { color: prayer.answered ? "#C9933A" : theme.textMuted },
            ]}
          >
            {prayer.answered ? "Praise Report" : "Answered?"}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function getTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function PrayerWall({ groupId }: { groupId?: string } = {}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { isPro } = useProStatus();
  const { userId, user } = useAuth();
  const qc = useQueryClient();
  const displayName = user?.displayName || "Family Member";

  const isGroupMode = !!groupId;
  const queryKeyStr = isGroupMode
    ? `/api/groups/${groupId}/prayers`
    : `/api/family/prayers?userId=${userId}`;

  const [showForm, setShowForm] = useState(false);
  const [prayerTitle, setPrayerTitle] = useState("");
  const [prayerContent, setPrayerContent] = useState("");
  const [authorName, setAuthorName] = useState("");

  const { data: prayers } = useQuery<FamilyPrayer[]>({
    queryKey: [queryKeyStr],
    enabled: isPro,
  });

  const postMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; authorName: string }) => {
      const endpoint = isGroupMode
        ? `/api/groups/${groupId}/prayers`
        : "/api/family/prayers";
      const res = await apiRequest("POST", endpoint, {
        userId,
        familyId: userId,
        ...data,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeyStr] });
      setPrayerTitle("");
      setPrayerContent("");
      setShowForm(false);
    },
  });

  const supportMutation = useMutation({
    mutationFn: async (prayerId: string) => {
      const endpoint = isGroupMode
        ? `/api/groups/${groupId}/prayers/${prayerId}/support`
        : `/api/family/prayers/${prayerId}/support`;
      const res = await apiRequest("POST", endpoint, {
        userId,
        memberName: displayName,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeyStr] });
    },
  });

  const answeredMutation = useMutation({
    mutationFn: async ({ id, answered }: { id: string; answered: boolean }) => {
      const endpoint = isGroupMode
        ? `/api/groups/${groupId}/prayers/${id}/answered`
        : `/api/family/prayers/${id}/answered`;
      const res = await apiRequest("POST", endpoint, {
        userId,
        answered,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/family/prayers?userId=guest"] });
    },
  });

  const handlePost = useCallback(() => {
    if (!prayerTitle.trim()) return;
    postMutation.mutate({
      title: prayerTitle.trim(),
      content: prayerContent.trim(),
      authorName: authorName.trim() || "Family Member",
    });
  }, [prayerTitle, prayerContent, authorName]);

  const handleToggleAnswered = useCallback((id: string, answered: boolean) => {
    if (answered) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    answeredMutation.mutate({ id, answered });
  }, []);

  const activePrayers = prayers?.filter((p) => !p.answered) || [];
  const answeredPrayers = prayers?.filter((p) => p.answered) || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={styles.titleRow}>
        <Ionicons name="flame" size={18} color={theme.accent} />
        <Text style={[styles.title, { color: theme.text }]}>Family Altar</Text>
        <Pressable
          style={[styles.addButton, { backgroundColor: theme.accent + "15" }]}
          onPress={() => setShowForm(!showForm)}
          testID="prayer-add-btn"
        >
          <Ionicons name={showForm ? "close" : "add"} size={18} color={theme.accent} />
        </Pressable>
      </View>

      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Lift up your family in prayer together
      </Text>

      {showForm && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.formContainer, { backgroundColor: isDark ? "#0F0F18" : "#F8F4EC", borderColor: theme.border }]}
        >
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: isDark ? "#1A1A24" : "#FFFFFF" }]}
            placeholder="Prayer request..."
            placeholderTextColor={theme.textMuted}
            value={prayerTitle}
            onChangeText={setPrayerTitle}
            testID="prayer-title-input"
          />
          <TextInput
            style={[styles.input, styles.contentInput, { color: theme.text, borderColor: theme.border, backgroundColor: isDark ? "#1A1A24" : "#FFFFFF" }]}
            placeholder="Details (optional)"
            placeholderTextColor={theme.textMuted}
            value={prayerContent}
            onChangeText={setPrayerContent}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            testID="prayer-content-input"
          />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: isDark ? "#1A1A24" : "#FFFFFF" }]}
            placeholder="Your name"
            placeholderTextColor={theme.textMuted}
            value={authorName}
            onChangeText={setAuthorName}
            testID="prayer-author-input"
          />
          <Pressable
            style={[styles.postButton, { backgroundColor: theme.accent, opacity: prayerTitle.trim() ? 1 : 0.5 }]}
            onPress={handlePost}
            disabled={!prayerTitle.trim() || postMutation.isPending}
            testID="prayer-post-btn"
          >
            {postMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.postButtonText}>Post Prayer</Text>
            )}
          </Pressable>
        </Animated.View>
      )}

      {activePrayers.length === 0 && !showForm && (
        <View style={styles.emptyState}>
          <Ionicons name="flame-outline" size={32} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No prayer requests yet. Lift your family up in prayer.
          </Text>
        </View>
      )}

      {activePrayers.map((prayer) => (
        <GlowCard
          key={prayer.id}
          prayer={prayer}
          theme={theme}
          isDark={isDark}
          onSupport={(id) => supportMutation.mutate(id)}
          onToggleAnswered={handleToggleAnswered}
          supportPending={supportMutation.isPending}
        />
      ))}

      {answeredPrayers.length > 0 && (
        <View style={styles.answeredSection}>
          <View style={styles.answeredHeader}>
            <Ionicons name="trophy" size={16} color="#C9933A" />
            <Text style={[styles.answeredTitle, { color: "#C9933A" }]}>
              Praise Reports ({answeredPrayers.length})
            </Text>
          </View>
          {answeredPrayers.map((prayer) => (
            <GlowCard
              key={prayer.id}
              prayer={prayer}
              theme={theme}
              isDark={isDark}
              onSupport={(id) => supportMutation.mutate(id)}
              onToggleAnswered={handleToggleAnswered}
              supportPending={supportMutation.isPending}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    marginBottom: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  formContainer: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  contentInput: {
    minHeight: 70,
  },
  postButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  postButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
  },
  cardHeader: {
    marginBottom: 6,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  timeAgo: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  prayerTitle: {
    fontSize: 15,
    fontFamily: "Lora_600SemiBold",
    marginBottom: 4,
    lineHeight: 22,
  },
  prayerContent: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 8,
  },
  scriptureBox: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  scriptureTextContainer: {
    flex: 1,
    gap: 4,
  },
  scriptureVerse: {
    fontSize: 12,
    fontFamily: "Lora_400Regular_Italic",
    lineHeight: 18,
  },
  scriptureNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    fontStyle: "italic",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  supportText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  answeredToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
  },
  answeredText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 18,
  },
  answeredSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#C9933A20",
  },
  answeredHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  answeredTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
