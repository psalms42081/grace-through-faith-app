import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Dimensions,
  Modal,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  FadeIn,
  FadeInDown,
  FadeInUp,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { createAudioPlayer, setIsAudioActiveAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KidsColors } from "@/constants/colors";
import { useKidsMode } from "@/context/KidsModeContext";
import { apiRequest } from "@/lib/query-client";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type SceneMood = "AWE" | "PEACE" | "TENSION" | "JOY";

interface StoryScene {
  id: string;
  storyId: string;
  sceneIndex: number;
  narration: string;
  illustrationPrompt: string;
  mood: SceneMood;
  pauseAndWonder: {
    question: string;
    options: { emoji: string; label: string }[];
    correctIndex: number;
  } | null;
}

interface AudioAsset {
  label: string;
  url: string;
}

type AudioAssets = Record<SceneMood, AudioAsset>;

const QUIET_MODE_KEY = "@grace_kids_quiet_mode";
const CROSSFADE_DURATION = 2000;
const CROSSFADE_STEPS = 20;

function useAtmosphereAudio(currentMood: SceneMood | null, quietMode: boolean) {
  const playerRefs = useRef<Partial<Record<SceneMood, AudioPlayer>>>({});
  const activeMood = useRef<SceneMood | null>(null);
  const crossfadeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingMoods = useRef<Set<SceneMood>>(new Set());
  const mountedRef = useRef(true);
  const [assets, setAssets] = useState<AudioAssets | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    setIsAudioActiveAsync(true).catch(() => {});

    apiRequest("GET", "/api/kids/audio-assets")
      .then((res) => res.json())
      .then((data) => {
        if (mountedRef.current) setAssets(data as AudioAssets);
      })
      .catch(() => {});

    return () => {
      mountedRef.current = false;
      if (crossfadeTimer.current) clearInterval(crossfadeTimer.current);
      Object.values(playerRefs.current).forEach((p) => {
        try { p?.pause(); p?.remove(); } catch {}
      });
      playerRefs.current = {};
      setIsAudioActiveAsync(false).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;

    if (quietMode) {
      if (crossfadeTimer.current) clearInterval(crossfadeTimer.current);
      Object.values(playerRefs.current).forEach((p) => {
        try { p!.volume = 0; p?.pause(); } catch {}
      });
      activeMood.current = null;
      return;
    }

    if (!currentMood || !assets) return;
    if (currentMood === activeMood.current) return;

    crossfadeTo(currentMood);
  }, [currentMood, quietMode, assets]);

  const ensureLoaded = (mood: SceneMood): AudioPlayer | null => {
    if (playerRefs.current[mood]) return playerRefs.current[mood]!;
    if (!assets?.[mood]) return null;
    if (loadingMoods.current.has(mood)) return null;

    loadingMoods.current.add(mood);
    try {
      const player = createAudioPlayer(assets[mood].url);
      player.loop = true;
      player.volume = 0;
      playerRefs.current[mood] = player;
      loadingMoods.current.delete(mood);
      return player;
    } catch {
      loadingMoods.current.delete(mood);
      return null;
    }
  };

  const crossfadeTo = (targetMood: SceneMood) => {
    if (crossfadeTimer.current) clearInterval(crossfadeTimer.current);

    const outMood = activeMood.current;
    activeMood.current = targetMood;

    const inPlayer = ensureLoaded(targetMood);
    if (!inPlayer) return;

    const outPlayer = outMood ? playerRefs.current[outMood] : null;

    inPlayer.volume = 0;
    inPlayer.play();

    let step = 0;
    const interval = CROSSFADE_DURATION / CROSSFADE_STEPS;

    crossfadeTimer.current = setInterval(() => {
      if (!mountedRef.current) {
        if (crossfadeTimer.current) clearInterval(crossfadeTimer.current);
        return;
      }
      step++;
      const progress = step / CROSSFADE_STEPS;
      const inVol = Math.min(0.4, progress * 0.4);
      const outVol = Math.max(0, 0.4 * (1 - progress));

      try {
        inPlayer.volume = inVol;
        if (outPlayer) outPlayer.volume = outVol;
      } catch {}

      if (step >= CROSSFADE_STEPS) {
        if (crossfadeTimer.current) clearInterval(crossfadeTimer.current);
        if (outPlayer) {
          try {
            outPlayer.pause();
            outPlayer.seekTo(0);
          } catch {}
        }
      }
    }, interval);
  };

  const cleanup = useCallback(() => {
    if (crossfadeTimer.current) clearInterval(crossfadeTimer.current);
    Object.values(playerRefs.current).forEach((p) => {
      try { p?.pause(); p?.remove(); } catch {}
    });
    playerRefs.current = {};
    activeMood.current = null;
  }, []);

  return { cleanup };
}

