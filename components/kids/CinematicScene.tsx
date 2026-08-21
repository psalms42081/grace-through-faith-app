import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
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
const IMAGE_TOP_PADDING = 12;

function haptic(s: "light" | "medium" | "success" = "light") {
  if (Platform.OS === "web") return;
  if (s === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(s === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
}

const SOUND_URLS: Record<string, string> = {
  whoosh: "https://cdn.pixabay.com/audio/2022/03/15/audio_7e0d0e5e8a.mp3",
  thud: "https://cdn.pixabay.com/audio/2024/02/19/audio_e4043e5799.mp3",
  cheer: "https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3",
  chime: "https://cdn.pixabay.com/audio/2022/11/21/audio_dc39e01043.mp3",
  fanfare: "https://cdn.pixabay.com/audio/2022/03/15/audio_942de29f3e.mp3",
};
const SOUND_DURATIONS: Record<string, number> = {
  whoosh: 1500, thud: 1500, cheer: 4000, chime: 2500, fanfare: 5000,
};

function playSound(key: string) {
  try {
    const url = SOUND_URLS[key];
    if (!url) return;
    const player = createAudioPlayer({ uri: url });
    player.play();
    setTimeout(() => { try { player.remove(); } catch {} }, SOUND_DURATIONS[key] || 3000);
  } catch {}
}

interface CinematicSceneProps {
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

interface ImageFrame {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

const CAMERA_CHOREOGRAPHY = [
  { fromScale: 1.0, toScale: 1.05, fromX: 10, toX: -6, fromY: 2, toY: -2, duration: 20000 },
  { fromScale: 1.02, toScale: 1.06, fromX: -4, toX: 4, fromY: 4, toY: -2, duration: 18000 },
  { fromScale: 1.0, toScale: 1.04, fromX: 4, toX: -2, fromY: -2, toY: 2, duration: 22000 },
  { fromScale: 1.0, toScale: 1.03, fromX: 2, toX: -4, fromY: 2, toY: -1, duration: 20000 },
  { fromScale: 1.0, toScale: 1.05, fromX: -6, toX: 8, fromY: -2, toY: 2, duration: 15000 },
  { fromScale: 1.0, toScale: 1.04, fromX: 3, toX: -3, fromY: 1, toY: -1, duration: 18000 },
];

function GlowEffect({ x, y, imageFrame, color, size, delay: d, duration }: {
  x: number; y: number; imageFrame: ImageFrame;
  color: string; size: number; delay: number; duration: number;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(d, withSequence(
      withTiming(0.6, { duration: duration * 0.4, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.25, { duration: duration * 0.6, easing: Easing.inOut(Easing.ease) })
    ));
    scale.value = withDelay(d, withSequence(
      withTiming(1, { duration: duration * 0.4, easing: Easing.out(Easing.ease) }),
      withTiming(0.8, { duration: duration * 0.6, easing: Easing.inOut(Easing.ease) })
    ));
  }, [d, duration, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const screenX = imageFrame.offsetX + x * imageFrame.width;
  const screenY = imageFrame.offsetY + y * imageFrame.height;

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: screenX - size / 2,
        top: screenY - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }, style]}
      pointerEvents="none"
    />
  );
}

function FloatingParticles({ imageFrame, count, color, speed }: {
  imageFrame: ImageFrame; count: number; color: string; speed: "slow" | "medium";
}) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      startX: Math.random(),
      startY: 0.5 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 0.1,
      delay: Math.random() * 4000,
      duration: speed === "slow" ? 6000 + Math.random() * 4000 : 4000 + Math.random() * 3000,
      size: 3 + Math.random() * 4,
    }));
  }, [count, speed]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => (
        <SingleParticle
          key={p.id}
          startX={p.startX}
          startY={p.startY}
          drift={p.drift}
          delay={p.delay}
          duration={p.duration}
          size={p.size}
          color={color}
          imageFrame={imageFrame}
        />
      ))}
    </View>
  );
}

function SingleParticle({ startX, startY, drift, delay: d, duration, size, color, imageFrame }: {
  startX: number; startY: number; drift: number; delay: number;
  duration: number; size: number; color: string; imageFrame: ImageFrame;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(d, withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1, false
    ));
    opacity.value = withDelay(d, withRepeat(
      withSequence(
        withTiming(0.7, { duration: duration * 0.2 }),
        withTiming(0.7, { duration: duration * 0.5 }),
        withTiming(0, { duration: duration * 0.3 })
      ),
      -1, false
    ));
  }, [d, duration, progress, opacity]);

  const style = useAnimatedStyle(() => {
    const y = startY - progress.value * 0.4;
    const x = startX + progress.value * drift;
    return {
      opacity: opacity.value,
      transform: [
        { translateX: imageFrame.offsetX + x * imageFrame.width },
        { translateY: imageFrame.offsetY + y * imageFrame.height },
      ],
    };
  });

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: -size / 2,
        top: -size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }, style]}
    />
  );
}

