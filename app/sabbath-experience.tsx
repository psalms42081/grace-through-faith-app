import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useSabbath, getSabbathPhase, SabbathPhase } from "@/lib/sabbath";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/contexts/ToastContext";
import StudyDepthSelector, { DepthBadge } from "@/components/StudyDepthSelector";
import { useStudyDepth } from "@/contexts/StudyDepthContext";
import { PathB } from "@/constants/colors";

const SABBATH_GOLD = "#D4A245"; // sun glyph only — not chrome

const THEOLOGICAL_FRAMES = [
  {
    theme: "Creation",
    text: "God blessed the seventh day and sanctified it, because in it He rested from all His work. The Sabbath is woven into the very fabric of creation \u2014 a gift before sin entered. It declares that our worth comes not from what we produce, but from Whose we are.",
    ref: "Genesis 2:3",
  },
  {
    theme: "Redemption",
    text: "The Sabbath points to the finished work of Christ. As God rested from creation, so we rest in the completed salvation He provides. Every Sabbath is a rehearsal of the eternal rest that awaits.",
    ref: "Hebrews 4:9-10",
  },
  {
    theme: "Identity",
    text: "Sabbath-keeping is an act of identity. It declares to the watching universe: we belong to the Creator. It is the seal of God, the sign of the covenant between Him and His people.",
    ref: "Ezekiel 20:12",
  },
  {
    theme: "Mission",
    text: "The Sabbath is not merely an absence of work \u2014 it is a presence of purpose. It reorients us toward God\u2019s mission: healing, fellowship, worship, and preparation for eternity.",
    ref: "Luke 4:16",
  },
];

const PROMPTS = [
  "What am I grateful for this week?",
  "Where did I see God working in my life?",
  "What do I need to surrender to God?",
];

const WORSHIP_PATHWAYS = [
  { icon: "book" as const, label: "Sabbath School", route: "/(tabs)/ss/sabbath-school" },
  { icon: "school" as const, label: "Study Paths", route: "/study-paths" },
  { icon: "git-network" as const, label: "Great Controversy", route: "/great-controversy" },
  { icon: "telescope" as const, label: "Prophecy Explorer", route: "/prophecy-explorer" },
  { icon: "videocam" as const, label: "Live Streams", route: "/" },
  { icon: "location" as const, label: "Church Connect", route: "/church-connect" },
  { icon: "heart" as const, label: "Family Altar", route: "/prayer-journal" },
];

interface PhaseConfig {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  subtitle: string;
}

const PHASE_CONFIGS: Record<SabbathPhase, PhaseConfig> = {
  "friday-evening": {
    label: "Friday Evening",
    icon: "moon-outline",
    color: "#8B6FBF",
    subtitle: "Welcoming the Sabbath",
  },
  "sabbath-morning": {
    label: "Sabbath Morning",
    icon: "sunny-outline",
    color: SABBATH_GOLD,
    subtitle: "Worship & Study",
  },
  afternoon: {
    label: "Sabbath Afternoon",
    icon: "leaf-outline",
    color: "#5A9E6F",
    subtitle: "Rest & Fellowship",
  },
  closing: {
    label: "Sabbath Closing",
    icon: "star-outline",
    color: "#C77B4A",
    subtitle: "Farewell & Gratitude",
  },
  outside: {
    label: "Preparing",
    icon: "time-outline",
    color: PathB.inkMuted,
    subtitle: "Awaiting Sacred Time",
  },
};

const PHASE_ORDER: SabbathPhase[] = ["friday-evening", "sabbath-morning", "afternoon", "closing"];

interface PhaseContentItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  ref?: string;
}

const FRIDAY_EVENING_CONTENT: PhaseContentItem[] = [
  {
    icon: "book-outline",
    title: "Opening Scripture",
    text: "\"And God blessed the seventh day, and sanctified it: because that in it he had rested from all his work which God created and made.\"",
    ref: "Genesis 2:3",
  },
  {
    icon: "people-outline",
    title: "Family Prayer",
    text: "Gather your household and welcome the Sabbath together. Thank God for His provision this week and ask for His presence during these sacred hours.",
  },
  {
    icon: "musical-notes-outline",
    title: "Worship Song",
    text: "Consider singing or listening to \"Day Is Dying in the West\" or another Sabbath vespers hymn as you transition from the week into holy time.",
  },
  {
    icon: "heart-outline",
    title: "Prepare Your Heart",
    text: "Set aside the concerns of the week. Release your burdens to the One who carries them. The Sabbath is His gift of rest \u2014 receive it with an open heart.",
  },
];

