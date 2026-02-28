import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { getApiUrl, apiRequest, queryClient } from "@/lib/query-client";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

const TRANSLATIONS = ["KJV", "ASV", "WEB"] as const;
type Translation = (typeof TRANSLATIONS)[number];

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

const VOICE_OPTIONS = [
  { id: "nova", label: "Nova", description: "Warm, expressive", gender: "female" },
  { id: "shimmer", label: "Shimmer", description: "Gentle, clear", gender: "female" },
  { id: "alloy", label: "Alloy", description: "Balanced, neutral", gender: "neutral" },
  { id: "echo", label: "Echo", description: "Smooth, measured", gender: "male" },
  { id: "fable", label: "Fable", description: "Rich, storytelling", gender: "male" },
  { id: "onyx", label: "Onyx", description: "Deep, authoritative", gender: "male" },
] as const;
type VoiceId = (typeof VOICE_OPTIONS)[number]["id"];

const VOICE_STORAGE_KEY = "@grace-through-faith/tts-voice";

interface Verse {
  id: string;
  verse: number;
  text: string;
}

interface PassageResponse {
  book: { id: number; name: string; chapterCount: number };
  chapter: number;
  verses: Verse[];
}

const BOOK_TOPICS: Record<string, string[]> = {
  Genesis: ["faith", "courage", "hope"],
  Exodus: ["faith", "strength", "courage"],
  Psalms: ["comfort", "joy", "peace", "prayer", "hope"],
  Proverbs: ["wisdom"],
  Isaiah: ["hope", "comfort", "strength"],
  Jeremiah: ["hope", "prayer", "courage"],
  Matthew: ["faith", "love", "grace", "prayer"],
  Mark: ["faith", "courage", "strength"],
  Luke: ["love", "grace", "forgiveness", "joy"],
  John: ["love", "faith", "grace", "hope"],
  Acts: ["faith", "courage", "strength"],
  Romans: ["grace", "faith", "hope", "love"],
  "1 Corinthians": ["love", "wisdom", "strength"],
  "2 Corinthians": ["comfort", "grace", "strength"],
  Galatians: ["grace", "faith", "joy"],
  Ephesians: ["grace", "love", "strength", "prayer"],
  Philippians: ["joy", "peace", "strength"],
  Colossians: ["peace", "wisdom", "forgiveness"],
  "1 Thessalonians": ["hope", "faith", "love"],
  "2 Timothy": ["courage", "faith", "strength"],
  Hebrews: ["faith", "hope", "courage"],
  James: ["wisdom", "prayer", "faith"],
  "1 Peter": ["hope", "courage", "grace"],
  "1 John": ["love", "faith", "forgiveness"],
  Revelation: ["hope", "courage", "faith"],
};

const TOPIC_INFO: Record<string, { title: string; icon: keyof typeof Ionicons.glyphMap; gradient: [string, string] }> = {
  love: { title: "Love", icon: "heart", gradient: ["#E8456B", "#C2185B"] },
  faith: { title: "Faith", icon: "shield", gradient: ["#5B86E5", "#36D1DC"] },
  prayer: { title: "Prayer", icon: "hand-left", gradient: ["#8B5CF6", "#6D3BD4"] },
  forgiveness: { title: "Forgiveness", icon: "refresh", gradient: ["#2E7D32", "#66BB6A"] },
  comfort: { title: "Comfort", icon: "heart-half", gradient: ["#FF6B35", "#F5A623"] },
  wisdom: { title: "Wisdom", icon: "bulb", gradient: ["#C9933A", "#A87828"] },
  strength: { title: "Strength", icon: "fitness", gradient: ["#E65100", "#FF8F00"] },
  peace: { title: "Peace", icon: "leaf", gradient: ["#00796B", "#4DB6AC"] },
  hope: { title: "Hope", icon: "sunny", gradient: ["#1565C0", "#42A5F5"] },
  grace: { title: "Grace", icon: "gift", gradient: ["#AD1457", "#EC407A"] },
  courage: { title: "Courage", icon: "flag", gradient: ["#4527A0", "#7C4DFF"] },
  joy: { title: "Joy", icon: "sparkles", gradient: ["#F9A825", "#FDD835"] },
};

interface ContextCard {
  id: string;
  category: string | null;
  title: string;
  body: string;
}

interface CommentaryEntry {
  id: string;
  commentatorName?: string;
  body: string;
}