function ShimmerLine({ imageFrame, y, width: w, delay: d }: {
  imageFrame: ImageFrame; y: number; width: number; delay: number;
}) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withDelay(d, withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    ));
  }, [d, shimmer]);

  const style = useAnimatedStyle(() => ({
    opacity: shimmer.value * 0.35,
  }));

  const screenY = imageFrame.offsetY + y * imageFrame.height;

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: imageFrame.offsetX + (imageFrame.width - w) / 2,
        top: screenY,
        width: w,
        height: 2,
        borderRadius: 1,
        backgroundColor: "rgba(200,220,255,0.6)",
      }, style]}
      pointerEvents="none"
    />
  );
}

function SlingAnimation({ imageFrame, onComplete, slingPos, targetPos }: {
  imageFrame: ImageFrame; onComplete: () => void;
  slingPos?: { x: number; y: number }; targetPos?: { x: number; y: number };
}) {
  const stoneProgress = useSharedValue(0);
  const stoneOpacity = useSharedValue(1);
  const impactScale = useSharedValue(0);
  const impactOpacity = useSharedValue(0);
  const [phase, setPhase] = useState<"ready" | "flying" | "hit">("ready");

  const sling = slingPos || { x: 0.62, y: 0.30 };
  const target = targetPos || { x: 0.18, y: 0.28 };
  const slingScreenX = imageFrame.offsetX + sling.x * imageFrame.width;
  const slingScreenY = imageFrame.offsetY + sling.y * imageFrame.height;
  const targetScreenX = imageFrame.offsetX + target.x * imageFrame.width;
  const targetScreenY = imageFrame.offsetY + target.y * imageFrame.height;
  const dx = targetScreenX - slingScreenX;
  const dy = targetScreenY - slingScreenY;

  const startFlight = () => {
    if (phase !== "ready") return;
    setPhase("flying");
    haptic("light");
    playSound("whoosh");

    stoneProgress.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });

    setTimeout(() => {
      setPhase("hit");
      haptic("medium");
      playSound("thud");
      stoneOpacity.value = withTiming(0, { duration: 200 });
      impactScale.value = withSequence(
        withSpring(1.5, { damping: 6 }),
        withTiming(2.5, { duration: 500 })
      );
      impactOpacity.value = withSequence(
        withTiming(0.9, { duration: 80 }),
        withTiming(0, { duration: 700 })
      );
      setTimeout(onComplete, 800);
    }, 650);
  };

  const startFlightRef = useRef(startFlight);
  startFlightRef.current = startFlight;

  useEffect(() => {
    const timer = setTimeout(() => startFlightRef.current(), 1500);
    return () => clearTimeout(timer);
  }, []);

  const stoneStyle = useAnimatedStyle(() => {
    const arcHeight = -40;
    const t = stoneProgress.value;
    const x = t * dx;
    const y = t * dy + arcHeight * Math.sin(t * Math.PI);
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: interpolate(t, [0, 0.5, 1], [1, 1.3, 0.7]) },
      ],
      opacity: stoneOpacity.value,
    };
  });

  const impactStyle = useAnimatedStyle(() => ({
    transform: [{ scale: impactScale.value }],
    opacity: impactOpacity.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[{
          position: "absolute",
          left: slingScreenX - 10,
          top: slingScreenY - 10,
          width: 20, height: 20,
          borderRadius: 10,
          backgroundColor: "#8B7355",
          borderWidth: 1.5,
          borderColor: "#6B5B45",
          zIndex: 18,
        }, stoneStyle]}
      />
      <Animated.View
        style={[{
          position: "absolute",
          left: targetScreenX - 40,
          top: targetScreenY - 40,
          width: 80, height: 80,
          borderRadius: 40,
          backgroundColor: "rgba(255,215,0,0.35)",
          borderWidth: 2,
          borderColor: "rgba(255,215,0,0.5)",
          zIndex: 17,
        }, impactStyle]}
      />
    </View>
  );
}

function CelebrationBurst({ imageFrame }: { imageFrame: ImageFrame }) {
  const particles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: 0.2 + Math.random() * 0.6,
      y: 0.3 + Math.random() * 0.4,
      size: 4 + Math.random() * 6,
      color: ["#FFD700", "#FFA500", "#FF6347", "#FFD700", "#FFFFFF"][i % 5],
      delay: i * 150,
    }));
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => (
        <CelebrationParticle
          key={p.id}
          x={p.x}
          y={p.y}
          size={p.size}
          color={p.color}
          delay={p.delay}
          imageFrame={imageFrame}
        />
      ))}
    </View>
  );
}