const SABBATH_MORNING_CONTENT: PhaseContentItem[] = [
  {
    icon: "school-outline",
    title: "Sabbath School Study",
    text: "Dive into this week's lesson with fellow believers. The Sabbath School is a time for corporate Bible study and spiritual growth.",
  },
  {
    icon: "help-circle-outline",
    title: "Reflection Questions",
    text: "What truth from Scripture has been illuminated for you this week? How does the Sabbath reshape your understanding of God's character?",
  },
  {
    icon: "shirt-outline",
    title: "Church Preparation",
    text: "Prepare yourself for corporate worship. Approach the sanctuary with reverence, knowing you are entering the presence of the King of kings.",
    ref: "Psalm 100:4",
  },
];

const AFTERNOON_CONTENT: PhaseContentItem[] = [
  {
    icon: "leaf-outline",
    title: "Nature Meditation",
    text: "Step outside and observe God's creation. The natural world is His second book \u2014 every leaf, every birdsong declares His glory and care.",
    ref: "Psalm 19:1",
  },
  {
    icon: "newspaper-outline",
    title: "Missionary Story",
    text: "Read or share a story of God's work around the world. The mission field extends from your neighborhood to the ends of the earth.",
  },
  {
    icon: "chatbubbles-outline",
    title: "Family Discussion",
    text: "Share what you learned from the sermon today. What spoke to your heart? How can you apply it in the coming week? Let children share their thoughts too.",
  },
];

const CLOSING_CONTENT: PhaseContentItem[] = [
  {
    icon: "hand-left-outline",
    title: "Closing Prayer",
    text: "As the sacred hours draw to a close, lift your heart in prayer. Thank God for the gift of rest and ask for strength for the week ahead.",
  },
  {
    icon: "journal-outline",
    title: "Gratitude Journal",
    text: "Record three blessings from this Sabbath. What moments of peace, insight, or connection did you experience? Let gratitude seal these sacred hours.",
  },
  {
    icon: "sparkles-outline",
    title: "Farewell Reflection",
    text: "As the sun sets, we bid farewell to the Sabbath with hope. The rest we have tasted is but a foretaste of the eternal rest that awaits God's people.",
    ref: "Hebrews 4:9",
  },
];

const PHASE_CONTENT: Record<SabbathPhase, PhaseContentItem[]> = {
  "friday-evening": FRIDAY_EVENING_CONTENT,
  "sabbath-morning": SABBATH_MORNING_CONTENT,
  afternoon: AFTERNOON_CONTENT,
  closing: CLOSING_CONTENT,
  outside: FRIDAY_EVENING_CONTENT,
};

interface ReflectionData {
  id: string;
  userId: string;
  date: string;
  prompt: string;
  response: string;
  createdAt: string;
}

