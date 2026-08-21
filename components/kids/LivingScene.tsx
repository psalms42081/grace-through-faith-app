import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  PanResponder,
} from "react-native";
import { Image } from "expo-image";
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
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { createAudioPlayer } from "expo-audio";

const { width: SW, height: SH } = Dimensions.get("window");

const IMAGE_ASPECT_RATIO = 1536 / 1024;
const RENDERED_W = SW;
const RENDERED_H = SW / IMAGE_ASPECT_RATIO;

const PAGE_BG = "#0B0910";
const PAGE_BG_WARM = "#0F0D14";

const IMAGE_TOP_PADDING = 12;

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

interface ImageFrame {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
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

function toScreen(normalizedX: number, normalizedY: number, frame: ImageFrame) {
  return {
    screenX: frame.offsetX + normalizedX * frame.width,
    screenY: frame.offsetY + normalizedY * frame.height,
  };
}

function SoftHotspot({
  x,
  y,
  size,
  delay: d,
  onPress,
  collected,
  label,
  imageFrame,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  onPress: () => void;
  collected?: boolean;
  label?: string;
  imageFrame: ImageFrame;
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
  }, [collected, d, glowOpacity, glowScale]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const tapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
  }));

  if (collected) return null;

  const { screenX, screenY } = toScreen(x, y, imageFrame);

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
          left: screenX - size / 2,
          top: screenY - size / 2,
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

function TapWiggleScene({ config, isActive, imageFrame }: { config: Record<string, any>; isActive: boolean; imageFrame: ImageFrame }) {
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
            imageFrame={imageFrame}
          />
        );
      })}
    </View>
  );
}

function TapCompareScene({ config, isActive, imageFrame }: { config: Record<string, any>; isActive: boolean; imageFrame: ImageFrame }) {
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
          imageFrame={imageFrame}
        />
      )}
      {compared && (
        <Animated.View entering={FadeIn.duration(500)} style={[ls.revealBadge, { top: imageFrame.offsetY + imageFrame.height * 0.2, alignSelf: "center" }]}>
          <Text style={ls.revealText}>{config.resultText || "He is SO tall!"}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function TapGlowScene({ config, isActive, imageFrame }: { config: Record<string, any>; isActive: boolean; imageFrame: ImageFrame }) {
  const [glowing, setGlowing] = useState(false);
  const glowRadius = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  const h = config.hotspot || { x: 0.5, y: 0.5 };
  const { screenX, screenY } = toScreen(h.x, h.y, imageFrame);

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
    glowRadius.value = withSpring(180, { damping: 10, stiffness: 50 });
    glowOpacity.value = withTiming(0.4, { duration: 800 });
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {isActive && !glowing && (
        <SoftHotspot x={h.x} y={h.y} size={44} delay={400} label="Tap David's heart" onPress={handleGlow} imageFrame={imageFrame} />
      )}
      {glowing && (
        <>
          <Animated.View
            style={[
              ls.glowCircle,
              glowStyle,
              {
                left: screenX - 90,
                top: screenY - 90,
                backgroundColor: config.glowColor || "rgba(255,215,0,0.3)",
              },
            ]}
          />
          <Animated.View entering={FadeIn.delay(600).duration(600)} style={[ls.revealBadge, { top: imageFrame.offsetY + imageFrame.height * 0.15, alignSelf: "center" }]}>
            <Text style={[ls.revealText, { color: "#FFD700", fontSize: 22 }]}>{config.revealText || "God is with me."}</Text>
          </Animated.View>
        </>
      )}
    </View>
  );
}

function TapCollectScene({ config, isActive, imageFrame }: { config: Record<string, any>; isActive: boolean; imageFrame: ImageFrame }) {
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
            imageFrame={imageFrame}
          />
        );
      })}
      {isActive && (
        <View style={[ls.collectCounter, { top: imageFrame.offsetY + 8 }]}>
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

function DragReleaseScene({ config, isActive, imageFrame }: { config: Record<string, any>; isActive: boolean; imageFrame: ImageFrame }) {
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
  const slingScreen = toScreen(sling.x, sling.y, imageFrame);
  const targetScreen = toScreen(target.x, target.y, imageFrame);

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

    const dx = targetScreen.screenX - slingScreen.screenX;
    const dy = targetScreen.screenY - slingScreen.screenY;

    stoneOpacity.value = 1;
    stoneX.value = withTiming(dx, { duration: 450, easing: Easing.out(Easing.quad) });
    stoneY.value = withTiming(dy - 20, { duration: 450, easing: Easing.out(Easing.quad) });
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
          style={[ls.dragZone, {
            left: slingScreen.screenX - 50,
            top: slingScreen.screenY - 50,
            width: 100,
            height: 100,
          }]}
        >
          <Animated.View style={slingAnim}>
            <View style={ls.dragIndicator} />
          </Animated.View>
        </View>
      )}

      {isActive && phase === "dragging" && (
        <Animated.View entering={FadeIn.duration(300)} style={[ls.releaseButtonWrap, { top: imageFrame.offsetY + imageFrame.height * 0.85 }]}>
          <Pressable onPress={handleRelease} style={ls.releaseButton}>
            <Text style={ls.releaseButtonText}>Let go!</Text>
          </Pressable>
        </Animated.View>
      )}

      <Animated.View
        style={[
          ls.projectile,
          stoneAnim,
          { left: slingScreen.screenX - 10, top: slingScreen.screenY - 10 },
        ]}
      >
        <View style={ls.stoneVisual} />
      </Animated.View>

      <Animated.View
        style={[
          ls.impactBurst,
          impactAnim,
          { left: targetScreen.screenX - 35, top: targetScreen.screenY - 35 },
        ]}
      />

      {phase === "hit" && (
        <Animated.View entering={FadeIn.delay(300).duration(500)} style={[ls.revealBadge, { top: imageFrame.offsetY + imageFrame.height * 0.12, alignSelf: "center" }]}>
          <Text style={[ls.revealText, { fontSize: 20 }]}>{config.resultText || "The stone flew true!"}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function TapCheerScene({ config, isActive, imageFrame }: { config: Record<string, any>; isActive: boolean; imageFrame: ImageFrame }) {
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
            imageFrame={imageFrame}
          />
        );
      })}
      {tapped.size >= hotspots.length && (
        <Animated.View entering={FadeIn.delay(200).duration(500)} style={[ls.revealBadge, { top: imageFrame.offsetY + imageFrame.height * 0.1, alignSelf: "center" }]}>
          <Text style={[ls.revealText, { color: "#FFD700", fontSize: 20 }]}>God is stronger than any giant!</Text>
        </Animated.View>
      )}
    </View>
  );
}

