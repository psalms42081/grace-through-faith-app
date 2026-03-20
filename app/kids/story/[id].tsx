import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Dimensions,
  Modal,
  Image,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  FadeIn,
  FadeInDown,
  FadeInUp,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { createAudioPlayer, setIsAudioActiveAsync, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/useTheme";
import { useKidsMode } from "@/context/KidsModeContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import SceneInteraction from "@/components/kids/SceneInteraction";
import StoryCompletionFlow from "@/components/kids/StoryCompletionFlow";
import LivingScene from "@/components/kids/LivingScene";
import CinematicScene from "@/components/kids/CinematicScene";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const KIDS_VOICE_KEY = "@grace-kids/narrator-voice";

type NarratorVoice = "george" | "sarah";
const NARRATOR_VOICES: { id: NarratorVoice; label: string; desc: string; gender: "male" | "female" }[] = [
  { id: "george", label: "George", desc: "Warm storyteller", gender: "male" },
  { id: "sarah", label: "Sarah", desc: "Reassuring & confident", gender: "female" },
];

const VOICE_PITCH_MAP: Record<NarratorVoice, { pitch: number; rate: number; gender: "male" | "female" }> = {
  george: { pitch: 0.9, rate: 0, gender: "male" },
  sarah: { pitch: 1.1, rate: 0, gender: "female" },
};

let cachedDeviceVoices: { male: Speech.Voice | null; female: Speech.Voice | null } | null = null;

async function getBestDeviceVoice(gender: "male" | "female"): Promise<Speech.Voice | undefined> {
  if (!cachedDeviceVoices) {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const enVoices = voices.filter(v => v.language?.startsWith("en"));
      cachedDeviceVoices = {
        male: enVoices.find(v => v.name?.toLowerCase().includes("male") || v.identifier?.toLowerCase().includes("male")) ||
              enVoices.find(v => v.name?.toLowerCase().includes("daniel") || v.name?.toLowerCase().includes("james") || v.name?.toLowerCase().includes("david")) ||
              null,
        female: enVoices.find(v => v.name?.toLowerCase().includes("female") || v.identifier?.toLowerCase().includes("female")) ||
                enVoices.find(v => v.name?.toLowerCase().includes("samantha") || v.name?.toLowerCase().includes("karen") || v.name?.toLowerCase().includes("victoria")) ||
                null,
      };
    } catch {
      cachedDeviceVoices = { male: null, female: null };
    }
  }
  const picked = gender === "male" ? cachedDeviceVoices.male : cachedDeviceVoices.female;
  return picked || undefined;
}

type SceneMood = "AWE" | "PEACE" | "TENSION" | "JOY" | "LOVE";

interface VideoTimecodeSegment {
  startMs: number;
  endMs: number;
  text: string;
}

interface StoryScene {
  id: string;
  storyId: string;
  sceneIndex: number;
  narration: string;
  illustrationPrompt: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoTimecodes: { segments: VideoTimecodeSegment[] } | null;
  mood: SceneMood;
  pauseAndWonder: {
    question: string;
    options: { emoji: string; label: string }[];
    correctIndex: number;
  } | null;
  interactionType?: string | null;
  interactionConfig?: Record<string, any> | null;
  soundEffects?: { key: string; url?: string; trigger: string }[] | null;
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

interface SentenceInfo {
  text: string;
  startWordIndex: number;
  endWordIndex: number;
}

function splitIntoSentences(text: string): SentenceInfo[] {
  const words = text.split(/\s+/);
  const sentences: SentenceInfo[] = [];
  let currentSentence = "";
  let startIdx = 0;

  words.forEach((word, i) => {
    currentSentence += (currentSentence ? " " : "") + word;
    if (/[.!?]$/.test(word) || i === words.length - 1) {
      sentences.push({
        text: currentSentence,
        startWordIndex: startIdx,
        endWordIndex: i,
      });
      currentSentence = "";
      startIdx = i + 1;
    }
  });

  return sentences;
}

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
  const sentences = useMemo(() => splitIntoSentences(text), [text]);
  const fontSize = isLittleLambs ? 22 : 20;

  const currentSentenceIdx = useMemo(() => {
    if (!isSpeaking) return -1;
    return sentences.findIndex(
      (s) => currentWordIndex >= s.startWordIndex && currentWordIndex <= s.endWordIndex
    );
  }, [sentences, currentWordIndex, isSpeaking]);