function PhaseIndicator({ currentPhase }: { currentPhase: SabbathPhase }) {
  const activeIdx = PHASE_ORDER.indexOf(currentPhase);

  return (
    <View style={phaseStyles.container}>
      <View style={phaseStyles.timeline}>
        {PHASE_ORDER.map((phase, i) => {
          const config = PHASE_CONFIGS[phase];
          const isActive = phase === currentPhase;
          const isPast = activeIdx >= 0 && i < activeIdx;
          const dotColor = isActive ? config.color : isPast ? config.color + "80" : "#333";

          return (
            <View key={phase} style={phaseStyles.phaseItem}>
              {i > 0 && (
                <View
                  style={[
                    phaseStyles.connector,
                    { backgroundColor: isPast || isActive ? PathB.ink + "28" : PathB.ink + "12" },
                  ]}
                />
              )}
              <View
                style={[
                  phaseStyles.dot,
                  {
                    backgroundColor: dotColor,
                    borderColor: isActive ? config.color : "transparent",
                    borderWidth: isActive ? 2 : 0,
                    width: isActive ? 14 : 10,
                    height: isActive ? 14 : 10,
                    borderRadius: isActive ? 7 : 5,
                  },
                ]}
              />
              <Text
                style={[
                  phaseStyles.phaseLabel,
                  {
                    color: isActive ? config.color : isPast ? "#9A8E7A" : "#5C5549",
                    fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            </View>
          );
        })}
      </View>

      {currentPhase !== "outside" && (
        <View style={[phaseStyles.currentBanner, { backgroundColor: PHASE_CONFIGS[currentPhase].color + "18" }]}>
          <Ionicons
            name={PHASE_CONFIGS[currentPhase].icon}
            size={18}
            color={PHASE_CONFIGS[currentPhase].color}
          />
          <View style={{ flex: 1 }}>
            <Text style={[phaseStyles.bannerTitle, { color: PathB.ink }]}>
              {PHASE_CONFIGS[currentPhase].label}
            </Text>
            <Text style={phaseStyles.bannerSubtitle}>
              {PHASE_CONFIGS[currentPhase].subtitle}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function PhaseContentCard({ item, phaseColor }: { item: PhaseContentItem; phaseColor: string }) {
  return (
    <View style={[cardStyles.card, { borderColor: PathB.ink + "14", backgroundColor: "#FFFFFF" }]}>
      <View style={[cardStyles.iconWrap, { backgroundColor: PathB.ink + "0F" }]}>
        <Ionicons name={item.icon} size={20} color={phaseColor} />
      </View>
      <Text style={cardStyles.title}>{item.title}</Text>
      <Text style={cardStyles.text}>{item.text}</Text>
      {item.ref && <Text style={cardStyles.ref}>{item.ref}</Text>}
    </View>
  );
}

export default function SabbathExperienceScreen() {
  const { theme, isDark } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { closingReflectionActive, sabbathStart, sabbathEnd, isSabbath } = useSabbath();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const todayStr = new Date().toISOString().split("T")[0];

  const frameIndex = Math.floor(Date.now() / (7 * 86400000)) % 4;
  const frame = THEOLOGICAL_FRAMES[frameIndex];

  const [responses, setResponses] = useState<Record<string, string>>({});
  const [closingResponse, setClosingResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingClosing, setSavingClosing] = useState(false);

  const [currentPhase, setCurrentPhase] = useState<SabbathPhase>(() => {
    if (!sabbathStart || !sabbathEnd) return "outside";
    return getSabbathPhase(sabbathStart, sabbathEnd);
  });

  useEffect(() => {
    if (!sabbathStart || !sabbathEnd) {
      setCurrentPhase("outside");
      return;
    }
    setCurrentPhase(getSabbathPhase(sabbathStart, sabbathEnd));
    const interval = setInterval(() => {
      setCurrentPhase(getSabbathPhase(sabbathStart, sabbathEnd));
    }, 60000);
    return () => clearInterval(interval);
  }, [sabbathStart, sabbathEnd]);

  const phaseConfig = PHASE_CONFIGS[currentPhase];
  const phaseContent = PHASE_CONTENT[currentPhase];

  const queryKey = [`/api/sabbath/reflections?userId=${userId}&date=${todayStr}`];

  const { data: existingReflections, isLoading } = useQuery<ReflectionData[]>({
    queryKey,
  });

  useEffect(() => {
    if (existingReflections && existingReflections.length > 0) {
      const loaded: Record<string, string> = {};
      for (const r of existingReflections) {
        if (r.prompt === "closing") {
          setClosingResponse(r.response);
        } else {
          loaded[r.prompt] = r.response;
        }
      }
      setResponses(loaded);
    }
  }, [existingReflections]);

  const saveReflectionMutation = useMutation({
    mutationFn: async (payload: { prompt: string; response: string }) => {
      await apiRequest("POST", "/api/sabbath/reflections", {
        userId,
        date: todayStr,
        prompt: payload.prompt,
        response: payload.response,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleSaveReflections = async () => {
    setSaving(true);
    const promises = PROMPTS.filter((p) => responses[p]?.trim()).map((p) =>
      saveReflectionMutation.mutateAsync({ prompt: p, response: responses[p].trim() })
    );
    try {
      await Promise.all(promises);
    } catch {
      showToast("Could not save reflections. Please try again.", "error");
    }
    setSaving(false);
  };

  const handleSaveClosing = async () => {
    if (!closingResponse.trim()) return;
    setSavingClosing(true);
    try {
      await saveReflectionMutation.mutateAsync({
        prompt: "closing",
        response: closingResponse.trim(),
      });
    } catch {
      showToast("Could not save reflection. Please try again.", "error");
    }
    setSavingClosing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Sabbath Experience
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: bottomPad + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <PhaseIndicator currentPhase={currentPhase} />

        <Text style={[styles.sectionTitle, { color: PathB.ink }]}>
          Sacred Time
        </Text>
        <View
          style={[
            styles.framingCard,
            {
              borderColor: theme.border,
              backgroundColor: theme.backgroundCard,
            },
          ]}
        >
          <Text style={[styles.themeLabel, { color: PathB.coralInk }]}>
            {frame.theme}
          </Text>
          <Text style={[styles.framingText, { color: theme.text }]}>
            {frame.text}
          </Text>
          <Text style={[styles.framingRef, { color: theme.textMuted }]}>
            {frame.ref}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: PathB.ink, marginTop: 32 }]}>
          {phaseConfig.label}
        </Text>
        <Text style={[styles.phaseSubtitle, { color: theme.textSecondary }]}>
          {phaseConfig.subtitle}
        </Text>
        {phaseContent.map((item, i) => (
          <PhaseContentCard key={i} item={item} phaseColor={phaseConfig.color} />
        ))}

        {currentPhase === "sabbath-morning" && (
          <Pressable
            onPress={() => router.push("/(tabs)/ss/sabbath-school" as any)}
            style={({ pressed }) => [
              styles.quickLink,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="school-outline" size={20} color={PathB.ink} />
            <Text style={[styles.quickLinkText, { color: PathB.ink }]}>
              Open Sabbath School Study
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </Pressable>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 32 }]}>
          Sabbath Reflections
        </Text>
        {PROMPTS.map((prompt) => (
          <View key={prompt} style={styles.promptBlock}>
            <Text style={[styles.promptLabel, { color: theme.textSecondary }]}>
              {prompt}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: theme.border,
                  color: theme.text,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              placeholder="Write your reflection..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={responses[prompt] || ""}
              onChangeText={(text) =>
                setResponses((prev) => ({ ...prev, [prompt]: text }))
              }
            />
          </View>
        ))}
        <Pressable
          onPress={handleSaveReflections}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: PathB.coral,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Reflections</Text>
          )}
        </Pressable>

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 32 }]}>
          Worship Pathways
        </Text>
        <StudyDepthSelector compact />
        <View style={[styles.pathwaysCard, { backgroundColor: theme.backgroundCard }]}>
          {WORSHIP_PATHWAYS.map((pathway, i) => (
            <Pressable
              key={pathway.label}
              onPress={() => router.push(pathway.route as any)}
              style={({ pressed }) => [
                styles.pathwayRow,
                { opacity: pressed ? 0.7 : 1 },
                i < WORSHIP_PATHWAYS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.pathwayIcon,
                  { backgroundColor: PathB.ink + "0F" },
                ]}
              >
                <Ionicons name={pathway.icon} size={20} color={PathB.ink} />
              </View>
              <Text style={[styles.pathwayLabel, { color: theme.text }]}>
                {pathway.label}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>

        {(closingReflectionActive || currentPhase === "closing") && (
          <>
            <Text
              style={[styles.sectionTitle, { color: PathB.ink, marginTop: 32 }]}
            >
              Sabbath Farewell
            </Text>
            <View
              style={[
                styles.closingCard,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundCard,
                },
              ]}
            >
              <Text style={[styles.closingPrompt, { color: theme.textSecondary }]}>
                How did you encounter God this Sabbath?
              </Text>
              <TextInput
                style={[
                  styles.closingInput,
                  {
                    backgroundColor: theme.backgroundCard,
                    borderColor: theme.border,
                    color: theme.text,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
                placeholder="Share your experience..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={closingResponse}
                onChangeText={setClosingResponse}
              />
              <Pressable
                onPress={handleSaveClosing}
                disabled={savingClosing}
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    backgroundColor: PathB.coral,
                    opacity: pressed ? 0.85 : 1,
                    marginTop: 8,
                  },
                ]}
              >
                {savingClosing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const phaseStyles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  timeline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  phaseItem: {
    alignItems: "center",
    flex: 1,
    position: "relative",
  },
  connector: {
    position: "absolute",
    top: 5,
    right: "50%",
    left: "-50%",
    height: 2,
    zIndex: -1,
  },
  dot: {
    marginBottom: 6,
  },
  phaseLabel: {
    fontSize: 10,
    textAlign: "center",
  },
  currentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bannerTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  bannerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#9A8E7A",
    marginTop: 2,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    gap: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: "Lora_700Bold",
    color: PathB.ink,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: PathB.inkMuted,
  },
  ref: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: PathB.inkMuted,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontFamily: "Lora_700Bold",
  },
  scrollView: { flex: 1 },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "Lora_700Bold",
    marginBottom: 14,
  },
  phaseSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
    marginTop: -8,
  },
  framingCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  themeLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  framingText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Lora_400Regular_Italic",
  },
  framingRef: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  promptBlock: {
    marginBottom: 16,
  },
  promptLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 80,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  pathwaysCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  pathwayRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  pathwayIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pathwayLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  closingCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  closingPrompt: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  closingInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
  },
  quickLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  quickLinkText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
