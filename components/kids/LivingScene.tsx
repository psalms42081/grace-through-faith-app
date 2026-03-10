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

const { width: SW, height: SH } = Dimensions.get("window");
const SCENE_HEIGHT = SH * 0.68;

function haptic(s: "light" | "medium" | "success" = "light") {
  if (Platform.OS === "web") return;
  if (s === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(s === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
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

function PulsingHotspot({
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
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);
  const [showLabel, setShowLabel] = useState(false);
  const tapScale = useSharedValue(1);

  useEffect(() => {
    if (collected) return;
    pulseScale.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(1.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    pulseOpacity.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 800 }),
          withTiming(0.3, { duration: 800 })
        ),
        -1,
        true
      )
    );
  }, [collected]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const tapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
  }));

  if (collected) return null;

  const handlePress = () => {
    haptic("light");
    tapScale.value = withSequence(
      withSpring(1.5, { damping: 5 }),
      withSpring(1, { damping: 8 })
    );
    setShowLabel(true);
    setTimeout(() => setShowLabel(false), 1200);
    onPress();
  };

  return (
    <Animated.View
      entering={FadeIn.delay(d).duration(400)}
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
      <Animated.View style={[ls.hotspotPulse, { width: size, height: size, borderRadius: size / 2 }, pulseStyle]} />
      <Animated.View style={tapStyle}>
        <Pressable onPress={handlePress} hitSlop={12} style={[ls.hotspotInner, { width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3 }]} />
      </Animated.View>
      {showLabel && label && (
        <Animated.View entering={FadeInUp.duration(200)} style={ls.hotspotLabel}>
          <Text style={ls.hotspotLabelText}>{label}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function TapWiggleScene({ config, isActive }: { config: Record<string, any>; isActive: boolean }) {
  const hotspots = config.hotspots || [];
  const [tapped, setTapped] = useState<Set<number>>(new Set());

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {isActive && hotspots.map((h: any, i: number) => (
        <PulsingHotspot
          key={i}
          x={h.x}
          y={h.y}
          size={h.size || 56}
          delay={i * 200}
          label={h.label}
          collected={tapped.has(i)}
          onPress={() => setTapped(prev => new Set([...prev, i]))}
        />
      ))}
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
        <PulsingHotspot
          x={h.x}
          y={h.y}
          size={h.size || 70}
          delay={300}
          label="Tap to see!"
          onPress={handleTap}
        />
      )}
      {compared && (
        <Animated.View entering={FadeIn.duration(500)} style={[ls.revealBadge, { top: SCENE_HEIGHT * 0.25, alignSelf: "center" }]}>
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
    setGlowing(true);
    glowRadius.value = withSpring(240, { damping: 8, stiffness: 60 });
    glowOpacity.value = withTiming(0.45, { duration: 800 });
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {isActive && !glowing && (
        <PulsingHotspot x={h.x} y={h.y} size={64} delay={400} label="Tap David's heart" onPress={handleGlow} />
      )}
      {glowing && (
        <>
          <Animated.View
            style={[
              ls.glowCircle,
              glowStyle,
              {
                left: h.x * SW - 120,
                top: h.y * SCENE_HEIGHT - 120,
                backgroundColor: config.glowColor || "rgba(255,215,0,0.3)",
              },
            ]}
          />
          <Animated.View entering={FadeIn.delay(600).duration(600)} style={[ls.revealBadge, { top: SCENE_HEIGHT * 0.3, alignSelf: "center" }]}>
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
  const allDone = collected.size >= total;

  const handleCollect = (idx: number) => {
    if (collected.has(idx)) return;
    haptic("light");
    setCollected(prev => new Set([...prev, idx]));
    if (collected.size + 1 >= total) {
      setTimeout(() => haptic("success"), 300);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {isActive && hotspots.map((h: any, i: number) => (
        <PulsingHotspot
          key={i}
          x={h.x}
          y={h.y}
          size={h.size || 50}
          delay={i * 200 + 300}
          label={`Stone ${i + 1}!`}
          collected={collected.has(i)}
          onPress={() => handleCollect(i)}
        />
      ))}
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

  const sling = config.slingArea || { x: 0.72, y: 0.55 };
  const target = config.targetArea || { x: 0.25, y: 0.4 };

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
      setPhase("hit");
      impactScale.value = withSequence(
        withSpring(1.5, { damping: 6 }),
        withTiming(2, { duration: 400 }),
      );
      impactOpacity.value = withSequence(
        withTiming(0.9, { duration: 100 }),
        withTiming(0, { duration: 600 })
      );
    }, 500);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {isActive && (phase === "ready" || phase === "dragging") && (
        <>
          <View
            {...panRef.panHandlers}
            style={[ls.dragZone, { left: sling.x * SW - 50, top: sling.y * SCENE_HEIGHT - 50, width: 100, height: 100 }]}
          >
            <Animated.View style={slingAnim}>
              <View style={ls.dragIndicator} />
            </Animated.View>
          </View>
          <PulsingHotspot
            x={sling.x}
            y={sling.y}
            size={70}
            delay={200}
            label="Swirl here!"
            onPress={() => {}}
          />
        </>
      )}

      {isActive && phase === "dragging" && (
        <Animated.View entering={FadeIn.duration(300)} style={ls.releaseButtonWrap}>
          <Pressable onPress={handleRelease} style={ls.releaseButton}>
            <Text style={ls.releaseButtonText}>Release the stone!</Text>
          </Pressable>
        </Animated.View>
      )}

      <Animated.View
        style={[
          ls.projectile,
          stoneAnim,
          { left: sling.x * SW - 12, top: sling.y * SCENE_HEIGHT - 12 },
        ]}
      >
        <View style={ls.stoneVisual} />
      </Animated.View>

      <Animated.View
        style={[
          ls.impactBurst,
          impactAnim,
          { left: target.x * SW - 40, top: target.y * SCENE_HEIGHT - 40 },
        ]}
      />

      {phase === "hit" && (
        <Animated.View entering={FadeIn.delay(300).duration(500)} style={[ls.revealBadge, { top: SCENE_HEIGHT * 0.2, alignSelf: "center" }]}>
          <Text style={[ls.revealText, { fontSize: 20 }]}>{config.resultText || "The stone flew true!"}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function TapCheerScene({ config, isActive }: { config: Record<string, any>; isActive: boolean }) {
  const hotspots = config.hotspots || [];
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const [tapCount, setTapCount] = useState(0);

  const handleTap = (idx: number) => {
    if (tapped.has(idx)) return;
    haptic("light");
    const next = new Set([...tapped, idx]);
    setTapped(next);
    setTapCount(next.size);
    if (next.size >= hotspots.length) {
      setTimeout(() => haptic("success"), 300);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {isActive && hotspots.map((h: any, i: number) => (
        <PulsingHotspot
          key={i}
          x={h.x}
          y={h.y}
          size={h.size || 52}
          delay={i * 150}
          label={h.label || "Hooray!"}
          collected={tapped.has(i)}
          onPress={() => handleTap(i)}
        />
      ))}
      {tapped.size >= hotspots.length && (
        <Animated.View entering={FadeIn.delay(200).duration(500)} style={[ls.revealBadge, { top: SCENE_HEIGHT * 0.15, alignSelf: "center" }]}>
          <Text style={[ls.revealText, { color: "#FFD700" }]}>God is stronger than any giant!</Text>
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
  const kenBurnsProgress = useSharedValue(0);
  const instructionOpacity = useSharedValue(0);
  const instruction = interactionConfig?.instruction || "";

  useEffect(() => {
    if (isActive) {
      kenBurnsProgress.value = 0;
      kenBurnsProgress.value = withRepeat(
        withTiming(1, { duration: 20000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      if (instruction) {
        instructionOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
        setTimeout(() => {
          instructionOpacity.value = withTiming(0, { duration: 600 });
        }, 4000);
      }
    } else {
      kenBurnsProgress.value = withTiming(0, { duration: 500 });
      instructionOpacity.value = 0;
    }
  }, [isActive]);

  const patterns = [
    { fromScale: 1.0, toScale: 1.08, fromX: 0, toX: -8, fromY: 0, toY: -5 },
    { fromScale: 1.02, toScale: 1.1, fromX: -5, toX: 5, fromY: -3, toY: 3 },
    { fromScale: 1.0, toScale: 1.06, fromX: 5, toX: -5, fromY: 3, toY: -4 },
    { fromScale: 1.03, toScale: 1.1, fromX: 3, toX: -6, fromY: -4, toY: 3 },
    { fromScale: 1.0, toScale: 1.07, fromX: -4, toX: 4, fromY: 4, toY: -3 },
    { fromScale: 1.02, toScale: 1.09, fromX: 6, toX: -3, fromY: -2, toY: 5 },
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
              onError={() => setImageError(true)}
            />
          )}
        </Animated.View>

        <InteractionLayer type={interactionType} config={interactionConfig} isActive={isActive} />

        {instruction !== "" && (
          <Animated.View style={[ls.instructionWrap, instructionStyle]}>
            <Text style={ls.instructionText}>{instruction}</Text>
          </Animated.View>
        )}
      </View>

      <LinearGradient
        colors={["transparent", "rgba(5,5,7,0.6)", "rgba(5,5,7,0.92)"]}
        locations={[0, 0.3, 1]}
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
    height: SCENE_HEIGHT * 0.4,
  },
  narrationWrap: {
    position: "absolute",
    bottom: 140,
    left: 24,
    right: 24,
    alignItems: "center",
  },
  narrationText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 22,
    lineHeight: 32,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hotspot: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  hotspotPulse: {
    position: "absolute",
    backgroundColor: "rgba(255,215,0,0.15)",
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.4)",
  },
  hotspotInner: {
    backgroundColor: "rgba(255,215,0,0.25)",
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.7)",
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
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginHorizontal: 40,
    zIndex: 20,
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
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    zIndex: 20,
  },
  collectCountText: {
    color: "#FFD700",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  dragZone: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
  },
  dragIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,215,0,0.3)",
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.6)",
  },
  releaseButtonWrap: {
    position: "absolute",
    bottom: SCENE_HEIGHT * 0.08,
    alignSelf: "center",
    zIndex: 25,
  },
  releaseButton: {
    backgroundColor: "#C9933A",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  releaseButtonText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  projectile: {
    position: "absolute",
    zIndex: 18,
  },
  stoneVisual: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,215,0,0.4)",
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.6)",
    zIndex: 17,
  },
  instructionWrap: {
    position: "absolute",
    top: SCENE_HEIGHT * 0.08,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 30,
  },
  instructionText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});