  return (
    <Text style={{ textAlign: "center", lineHeight: fontSize * 2.1 }}>
      {words.map((word, i) => {
        const isActive = isSpeaking && i === currentWordIndex;
        const isPast = isSpeaking && i < currentWordIndex;
        const sentenceIdx = sentences.findIndex(
          (s) => i >= s.startWordIndex && i <= s.endWordIndex
        );
        const isInCurrentSentence = isSpeaking && sentenceIdx === currentSentenceIdx;
        const isInPastSentence = isSpeaking && sentenceIdx < currentSentenceIdx;

        return (
          <Text
            key={i}
            style={{
              fontFamily: "Lora_400Regular",
              fontSize: isActive ? fontSize + 2 : fontSize,
              color: isActive
                ? "#F5C451"
                : isInCurrentSentence
                ? "rgba(255,255,255,0.95)"
                : isInPastSentence
                ? "rgba(255,255,255,0.6)"
                : isSpeaking
                ? "rgba(255,255,255,0.35)"
                : "rgba(255,255,255,0.9)",
              fontWeight: isActive ? ("700" as const) : ("400" as const),
              backgroundColor: isActive
                ? "rgba(245,196,81,0.15)"
                : "transparent",
              borderRadius: isActive ? 4 : 0,
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

const MOOD_PARTICLES: Record<SceneMood, { icons: string[]; colors: string[]; count: number; speed: number }> = {
  AWE: {
    icons: ["star", "sparkles", "diamond"],
    colors: ["#A78BFA", "#C4B5FD", "#DDD6FE", "#8B5CF6"],
    count: 8,
    speed: 6000,
  },
  PEACE: {
    icons: ["leaf", "water", "flower"],
    colors: ["#7EDCB5", "#6EE7B7", "#A7F3D0", "#34D399"],
    count: 6,
    speed: 9000,
  },
  TENSION: {
    icons: ["flash", "flame", "thunderstorm"],
    colors: ["#F97316", "#FB923C", "#FDBA74", "#EF4444"],
    count: 5,
    speed: 3000,
  },
  JOY: {
    icons: ["sunny", "heart", "musical-notes"],
    colors: ["#FBBF24", "#FDE68A", "#FCA5A5", "#F472B6"],
    count: 8,
    speed: 5000,
  },
  LOVE: {
    icons: ["heart", "heart-circle", "flower"],
    colors: ["#F472B6", "#FB7185", "#FDA4AF", "#E879F9"],
    count: 7,
    speed: 7000,
  },
};

function MoodParticle({
  icon,
  color,
  delay,
  startX,
  speed,
}: {
  icon: string;
  color: string;
  delay: number;
  startX: number;
  speed: number;
}) {
  const translateY = useSharedValue(SCREEN_HEIGHT + 20);
  const translateX = useSharedValue(startX);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(0.6 + Math.random() * 0.5);

  useEffect(() => {
    const drift = (Math.random() - 0.5) * 60;
    opacity.value = withDelay(delay, withTiming(0.5, { duration: 800 }));
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(-40, { duration: speed, easing: Easing.linear }),
        -1,
        false
      )
    );
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(startX + drift, { duration: speed / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(startX - drift * 0.5, { duration: speed / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    rotate.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: speed * 1.5, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[particleStyles.particle, animStyle]}>
      <Ionicons name={icon as any} size={14 + Math.random() * 10} color={color} />
    </Animated.View>
  );
}

function MoodParticleOverlay({ mood, isActive }: { mood: SceneMood; isActive: boolean }) {
  const config = MOOD_PARTICLES[mood] ?? MOOD_PARTICLES.PEACE;
  const particles = useMemo(() => {
    const c = MOOD_PARTICLES[mood] ?? MOOD_PARTICLES.PEACE;
    return Array.from({ length: c.count }).map((_, i) => ({
      id: i,
      icon: c.icons[i % c.icons.length],
      color: c.colors[i % c.colors.length],
      delay: i * (c.speed / c.count),
      startX: 20 + Math.random() * (SCREEN_WIDTH - 40),
      speed: c.speed + (Math.random() - 0.5) * 2000,
    }));
  }, [mood]);

  if (!isActive) return null;

  return (
    <View style={particleStyles.overlay} pointerEvents="none">
      {particles.map((p) => (
        <MoodParticle key={`${mood}-${p.id}`} {...p} />
      ))}
    </View>
  );
}

interface TapRipple {
  id: number;
  x: number;
  y: number;
}

function TapReactionOverlay({
  mood,
  onTapZone,
}: {
  mood: SceneMood;
  onTapZone: (x: number, y: number) => void;
}) {
  const [ripples, setRipples] = useState<TapRipple[]>([]);
  const nextId = useRef(0);

  const handlePress = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    const id = nextId.current++;
    setRipples((prev) => [...prev.slice(-5), { id, x: locationX, y: locationY }]);
    onTapZone(locationX, locationY);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 1200);
  };

  const config = MOOD_PARTICLES[mood] ?? MOOD_PARTICLES.PEACE;
  const tapIcon = config.icons[0];
  const tapColor = config.colors[0];

  return (
    <Pressable
      style={particleStyles.tapZone}
      onPress={handlePress}
    >
      {ripples.map((r) => (
        <TapRippleEffect key={r.id} x={r.x} y={r.y} icon={tapIcon} color={tapColor} mood={mood} />
      ))}
    </Pressable>
  );
}

function TapRippleEffect({
  x,
  y,
  icon,
  color,
  mood,
}: {
  x: number;
  y: number;
  icon: string;
  color: string;
  mood: SceneMood;
}) {
  const ringScale = useSharedValue(0.2);
  const ringOpacity = useSharedValue(0.8);
  const burstItems = useMemo(() => {
    const count = mood === "JOY" ? 6 : mood === "AWE" ? 5 : 4;
    const config = MOOD_PARTICLES[mood] ?? MOOD_PARTICLES.PEACE;
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      return {
        id: i,
        icon: config.icons[i % config.icons.length],
        color: config.colors[i % config.colors.length],
        angle,
        distance: 30 + Math.random() * 25,
      };
    });
  }, [mood]);

  useEffect(() => {
    ringScale.value = withSpring(1.5, { damping: 8, stiffness: 100 });
    ringOpacity.value = withDelay(400, withTiming(0, { duration: 600 }));
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={[particleStyles.rippleContainer, { left: x - 40, top: y - 40 }]} pointerEvents="none">
      <Animated.View style={[particleStyles.ring, { borderColor: color }, ringStyle]} />
      {burstItems.map((item) => (
        <BurstParticle key={item.id} {...item} originX={40} originY={40} />
      ))}
    </View>
  );
}

function BurstParticle({
  icon,
  color,
  angle,
  distance,
  originX,
  originY,
}: {
  icon: string;
  color: string;
  angle: number;
  distance: number;
  originX: number;
  originY: number;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withSpring(1, { damping: 10, stiffness: 120 });
    opacity.value = withDelay(500, withTiming(0, { duration: 500 }));
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const dx = Math.cos(angle) * distance * progress.value;
    const dy = Math.sin(angle) * distance * progress.value;
    return {
      transform: [
        { translateX: originX + dx - 10 },
        { translateY: originY + dy - 10 },
        { scale: 1 - progress.value * 0.3 },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[particleStyles.burstParticle, animStyle]}>
      <Ionicons name={icon as any} size={16} color={color} />
    </Animated.View>
  );
}

const particleStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  particle: {
    position: "absolute",
  },
  tapZone: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  rippleContainer: {
    position: "absolute",
    width: 80,
    height: 80,
  },
  ring: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    position: "absolute",
  },
  burstParticle: {
    position: "absolute",
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

const MOOD_CONFIG: Record<SceneMood, { icon: string; color: string; label: string }> = {
  AWE: { icon: "sparkles", color: "#A78BFA", label: "Awe" },
  PEACE: { icon: "leaf", color: "#7EDCB5", label: "Peace" },
  TENSION: { icon: "flash", color: "#F97316", label: "Tension" },
  JOY: { icon: "sunny", color: "#FBBF24", label: "Joy" },
  LOVE: { icon: "heart", color: "#F472B6", label: "Love" },
};

const FALLBACK_MOOD_GRADIENTS: Record<SceneMood, string[]> = {
  AWE: ["#2E1065", "#6B21A8", "#A78BFA"],
  PEACE: ["#064E3B", "#166534", "#6EE7B7"],
  TENSION: ["#7C2D12", "#C2410C", "#FDBA74"],
  JOY: ["#78350F", "#D97706", "#FDE68A"],
  LOVE: ["#831843", "#BE185D", "#F9A8D4"],
};

const FALLBACK_MOOD_ICONS: Record<SceneMood, { name: string; color: string }> = {
  AWE: { name: "sparkles", color: "#DDD6FE" },
  PEACE: { name: "leaf", color: "#A7F3D0" },
  TENSION: { name: "flame", color: "#FED7AA" },
  JOY: { name: "sunny", color: "#FEF3C7" },
  LOVE: { name: "heart", color: "#FDA4AF" },
};

function SceneIllustrationPlaceholder({ mood, loading }: { mood: SceneMood; loading: boolean }) {
  const gradientColors = FALLBACK_MOOD_GRADIENTS[mood] || FALLBACK_MOOD_GRADIENTS.PEACE;
  const moodIcon = FALLBACK_MOOD_ICONS[mood] || FALLBACK_MOOD_ICONS.PEACE;

  const pulseScale = useSharedValue(1);
  const iconRotate = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    iconRotate.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-8, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulseScale.value },
      { rotate: `${iconRotate.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <LinearGradient
      colors={gradientColors as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={illustrationStyles.placeholderGradient}
    >
      <Animated.View style={[illustrationStyles.placeholderGlow, glowStyle]} />
      <Animated.View style={iconAnimStyle}>
        <Ionicons
          name={moodIcon.name as any}
          size={loading ? 56 : 64}
          color={moodIcon.color}
        />
      </Animated.View>
      {loading && (
        <View style={illustrationStyles.loadingRow}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
          <Text style={illustrationStyles.loadingLabel}>Painting your scene...</Text>
        </View>
      )}
    </LinearGradient>
  );
}

function SceneIllustration({ sceneId, illustrationPrompt, isVisible, onImageLoaded, mood }: { sceneId: string; illustrationPrompt: string; isVisible: boolean; onImageLoaded?: (url: string) => void; mood?: SceneMood }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const baseUrl = useMemo(() => {
    try { return getApiUrl().replace(/\/$/, ""); } catch { return ""; }
  }, []);

  useEffect(() => {
    if (!isVisible || imageUrl || loading || failed || !sceneId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await apiRequest("POST", `/api/kids/scene/${sceneId}/generate-image`);
        const data = await res.json();
        if (!cancelled && data.imageUrl) {
          const fullUrl = `${baseUrl}${data.imageUrl}`;
          setImageUrl(fullUrl);
          onImageLoaded?.(fullUrl);
        } else if (!cancelled) {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isVisible, sceneId]);

  if (imageUrl && !imageLoadError) {
    const ExpoImage = require("expo-image").Image;
    return (
      <ExpoImage
        source={imageUrl}
        style={illustrationStyles.image}
        contentFit="cover"
        cachePolicy="disk"
        transition={200}
        onError={() => setImageLoadError(true)}
      />
    );
  }

  return <SceneIllustrationPlaceholder mood={mood || "PEACE"} loading={loading && !failed} />;
}

const ILLUSTRATION_WIDTH = SCREEN_WIDTH - 48;
const ILLUSTRATION_HEIGHT = ILLUSTRATION_WIDTH * 0.85;

const KEN_BURNS_PATTERNS = [
  { fromScale: 1.0, toScale: 1.18, fromX: 0, toX: -15, fromY: 0, toY: -10 },
  { fromScale: 1.05, toScale: 1.2, fromX: -10, toX: 10, fromY: -5, toY: 5 },
  { fromScale: 1.0, toScale: 1.15, fromX: 10, toX: -10, fromY: 5, toY: -8 },
  { fromScale: 1.08, toScale: 1.22, fromX: 5, toX: -12, fromY: -8, toY: 6 },
  { fromScale: 1.0, toScale: 1.12, fromX: -8, toX: 8, fromY: 8, toY: -5 },
  { fromScale: 1.05, toScale: 1.18, fromX: 12, toX: -5, fromY: -3, toY: 10 },
  { fromScale: 1.02, toScale: 1.2, fromX: -5, toX: 15, fromY: 3, toY: -6 },
];

function KenBurnsImage({
  uri,
  isActive,
  patternIndex,
  mood,
  onError,
}: {
  uri: string;
  isActive: boolean;
  patternIndex: number;
  mood?: SceneMood;
  onError?: () => void;
}) {
  const [hasError, setHasError] = useState(false);
  const progress = useSharedValue(0);
  const pattern = KEN_BURNS_PATTERNS[patternIndex % KEN_BURNS_PATTERNS.length];

  useEffect(() => {
    if (isActive) {
      progress.value = 0;
      progress.value = withRepeat(
        withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      progress.value = withTiming(0, { duration: 500 });
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [pattern.fromScale, pattern.toScale]);
    const translateX = interpolate(progress.value, [0, 1], [pattern.fromX, pattern.toX]);
    const translateY = interpolate(progress.value, [0, 1], [pattern.fromY, pattern.toY]);
    return {
      transform: [
        { scale },
        { translateX },
        { translateY },
      ],
    };
  });

  if (hasError) {
    return <SceneIllustrationPlaceholder mood={mood || "PEACE"} loading={false} />;
  }

  return (
    <View style={kenBurnsStyles.container}>
      <Animated.Image
        source={{ uri }}
        style={[kenBurnsStyles.image, animatedStyle]}
        resizeMode="cover"
        onError={() => {
          setHasError(true);
          onError?.();
        }}
      />
    </View>
  );
}

const kenBurnsStyles = StyleSheet.create({
  container: {
    width: ILLUSTRATION_WIDTH,
    height: ILLUSTRATION_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});

const VIDEO_HEIGHT = SCREEN_HEIGHT * 0.45;

function VideoStoryPlayer({
  videoUrl,
  timecodes,
  narration,
  isActive,
  mood,
  theme,
  isLittleLambs,
  onVideoEnd,
}: {
  videoUrl: string;
  timecodes: { segments: VideoTimecodeSegment[] } | null;
  narration: string;
  isActive: boolean;
  mood: SceneMood;
  theme: any;
  isLittleLambs: boolean;
  onVideoEnd?: () => void;
}) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const rawSegments = useMemo(() => {
    if (timecodes?.segments?.length) return timecodes.segments;
    const sentences = narration.match(/[^.!?]+[.!?]+/g) || [narration];
    const totalWords = narration.split(/\s+/).length;
    const estimatedDurationMs = totalWords * 350;
    let currentMs = 0;
    return sentences.map((sentence) => {
      const sentenceWords = sentence.trim().split(/\s+/).length;
      const segmentDuration = (sentenceWords / totalWords) * estimatedDurationMs;
      const segment = {
        startMs: Math.round(currentMs),
        endMs: Math.round(currentMs + segmentDuration),
        text: sentence.trim(),
      };
      currentMs += segmentDuration;
      return segment;
    });
  }, [timecodes, narration]);

  const segments = useMemo(() => {
    if (!duration || !rawSegments.length) return rawSegments;
    const lastEnd = rawSegments[rawSegments.length - 1].endMs;
    if (lastEnd <= 0) return rawSegments;
    const scale = duration / lastEnd;
    if (Math.abs(scale - 1) < 0.05) return rawSegments;
    return rawSegments.map((s) => ({
      ...s,
      startMs: Math.round(s.startMs * scale),
      endMs: Math.round(s.endMs * scale),
    }));
  }, [rawSegments, duration]);

  const currentSegmentIndex = useMemo(() => {
    if (!isPlaying) return -1;
    return segments.findIndex(
      (s) => currentTimeMs >= s.startMs && currentTimeMs < s.endMs
    );
  }, [currentTimeMs, segments, isPlaying]);

  const progressPercent = useMemo(() => {
    if (!duration) return 0;
    return Math.min(100, (currentTimeMs / duration) * 100);
  }, [currentTimeMs, duration]);

  useEffect(() => {
    if (isActive && videoRef.current && isLoaded && !hasError) {
      videoRef.current.playAsync();
      setIsPlaying(true);
    } else if (!isActive && videoRef.current) {
      videoRef.current.pauseAsync();
      setIsPlaying(false);
    }
  }, [isActive, isLoaded, hasError]);

  const handlePlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if ((status as any).error) {
        setHasError(true);
      }
      return;
    }
    setCurrentTimeMs(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);
    if (!isLoaded) setIsLoaded(true);
    if (status.didJustFinish) {
      setIsPlaying(false);
      onVideoEnd?.();
    }
  };

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const replayVideo = async () => {
    if (!videoRef.current) return;
    setHasError(false);
    await videoRef.current.setPositionAsync(0);
    await videoRef.current.playAsync();
  };

  const moodColors = MOOD_PARTICLES[mood]?.colors || ["#A78BFA"];
  const fontSize = isLittleLambs ? 20 : 18;

  return (
    <View style={videoStyles.container}>
      <View style={videoStyles.videoArea}>
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={videoStyles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false}
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatus}
          isMuted={false}
        />

        {hasError && (
          <View style={videoStyles.loadingOverlay}>
            <Ionicons name="alert-circle" size={40} color="#FF6B6B" />
            <Text style={videoStyles.loadingText}>Video unavailable</Text>
            <Pressable onPress={replayVideo} style={[videoStyles.playPauseBtn, { marginTop: 8 }]}>
              <Ionicons name="refresh" size={22} color="#fff" />
            </Pressable>
          </View>
        )}

        {!isLoaded && !hasError && (
          <View style={videoStyles.loadingOverlay}>
            <ActivityIndicator size="large" color={moodColors[0]} />
            <Text style={videoStyles.loadingText}>Loading video...</Text>
          </View>
        )}

        <View style={videoStyles.controlsOverlay}>
          <Pressable onPress={togglePlayPause} style={videoStyles.playPauseBtn}>
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={28}
              color="#fff"
            />
          </Pressable>
        </View>

        <View style={videoStyles.progressBarContainer}>
          <View
            style={[
              videoStyles.progressBar,
              { width: `${progressPercent}%`, backgroundColor: moodColors[0] },
            ]}
          />
        </View>

        <View style={videoStyles.cinemaBadge}>
          <Ionicons name="videocam" size={12} color={moodColors[0]} />
          <Text style={[videoStyles.cinemaBadgeText, { color: moodColors[0] }]}>
            Cinema
          </Text>
        </View>
      </View>

      <View style={videoStyles.textArea}>
        <View style={videoStyles.syncedTextContainer}>
          {segments.map((segment, i) => {
            const isCurrentSegment = i === currentSegmentIndex;
            const isPastSegment = i < currentSegmentIndex;

            return (
              <Animated.Text
                key={i}
                style={[
                  videoStyles.segmentText,
                  {
                    fontSize,
                    lineHeight: fontSize * 1.7,
                    color: isCurrentSegment
                      ? "#F5C451"
                      : isPastSegment
                      ? "rgba(255,255,255,0.55)"
                      : isPlaying
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(255,255,255,0.85)",
                    fontWeight: isCurrentSegment
                      ? ("700" as const)
                      : ("400" as const),
                    backgroundColor: isCurrentSegment
                      ? "rgba(255,215,0,0.1)"
                      : "transparent",
                  },
                ]}
              >
                {segment.text}{" "}
              </Animated.Text>
            );
          })}
        </View>

        {!isPlaying && isLoaded && currentTimeMs > 0 && duration > 0 && currentTimeMs >= duration - 500 && (
          <Pressable onPress={replayVideo} style={[videoStyles.replayBtn, { backgroundColor: moodColors[0] }]}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={videoStyles.replayBtnText}>Watch Again</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const videoStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoArea: {
    height: VIDEO_HEIGHT,
    backgroundColor: "#000",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  controlsOverlay: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  playPauseBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
  cinemaBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  cinemaBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  textArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    justifyContent: "center",
  },
  syncedTextContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  segmentText: {
    fontFamily: "Lora_400Regular",
    textAlign: "center",
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderRadius: 4,
  },
  replayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: "center",
    marginTop: 16,
  },
  replayBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});

const illustrationStyles = StyleSheet.create({
  image: {
    width: ILLUSTRATION_WIDTH,
    height: ILLUSTRATION_HEIGHT,
    borderRadius: 16,
  },
  placeholderGradient: {
    width: ILLUSTRATION_WIDTH,
    height: ILLUSTRATION_HEIGHT,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    overflow: "hidden",
  },
  placeholderGlow: {
    position: "absolute",
    width: ILLUSTRATION_WIDTH * 0.7,
    height: ILLUSTRATION_WIDTH * 0.7,
    borderRadius: ILLUSTRATION_WIDTH * 0.35,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  loadingLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});

function PulsingPlayButton({ isSpeaking, onPress }: { isSpeaking: boolean; onPress: () => void }) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (!isSpeaking) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isSpeaking]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={pulseStyle}>
      <Pressable
        onPress={onPress}
        style={[playBtnStyles.btn, { backgroundColor: isSpeaking ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.12)" }]}
        testID="read-to-me"
      >
        <Ionicons
          name={isSpeaking ? "pause" : "play"}
          size={22}
          color={isSpeaking ? "#FF6B35" : "rgba(255,255,255,0.85)"}
        />
      </Pressable>
    </Animated.View>
  );
}

const playBtnStyles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});

function CompletionSparkle({ index, color }: { index: number; color: string }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const angle = (index * 45) * (Math.PI / 180);
    const radius = 40 + Math.random() * 20;
    const delay = 300 + index * 50;
    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1.4, { damping: 5, stiffness: 180 }),
        withSpring(0, { damping: 10, stiffness: 120 })
      )
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 300 })
      )
    );
    translateX.value = withDelay(delay, withTiming(Math.cos(angle) * radius, { duration: 400 }));
    translateY.value = withDelay(delay, withTiming(Math.sin(angle) * radius, { duration: 400 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name="sparkles" size={12 + Math.random() * 6} color={color} />
    </Animated.View>
  );
}

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
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current;
        return (
          <Animated.View
            key={i}
            entering={FadeIn.duration(200)}
            style={[
              dotStyles.dot,
              {
                backgroundColor: isActive ? (theme.starGold || "#F5C451") : "rgba(255,255,255,0.3)",
                width: isActive ? 24 : 8,
                opacity: isActive ? 1 : 0.4,
                transform: [{ scale: isActive ? 1.3 : 1 }],
              },
            ]}
          />
        );
      })}
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
    marginTop: 8,
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
  const { theme, isDark } = useTheme(true);
  const insets = useSafeAreaInsets();
  const { ageGroup, activeChildProfileId } = useKidsMode();
  const queryClient = useQueryClient();
  const isLittleLambs = ageGroup === "little_lambs";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const baseUrl = useMemo(() => {
    try { return getApiUrl().replace(/\/$/, ""); } catch { return ""; }
  }, []);

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
  const [storyMemoryVerse, setStoryMemoryVerse] = useState("");
  const [storyMemoryVerseRef, setStoryMemoryVerseRef] = useState("");
  const [storyPrayerPrompt, setStoryPrayerPrompt] = useState("");
  const [showCompletionFlow, setShowCompletionFlow] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  const [quietModeLoaded, setQuietModeLoaded] = useState(false);
  const [autoPlayMode, setAutoPlayMode] = useState(false);
  const [narratorVoice, setNarratorVoice] = useState<NarratorVoice>("george");
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const autoPlayRef = useRef(false);
  const narrationActiveRef = useRef(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrationPlayerRef = useRef<AudioPlayer | null>(null);
  const narrationAbortRef = useRef<AbortController | null>(null);
  const narrationListenerRef = useRef<{ remove: () => void } | null>(null);

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
    AsyncStorage.getItem(KIDS_VOICE_KEY).then((val) => {
      if (val && NARRATOR_VOICES.some(v => v.id === val)) {
        setNarratorVoice(val as NarratorVoice);
      }
    }).catch(() => {});
  }, []);

  const stopNarrationAudio = useCallback(() => {
    if (narrationAbortRef.current) {
      narrationAbortRef.current.abort();
      narrationAbortRef.current = null;
    }
    if (narrationListenerRef.current) {
      try { narrationListenerRef.current.remove(); } catch {}
      narrationListenerRef.current = null;
    }
    if (narrationPlayerRef.current) {
      try { narrationPlayerRef.current.pause(); } catch {}
      try { narrationPlayerRef.current.remove(); } catch {}
      narrationPlayerRef.current = null;
    }
    Speech.stop();
  }, []);

  useEffect(() => {
    loadScenes();
    return () => {
      stopNarrationAudio();
      if (wordTimerRef.current) clearTimeout(wordTimerRef.current);
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      autoPlayRef.current = false;
      narrationActiveRef.current = false;
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
        if (storyData.memoryVerse) setStoryMemoryVerse(storyData.memoryVerse);
        if (storyData.memoryVerseRef) setStoryMemoryVerseRef(storyData.memoryVerseRef);
        if (storyData.prayerPrompt) setStoryPrayerPrompt(storyData.prayerPrompt);
      } catch {}

      const genRes = await apiRequest("POST", `/api/kids/story/${id}/generate`);
      const data: StoryScene[] = await genRes.json();
      setScenes(data);

      const base = getApiUrl();
      const { prefetch } = require("expo-image").Image;
      const sceneUris = data
        .map((scene: StoryScene) =>
          scene.imageUrl
            ? scene.imageUrl.startsWith("http") ? scene.imageUrl : `${base}${scene.imageUrl}`
            : null
        )
        .filter(Boolean) as string[];

      sceneUris.slice(0, 2).forEach((uri) => prefetch(uri).catch(() => {}));

      if (sceneUris.length > 2) {
        setTimeout(() => {
          sceneUris.slice(2).forEach((uri) => prefetch(uri).catch(() => {}));
        }, 3000);
      }
    } catch (err: any) {
      setError("Could not load the story. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const startNarrationRef = useRef<(sceneIdx: number) => void>(() => {});

  const autoAdvanceToNext = useCallback((fromScene: number) => {
    if (!autoPlayRef.current) return;
    if (fromScene >= scenes.length - 1) {
      setAutoPlayMode(false);
      autoPlayRef.current = false;
      return;
    }

    autoAdvanceTimer.current = setTimeout(() => {
      if (!autoPlayRef.current) return;
      const nextIdx = fromScene + 1;
      setCurrentScene(nextIdx);
      flatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });

      setTimeout(() => {
        if (autoPlayRef.current) {
          startNarrationRef.current(nextIdx);
        }
      }, 800);
    }, 1500);
  }, [scenes.length]);

  const startNarration = useCallback(async (sceneIdx: number) => {
    const scene = scenes[sceneIdx];
    if (!scene) return;
    if (scene.videoUrl) return;

    stopNarrationAudio();
    if (wordTimerRef.current) clearTimeout(wordTimerRef.current);

    const words = scene.narration.split(/\s+/);
    setIsSpeaking(true);
    setCurrentWordIndex(0);

    const onNarrationEnd = () => {
      if (wordTimerRef.current) clearTimeout(wordTimerRef.current);
      setIsSpeaking(false);
      setCurrentWordIndex(0);
      if (scene.pauseAndWonder && !answeredWonders.has(scene.sceneIndex)) {
        setShowWonder(scene.sceneIndex);
      } else {
        autoAdvanceToNext(sceneIdx);
      }
    };

    const onNarrationStopped = () => {
      if (wordTimerRef.current) clearTimeout(wordTimerRef.current);
      setIsSpeaking(false);
      setCurrentWordIndex(0);
    };

    const abortCtrl = new AbortController();
    narrationAbortRef.current = abortCtrl;

    try {
      const apiBase = getApiUrl();
      const prepareUrl = new URL("/api/tts/prepare", apiBase).toString();
      console.log("[Kids TTS] Calling prepare:", prepareUrl, "voice:", narratorVoice, "text length:", scene.narration.length);

      let prepareRes: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (abortCtrl.signal.aborted) return;
        try {
          prepareRes = await fetch(prepareUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: scene.narration, voice: narratorVoice }),
            signal: abortCtrl.signal,
          });
          if (prepareRes.ok) break;
          console.log(`[Kids TTS] Prepare attempt ${attempt + 1} failed: ${prepareRes.status}`);
          prepareRes = null;
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
        } catch (fetchErr: any) {
          if (abortCtrl.signal.aborted) return;
          console.log(`[Kids TTS] Prepare attempt ${attempt + 1} fetch error:`, fetchErr.message);
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!prepareRes || !prepareRes.ok) {
        const errBody = prepareRes ? await prepareRes.text().catch(() => "") : "no response";
        throw new Error(`TTS prepare failed after retries: ${prepareRes?.status || "network"} ${errBody}`);
      }

      const { audioId } = await prepareRes.json();
      console.log("[Kids TTS] Prepare succeeded, audioId:", audioId);
      if (abortCtrl.signal.aborted) return;

      const audioUri = new URL(`/api/tts/audio/${audioId}`, apiBase).href;
      console.log("[Kids TTS] Playing from:", audioUri);

      console.log("[Kids TTS] Setting audio mode...");
      await setIsAudioActiveAsync(true).catch((e: any) => console.log("[Kids TTS] setIsAudioActiveAsync error:", e.message));
      await setAudioModeAsync({ playsInSilentMode: true }).catch((e: any) => console.log("[Kids TTS] setAudioModeAsync error:", e.message));

      console.log("[Kids TTS] Creating audio player...");
      const player = createAudioPlayer(audioUri);
      narrationPlayerRef.current = player;
      console.log("[Kids TTS] Player created, setting up listener...");

      let wordTimerStarted = false;
      const startWordTimer = (durationMs?: number) => {
        if (wordTimerStarted) return;
        wordTimerStarted = true;
        const totalMs = durationMs && durationMs > 0
          ? durationMs
          : (isLittleLambs ? 480 : 400) * words.length;
        const minChars = 2;
        const charWeights = words.map(w => Math.max(w.replace(/[^a-zA-Z']/g, "").length, minChars));
        const totalWeight = charWeights.reduce((a, b) => a + b, 0);
        const wordDurations = charWeights.map(w => Math.max(180, (w / totalWeight) * totalMs));

        let wordIdx = 0;
        const scheduleNext = () => {
          if (wordIdx >= words.length - 1) return;
          const delay = wordDurations[wordIdx];
          wordTimerRef.current = setTimeout(() => {
            wordIdx++;
            setCurrentWordIndex(wordIdx);
            scheduleNext();
          }, delay) as any;
        };
        scheduleNext();
      };

      const statusSub = player.addListener("playbackStatusUpdate", (status: any) => {
        if (status.playing && !wordTimerStarted && status.duration && status.duration > 0) {
          startWordTimer(status.duration * 1000);
        }
        if (status.didJustFinish) {
          console.log("[Kids TTS] Audio finished playing");
          if (narrationListenerRef.current === statusSub) narrationListenerRef.current = null;
          statusSub?.remove();
          if (narrationPlayerRef.current === player) {
            narrationPlayerRef.current = null;
          }
          if (!abortCtrl.signal.aborted) {
            onNarrationEnd();
          }
        }
      });
      narrationListenerRef.current = statusSub;

      setTimeout(() => {
        if (!wordTimerStarted && !abortCtrl.signal.aborted) {
          startWordTimer();
        }
      }, 600);

      console.log("[Kids TTS] Calling player.play()...");
      player.play();
      console.log("[Kids TTS] player.play() called successfully");
    } catch (err: any) {
      if (abortCtrl.signal.aborted) return;
      console.log("[Kids TTS] ElevenLabs failed, falling back to device voice:", err.message);
      const fallbackTotalMs = (isLittleLambs ? 480 : 400) * words.length;
      const fbMinChars = 2;
      const fbWeights = words.map(w => Math.max(w.replace(/[^a-zA-Z']/g, "").length, fbMinChars));
      const fbTotalWeight = fbWeights.reduce((a, b) => a + b, 0);
      const fbDurations = fbWeights.map(w => Math.max(180, (w / fbTotalWeight) * fallbackTotalMs));
      let wordIdx = 0;
      const fbScheduleNext = () => {
        if (wordIdx >= words.length - 1) return;
        const delay = fbDurations[wordIdx];
        wordTimerRef.current = setTimeout(() => {
          wordIdx++;
          setCurrentWordIndex(wordIdx);
          fbScheduleNext();
        }, delay) as any;
      };
      fbScheduleNext();

      const voiceConfig = VOICE_PITCH_MAP[narratorVoice] || VOICE_PITCH_MAP.george;
      const baseRate = isLittleLambs ? 0.85 : 0.95;
      getBestDeviceVoice(voiceConfig.gender).then((deviceVoice) => {
        if (abortCtrl.signal.aborted) return;
        const speechOpts: Speech.SpeechOptions = {
          language: "en-US",
          rate: baseRate + voiceConfig.rate,
          pitch: voiceConfig.pitch,
          onDone: onNarrationEnd,
          onStopped: onNarrationStopped,
        };
        if (deviceVoice) {
          speechOpts.voice = deviceVoice.identifier;
        }
        Speech.speak(scene.narration, speechOpts);
      }).catch(() => {
        if (abortCtrl.signal.aborted) return;
        Speech.speak(scene.narration, {
          language: "en-US",
          rate: baseRate,
          pitch: voiceConfig.pitch,
          onDone: onNarrationEnd,
          onStopped: onNarrationStopped,
        });
      });
    }
  }, [scenes, isLittleLambs, answeredWonders, autoAdvanceToNext, narratorVoice, stopNarrationAudio]);

  startNarrationRef.current = startNarration;

  const handleReadToMe = useCallback(() => {
    const scene = scenes[currentScene];
    if (!scene) return;

    if (isSpeaking) {
      stopNarrationAudio();
      setIsSpeaking(false);
      setCurrentWordIndex(0);
      if (wordTimerRef.current) clearTimeout(wordTimerRef.current);
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      setAutoPlayMode(false);
      autoPlayRef.current = false;
      narrationActiveRef.current = false;
      return;
    }

    narrationActiveRef.current = true;
    startNarration(currentScene);
  }, [currentScene, scenes, isSpeaking, startNarration, stopNarrationAudio]);

  const handleReplayNarration = useCallback(() => {
    stopNarrationAudio();
    setIsSpeaking(false);
    setCurrentWordIndex(0);
    if (wordTimerRef.current) clearTimeout(wordTimerRef.current);
    narrationActiveRef.current = true;
    setTimeout(() => startNarration(currentScene), 100);
  }, [currentScene, startNarration, stopNarrationAudio]);

  const handleAutoPlay = useCallback(() => {
    if (autoPlayMode) {
      stopNarrationAudio();
      setIsSpeaking(false);
      setCurrentWordIndex(0);
      if (wordTimerRef.current) clearTimeout(wordTimerRef.current);
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      setAutoPlayMode(false);
      autoPlayRef.current = false;
      narrationActiveRef.current = false;
      return;
    }

    setAutoPlayMode(true);
    autoPlayRef.current = true;
    narrationActiveRef.current = true;
    startNarration(currentScene);
  }, [autoPlayMode, currentScene, startNarration, stopNarrationAudio]);

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

        if (autoPlayRef.current) {
          const sceneIndex = scenes.findIndex((s) => s.sceneIndex === sceneIdx);
          if (sceneIndex >= 0) {
            autoAdvanceToNext(sceneIndex);
          }
        }
      }, 1800);
    },
    [scenes, autoAdvanceToNext]
  );

  const goToScene = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= scenes.length) return;
      stopNarrationAudio();
      setIsSpeaking(false);
      setCurrentWordIndex(0);
      if (wordTimerRef.current) clearTimeout(wordTimerRef.current);
      prevSceneRef.current = idx;
      setCurrentScene(idx);
      flatListRef.current?.scrollToIndex({ index: idx, animated: true });
      if (narrationActiveRef.current) {
        setTimeout(() => {
          startNarrationRef.current(idx);
        }, 500);
      }
    },
    [scenes.length, stopNarrationAudio]
  );

  const progressUserId = activeChildProfileId || "guest";

  const completeMutation = useMutation({
    mutationFn: async () => {
      const completeRes = await apiRequest("POST", "/api/kids/progress/complete", {
        userId: progressUserId,
        storyId: id,
        childProfileId: activeChildProfileId,
      });
      const completeData = await completeRes.json();

      const streakRes = await apiRequest("POST", "/api/kids/streak/update", {
        userId: progressUserId,
        childProfileId: activeChildProfileId,
      });
      const streakData = await streakRes.json();

      let pointsData = null;
      if (completeData.firstCompletion) {
        const pointsRes = await apiRequest("POST", "/api/kids/story/award-points", {
          userId: progressUserId,
          storyId: id,
          points: 25,
          childProfileId: activeChildProfileId,
        });
        pointsData = await pointsRes.json();
      }

      return { streak: streakData, points: pointsData };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/kids/progress?_uid=${progressUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/kids/streak?_uid=${progressUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/kids/profile/stats?_uid=${progressUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/kids/badges/earned?_uid=${progressUserId}`] });

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

  const hasCompletionFlow = !!(storyMemoryVerse && storyPrayerPrompt);

  const handleComplete = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    if (hasCompletionFlow) {
      setShowCompletionFlow(true);
    } else {
      setStoryComplete(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      completeMutation.mutate();
    }
  }, [hasCompletionFlow]);

  const prevSceneRef = useRef(0);
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      if (typeof idx === "number") {
        const changed = prevSceneRef.current !== idx;
        prevSceneRef.current = idx;
        setCurrentScene(idx);
        if (changed && narrationActiveRef.current && !autoPlayRef.current) {
          setTimeout(() => {
            startNarrationRef.current(idx);
          }, 400);
        }
      }
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderScene = useCallback(
    ({ item, index }: { item: StoryScene; index: number }) => {
      const palette = SCENE_GRADIENT_PALETTES[index % SCENE_GRADIENT_PALETTES.length];
      const isLastScene = index === scenes.length - 1;

      const hasVideo = !!item.videoUrl;

      const isLivingScene = !!item.interactionConfig?.isLivingScene;

      return (
        <View style={[styles.scenePage, { width: SCREEN_WIDTH, backgroundColor: isLivingScene ? "#050507" : undefined }]}>
          {!isLivingScene && (
            <LinearGradient
              colors={palette as [string, string, string]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}

          {!item.interactionType && !isLivingScene && (
            <MoodParticleOverlay
              mood={item.mood || "PEACE"}
              isActive={index === currentScene && !quietMode}
            />
          )}

          {hasVideo ? (
            <View style={[styles.sceneContent, { paddingTop: topPad }]}>
              <VideoStoryPlayer
                videoUrl={item.videoUrl!.startsWith("http") ? item.videoUrl! : `${baseUrl}${item.videoUrl!}`}
                timecodes={item.videoTimecodes}
                narration={item.narration}
                isActive={index === currentScene}
                mood={item.mood || "PEACE"}
                theme={theme}
                isLittleLambs={isLittleLambs}
                onVideoEnd={() => {
                  if (isLastScene) {
                    handleComplete();
                  } else {
                    autoAdvanceToNext(index);
                  }
                }}
              />
            </View>
          ) : item.interactionConfig?.isLivingScene ? (
          <View style={{ flex: 1 }}>
            {isLittleLambs ? (
              <CinematicScene
                imageUrl={item.imageUrl ? (item.imageUrl.startsWith("http") ? item.imageUrl : `${baseUrl}${item.imageUrl}`) : ""}
                narration={item.narration}
                interactionType={item.interactionType || ""}
                interactionConfig={item.interactionConfig || {}}
                mood={item.mood || "PEACE"}
                isActive={index === currentScene}
                sceneIndex={index}
                isLittleLambs={isLittleLambs}
                currentWordIndex={currentWordIndex}
                isSpeaking={isSpeaking}
                theme={theme}
              />
            ) : (
              <LivingScene
                imageUrl={item.imageUrl ? (item.imageUrl.startsWith("http") ? item.imageUrl : `${baseUrl}${item.imageUrl}`) : ""}
                narration={item.narration}
                interactionType={item.interactionType || ""}
                interactionConfig={item.interactionConfig || {}}
                mood={item.mood || "PEACE"}
                isActive={index === currentScene}
                sceneIndex={index}
                isLittleLambs={isLittleLambs}
                currentWordIndex={currentWordIndex}
                isSpeaking={isSpeaking}
                theme={theme}
              />
            )}

            {isLastScene && !storyComplete && index === currentScene && (
              <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.livingSceneCompleteWrap}>
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
              <Animated.View entering={FadeInDown.springify().damping(10).stiffness(120)} style={[styles.completeMessage, styles.livingSceneCompleteMsg]}>
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                  <Animated.View
                    entering={FadeIn.delay(200).duration(300)}
                    style={{ transform: [{ scale: 1 }] }}
                  >
                    <Ionicons name="star" size={52} color={theme.starGold || "#F5A623"} />
                  </Animated.View>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <CompletionSparkle key={i} index={i} color={i % 2 === 0 ? (theme.starGold || "#F5A623") : "#fff"} />
                  ))}
                </View>
                <Animated.View entering={FadeInUp.delay(200).springify()}>
                  <Text style={[styles.completeCelebration, { fontFamily: "Inter_600SemiBold" }]}>
                    Great job! You finished the story!
                  </Text>
                </Animated.View>
                <Text style={[styles.completeTitle, { fontFamily: "Lora_700Bold" }]}>
                  Story Complete!
                </Text>
                <Animated.View entering={FadeInUp.delay(400).springify()}>
                  <Text style={[styles.completeSubtitle, { fontFamily: "Inter_500Medium" }]}>
                    +25 Seed Points earned
                  </Text>
                </Animated.View>
              </Animated.View>
            )}
          </View>
          ) : (
          <View style={[styles.sceneContent, { paddingTop: topPad + 16 }]}>
            <View style={styles.illustrationArea}>
              {item.imageUrl ? (
                <KenBurnsImage
                  uri={item.imageUrl.startsWith("http") ? item.imageUrl : `${baseUrl}${item.imageUrl}`}
                  isActive={index === currentScene}
                  patternIndex={index}
                  mood={item.mood || "PEACE"}
                />
              ) : (
                <SceneIllustration
                  sceneId={item.id}
                  illustrationPrompt={item.illustrationPrompt}
                  isVisible={Math.abs(index - currentScene) <= 1}
                  mood={item.mood || "PEACE"}
                  onImageLoaded={(url) => {
                    setScenes(prev => prev.map(s => s.id === item.id ? { ...s, imageUrl: url } : s));
                  }}
                />
              )}
              {index === currentScene && !item.interactionType && (
                <TapReactionOverlay
                  mood={item.mood || "PEACE"}
                  onTapZone={(x, y) => {
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                />
              )}
              {index === currentScene && item.interactionType && item.interactionConfig && (
                <SceneInteraction
                  type={item.interactionType}
                  config={item.interactionConfig}
                  containerWidth={SCREEN_WIDTH - 32}
                  containerHeight={ILLUSTRATION_HEIGHT}
                />
              )}
            </View>

            <View style={styles.narrationArea}>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.narrationScroll}
              >
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
              </ScrollView>
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
              <Animated.View entering={FadeInDown.springify().damping(10).stiffness(120)} style={styles.completeMessage}>
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                  <Animated.View
                    entering={FadeIn.delay(200).duration(300)}
                    style={{ transform: [{ scale: 1 }] }}
                  >
                    <Ionicons name="star" size={52} color={theme.starGold || "#F5A623"} />
                  </Animated.View>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <CompletionSparkle key={i} index={i} color={i % 2 === 0 ? (theme.starGold || "#F5A623") : "#fff"} />
                  ))}
                </View>
                <Animated.View entering={FadeInUp.delay(200).springify()}>
                  <Text style={[styles.completeCelebration, { fontFamily: "Inter_600SemiBold" }]}>
                    Great job! You finished the story!
                  </Text>
                </Animated.View>
                <Text style={[styles.completeTitle, { fontFamily: "Lora_700Bold" }]}>
                  Story Complete!
                </Text>
                <Animated.View entering={FadeInUp.delay(400).springify()}>
                  <Text style={[styles.completeSubtitle, { fontFamily: "Inter_500Medium" }]}>
                    +25 Seed Points earned
                  </Text>
                </Animated.View>
              </Animated.View>
            )}
          </View>
          )}
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
      autoAdvanceToNext,
      handleComplete,
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

      {showCompletionFlow && (
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={["#0D0D2B", "#1A1A3E", "#0D0D2B"]}
            style={StyleSheet.absoluteFill}
          />
          <StoryCompletionFlow
            memoryVerse={storyMemoryVerse}
            memoryVerseRef={storyMemoryVerseRef}
            prayerPrompt={storyPrayerPrompt}
            storyTitle={storyTitle}
            onComplete={() => {
              setShowCompletionFlow(false);
              setStoryComplete(true);
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 2000);
              completeMutation.mutate();
            }}
            theme={theme}
          />
        </View>
      )}