const SCENE_GRADIENT_PALETTES = [
  ["#2E1065", "#4A1A8A", "#6B21A8"],
  ["#1E3A5F", "#2563EB", "#3B82F6"],
  ["#1A4731", "#166534", "#22C55E"],
  ["#7C2D12", "#C2410C", "#F97316"],
  ["#4C1D95", "#7C3AED", "#A78BFA"],
  ["#831843", "#BE185D", "#EC4899"],
  ["#1E3A5F", "#0F766E", "#14B8A6"],
];

function ConfettiBurst({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const items = useMemo(() => {
    const particles: { id: number; emoji: string; x: number; delay: number; rotation: number }[] = [];
    const emojis = ["star", "sparkles", "heart", "flash"];
    for (let i = 0; i < 12; i++) {
      particles.push({
        id: i,
        emoji: emojis[i % emojis.length],
        x: (Math.random() - 0.5) * SCREEN_WIDTH * 0.8,
        delay: Math.random() * 300,
        rotation: (Math.random() - 0.5) * 720,
      });
    }
    return particles;
  }, []);

  return (
    <View style={confettiStyles.container} pointerEvents="none">
      {items.map((p) => (
        <ConfettiParticle key={p.id} particle={p} />
      ))}
    </View>
  );
}

function ConfettiParticle({
  particle,
}: {
  particle: { id: number; emoji: string; x: number; delay: number; rotation: number };
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withDelay(
      particle.delay,
      withSpring(1, { damping: 6, stiffness: 150 })
    );
    translateY.value = withDelay(
      particle.delay,
      withTiming(-200 - Math.random() * 150, { duration: 1200, easing: Easing.out(Easing.quad) })
    );
    translateX.value = withDelay(
      particle.delay,
      withTiming(particle.x, { duration: 1200, easing: Easing.out(Easing.quad) })
    );
    rotate.value = withDelay(
      particle.delay,
      withTiming(particle.rotation, { duration: 1200 })
    );
    opacity.value = withDelay(
      particle.delay + 800,
      withTiming(0, { duration: 400 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const colors: Record<string, string> = {
    star: "#F5A623",
    sparkles: "#6AABEF",
    heart: "#FF6B6B",
    flash: "#7ED321",
  };

  return (
    <Animated.View style={[confettiStyles.particle, style]}>
      <Ionicons
        name={particle.emoji as any}
        size={20 + Math.random() * 12}
        color={colors[particle.emoji] || "#F5A623"}
      />
    </Animated.View>
  );
}

const confettiStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  particle: {
    position: "absolute",
  },
});

function WordHighlightText({
  text,
  currentWordIndex,
  isSpeaking,
  theme,
  isLittleLambs,
}: {
  text: string;
  currentWordIndex: number;
  isSpeaking: boolean;
  theme: any;
  isLittleLambs: boolean;
}) {
  const words = useMemo(() => text.split(/\s+/), [text]);
  const fontSize = isLittleLambs ? 22 : 20;

  return (
    <Text style={{ textAlign: "center", lineHeight: fontSize * 1.8 }}>
      {words.map((word, i) => {
        const isActive = isSpeaking && i === currentWordIndex;
        const isPast = isSpeaking && i < currentWordIndex;
        return (
          <Text
            key={i}
            style={{
              fontFamily: "Lora_400Regular",
              fontSize: isActive ? fontSize + 2 : fontSize,
              color: isActive
                ? theme.accent
                : isPast
                ? "rgba(255,255,255,0.9)"
                : isSpeaking
                ? "rgba(255,255,255,0.45)"
                : "rgba(255,255,255,0.9)",
              fontWeight: isActive ? ("700" as const) : ("400" as const),
            }}
          >
            {word}{" "}
          </Text>
        );
      })}
    </Text>
  );
}

function PauseAndWonderOverlay({
  wonder,
  theme,
  onAnswer,
  answered,
  isDark,
}: {
  wonder: StoryScene["pauseAndWonder"];
  theme: any;
  onAnswer: (idx: number) => void;
  answered: boolean;
  isDark: boolean;
}) {
  if (!wonder) return null;

  return (
    <View style={wonderStyles.overlay}>
      <BlurView
        intensity={40}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        entering={FadeInDown.springify().damping(14)}
        style={[wonderStyles.card, { backgroundColor: isDark ? "rgba(30,30,60,0.92)" : "rgba(255,255,255,0.95)" }]}
      >
        <Ionicons name="sparkles" size={28} color={theme.starGold || theme.accent} />
        <Text style={[wonderStyles.question, { color: isDark ? "#F0E8D8" : "#333", fontFamily: "Lora_600SemiBold" }]}>
          {wonder.question}
        </Text>
        <View style={wonderStyles.optionsRow}>
          {wonder.options.map((opt, idx) => (
            <WonderOptionButton
              key={idx}
              opt={opt}
              idx={idx}
              theme={theme}
              onPress={() => onAnswer(idx)}
              answered={answered}
              isCorrect={idx === wonder.correctIndex}
              isDark={isDark}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

function WonderOptionButton({
  opt,
  idx,
  theme,
  onPress,
  answered,
  isCorrect,
  isDark,
}: {
  opt: { emoji: string; label: string };
  idx: number;
  theme: any;
  onPress: () => void;
  answered: boolean;
  isCorrect: boolean;
  isDark: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (answered) return;
    scale.value = withSequence(
      withSpring(0.9, { damping: 10 }),
      withSpring(1.05, { damping: 8 }),
      withSpring(1)
    );
    onPress();
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          wonderStyles.optionBtn,
          {
            backgroundColor: answered
              ? isCorrect
                ? (theme.success || "#7ED321") + "30"
                : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
              : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
            borderColor: answered && isCorrect ? (theme.success || "#7ED321") : "transparent",
            borderWidth: answered && isCorrect ? 2 : 0,
          },
        ]}
        testID={`wonder-option-${idx}`}
      >
        <Text style={wonderStyles.optionEmoji}>{opt.emoji}</Text>
        <Text
          style={[
            wonderStyles.optionLabel,
            {
              color: isDark ? "#F0E8D8" : "#333",
              fontFamily: "Inter_600SemiBold",
            },
          ]}
          numberOfLines={2}
        >
          {opt.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const wonderStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 50,
  },
  card: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 16,
    width: "100%",
    maxWidth: 360,
  },
  question: {
    fontSize: 20,
    lineHeight: 28,
    textAlign: "center",
  },
  optionsRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  optionBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 18,
    minWidth: 90,
    minHeight: 90,
    gap: 6,
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionLabel: {
    fontSize: 12,
    textAlign: "center",
  },
});

const MOOD_CONFIG: Record<SceneMood, { icon: string; color: string; label: string }> = {
  AWE: { icon: "sparkles", color: "#A78BFA", label: "Awe" },
  PEACE: { icon: "leaf", color: "#7EDCB5", label: "Peace" },
  TENSION: { icon: "flash", color: "#F97316", label: "Tension" },
  JOY: { icon: "sunny", color: "#FBBF24", label: "Joy" },
};

function MoodBadge({ mood }: { mood: SceneMood }) {
  const config = MOOD_CONFIG[mood];
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 150 });
    opacity.value = withTiming(1, { duration: 400 });
  }, [mood]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[moodBadgeStyles.container, { backgroundColor: config.color + "30" }, animStyle]}>
      <Ionicons name={config.icon as any} size={14} color={config.color} />
      <Text style={[moodBadgeStyles.label, { color: config.color }]}>{config.label}</Text>
    </Animated.View>
  );
}

const moodBadgeStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});

function SceneProgressDots({
  total,
  current,
  theme,
}: {
  total: number;
  current: number;
  theme: any;
}) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            {
              backgroundColor: i === current ? theme.accent : "rgba(255,255,255,0.3)",
              width: i === current ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

function LevelUpModal({
  visible,
  newLevel,
  theme,
  onClose,
}: {
  visible: boolean;
  newLevel: number;
  theme: any;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={levelStyles.overlay}>
        <Animated.View
          entering={FadeInUp.springify().damping(12)}
          style={[levelStyles.card, { backgroundColor: theme.backgroundCard || "#2A2A4A" }]}
        >
          <Ionicons name="trophy" size={56} color={theme.starGold || "#F5A623"} />
          <Text style={[levelStyles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Level Up!
          </Text>
          <Text style={[levelStyles.level, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
            Level {newLevel}
          </Text>
          <Text style={[levelStyles.desc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            You are growing in God's Word!
          </Text>
          <Pressable onPress={onClose} style={[levelStyles.btn, { backgroundColor: theme.accent }]}>
            <Text style={[levelStyles.btnText, { fontFamily: "Inter_600SemiBold" }]}>Awesome!</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const levelStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  title: { fontSize: 28 },
  level: { fontSize: 36 },
  desc: { fontSize: 15, textAlign: "center", marginTop: 4 },
  btn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 16,
  },
  btnText: { color: "#fff", fontSize: 16 },
});

function StreakCelebration({
  visible,
  streakDays,
  theme,
  onClose,
}: {
  visible: boolean;
  streakDays: number;
  theme: any;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={levelStyles.overlay}>
        <Animated.View
          entering={FadeInUp.springify().damping(12)}
          style={[levelStyles.card, { backgroundColor: theme.backgroundCard || "#2A2A4A" }]}
        >
          <Ionicons name="flame" size={56} color="#FF6B35" />
          <Text style={[levelStyles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {streakDays}-Day Streak!
          </Text>
          <Text style={[levelStyles.desc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Keep reading every day to grow your streak!
          </Text>
          <Pressable onPress={onClose} style={[levelStyles.btn, { backgroundColor: "#FF6B35" }]}>
            <Text style={[levelStyles.btnText, { fontFamily: "Inter_600SemiBold" }]}>Keep Going!</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function SceneStoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? KidsColors.dark : KidsColors.light;
  const insets = useSafeAreaInsets();
  const { ageGroup, activeChildProfileId } = useKidsMode();
  const queryClient = useQueryClient();
  const isLittleLambs = ageGroup === "little_lambs";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [scenes, setScenes] = useState<StoryScene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentScene, setCurrentScene] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [answeredWonders, setAnsweredWonders] = useState<Set<number>>(new Set());
  const [showWonder, setShowWonder] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [storyComplete, setStoryComplete] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [showStreak, setShowStreak] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [storyTitle, setStoryTitle] = useState("");
  const [quietMode, setQuietMode] = useState(false);
  const [quietModeLoaded, setQuietModeLoaded] = useState(false);

  const currentMood = useMemo<SceneMood | null>(() => {
    if (scenes.length === 0 || !quietModeLoaded) return null;
    return scenes[currentScene]?.mood || "PEACE";
  }, [scenes, currentScene, quietModeLoaded]);

  const { cleanup: cleanupAudio } = useAtmosphereAudio(currentMood, quietMode);

  const flatListRef = useRef<FlatList>(null);
  const wordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(QUIET_MODE_KEY).then((val) => {
      if (val === "true") setQuietMode(true);
      setQuietModeLoaded(true);
    }).catch(() => setQuietModeLoaded(true));
  }, []);

  useEffect(() => {
    loadScenes();
    return () => {
      Speech.stop();
      if (wordTimerRef.current) clearInterval(wordTimerRef.current);
      cleanupAudio();
    };
  }, [id]);

  const loadScenes = async () => {
    try {
      setLoading(true);
      setError(null);

      try {
        const storyRes = await apiRequest("GET", `/api/kids/stories/${id}`);
        const storyData = await storyRes.json();
        setStoryTitle(storyData.title || "");
      } catch {}

      const genRes = await apiRequest("POST", `/api/kids/story/${id}/generate`);
      const data: StoryScene[] = await genRes.json();
      setScenes(data);
    } catch (err: any) {
      setError(err.message || "Failed to load story");
    } finally {
      setLoading(false);
    }
  };

  const handleReadToMe = useCallback(() => {
    const scene = scenes[currentScene];
    if (!scene) return;

    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      setCurrentWordIndex(0);
      if (wordTimerRef.current) clearInterval(wordTimerRef.current);
      return;
    }

    const words = scene.narration.split(/\s+/);
    setIsSpeaking(true);
    setCurrentWordIndex(0);

    const avgWordDuration = isLittleLambs ? 380 : 300;
    let wordIdx = 0;
    wordTimerRef.current = setInterval(() => {
      wordIdx++;
      if (wordIdx >= words.length) {
        if (wordTimerRef.current) clearInterval(wordTimerRef.current);
        setIsSpeaking(false);
        setCurrentWordIndex(0);
        if (scene.pauseAndWonder && !answeredWonders.has(scene.sceneIndex)) {
          setShowWonder(scene.sceneIndex);
        }
        return;
      }
      setCurrentWordIndex(wordIdx);
    }, avgWordDuration);

    Speech.speak(scene.narration, {
      language: "en-US",
      rate: isLittleLambs ? 0.85 : 0.95,
      onDone: () => {
        if (wordTimerRef.current) clearInterval(wordTimerRef.current);
        setIsSpeaking(false);
        setCurrentWordIndex(0);
        if (scene.pauseAndWonder && !answeredWonders.has(scene.sceneIndex)) {
          setShowWonder(scene.sceneIndex);
        }
      },
      onStopped: () => {
        if (wordTimerRef.current) clearInterval(wordTimerRef.current);
        setIsSpeaking(false);
        setCurrentWordIndex(0);
      },
    });
  }, [currentScene, scenes, isSpeaking, isLittleLambs, answeredWonders]);

  const handleWonderAnswer = useCallback(
    (sceneIdx: number, optionIdx: number) => {
      setAnsweredWonders((prev) => new Set([...prev, sceneIdx]));
      setShowConfetti(true);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setTimeout(() => {
        setShowConfetti(false);
        setShowWonder(null);
      }, 1800);
    },
    []
  );

  const goToScene = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= scenes.length) return;
      Speech.stop();
      setIsSpeaking(false);
      setCurrentWordIndex(0);
      if (wordTimerRef.current) clearInterval(wordTimerRef.current);
      setCurrentScene(idx);
      flatListRef.current?.scrollToIndex({ index: idx, animated: true });
    },
    [scenes.length]
  );

  const progressUserId = activeChildProfileId || "guest";

  const completeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/kids/progress/complete", {
        userId: progressUserId,
        storyId: id,
        childProfileId: activeChildProfileId,
      });

      const streakRes = await apiRequest("POST", "/api/kids/streak/update", {
        userId: progressUserId,
        childProfileId: activeChildProfileId,
      });
      const streakData = await streakRes.json();

      const pointsRes = await apiRequest("POST", "/api/kids/story/award-points", {
        userId: progressUserId,
        storyId: id,
        points: 25,
        childProfileId: activeChildProfileId,
      });
      const pointsData = await pointsRes.json();

      return { streak: streakData, points: pointsData };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/kids/progress/${progressUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/kids/streak/${progressUserId}`] });

      if (data.points?.leveledUp) {
        setNewLevel(data.points.currentLevel);
        setShowLevelUp(true);
      }

      if (data.streak?.currentStreak >= 3 && data.streak?.currentStreak % 3 === 0) {
        setStreakDays(data.streak.currentStreak);
        setTimeout(() => setShowStreak(true), data.points?.leveledUp ? 2500 : 500);
      }
    },
  });

  const toggleQuietMode = useCallback(() => {
    setQuietMode((prev) => {
      const next = !prev;
      AsyncStorage.setItem(QUIET_MODE_KEY, next ? "true" : "false");
      return next;
    });
  }, []);

  const handleComplete = useCallback(() => {
    setStoryComplete(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
    completeMutation.mutate();
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      if (typeof idx === "number") {
        setCurrentScene(idx);
      }
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderScene = useCallback(
    ({ item, index }: { item: StoryScene; index: number }) => {
      const palette = SCENE_GRADIENT_PALETTES[index % SCENE_GRADIENT_PALETTES.length];
      const isLastScene = index === scenes.length - 1;

      return (
        <View style={[styles.scenePage, { width: SCREEN_WIDTH }]}>
          <LinearGradient
            colors={palette as [string, string, string]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          <View style={[styles.sceneContent, { paddingTop: topPad + 16 }]}>
            <View style={styles.illustrationArea}>
              <View style={styles.illustrationPlaceholder}>
                <Ionicons
                  name="image-outline"
                  size={32}
                  color="rgba(255,255,255,0.4)"
                />
                <Text style={styles.illustrationLabel} numberOfLines={3}>
                  {item.illustrationPrompt.replace("Soft watercolor, 2D animation style, warm earth tones, biblically inspired. ", "")}
                </Text>
              </View>
            </View>

            <View style={styles.narrationArea}>
              {index === currentScene ? (
                <WordHighlightText
                  text={item.narration}
                  currentWordIndex={currentWordIndex}
                  isSpeaking={isSpeaking}
                  theme={theme}
                  isLittleLambs={isLittleLambs}
                />
              ) : (
                <Text
                  style={[
                    styles.narrationText,
                    { fontFamily: "Lora_400Regular", fontSize: isLittleLambs ? 22 : 20 },
                  ]}
                >
                  {item.narration}
                </Text>
              )}
            </View>

            {item.pauseAndWonder && !answeredWonders.has(item.sceneIndex) && index === currentScene && (
              <Pressable
                onPress={() => setShowWonder(item.sceneIndex)}
                style={styles.wonderTrigger}
              >
                <Ionicons name="sparkles" size={16} color={theme.starGold || "#F5A623"} />
                <Text style={[styles.wonderTriggerText, { fontFamily: "Inter_600SemiBold" }]}>
                  Pause & Wonder
                </Text>
              </Pressable>
            )}

            {item.pauseAndWonder && answeredWonders.has(item.sceneIndex) && (
              <View style={styles.wonderDone}>
                <Ionicons name="checkmark-circle" size={16} color="#7ED321" />
                <Text style={[styles.wonderDoneText, { fontFamily: "Inter_500Medium" }]}>
                  Wonder answered!
                </Text>
              </View>
            )}

            {isLastScene && !storyComplete && index === currentScene && (
              <Animated.View entering={FadeInUp.delay(300).springify()}>
                <Pressable
                  onPress={handleComplete}
                  style={[styles.completeBtn, { backgroundColor: theme.starGold || "#F5A623" }]}
                  testID="complete-story"
                >
                  <Ionicons name="star" size={20} color="#fff" />
                  <Text style={[styles.completeBtnText, { fontFamily: "Inter_700Bold" }]}>
                    I Finished This Story!
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {storyComplete && isLastScene && (
              <Animated.View entering={FadeIn.duration(500)} style={styles.completeMessage}>
                <Ionicons name="star" size={44} color={theme.starGold || "#F5A623"} />
                <Text style={[styles.completeTitle, { fontFamily: "Lora_700Bold" }]}>
                  Story Complete!
                </Text>
                <Text style={[styles.completeSubtitle, { fontFamily: "Inter_500Medium" }]}>
                  +25 Seed Points earned
                </Text>
              </Animated.View>
            )}
          </View>
        </View>
      );
    },
    [
      currentScene,
      currentWordIndex,
      isSpeaking,
      theme,
      isLittleLambs,
      answeredWonders,
      storyComplete,
      scenes.length,
      topPad,
    ]
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
          Preparing your story...
        </Text>
      </View>
    );
  }

  if (error || scenes.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
        <Text style={[styles.loadingText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
          {error || "No scenes available"}
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.retryBtn, { backgroundColor: theme.accent }]}>
          <Text style={[styles.retryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={scenes}
        renderItem={renderScene}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        scrollEnabled={showWonder === null}
      />

      <ConfettiBurst visible={showConfetti} />

      {showWonder !== null && (
        <PauseAndWonderOverlay
          wonder={scenes.find((s) => s.sceneIndex === showWonder)?.pauseAndWonder || null}
          theme={theme}
          onAnswer={(idx) => handleWonderAnswer(showWonder, idx)}
          answered={answeredWonders.has(showWonder)}
          isDark={isDark}
        />
      )}

      <View style={[styles.topHeader, { paddingTop: topPad + 8 }]}>
        <Pressable
          onPress={toggleQuietMode}
          style={[
            styles.quietModeBtn,
            { backgroundColor: quietMode ? "rgba(255,100,100,0.25)" : "rgba(255,255,255,0.15)" },
          ]}
          testID="quiet-mode-toggle"
        >
          <Ionicons
            name={quietMode ? "volume-mute" : "musical-notes"}
            size={18}
            color={quietMode ? "#FF6B6B" : "rgba(255,255,255,0.8)"}
          />
        </Pressable>
        {currentMood && !quietMode && (
          <MoodBadge mood={currentMood} />
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="scene-back"
        >
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.8)" />
        </Pressable>

        <View style={styles.navCenter}>
          <View style={styles.sceneInfo}>
            <Text style={[styles.storyTitleText, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {storyTitle}
            </Text>
          </View>
          <SceneProgressDots total={scenes.length} current={currentScene} theme={theme} />
        </View>

        <Pressable
          onPress={handleReadToMe}
          style={[styles.readToMeBtn, { backgroundColor: isSpeaking ? "#FF6B35" : "rgba(255,255,255,0.2)" }]}
          testID="read-to-me"
        >
          <Ionicons
            name={isSpeaking ? "stop" : "volume-high"}
            size={20}
            color="#fff"
          />
        </Pressable>
      </View>

      {currentScene > 0 && (
        <Pressable
          onPress={() => goToScene(currentScene - 1)}
          style={[styles.navArrow, styles.navLeft]}
          testID="scene-prev"
        >
          <Ionicons name="chevron-back" size={28} color="rgba(255,255,255,0.6)" />
        </Pressable>
      )}

      {currentScene < scenes.length - 1 && (
        <Pressable
          onPress={() => goToScene(currentScene + 1)}
          style={[styles.navArrow, styles.navRight]}
          testID="scene-next"
        >
          <Ionicons name="chevron-forward" size={28} color="rgba(255,255,255,0.6)" />
        </Pressable>
      )}

      <LevelUpModal
        visible={showLevelUp}
        newLevel={newLevel}
        theme={theme}
        onClose={() => setShowLevelUp(false)}
      />

      <StreakCelebration
        visible={showStreak}
        streakDays={streakDays}
        theme={theme}
        onClose={() => setShowStreak(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 15,
  },
  scenePage: {
    flex: 1,
    height: SCREEN_HEIGHT,
  },
  sceneContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  illustrationArea: {
    height: "30%",
    justifyContent: "center",
    alignItems: "center",
  },
  illustrationPlaceholder: {
    width: "90%",
    height: "85%",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  illustrationLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  narrationArea: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  narrationText: {
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 36,
  },
  wonderTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: "rgba(245,166,35,0.15)",
    alignSelf: "center",
    marginTop: 12,
  },
  wonderTriggerText: {
    color: "#F5A623",
    fontSize: 14,
  },
  wonderDone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  wonderDoneText: {
    color: "#7ED321",
    fontSize: 13,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 28,
    alignSelf: "center",
    marginTop: 20,
  },
  completeBtnText: {
    color: "#fff",
    fontSize: 17,
  },
  completeMessage: {
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  completeTitle: {
    color: "#fff",
    fontSize: 26,
  },
  completeSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  navCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  sceneInfo: {
    alignItems: "center",
  },
  storyTitleText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  readToMeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  topHeader: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 20,
  },
  quietModeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  navLeft: {
    left: 4,
  },
  navRight: {
    right: 4,
  },
});