interface DevPlan {
  id: string;
  title: string;
  totalDays: number;
  theme: string | null;
}

function RelatedContent({
  bookId,
  bookName,
  chapter,
  totalChapters,
  translation,
  theme,
  isDark,
}: {
  bookId: number;
  bookName: string;
  chapter: number;
  totalChapters: number;
  translation: string;
  theme: typeof Colors.dark;
  isDark: boolean;
}) {
  const { data: contextCards } = useQuery<ContextCard[]>({
    queryKey: [`/api/context?book=${bookId}&chapter=${chapter}`],
  });

  const { data: commentary } = useQuery<CommentaryEntry[]>({
    queryKey: [`/api/commentary?book=${bookId}&chapter=${chapter}`],
  });

  const { data: plans } = useQuery<DevPlan[]>({
    queryKey: ["/api/devotionals/plans"],
  });

  const relatedTopics = useMemo(() => {
    const topics = BOOK_TOPICS[bookName] || ["faith", "love", "hope"];
    return topics.slice(0, 3).map((id) => ({ id, ...TOPIC_INFO[id] })).filter(Boolean);
  }, [bookName]);

  const hasContext = (contextCards?.length ?? 0) > 0;
  const hasCommentary = (commentary?.length ?? 0) > 0;
  const nearbyChapters = useMemo(() => {
    const chs: number[] = [];
    for (let c = Math.max(1, chapter - 2); c <= Math.min(totalChapters, chapter + 2); c++) {
      if (c !== chapter) chs.push(c);
    }
    return chs;
  }, [chapter, totalChapters]);

  return (
    <View style={relatedStyles.wrapper}>
      <View style={[relatedStyles.divider, { backgroundColor: theme.border }]} />

      <View style={relatedStyles.header}>
        <Text style={[relatedStyles.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Related
        </Text>
        <Text style={[relatedStyles.headerSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {bookName} {chapter}
        </Text>
      </View>

      <Pressable
        onPress={() =>
          router.push(
            `/passage-context?bookId=${bookId}&chapter=${chapter}&bookName=${encodeURIComponent(bookName)}`
          )
        }
        style={({ pressed }) => [
          relatedStyles.studyCard,
          { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
        ]}
        testID="related-study"
      >
        <LinearGradient colors={["#C9933A", "#A87828"]} style={relatedStyles.studyIcon}>
          <Ionicons name="layers" size={20} color="#fff" />
        </LinearGradient>
        <View style={relatedStyles.studyInfo}>
          <Text style={[relatedStyles.studyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Study {bookName} {chapter}
          </Text>
          <Text style={[relatedStyles.studyDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {hasContext ? `${contextCards!.length} context cards` : "Context"}
            {hasCommentary ? ` · ${commentary!.length} commentaries` : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>

      {relatedTopics.length > 0 && (
        <>
          <Text style={[relatedStyles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            TOPICS
          </Text>
          <View style={relatedStyles.topicsRow}>
            {relatedTopics.map((topic) => (
              <Pressable
                key={topic.id}
                onPress={() => router.push(`/topic/${topic.id}`)}
                style={({ pressed }) => [relatedStyles.topicChip, { opacity: pressed ? 0.8 : 1 }]}
              >
                <LinearGradient
                  colors={topic.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={relatedStyles.topicChipGradient}
                >
                  <Ionicons name={topic.icon} size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={[relatedStyles.topicChipText, { fontFamily: "Inter_600SemiBold" }]}>
                    {topic.title}
                  </Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {plans && plans.length > 0 && (
        <>
          <Text style={[relatedStyles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            DEVOTIONAL PLANS
          </Text>
          {plans.slice(0, 2).map((plan) => (
            <Pressable
              key={plan.id}
              onPress={() => router.push("/devotionals")}
              style={({ pressed }) => [
                relatedStyles.planRow,
                { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="flame" size={18} color={theme.accent} />
              <View style={relatedStyles.planInfo}>
                <Text style={[relatedStyles.planTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                  {plan.title}
                </Text>
                <Text style={[relatedStyles.planMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {plan.totalDays} days
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>
          ))}
        </>
      )}

      {nearbyChapters.length > 0 && (
        <>
          <Text style={[relatedStyles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            SEE ALSO
          </Text>
          {nearbyChapters.map((ch) => (
            <Pressable
              key={ch}
              onPress={() => router.replace(`/read/${bookId}/${ch}?translation=${translation}`)}
              style={({ pressed }) => [
                relatedStyles.seeAlsoRow,
                { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={relatedStyles.seeAlsoInfo}>
                <Text style={[relatedStyles.seeAlsoLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {bookName}
                </Text>
                <Text style={[relatedStyles.seeAlsoTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  Chapter {ch}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

const relatedStyles = StyleSheet.create({
  wrapper: {
    marginTop: 40,
    paddingBottom: 20,
  },
  divider: {
    height: 1,
    marginBottom: 28,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: { fontSize: 22, marginBottom: 4 },
  headerSub: { fontSize: 13 },
  studyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 20,
  },
  studyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  studyInfo: { flex: 1 },
  studyTitle: { fontSize: 15, marginBottom: 3 },
  studyDesc: { fontSize: 12 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },
  topicsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  topicChip: {},
  topicChipGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  topicChipText: { color: "#fff", fontSize: 13 },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  planInfo: { flex: 1 },
  planTitle: { fontSize: 14, marginBottom: 2 },
  planMeta: { fontSize: 12 },
  seeAlsoRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  seeAlsoInfo: { flex: 1 },
  seeAlsoLabel: { fontSize: 11, marginBottom: 2 },
  seeAlsoTitle: { fontSize: 15 },
});

export default function VerseReaderScreen() {
  const { bookId, chapter, translation: txParam } = useLocalSearchParams<{ bookId: string; chapter: string; translation?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const initialTx = TRANSLATIONS.includes(txParam as Translation) ? (txParam as Translation) : "KJV";
  const [translation, setTranslation] = useState<Translation>(initialTx);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speakingVerseIndex, setSpeakingVerseIndex] = useState(-1);
  const [speechRate, setSpeechRate] = useState(1);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>("nova");
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const sessionRef = useRef(0);
  const currentIndexRef = useRef(-1);
  const versesRef = useRef<Verse[]>([]);
  const speechRateRef = useRef(1);
  const playerRef = useRef<AudioPlayer | null>(null);
  const selectedVoiceRef = useRef<VoiceId>("nova");
  const verseLayoutsRef = useRef<Record<number, { y: number; height: number }>>({});
  const scrollContentOffsetRef = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(VOICE_STORAGE_KEY).then((saved) => {
      if (saved && VOICE_OPTIONS.some((v) => v.id === saved)) {
        setSelectedVoice(saved as VoiceId);
        selectedVoiceRef.current = saved as VoiceId;
      }
    });
  }, []);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentModeIOS: true,
    }).catch(() => {});
  }, []);

  const { data, isLoading, error } = useQuery<PassageResponse>({
    queryKey: [`/api/passage?book=${bookId}&chapter=${chapter}&translation=${translation}`],
  });

  const bookName = data?.book?.name ?? "";
  const totalChapters = data?.book?.chapterCount ?? 0;
  const chapterNum = Number(chapter);

  const canGoPrev = chapterNum > 1;
  const canGoNext = chapterNum < totalChapters;

  useEffect(() => {
    versesRef.current = data?.verses ?? [];
  }, [data?.verses]);

  useEffect(() => {
    if (data?.book?.name && bookId && chapter) {
      apiRequest("POST", "/api/reading-history", {
        userId: "guest",
        bookId: Number(bookId),
        bookName: data.book.name,
        chapter: Number(chapter),
        translation,
      })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/reading-history/recent?userId=guest"] });
          queryClient.invalidateQueries({ queryKey: ["/api/reading-streaks?userId=guest"] });
        })
        .catch(() => {});
    }
  }, [data?.book?.name, bookId, chapter, translation]);

  const cleanupPlayer = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.remove();
      } catch {}
      playerRef.current = null;
    }
  }, []);

  const resetPlayback = useCallback(() => {
    sessionRef.current += 1;
    cleanupPlayer();
    Speech.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingVerseIndex(-1);
    setIsLoadingAudio(false);
    setUsingFallback(false);
    currentIndexRef.current = -1;
  }, [cleanupPlayer]);

  useEffect(() => {
    resetPlayback();
  }, [bookId, chapter, translation, resetPlayback]);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      cleanupPlayer();
      Speech.stop();
    };
  }, [cleanupPlayer]);

  const speakVerseFallback = useCallback((index: number, session: number) => {
    if (session !== sessionRef.current) return;

    const verses = versesRef.current;
    if (index < 0 || index >= verses.length) {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingVerseIndex(-1);
      currentIndexRef.current = -1;
      return;
    }

    currentIndexRef.current = index;
    setSpeakingVerseIndex(index);

    const verse = verses[index];
    const textToSpeak = `${verse.verse}. ${verse.text}`;

    try {
      Speech.speak(textToSpeak, {
        rate: speechRateRef.current,
        onDone: () => {
          if (session === sessionRef.current) {
            speakVerseFallback(index + 1, session);
          }
        },
        onStopped: () => {},
        onError: () => {
          if (session === sessionRef.current) {
            setIsSpeaking(false);
            setIsPaused(false);
            setSpeakingVerseIndex(-1);
          }
        },
      });
    } catch {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingVerseIndex(-1);
      currentIndexRef.current = -1;
    }
  }, []);

  const BATCH_SIZE = 5;

  const speakVerseAI = useCallback(async (index: number, session: number) => {
    if (session !== sessionRef.current) return;

    const verses = versesRef.current;
    if (index < 0 || index >= verses.length) {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingVerseIndex(-1);
      setIsLoadingAudio(false);
      currentIndexRef.current = -1;
      return;
    }

    currentIndexRef.current = index;
    setSpeakingVerseIndex(index);
    setIsLoadingAudio(true);

    const batchEnd = Math.min(index + BATCH_SIZE, verses.length);
    const batchVerses = verses.slice(index, batchEnd);
    const textToSpeak = batchVerses
      .map((v) => `${v.verse}. ${v.text}`)
      .join("\n\n");

    try {
      const apiUrl = getApiUrl();
      const url = new URL("/api/tts", apiUrl);

      const response = await fetch(url.href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, voice: selectedVoiceRef.current }),
      });

      if (!response.ok) {
        throw new Error("TTS API failed");
      }

      if (session !== sessionRef.current) return;

      cleanupPlayer();

      let audioUri: string;

      if (Platform.OS === "web") {
        const blob = await response.blob();
        audioUri = URL.createObjectURL(blob);
      } else {
        const fileUri = `${FileSystem.cacheDirectory}tts_batch_${index}_${Date.now()}.mp3`;
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const binChunks: string[] = [];
        for (let i = 0; i < bytes.length; i += 4096) {
          binChunks.push(String.fromCharCode(...bytes.subarray(i, Math.min(i + 4096, bytes.length))));
        }
        const base64Data = btoa(binChunks.join(""));
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        audioUri = fileUri;
      }

      if (session !== sessionRef.current) return;

      const player = createAudioPlayer({ uri: audioUri });
      player.playbackRate = speechRateRef.current;
      playerRef.current = player;

      setIsLoadingAudio(false);
      setSpeakingVerseIndex(batchEnd - 1);

      await new Promise<void>((resolve) => {
        const subscription = player.addListener("playbackStatusUpdate", (status: any) => {
          if (status.didJustFinish) {
            subscription.remove();
            resolve();
          }
        });
        player.play();
      });

      if (session === sessionRef.current) {
        cleanupPlayer();
        speakVerseAI(batchEnd, session);
      }
    } catch {
      if (session !== sessionRef.current) return;
      setUsingFallback(true);
      setIsLoadingAudio(false);
      speakVerseFallback(index, session);
    }
  }, [cleanupPlayer, speakVerseFallback]);

  const scrollToVerseEstimate = useCallback((index: number) => {
    if (index < 0 || !scrollViewRef.current) return;
    const verses = versesRef.current;
    if (!verses.length) return;
    const headerHeight = 120;
    const avgCharsPerLine = 35;
    const lineHeight = 34;
    let yOffset = headerHeight;
    for (let i = 0; i < index; i++) {
      const charCount = verses[i].text.length + 4;
      const lines = Math.ceil(charCount / avgCharsPerLine);
      yOffset += lines * lineHeight;
    }
    const targetY = Math.max(0, yOffset - 120);
    scrollViewRef.current.scrollTo({ y: targetY, animated: true });
  }, []);

  useEffect(() => {
    if (speakingVerseIndex >= 0 && (isSpeaking || isPaused)) {
      scrollToVerseEstimate(speakingVerseIndex);
    }
  }, [speakingVerseIndex, isSpeaking, isPaused, scrollToVerseEstimate]);

  const handlePlay = useCallback(() => {
    const verses = versesRef.current;
    if (!verses.length) return;

    if (isPaused && currentIndexRef.current >= 0) {
      setIsPaused(false);
      setIsSpeaking(true);
      if (usingFallback) {
        speakVerseFallback(currentIndexRef.current, sessionRef.current);
      } else {
        speakVerseAI(currentIndexRef.current, sessionRef.current);
      }
      return;
    }

    const session = ++sessionRef.current;
    setIsSpeaking(true);
    setIsPaused(false);
    setUsingFallback(false);
    speakVerseAI(0, session);
  }, [isPaused, usingFallback, speakVerseAI, speakVerseFallback]);

  const handlePause = useCallback(() => {
    if (usingFallback) {
      Speech.stop();
    } else {
      try {
        if (playerRef.current) {
          playerRef.current.pause();
        }
      } catch {}
    }
    setIsPaused(true);
    setIsSpeaking(false);
  }, [usingFallback]);

  const handleStop = useCallback(() => {
    resetPlayback();
  }, [resetPlayback]);

  const handleSpeedChange = useCallback((rate: number) => {
    speechRateRef.current = rate;
    setSpeechRate(rate);
    setShowSpeedPicker(false);
    if (isSpeaking && currentIndexRef.current >= 0) {
      if (usingFallback) {
        Speech.stop();
        speakVerseFallback(currentIndexRef.current, sessionRef.current);
      } else {
        cleanupPlayer();
        Speech.stop();
        speakVerseAI(currentIndexRef.current, sessionRef.current);
      }
    }
  }, [isSpeaking, usingFallback, speakVerseFallback, speakVerseAI, cleanupPlayer]);

  const handleVoiceChange = useCallback((voice: VoiceId) => {
    selectedVoiceRef.current = voice;
    setSelectedVoice(voice);
    setShowVoicePicker(false);
    AsyncStorage.setItem(VOICE_STORAGE_KEY, voice).catch(() => {});
    setUsingFallback(false);
    if (isSpeaking && currentIndexRef.current >= 0) {
      cleanupPlayer();
      Speech.stop();
      speakVerseAI(currentIndexRef.current, sessionRef.current);
    }
  }, [isSpeaking, speakVerseAI, cleanupPlayer]);

  const goToPrev = useCallback(() => {
    if (canGoPrev) {
      handleStop();
      router.replace(`/read/${bookId}/${chapterNum - 1}?translation=${translation}`);
    }
  }, [bookId, chapterNum, canGoPrev, translation, handleStop]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      handleStop();
      router.replace(`/read/${bookId}/${chapterNum + 1}?translation=${translation}`);
    }
  }, [bookId, chapterNum, canGoNext, translation, handleStop]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isActive = isSpeaking || isPaused;

  const handleVerseTap = useCallback((item: Verse) => {
    router.push({
      pathname: "/verse-actions",
      params: {
        bookId,
        chapter,
        verse: String(item.verse),
        text: item.text,
        bookName,
        verseId: item.id,
        translation,
      },
    });
  }, [bookId, chapter, bookName, translation]);

  const currentVoiceLabel = VOICE_OPTIONS.find((v) => v.id === selectedVoice)?.label ?? "Nova";

  const verses = data?.verses ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackBtn}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </Pressable>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <Pressable
                hitSlop={8}
                style={styles.headerBtn}
                onPress={() => setShowTranslationPicker(!showTranslationPicker)}
              >
                <View style={[styles.translationBadge, { backgroundColor: isDark ? theme.backgroundCard : theme.backgroundCard }]}>
                  <Ionicons name="globe-outline" size={13} color={theme.textSecondary} />
                  <Text style={[styles.translationBadgeText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {translation}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                hitSlop={8}
                style={styles.headerBtn}
                onPress={() =>
                  router.push(
                    `/passage-context?bookId=${bookId}&chapter=${chapter}&bookName=${encodeURIComponent(bookName)}`
                  )
                }
              >
                <Ionicons name="layers-outline" size={20} color={theme.textSecondary} />
              </Pressable>
              <Pressable hitSlop={8} style={styles.headerBtn}>
                <Ionicons name="bookmark-outline" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={40} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.text, fontFamily: "Lora_500Medium" }]}>
              Unable to load passage
            </Text>
            <Text style={[styles.errorSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {(error as Error).message}
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: 160 + bottomPad },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {showTranslationPicker && (
                <View style={[styles.translationDropdown, { backgroundColor: isDark ? theme.backgroundElevated : theme.backgroundCard }]}>
                  {TRANSLATIONS.map((t) => {
                    const isActiveT = translation === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => { setTranslation(t); setShowTranslationPicker(false); }}
                        style={[
                          styles.translationOption,
                          isActiveT && { backgroundColor: theme.accent + "15" },
                        ]}
                      >
                        <Text style={[
                          styles.translationOptionText,
                          {
                            color: isActiveT ? theme.accent : theme.text,
                            fontFamily: isActiveT ? "Inter_700Bold" : "Inter_500Medium",
                          },
                        ]}>
                          {t}
                        </Text>
                        <Text style={[styles.translationOptionDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                          {t === "KJV" ? "King James Version" : t === "ASV" ? "American Standard" : "World English Bible"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <View style={styles.chapterHeader}>
                <Text style={[styles.bookNameHeader, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  {bookName}
                </Text>
                <Text style={[styles.chapterNumber, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                  {chapter}
                </Text>
              </View>

              <View style={styles.proseContainer}>
                <Text style={[styles.proseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                  {verses.map((v, i) => (
                    <React.Fragment key={v.id}>
                      <Text
                        onPress={() => handleVerseTap(v)}
                        style={[
                          styles.proseText,
                          {
                            color: theme.text,
                            fontFamily: "Lora_400Regular",
                            backgroundColor: i === speakingVerseIndex ? theme.highlightYellow : "transparent",
                          },
                        ]}
                      >
                        <Text style={[styles.verseNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                          {" "}{v.verse}{" "}
                        </Text>
                        {v.text}
                      </Text>
                      {"  "}
                    </React.Fragment>
                  ))}
                </Text>
              </View>

              <RelatedContent
                bookId={Number(bookId)}
                bookName={bookName}
                chapter={chapterNum}
                totalChapters={totalChapters}
                translation={translation}
                theme={theme}
                isDark={isDark}
              />
            </ScrollView>

            <View style={[
              styles.bottomBar,
              {
                backgroundColor: theme.background,
                borderTopColor: theme.border,
                paddingBottom: bottomPad + 8,
              },
            ]}>
              {showVoicePicker && (
                <View style={[styles.voicePopup, { backgroundColor: isDark ? theme.backgroundElevated : theme.backgroundCard }]}>
                  <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                    {(["female", "neutral", "male"] as const).map((gender) => {
                      const voices = VOICE_OPTIONS.filter((v) => v.gender === gender);
                      const sectionLabel = gender === "female" ? "Female Voices" : gender === "male" ? "Male Voices" : "Neutral";
                      return (
                        <View key={gender}>
                          <Text style={{ color: theme.textMuted, fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1, paddingHorizontal: 12, paddingTop: gender === "female" ? 8 : 14, paddingBottom: 4, textTransform: "uppercase" }}>
                            {sectionLabel}
                          </Text>
                          {voices.map((v) => (
                            <Pressable
                              key={v.id}
                              onPress={() => handleVoiceChange(v.id)}
                              style={[
                                styles.voiceOption,
                                selectedVoice === v.id && { backgroundColor: theme.accent + "15" },
                              ]}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                                <Ionicons
                                  name={selectedVoice === v.id ? "radio-button-on" : "radio-button-off"}
                                  size={18}
                                  color={selectedVoice === v.id ? theme.accent : theme.textMuted}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text style={[
                                    styles.voiceOptionLabel,
                                    {
                                      color: selectedVoice === v.id ? theme.accent : theme.text,
                                      fontFamily: selectedVoice === v.id ? "Inter_700Bold" : "Inter_500Medium",
                                    },
                                  ]}>
                                    {v.label}
                                  </Text>
                                  <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 }}>
                                    {v.description}
                                  </Text>
                                </View>
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {showSpeedPicker && (
                <View style={[styles.speedPopup, { backgroundColor: isDark ? theme.backgroundElevated : theme.backgroundCard }]}>
                  {SPEED_OPTIONS.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => handleSpeedChange(s)}
                      style={[
                        styles.speedOption,
                        speechRate === s && { backgroundColor: theme.accent + "15" },
                      ]}
                    >
                      <Text style={[
                        styles.speedOptionText,
                        {
                          color: speechRate === s ? theme.accent : theme.text,
                          fontFamily: speechRate === s ? "Inter_700Bold" : "Inter_500Medium",
                        },
                      ]}>
                        {s}x
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={[styles.audioStatusBar, { backgroundColor: theme.backgroundCard }]}>
                <View style={styles.audioStatusLeft}>
                  <Pressable
                    onPress={() => { setShowVoicePicker(!showVoicePicker); setShowSpeedPicker(false); }}
                    style={[styles.voiceChip, { backgroundColor: theme.accent + "15" }]}
                    testID="voice-button"
                  >
                    <Ionicons name="mic-outline" size={13} color={theme.accent} />
                    <Text style={[styles.voiceChipText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      {currentVoiceLabel}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setShowSpeedPicker(!showSpeedPicker); setShowVoicePicker(false); }}
                    style={[styles.speedChip, { backgroundColor: theme.accent + "15" }]}
                    testID="speed-button"
                  >
                    <Text style={[styles.speedChipText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      {speechRate}x
                    </Text>
                  </Pressable>
                </View>
                {isActive && (
                  <View style={styles.audioStatusRight}>
                    {isLoadingAudio ? (
                      <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                      <Ionicons name="volume-high" size={14} color={theme.accent} />
                    )}
                    <Text style={[styles.audioStatusText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                      {isLoadingAudio
                        ? "Loading..."
                        : isPaused
                          ? "Paused"
                          : `Verse ${verses[speakingVerseIndex]?.verse ?? ""}`}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.navRow}>
                <Pressable
                  onPress={isSpeaking ? handlePause : handlePlay}
                  hitSlop={8}
                  testID="play-pause-button"
                  style={[styles.playBtn, { backgroundColor: theme.accent }]}
                >
                  <Ionicons
                    name={isSpeaking ? "pause" : "play"}
                    size={18}
                    color="#fff"
                  />
                </Pressable>

                {isActive && (
                  <Pressable onPress={handleStop} hitSlop={8} testID="stop-button" style={styles.stopBtn}>
                    <Ionicons name="stop" size={16} color={theme.textMuted} />
                  </Pressable>
                )}

                <View style={styles.navCenter}>
                  <Pressable
                    onPress={goToPrev}
                    disabled={!canGoPrev}
                    hitSlop={8}
                    style={[styles.navArrow, { opacity: canGoPrev ? 1 : 0.25 }]}
                  >
                    <Ionicons name="chevron-back" size={20} color={theme.text} />
                  </Pressable>

                  <Text style={[styles.navChapterLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {bookName} {chapter}
                  </Text>

                  <Pressable
                    onPress={goToNext}
                    disabled={!canGoNext}
                    hitSlop={8}
                    style={[styles.navArrow, { opacity: canGoNext ? 1 : 0.25 }]}
                  >
                    <Ionicons name="chevron-forward" size={20} color={theme.text} />
                  </Pressable>
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRight: { flexDirection: "row", gap: 14, alignItems: "center" },
  headerBackBtn: { padding: 4 },
  headerBtn: { padding: 4 },
  translationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  translationBadgeText: { fontSize: 12 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 20 },
  errorText: { fontSize: 17 },
  errorSub: { fontSize: 13, textAlign: "center" },
  scrollContent: { paddingHorizontal: 28, paddingTop: 8 },
  translationDropdown: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  translationOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  translationOptionText: { fontSize: 15 },
  translationOptionDesc: { fontSize: 12 },
  chapterHeader: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 40,
    gap: 0,
  },
  bookNameHeader: {
    fontSize: 16,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    opacity: 0.6,
    marginBottom: 4,
  },
  chapterNumber: {
    fontSize: 64,
    lineHeight: 74,
  },
  proseContainer: {
    paddingBottom: 24,
  },
  proseText: {
    fontSize: 21,
    lineHeight: 36,
  },
  verseNum: {
    fontSize: 11,
    lineHeight: 36,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  audioStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  audioStatusLeft: {
    flexDirection: "row",
    gap: 8,
  },
  voiceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  voiceChipText: { fontSize: 12 },
  speedChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  speedChipText: { fontSize: 12 },
  audioStatusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  audioStatusText: { fontSize: 12 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  navCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  navChapterLabel: {
    fontSize: 15,
  },
  voicePopup: {
    borderRadius: 14,
    marginBottom: 8,
    overflow: "hidden",
  },
  voiceOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  voiceOptionLabel: { fontSize: 15 },
  speedPopup: {
    flexDirection: "row",
    borderRadius: 14,
    marginBottom: 8,
    overflow: "hidden",
  },
  speedOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  speedOptionText: { fontSize: 13 },
});