function CalibrationDot({
  id,
  initialX,
  initialY,
  label,
  imageFrame,
  color,
}: {
  id: string;
  initialX: number;
  initialY: number;
  label: string;
  imageFrame: ImageFrame;
  color: string;
}) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const posRef = useRef({ x: initialX, y: initialY });
  const dragStartRef = useRef({ x: initialX, y: initialY });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartRef.current = { ...posRef.current };
      },
      onPanResponderMove: (_, gs) => {
        const newX = Math.max(0, Math.min(1, dragStartRef.current.x + gs.dx / imageFrame.width));
        const newY = Math.max(0, Math.min(1, dragStartRef.current.y + gs.dy / imageFrame.height));
        posRef.current = { x: newX, y: newY };
        setPos({ x: newX, y: newY });
      },
      onPanResponderRelease: (_, gs) => {
        const finalX = Math.max(0, Math.min(1, dragStartRef.current.x + gs.dx / imageFrame.width));
        const finalY = Math.max(0, Math.min(1, dragStartRef.current.y + gs.dy / imageFrame.height));
        posRef.current = { x: finalX, y: finalY };
        setPos({ x: finalX, y: finalY });
      },
    })
  ).current;

  const { screenX, screenY } = toScreen(pos.x, pos.y, imageFrame);
  const crossSize = 30;

  return (
    <View
      {...panResponder.panHandlers}
      style={{
        position: "absolute",
        left: screenX - crossSize,
        top: screenY - crossSize,
        width: crossSize * 2,
        height: crossSize * 2,
        zIndex: 100,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ position: "absolute", width: crossSize * 2, height: 2, backgroundColor: color }} />
      <View style={{ position: "absolute", width: 2, height: crossSize * 2, backgroundColor: color }} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <View
        style={{
          position: "absolute",
          top: -22,
          backgroundColor: "rgba(0,0,0,0.9)",
          borderRadius: 4,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderWidth: 1,
          borderColor: color,
        }}
      >
        <Text style={{ color, fontSize: 9, fontFamily: "Inter_600SemiBold" }}>
          {label} ({pos.x.toFixed(3)}, {pos.y.toFixed(3)})
        </Text>
      </View>
    </View>
  );
}