function CelebrationParticle({ x, y, size, color, delay: d, imageFrame }: {
  x: number; y: number; size: number; color: string; delay: number; imageFrame: ImageFrame;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(d, withSequence(
      withTiming(-30 - Math.random() * 40, { duration: 1200, easing: Easing.out(Easing.ease) }),
      withTiming(-50 - Math.random() * 30, { duration: 1000, easing: Easing.inOut(Easing.ease) })
    ));
    opacity.value = withDelay(d, withSequence(
      withTiming(0.9, { duration: 300 }),
      withTiming(0.9, { duration: 1200 }),
      withTiming(0, { duration: 700 })
    ));
    scale.value = withDelay(d, withSequence(
      withSpring(1.2, { damping: 5 }),
      withTiming(0.6, { duration: 1000 })
    ));
  }, [d, translateY, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const screenX = imageFrame.offsetX + x * imageFrame.width;
  const screenY = imageFrame.offsetY + y * imageFrame.height;

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: screenX - size / 2,
        top: screenY - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }, style]}
    />
  );
}

interface CinematicConfig {
  effects?: {
    type: "particles" | "glow" | "shimmer" | "sling" | "celebration";
    x?: number;
    y?: number;
    color?: string;
    size?: number;
    count?: number;
    delay?: number;
    duration?: number;
    speed?: "slow" | "medium";
    width?: number;
  }[];
  revealText?: string;
  revealColor?: string;
  revealDelay?: number;
  slingArea?: { x: number; y: number };
  targetArea?: { x: number; y: number };
}

const DAVID_SCENE_DEFAULTS: Record<number, CinematicConfig> = {
  0: {
    effects: [
      { type: "particles", count: 6, color: "rgba(255,248,220,0.5)", speed: "slow" },
    ],
  },
  1: {
    effects: [
      { type: "glow", x: 0.205, y: 0.25, color: "rgba(180,60,30,0.12)", size: 160, delay: 800, duration: 4000 },
    ],
  },
  2: {
    effects: [
      { type: "glow", x: 0.456, y: 0.434, color: "rgba(255,215,0,0.18)", size: 120, delay: 1200, duration: 5000 },
      { type: "particles", count: 5, color: "rgba(255,215,0,0.4)", speed: "slow" },
    ],
  },
  3: {
    effects: [
      { type: "shimmer", y: 0.68, width: 0.5, delay: 0 },
      { type: "shimmer", y: 0.72, width: 0.4, delay: 800 },
      { type: "shimmer", y: 0.65, width: 0.35, delay: 1600 },
      { type: "particles", count: 4, color: "rgba(200,220,255,0.4)", speed: "slow" },
    ],
  },
  4: {
    effects: [{ type: "sling" }],
    slingArea: { x: 0.62, y: 0.30 },
    targetArea: { x: 0.18, y: 0.28 },
    revealText: "The stone flew true!",
  },
  5: {
    effects: [{ type: "celebration" }],
    revealText: "You can trust God too!",
    revealColor: "#F5C451",
    revealDelay: 1000,
  },
};

function SceneAnimationLayer({ sceneIndex, imageFrame, isActive, config }: {
  sceneIndex: number; imageFrame: ImageFrame; isActive: boolean;
  config: Record<string, any>;
}) {
  const [slingDone, setSlingDone] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setSlingDone(false);
    }
  }, [isActive]);

  if (!isActive) return null;

  const cinematic: CinematicConfig = config.cinematicConfig || DAVID_SCENE_DEFAULTS[sceneIndex] || {};
  const effects = cinematic.effects || [];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {effects.map((fx, i) => {
        switch (fx.type) {
          case "particles":
            return (
              <FloatingParticles
                key={`p${i}`}
                imageFrame={imageFrame}
                count={fx.count || 6}
                color={fx.color || "rgba(255,248,220,0.5)"}
                speed={fx.speed || "slow"}
              />
            );
          case "glow":
            return (
              <GlowEffect
                key={`g${i}`}
                x={fx.x || 0.5}
                y={fx.y || 0.5}
                imageFrame={imageFrame}
                color={fx.color || "rgba(255,215,0,0.18)"}
                size={fx.size || 120}
                delay={fx.delay || 800}
                duration={fx.duration || 4000}
              />
            );
          case "shimmer":
            return (
              <ShimmerLine
                key={`s${i}`}
                imageFrame={imageFrame}
                y={fx.y || 0.5}
                width={imageFrame.width * (fx.width || 0.4)}
                delay={fx.delay || 0}
              />
            );
          case "sling":
            return (
              <SlingAnimation
                key={`sl${i}`}
                imageFrame={imageFrame}
                onComplete={() => setSlingDone(true)}
                slingPos={cinematic.slingArea}
                targetPos={cinematic.targetArea}
              />
            );
          case "celebration":
            return <CelebrationBurst key={`c${i}`} imageFrame={imageFrame} />;
          default:
            return null;
        }
      })}

      
    </View>
  );
}