      {showWonder !== null && (
        <PauseAndWonderOverlay
          wonder={scenes.find((s) => s.sceneIndex === showWonder)?.pauseAndWonder || null}
          theme={theme}
          onAnswer={(idx) => handleWonderAnswer(showWonder, idx)}
          answered={answeredWonders.has(showWonder)}
          isDark={isDark}
        />
      )}

      {!isLittleLambs && (
        <View style={[styles.topHeader, { paddingTop: topPad + 8 }]}>
          {autoPlayMode && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={styles.autoPlayBadge}
            >
              <Ionicons name="play-forward" size={12} color="#A78BFA" />
              <Text style={styles.autoPlayBadgeText}>Auto-Read</Text>
            </Animated.View>
          )}
        </View>
      )}

      {currentScene === scenes.length - 1 ? (
        <View style={[styles.cinematicBottomBar, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 12 }]}>
          {storyComplete ? (
            <Animated.View entering={FadeInUp.delay(600).springify()}>
              <Pressable
                onPress={() => router.back()}
                style={styles.backToStoriesBtn}
                testID="back-to-stories"
              >
                <Ionicons name="arrow-back" size={18} color="#fff" />
                <Text style={[styles.backToStoriesBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Back to Stories
                </Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.cinematicBottomBar, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 }]}>
          <SceneProgressDots total={scenes.length} current={currentScene} theme={theme} />
          <View style={styles.cleanControlRow}>
            <PulsingPlayButton isSpeaking={isSpeaking} onPress={handleReadToMe} />
          </View>
        </View>
      )}

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

      <Modal
        visible={showVoicePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVoicePicker(false)}
      >
        <Pressable style={styles.voiceOverlay} onPress={() => setShowVoicePicker(false)}>
          <View style={styles.voiceSheet}>
            <Text style={styles.voiceSheetTitle}>Choose Narrator</Text>
            <Text style={styles.voiceSheetSubtitle}>MALE VOICES</Text>
            {NARRATOR_VOICES.filter(v => v.gender === "male").map(v => (
              <Pressable
                key={v.id}
                style={[
                  styles.voiceOption,
                  narratorVoice === v.id && styles.voiceOptionSelected,
                ]}
                onPress={() => {
                  setNarratorVoice(v.id);
                  AsyncStorage.setItem(KIDS_VOICE_KEY, v.id);
                  setShowVoicePicker(false);
                }}
              >
                <View style={styles.voiceOptionRow}>
                  <Ionicons
                    name={narratorVoice === v.id ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={narratorVoice === v.id ? "#A78BFA" : "#888"}
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.voiceOptionName, narratorVoice === v.id && { color: "#A78BFA" }]}>{v.label}</Text>
                    <Text style={styles.voiceOptionDesc}>{v.desc}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
            <Text style={[styles.voiceSheetSubtitle, { marginTop: 16 }]}>FEMALE VOICES</Text>
            {NARRATOR_VOICES.filter(v => v.gender === "female").map(v => (
              <Pressable
                key={v.id}
                style={[
                  styles.voiceOption,
                  narratorVoice === v.id && styles.voiceOptionSelected,
                ]}
                onPress={() => {
                  setNarratorVoice(v.id);
                  AsyncStorage.setItem(KIDS_VOICE_KEY, v.id);
                  setShowVoicePicker(false);
                }}
              >
                <View style={styles.voiceOptionRow}>
                  <Ionicons
                    name={narratorVoice === v.id ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={narratorVoice === v.id ? "#A78BFA" : "#888"}
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.voiceOptionName, narratorVoice === v.id && { color: "#A78BFA" }]}>{v.label}</Text>
                    <Text style={styles.voiceOptionDesc}>{v.desc}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
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
    paddingBottom: 140,
  },
  illustrationArea: {
    height: ILLUSTRATION_HEIGHT + 8,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderRadius: 16,
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
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  narrationScroll: {
    flexGrow: 1,
    justifyContent: "center",
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
    gap: 10,
    marginTop: 12,
  },
  livingSceneCompleteWrap: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 20,
  },
  livingSceneCompleteMsg: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  completeTitle: {
    color: "#fff",
    fontSize: 30,
  },
  completeCelebration: {
    color: "#F5C451",
    fontSize: 20,
    textAlign: "center" as const,
    marginBottom: 2,
  },
  completeSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    marginTop: 2,
  },
  cinematicBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  cleanControlRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 16,
    marginTop: 10,
  },
  cleanPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  backToStoriesBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    backgroundColor: "#F5A623",
  },
  backToStoriesBtnText: {
    color: "#fff",
    fontSize: 16,
  },
  cleanCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
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
  audioControls: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  autoPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  readToMeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
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
  autoPlayBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(167,139,250,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  autoPlayBadgeText: {
    color: "#A78BFA",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  quietModeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  navArrow: {
    position: "absolute",
    top: "35%",
    marginTop: -24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    opacity: 0.35,
  },
  navLeft: {
    left: 12,
  },
  navRight: {
    right: 12,
  },
  voicePickerBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
  },
  voicePickerLabel: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  voiceOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  voiceSheet: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    padding: 24,
    width: "85%" as any,
    maxWidth: 340,
  },
  voiceSheetTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center" as const,
    marginBottom: 20,
  },
  voiceSheetSubtitle: {
    color: "#A78BFA",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  voiceOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  voiceOptionSelected: {
    backgroundColor: "rgba(167,139,250,0.15)",
  },
  voiceOptionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  voiceOptionName: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  voiceOptionDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