function CalibrationOverlay({
  config,
  interactionType,
  imageFrame,
}: {
  config: Record<string, any>;
  interactionType: string;
  imageFrame: ImageFrame;
}) {
  const dots: { id: string; x: number; y: number; label: string; color: string }[] = [];

  if (interactionType === "tap_wiggle" || interactionType === "tap_collect" || interactionType === "tap_cheer") {
    const hotspots = config.hotspots || [];
    hotspots.forEach((h: any, i: number) => {
      dots.push({ id: `hs${i}`, x: h.x, y: h.y, label: h.label || `Hotspot ${i}`, color: ["#FF0000", "#00FF00", "#00AAFF", "#FF00FF", "#FFAA00"][i % 5] });
    });
  } else if (interactionType === "tap_compare" || interactionType === "tap_glow") {
    const h = config.hotspot || { x: 0.5, y: 0.5 };
    dots.push({ id: "hotspot", x: h.x, y: h.y, label: "Target", color: "#FF0000" });
  } else if (interactionType === "drag_release") {
    const sling = config.slingArea || { x: 0.5, y: 0.5 };
    const target = config.targetArea || { x: 0.5, y: 0.5 };
    dots.push({ id: "sling", x: sling.x, y: sling.y, label: "Sling", color: "#00FF00" });
    dots.push({ id: "target", x: target.x, y: target.y, label: "Target", color: "#FF0000" });
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View
        style={{
          position: "absolute",
          left: imageFrame.offsetX,
          top: imageFrame.offsetY,
          width: imageFrame.width,
          height: imageFrame.height,
          borderWidth: 2,
          borderColor: "rgba(255,0,0,0.6)",
          borderStyle: "dashed",
        }}
        pointerEvents="none"
      />
      <View
        style={{
          position: "absolute",
          left: imageFrame.offsetX + imageFrame.width / 2 - 1,
          top: imageFrame.offsetY,
          width: 1,
          height: imageFrame.height,
          backgroundColor: "rgba(255,0,0,0.2)",
        }}
        pointerEvents="none"
      />
      <View
        style={{
          position: "absolute",
          left: imageFrame.offsetX,
          top: imageFrame.offsetY + imageFrame.height / 2 - 1,
          width: imageFrame.width,
          height: 1,
          backgroundColor: "rgba(255,0,0,0.2)",
        }}
        pointerEvents="none"
      />
      {dots.map((d) => (
        <CalibrationDot
          key={d.id}
          id={d.id}
          initialX={d.x}
          initialY={d.y}
          label={d.label}
          imageFrame={imageFrame}
          color={d.color}
        />
      ))}
      <View
        style={{
          position: "absolute",
          bottom: 20,
          left: 10,
          right: 10,
          backgroundColor: "rgba(0,0,0,0.85)",
          borderRadius: 8,
          padding: 8,
          borderWidth: 1,
          borderColor: "#FF0000",
        }}
      >
        <Text style={{ color: "#FF4444", fontSize: 11, fontFamily: "Inter_700Bold", textAlign: "center" }}>
          CALIBRATION MODE - Drag crosshairs to exact positions
        </Text>
        <Text style={{ color: "#AAA", fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 2 }}>
          Coordinates logged to console on release
        </Text>
      </View>
    </View>
  );
}

const CALIBRATION_MODE = __DEV__ && false;

