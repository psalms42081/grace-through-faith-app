import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  PanResponder,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  withRepeat,
  FadeIn,
  FadeInUp,
  Easing,
  interpolate,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { createAudioPlayer } from "expo-audio";

const { width: SW, height: SH } = Dimensions.get("window");
const SCENE_HEIGHT = SH * 0.68;

function haptic(s: "light" | "medium" | "success" = "light") {
  if (Platform.OS === "web") return;
  if (s === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(s === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
}

const SOUND_URLS: Record<string, string> = {
  pop: "https://cdn.pixabay.com/audio/2022/03/10/audio_0c3f7d1cbc.mp3",
  chime: "https://cdn.pixabay.com/audio/2022/11/21/audio_dc39e01043.mp3",
  whoosh: "https://cdn.pixabay.com/audio/2022/03/15/audio_7e0d0e5e8a.mp3",
  thud: "https://cdn.pixabay.com/audio/2024/02/19/audio_e4043e5799.mp3",
  cheer: "https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3",
  collect: "https://cdn.pixabay.com/audio/2022/03/15/audio_85534dab1a.mp3",
  fanfare: "https://cdn.pixabay.com/audio/2022/03/15/audio_942de29f3e.mp3",
};

const SOUND_DURATIONS: Record<string, number> = {
  pop: 1500,
  chime: 2500,
  whoosh: 1500,
  thud: 1500,
  cheer: 4000,
  collect: 1500,
  fanfare: 5000,
};

function playSound(key: string) {
  try {
    const url = SOUND_URLS[key];
    if (!url) return;
    const player = createAudioPlayer({ uri: url });
    player.play();
    const dur = SOUND_DURATIONS[key] || 3000;
    setTimeout(() => {
      try { player.remove(); } catch {}
    }, dur);
  } catch {}
}

interface LivingSceneProps {
  imageUrl: string;
  narration: string;
  interactionType: string;
  interactionConfig: Record<string, any>;
  mood: string;
  isActive: boolean;
  sceneIndex: number;
  isLittleLambs: boolean;
  currentWordIndex: number;
  isSpeaking: boolean;
  theme: any;
}

function SoftHotspot({
  x,
  y,
  size,
  delay: d,
  onPress,
  collected,
  label,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  onPress: () => void;
  collected?: boolean;
  label?: string;
}) {
  const glowOpacity = useSharedValue(0.3);
  const glowScale = useSharedValue(1);
  const [showLabel, setShowLabel] = useState(false);
  const tapScale = useSharedValue(1);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (collected) return;
    glowOpacity.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.25, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    glowScale.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    return () => {
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    };
  }, [collected]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const tapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
  }));

  if (collected) return null;

  const handlePress = () => {
    haptic("light");
    tapScale.value = withSequence(
      withSpring(1.4, { damping: 6 }),
      withSpring(1, { damping: 10 })
    );
    setShowLabel(true);
    if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    labelTimerRef.current = setTimeout(() => setShowLabel(false), 1800);
    onPress();
  };

  return (
    <Animated.View
      entering={FadeIn.delay(d).duration(600)}
      style={[
        ls.hotspot,
        {
          left: x * SW - size / 2,
          top: y * SCENE_HEIGHT - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Animated.View
        style={[
          ls.hotspotGlow,
          { width: size, height: size, borderRadius: size / 2 },
          glowStyle,
        ]}
      />
      <Animated.View style={tapStyle}>
        <Pressable
          onPress={handlePress}
          hitSlop={20}
          style={[
            ls.hotspotCenter,
            { width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2 },
          ]}
        />
      </Animated.View>
      {showLabel && label && (
        <Animated.View entering={FadeInUp.duration(250)} style={ls.hotspotLabel}>
          <Text style={ls.hotspotLabelText}>{label}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function TapWiggleScene({ config, isActive }: { config: Record<string, any>; isActive: boolean }) {
  const hotspots = config.hotspots || [];
  const sequential = !!config.sequential;
  const [tapped, setTapped] = useState<Set<number>>(new Set());

  const handleTap = (i: number) => {
    if (tapped.has(i)) return;
    playSound("pop");
    setTapped(prev => new Set([...prev, i]));
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {isActive && hotspots.map((h: any, i: number) => {
        if (tapped.has(i)) return null;
        if (sequential && i > tapped.size) return null;
        return (
          <SoftHotspot
            key={i}
            x={h.x}
            y={h.y}
            size={h.size || 44}
            delay={sequential ? 400 : i * 300}
            label={h.label}
            collected={tapped.has(i)}
            onPress={() => handleTap(i)}
          />
        );
      })}
    </View>
  );
}

function TapCompareScene({ config, isActive }: { config: Record<string, any>; isActive: boolean }) {
  const [compared, setCompared] = useState(false);
  const shakeX = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handleTap = () => {
    haptic("medium");
    playSound("thud");
    setCompared(true);
    shakeX.value = withSequence(
      withTiming(-4, { duration: 50 }),
      withTiming(4, { duration: 50 }),
      withTiming(-3, { duration: 40 }),
      withTiming(3, { duration: 40 }),
      withTiming(0, { duration: 50 })
    );
  };

  const h = config.hotspot || { x: 0.25, y: 0.45 };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, shakeStyle]} pointerEvents="box-none">
      {isActive && !compared && (
        <SoftHotspot
          x={h.x}
          y={h.y}
          size={h.size || 50}
          delay={400}
          label="Tap to see!"
          onPress={handleTap}
        />
      )}
      {compared && (
        <Animated.View entering={FadeIn.duration(500)} style={[ls.revealBadge, { top: SCENE_HEIGHT * 0.22, alignSelf: "center" }]}>
          <Text style={ls.revealText}>{config.resultText || "He is SO tall!"}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function TapGlowScene({ config, isActive }: { config: Record<string, any>; isActive: boolean }) {
  const [glowing, setGlowing] = useState(false);
  const glowRadius = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  const h = config.hotspot || { x: 0.5, y: 0.5 };

  const glowStyle = useAnimatedStyle(() => ({
    width: glowRadius.value,
    height: glowRadius.value,
    borderRadius: glowRadius.value / 2,
    opacity: glowOpacity.value,
  }));

  const handleGlow = () => {
    haptic("success");
    playSound("chime");
    setGlowing(true);
    glowRadius.value = withSpring(200, { damping: 10, stiffness: 50 });
    glowOpacity.value = withTiming(0.4, { duration: 800 });
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {isActive && !glowing && (
        <SoftHotspot x={h.x} y={h.y} size={44} delay={400} label="Tap David's heart" onPress={handleGlow} />
      )}
      {glowing && (
        <>
          <Animated.View
            style={[
              ls.glowCircle,
              glowStyle,
              {
                left: h.x * SW - 100,
                top: h.y * SCENE_HEIGHT - 100,
                backgroundColor: config.glowColor || "rgba(255,215,0,0.3)",
              },
            ]}
          />
          <Animated.View entering={FadeIn.delay(600).duration(600)} style={[ls.revealBadge, { top: SCENE_HEIGHT * 0.25, alignSelf: "center" }]}>
            <Text style={[ls.revealText, { color: "#FFD700", fontSize: 22 }]}>{config.revealText || "God is with me."}</Text>
          </Animated.View>
        </>
      )}
    </View>
  );
}

function TapCollectScene({ config, isActive }: { config: Record<string, any>; isActive: boolean }) {
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const total = config.totalItems || 5;
  const hotspots = config.hotspots || [];
  const sequential = !!config.sequential;
  const allDone = collected.size >= total;

  const handleCollect = (idx: number) => {
    if (collected.has(idx)) return;
    haptic("light");
    playSound("collect");
    const next = new Set([...collected, idx]);
    setCollected(next);
    if (next.size >= total) {
      setTimeout(() => {
        haptic("success");
        playSound("fanfare");
      }, 400);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {isActive && hotspots.map((h: any, i: number) => {
        if (collected.has(i)) return null;
        if (sequential && i > collected.size) return null;
        return (
          <SoftHotspot
            key={i}
            x={h.x}
            y={h.y}
            size={h.size || 34}
            delay={sequential ? 400 : i * 200 + 300}
            label={h.label || `Stone ${i + 1}!`}
            collected={collected.has(i)}
            onPress={() => handleCollect(i)}
          />
        );
      })}
      {isActive && (
        <View style={ls.collectCounter}>
          <Text style={ls.collectCountText}>
            {allDone
              ? config.completeText || "All stones collected!"
              : `${collected.size} of ${total} stones`}
          </Text>
        </View>
      )}
    </View>
  );
}

function DragReleaseScene({ config, isActive }: { config: Record<string, any>; isActive: boolean }) {
  const [phase, setPhase] = useState<"ready" | "dragging" | "released" | "hit">("ready");
  const slingRotation = useSharedValue(0);
  const stoneX = useSharedValue(0);
  const stoneY = useSharedValue(0);
  const stoneOpacity = useSharedValue(0);
  const stoneScale = useSharedValue(1);
  const impactScale = useSharedValue(0);
  const impactOpacity = useSharedValue(0);

  const sling = config.slingArea || { x: 0.70, y: 0.38 };
  const target = config.targetArea || { x: 0.22, y: 0.40 };

  const slingAnim = useAnimatedStyle(() => ({
    transform: [{ rotate: `${slingRotation.value}deg` }],
  }));

  const stoneAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: stoneX.value }, { translateY: stoneY.value }, { scale: stoneScale.value }],
    opacity: stoneOpacity.value,
  }));

  const impactAnim = useAnimatedStyle(() => ({
    transform: [{ scale: impactScale.value }],
    opacity: impactOpacity.value,
  }));

  const panRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => phase === "ready" || phase === "dragging",
      onMoveShouldSetPanResponder: () => phase === "ready" || phase === "dragging",
      onPanResponderGrant: () => {
        setPhase("dragging");
        haptic("light");
      },
      onPanResponderMove: (_, gs) => {
        const angle = Math.atan2(gs.dy, gs.dx) * (180 / Math.PI);
        slingRotation.value = angle * 1.5;
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const handleRelease = () => {
    if (phase === "released" || phase === "hit") return;
    haptic("success");
    playSound("whoosh");
    setPhase("released");

    const dx = (target.x - sling.x) * SW;
    const dy = (target.y - sling.y) * SCENE_HEIGHT;

    stoneOpacity.value = 1;
    stoneX.value = withTiming(dx, { duration: 450, easing: Easing.out(Easing.quad) });
    stoneY.value = withTiming(dy - 30, { duration: 450, easing: Easing.out(Easing.quad) });
    stoneScale.value = withSequence(
      withTiming(1.3, { duration: 200 }),
      withTiming(0.6, { duration: 250 })
    );

    setTimeout(() => {
      haptic("medium");
      playSound("thud");
      setPhase("hit");
      impactScale.value = withSequence(
        withSpring(1.5, { damping: 6 }),
        withTiming(2, { duration: 400 }),
      );
      impactOpacity.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(0, { duration: 600 })
      );
    }, 500);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {isActive && (phase === "ready" || phase === "dragging") && (
        <View
          {...panRef.panHandlers}
          style={[ls.dragZone, { left: sling.x * SW - 50, top: sling.y * SCENE_HEIGHT - 50, width: 100, height: 100 }]}
        >
          <Animated.View style={slingAnim}>
            <View style={ls.dragIndicator} />
          </Animated.View>
        </View>
      )}

      {isActive && phase === "dragging" && (
        <Animated.View entering={FadeIn.duration(300)} style={ls.releaseButtonWrap}>
          <Pressable onPress={handleRelease} style={ls.releaseButton}>
            <Text style={ls.releaseButtonText}>Let go!</Text>
          </Pressable>
        </Animated.View>
      )}

      <Animated.View
        style={[
          ls.projectile,
          stoneAnim,
          { left: sling.x * SW - 10, top: sling.y * SCENE_HEIGHT - 10 },
        ]}
      >
        <View style={ls.stoneVisual} />
      </Animated.View>

      <Animated.View
        style={[
          ls.impactBurst,
          impactAnim,
          { left: target.x * SW - 35, top: target.y * SCENE_HEIGHT - 35 },
        ]}
      />

      {phase === "hit" && (
        <Animated.View entering={FadeIn.delay(300).duration(500)} style={[ls.revealBadge, { top: SCENE_HEIGHT * 0.18, alignSelf: "center" }]}>
          <Text style={[ls.revealText, { fontSize: 20 }]}>{config.resultText || "The stone flew true!"}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function TapCheerScene({ config, isActive }: { config: Record<string, any>; isActive: boolean }) {
  const hotspots = config.hotspots || [];
  const sequential = !!config.sequential;
  const [tapped, setTapped] = useState<Set<number>>(new Set());

  const handleTap = (idx: number) => {
    if (tapped.has(idx)) return;
    haptic("light");
    playSound("cheer");
    const next = new Set([...tapped, idx]);
    setTapped(next);
    if (next.size >= hotspots.length) {
      setTimeout(() => {
        haptic("success");
        playSound("fanfare");
      }, 400);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {isActive && hotspots.map((h: any, i: number) => {
        if (tapped.has(i)) return null;
        if (sequential && i > tapped.size) return null;
        return (
          <SoftHotspot
            key={i}
            x={h.x}
            y={h.y}
            size={h.size || 40}
            delay={sequential ? 400 : i * 200}
            label={h.label || "Hooray!"}
            collected={tapped.has(i)}
            onPress={() => handleTap(i)}
          />
        );
      })}
      {tapped.size >= hotspots.length && (
        <Animated.View entering={FadeIn.delay(200).duration(500)} style={[ls.revealBadge, { top: SCENE_HEIGHT * 0.15, alignSelf: "center" }]}>
          <Text style={[ls.revealText, { color: "#FFD700", fontSize: 20 }]}>God is stronger than any giant!</Text>
        </Animated.View>
      )}
    </View>
  );
}

function InteractionLayer({ type, config, isActive }: { type: string; config: Record<string, any>; isActive: boolean }) {
  switch (type) {
    case "tap_wiggle":
      return <TapWiggleScene config={config} isActive={isActive} />;
    case "tap_compare":
      return <TapCompareScene config={config} isActive={isActive} />;
    case "tap_glow":
      return <TapGlowScene config={config} isActive={isActive} />;
    case "tap_collect":
      return <TapCollectScene config={config} isActive={isActive} />;
    case "drag_release":
      return <DragReleaseScene config={config} isActive={isActive} />;
    case "tap_cheer":
      return <TapCheerScene config={config} isActive={isActive} />;
    default:
      return null;
  }
}

export default function LivingScene({
  imageUrl,
  narration,
  interactionType,
  interactionConfig,
  mood,
  isActive,
  sceneIndex,
  isLittleLambs,
  currentWordIndex,
  isSpeaking,
  theme,
}: LivingSceneProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const kenBurnsProgress = useSharedValue(0);
  const instructionOpacity = useSharedValue(0);
  const instruction = interactionConfig?.instruction || "";
  const instructionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showInteractions = imageLoaded || imageError || !imageUrl;

  useEffect(() => {
    if (isActive && showInteractions) {
      kenBurnsProgress.value = 0;
      kenBurnsProgress.value = withRepeat(
        withTiming(1, { duration: 20000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      if (instruction) {
        instructionOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
        if (instructionTimerRef.current) clearTimeout(instructionTimerRef.current);
        instructionTimerRef.current = setTimeout(() => {
          instructionOpacity.value = withTiming(0, { duration: 800 });
        }, 6000);
      }
    } else if (!isActive) {
      kenBurnsProgress.value = withTiming(0, { duration: 500 });
      instructionOpacity.value = 0;
      if (instructionTimerRef.current) {
        clearTimeout(instructionTimerRef.current);
        instructionTimerRef.current = null;
      }
    }
    return () => {
      if (instructionTimerRef.current) clearTimeout(instructionTimerRef.current);
    };
  }, [isActive, showInteractions]);

  const patterns = [
    { fromScale: 1.0, toScale: 1.06, fromX: 0, toX: -5, fromY: 0, toY: -3 },
    { fromScale: 1.01, toScale: 1.07, fromX: -3, toX: 3, fromY: -2, toY: 2 },
    { fromScale: 1.0, toScale: 1.05, fromX: 3, toX: -3, fromY: 2, toY: -3 },
    { fromScale: 1.02, toScale: 1.07, fromX: 2, toX: -4, fromY: -3, toY: 2 },
    { fromScale: 1.0, toScale: 1.06, fromX: -2, toX: 3, fromY: 3, toY: -2 },
    { fromScale: 1.01, toScale: 1.06, fromX: 4, toX: -2, fromY: -1, toY: 3 },
  ];
  const p = patterns[sceneIndex % patterns.length];

  const imageStyle = useAnimatedStyle(() => {
    const s = interpolate(kenBurnsProgress.value, [0, 1], [p.fromScale, p.toScale]);
    const tx = interpolate(kenBurnsProgress.value, [0, 1], [p.fromX, p.toX]);
    const ty = interpolate(kenBurnsProgress.value, [0, 1], [p.fromY, p.toY]);
    return {
      transform: [{ scale: s }, { translateX: tx }, { translateY: ty }],
    };
  });

  const instructionStyle = useAnimatedStyle(() => ({
    opacity: instructionOpacity.value,
  }));

  const words = narration.split(/\s+/);

  return (
    <View style={ls.container}>
      <View style={ls.sceneCanvas}>
        <Animated.View style={[ls.imageWrap, imageStyle]}>
          {imageError || !imageUrl ? (
            <LinearGradient
              colors={["#1a1520", "#0d0b12", "#050507"]}
              style={ls.fullImage}
            />
          ) : (
            <Image
              source={{ uri: imageUrl }}
              style={ls.fullImage}
              resizeMode="cover"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}
        </Animated.View>

        {!showInteractions && isActive && (
          <View style={ls.loadingOverlay}>
            <Animated.View entering={FadeIn.duration(400)} style={ls.loadingPill}>
              <Text style={ls.loadingText}>Loading scene...</Text>
            </Animated.View>
          </View>
        )}

        {showInteractions && (
          <InteractionLayer type={interactionType} config={interactionConfig} isActive={isActive} />
        )}

        {showInteractions && instruction !== "" && (
          <Animated.View style={[ls.instructionWrap, instructionStyle]}>
            <Text style={ls.instructionText} numberOfLines={2}>{instruction}</Text>
          </Animated.View>
        )}
      </View>

      <LinearGradient
        colors={["transparent", "rgba(5,5,7,0.6)", "rgba(5,5,7,0.95)"]}
        locations={[0, 0.25, 1]}
        style={ls.textGradient}
        pointerEvents="none"
      />

      <View style={ls.narrationWrap} pointerEvents="none">
        <Text style={[ls.narrationText, { fontFamily: "Lora_400Regular" }]}>
          {isActive && isSpeaking
            ? words.map((word, i) => (
                <Text
                  key={i}
                  style={{
                    color: i === currentWordIndex ? "#FFD700" : "rgba(255,255,255,0.95)",
                    fontFamily: i === currentWordIndex ? "Lora_700Bold" : "Lora_400Regular",
                  }}
                >
                  {word}{" "}
                </Text>
              ))
            : narration}
        </Text>
      </View>
    </View>
  );
}

const ls = StyleSheet.create({
  container: {
    flex: 1,
    width: SW,
  },
  sceneCanvas: {
    width: SW,
    height: SCENE_HEIGHT,
    overflow: "hidden",
  },
  imageWrap: {
    width: SW,
    height: SCENE_HEIGHT,
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  textGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCENE_HEIGHT * 0.45,
  },
  narrationWrap: {
    position: "absolute",
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  narrationText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 22,
    lineHeight: 33,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  hotspot: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  hotspotGlow: {
    position: "absolute",
    backgroundColor: "rgba(255,248,220,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.3)",
  },
  hotspotCenter: {
    backgroundColor: "rgba(255,215,0,0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.5)",
  },
  hotspotLabel: {
    position: "absolute",
    bottom: -28,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: "center",
  },
  hotspotLabelText: {
    color: "#FFD700",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  revealBadge: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.82)",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginHorizontal: 32,
    zIndex: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
  },
  revealText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Lora_700Bold",
    textAlign: "center",
  },
  glowCircle: {
    position: "absolute",
    zIndex: 5,
  },
  collectCounter: {
    position: "absolute",
    top: 80,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    zIndex: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
  },
  collectCountText: {
    color: "#FFD700",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  dragZone: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
  },
  dragIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,215,0,0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.4)",
  },
  releaseButtonWrap: {
    position: "absolute",
    bottom: SCENE_HEIGHT * 0.1,
    alignSelf: "center",
    zIndex: 25,
  },
  releaseButton: {
    backgroundColor: "#C9933A",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
  },
  releaseButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  projectile: {
    position: "absolute",
    zIndex: 18,
  },
  stoneVisual: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#8B7355",
    borderWidth: 1.5,
    borderColor: "#6B5B45",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  impactBurst: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,215,0,0.35)",
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.5)",
    zIndex: 17,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 25,
  },
  loadingPill: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
  },
  loadingText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  instructionWrap: {
    position: "absolute",
    top: SCENE_HEIGHT * 0.15,
    left: 24,
    right: 24,
    alignItems: "center",
    zIndex: 30,
  },
  instructionText: {
    color: "#fff",
    fontSize: 19,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
    overflow: "hidden",
  },
});