export default function CinematicScene({
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
}: CinematicSceneProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const cameraProgress = useSharedValue(0);

  const imageFrame = useMemo<ImageFrame>(() => ({
    offsetX: 0,
    offsetY: IMAGE_TOP_PADDING,
    width: RENDERED_W,
    height: RENDERED_H,
  }), []);

  const narrationTop = imageFrame.offsetY + imageFrame.height;

  const choreography = useMemo(
    () => CAMERA_CHOREOGRAPHY[sceneIndex % CAMERA_CHOREOGRAPHY.length],
    [sceneIndex],
  );

  const wasSpeakingRef = useRef(false);
  useEffect(() => {
    if (sceneIndex === 5 && isActive && wasSpeakingRef.current && !isSpeaking) {
      setTimeout(() => playSound("cheer"), 300);
    }
    wasSpeakingRef.current = isSpeaking;
  }, [isSpeaking, isActive, sceneIndex]);

  useEffect(() => {
    if (isActive) {
      cameraProgress.value = 0;
      cameraProgress.value = withRepeat(
        withTiming(1, { duration: choreography.duration, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
    } else {
      cameraProgress.value = withTiming(0, { duration: 500 });
    }
  }, [isActive, choreography, cameraProgress]);

  const cameraStyle = useAnimatedStyle(() => {
    const s = interpolate(cameraProgress.value, [0, 1], [choreography.fromScale, choreography.toScale]);
    const tx = interpolate(cameraProgress.value, [0, 1], [choreography.fromX, choreography.toX]);
    const ty = interpolate(cameraProgress.value, [0, 1], [choreography.fromY, choreography.toY]);
    return {
      transform: [{ scale: s }, { translateX: tx }, { translateY: ty }],
    };
  });

  const words = narration.split(/\s+/);

  const cinematic: CinematicConfig = (interactionConfig as any)?.cinematicConfig || DAVID_SCENE_DEFAULTS[sceneIndex] || {};
  const revealText = cinematic.revealText;
  const revealColor = cinematic.revealColor || "#F5C451";

  return (
    <View style={cs.page}>
      <View style={cs.illustrationArea}>
        <Animated.View style={[cs.imageWrap, cameraStyle]}>
          {imageError || !imageUrl ? (
            <LinearGradient
              colors={["#1a1520", "#0d0b12", "#050507"]}
              style={cs.containedImage}
            />
          ) : (
            <Image
              source={imageUrl}
              style={cs.containedImage}
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

      <SceneAnimationLayer
        sceneIndex={sceneIndex}
        imageFrame={imageFrame}
        isActive={isActive && (imageLoaded || imageError)}
        config={interactionConfig}
      />

      <LinearGradient
        colors={["transparent", "rgba(11,9,16,0.7)", PAGE_BG]}
        locations={[0, 0.4, 1]}
        style={[cs.narrationGradient, { top: narrationTop - 40 }]}
        pointerEvents="none"
      />

      <View style={[cs.narrationWrap, { top: narrationTop + 8 }]} pointerEvents="none">
        {revealText && (
          <Animated.View entering={FadeIn.delay(cinematic.revealDelay || 800).duration(600)} style={cs.revealRow}>
            <Text style={[cs.revealText, { color: revealColor }]}>
              {revealText}
            </Text>
          </Animated.View>
        )}
        <Text style={cs.narrationText}>
          {isActive && isSpeaking
            ? words.map((word, i) => (
                <Text
                  key={i}
                  style={{
                    color: i === currentWordIndex ? "#F5C451" : "rgba(255,255,255,0.92)",
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

const cs = StyleSheet.create({
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
  imageWrap: {
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
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  narrationText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 18,
    lineHeight: 32,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    maxWidth: 520,
  },
  revealRow: {
    alignItems: "center",
    marginBottom: 6,
  },
  revealText: {
    color: "#F5C451",
    fontSize: 18,
    fontFamily: "Lora_700Bold",
    textAlign: "center",
  },
});