function InteractionLayer({ type, config, isActive, imageFrame }: { type: string; config: Record<string, any>; isActive: boolean; imageFrame: ImageFrame }) {
  if (CALIBRATION_MODE) {
    return <CalibrationOverlay config={config} interactionType={type} imageFrame={imageFrame} />;
  }

  switch (type) {
    case "tap_wiggle":
      return <TapWiggleScene config={config} isActive={isActive} imageFrame={imageFrame} />;
    case "tap_compare":
      return <TapCompareScene config={config} isActive={isActive} imageFrame={imageFrame} />;
    case "tap_glow":
      return <TapGlowScene config={config} isActive={isActive} imageFrame={imageFrame} />;
    case "tap_collect":
      return <TapCollectScene config={config} isActive={isActive} imageFrame={imageFrame} />;
    case "drag_release":
      return <DragReleaseScene config={config} isActive={isActive} imageFrame={imageFrame} />;
    case "tap_cheer":
      return <TapCheerScene config={config} isActive={isActive} imageFrame={imageFrame} />;
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

  const imageFrame = useMemo<ImageFrame>(() => {
    return {
      offsetX: 0,
      offsetY: IMAGE_TOP_PADDING,
      width: RENDERED_W,
      height: RENDERED_H,
    };
  }, []);

  const narrationTop = imageFrame.offsetY + imageFrame.height;

  useEffect(() => {
    if (isActive && showInteractions) {
      kenBurnsProgress.value = 0;
      kenBurnsProgress.value = withRepeat(
        withTiming(1, { duration: 25000, easing: Easing.inOut(Easing.ease) }),
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
  }, [isActive, showInteractions, instruction, kenBurnsProgress, instructionOpacity]);

  const patterns = [
    { fromScale: 1.0, toScale: 1.03, fromX: 0, toX: -3, fromY: 0, toY: -2 },
    { fromScale: 1.0, toScale: 1.03, fromX: -2, toX: 2, fromY: -1, toY: 1 },
    { fromScale: 1.0, toScale: 1.03, fromX: 2, toX: -2, fromY: 1, toY: -1 },
    { fromScale: 1.0, toScale: 1.03, fromX: 1, toX: -2, fromY: -1, toY: 1 },
    { fromScale: 1.0, toScale: 1.03, fromX: -1, toX: 2, fromY: 1, toY: -1 },
    { fromScale: 1.0, toScale: 1.03, fromX: 2, toX: -1, fromY: 0, toY: 1 },
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
    <View style={ls.page}>
      <View style={ls.illustrationArea}>
        <Animated.View style={[ls.imageKenBurnsWrap, imageStyle]}>
          {imageError || !imageUrl ? (
            <LinearGradient
              colors={["#1a1520", "#0d0b12", "#050507"]}
              style={ls.containedImage}
            />
          ) : (
            <Image
              source={imageUrl}
              style={ls.containedImage}
              contentFit="contain"
              cachePolicy="disk"
              recyclingKey={imageUrl}
              transition={200}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}
        </Animated.View>
      </View>

      {!showInteractions && isActive && (
        <View style={[ls.loadingOverlay, { top: imageFrame.offsetY, height: imageFrame.height }]}>
          <Animated.View entering={FadeIn.duration(400)} style={ls.loadingPill}>
            <Text style={ls.loadingText}>Loading scene...</Text>
          </Animated.View>
        </View>
      )}

      {showInteractions && (
        <InteractionLayer type={interactionType} config={interactionConfig} isActive={isActive} imageFrame={imageFrame} />
      )}

      {showInteractions && instruction !== "" && (
        <Animated.View style={[ls.instructionWrap, instructionStyle, { top: imageFrame.offsetY + 10 }]}>
          <Text style={ls.instructionText} numberOfLines={2}>{instruction}</Text>
        </Animated.View>
      )}

      <LinearGradient
        colors={["transparent", "rgba(11,9,16,0.7)", PAGE_BG]}
        locations={[0, 0.4, 1]}
        style={[ls.narrationGradient, { top: narrationTop - 40 }]}
        pointerEvents="none"
      />

      <View style={[ls.narrationWrap, { top: narrationTop + 8 }]} pointerEvents="none">
        <Text style={ls.narrationText}>
          {isActive && isSpeaking
            ? words.map((word, i) => (
                <Text
                  key={i}
                  style={{
                    color: i === currentWordIndex ? "#FFD700" : "rgba(255,255,255,0.92)",
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
  page: {
    flex: 1,
    width: SW,
    backgroundColor: PAGE_BG,
  },
  illustrationArea: {
    width: SW,
    height: RENDERED_H + IMAGE_TOP_PADDING,
    overflow: "hidden",
  },
  imageKenBurnsWrap: {
    position: "absolute",
    top: IMAGE_TOP_PADDING,
    left: 0,
    width: RENDERED_W,
    height: RENDERED_H,
  },
  containedImage: {
    width: "100%",
    height: "100%",
  },
  narrationGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 60,
  },
  narrationWrap: {
    position: "absolute",
    left: 20,
    right: 20,
  },
  narrationText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 21,
    lineHeight: 32,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
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
    alignSelf: "center",
    zIndex: 25,
  },
  releaseButton: {
    backgroundColor: "#C9933A",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
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
    position: "absolute",
    left: 0,
    right: 0,
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
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
    overflow: "hidden",
  },
});
