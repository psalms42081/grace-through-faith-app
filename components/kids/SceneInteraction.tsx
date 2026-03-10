import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  PanResponder,
  GestureResponderEvent,
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
  FadeInDown,
  FadeInUp,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface InteractionProps {
  type: string;
  config: Record<string, any>;
  containerWidth: number;
  containerHeight: number;
}

function haptic(style: "light" | "medium" | "success" = "light") {
  if (Platform.OS === "web") return;
  if (style === "success") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    Haptics.impactAsync(
      style === "medium"
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );
  }
}

function TapWiggleInteraction({ config, containerWidth, containerHeight }: Omit<InteractionProps, "type">) {
  const targets = config.targets || [];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {targets.map((t: any, i: number) => (
        <WiggleTarget
          key={t.id || i}
          target={t}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          delay={i * 100}
        />
      ))}
    </View>
  );
}

function WiggleTarget({
  target,
  containerWidth,
  containerHeight,
  delay,
}: {
  target: any;
  containerWidth: number;
  containerHeight: number;
  delay: number;
}) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const [showLabel, setShowLabel] = useState(false);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const handleTap = () => {
    haptic("light");
    setShowLabel(true);
    scale.value = withSequence(
      withSpring(1.3, { damping: 6, stiffness: 300 }),
      withSpring(0.9, { damping: 8 }),
      withSpring(1.05, { damping: 10 }),
      withSpring(1)
    );
    rotation.value = withSequence(
      withTiming(-12, { duration: 80 }),
      withTiming(12, { duration: 80 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 80 })
    );
    setTimeout(() => setShowLabel(false), 1200);
  };

  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(400)}
      style={[
        iStyles.targetWrap,
        {
          left: target.x * containerWidth - (target.size || 44) / 2,
          top: target.y * containerHeight - (target.size || 44) / 2,
        },
      ]}
    >
      <Animated.View style={animStyle}>
        <Pressable onPress={handleTap} style={iStyles.targetPressable}>
          <Text style={{ fontSize: target.size || 44 }}>{target.icon}</Text>
        </Pressable>
      </Animated.View>
      {showLabel && target.label && (
        <Animated.View entering={FadeInUp.duration(200)} style={iStyles.labelBubble}>
          <Text style={iStyles.labelText}>{target.label}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function TapCompareInteraction({ config, containerWidth, containerHeight }: Omit<InteractionProps, "type">) {
  const [compared, setCompared] = useState(false);
  const bigScale = useSharedValue(1);
  const smallScale = useSharedValue(1);

  const bigAnim = useAnimatedStyle(() => ({
    transform: [{ scale: bigScale.value }],
  }));
  const smallAnim = useAnimatedStyle(() => ({
    transform: [{ scale: smallScale.value }],
  }));

  const handleCompare = () => {
    haptic("medium");
    setCompared(true);
    bigScale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1)
    );
    smallScale.value = withSequence(
      withSpring(0.7, { damping: 8 }),
      withSpring(1)
    );
  };

  return (
    <View style={[StyleSheet.absoluteFill, iStyles.compareContainer]} pointerEvents="box-none">
      <Pressable onPress={handleCompare} style={iStyles.compareRow}>
        <Animated.View style={[iStyles.compareItem, smallAnim]}>
          <Text style={{ fontSize: config.smallSize || 36 }}>{config.smallIcon}</Text>
          <Text style={iStyles.compareLabel}>{config.smallLabel}</Text>
        </Animated.View>
        <Animated.View style={[iStyles.compareItem, bigAnim]}>
          <Text style={{ fontSize: config.bigSize || 80 }}>{config.bigIcon}</Text>
          <Text style={iStyles.compareLabel}>{config.bigLabel}</Text>
        </Animated.View>
      </Pressable>
      {compared && (
        <Animated.View entering={FadeInDown.springify().damping(12)} style={iStyles.resultBubble}>
          <Text style={iStyles.resultText}>{config.resultText}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function TapGlowInteraction({ config, containerWidth, containerHeight }: Omit<InteractionProps, "type">) {
  const [glowing, setGlowing] = useState(false);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.6);

  const glowAnim = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const handleGlow = () => {
    haptic("success");
    setGlowing(true);
    glowScale.value = withSequence(
      withSpring(1.8, { damping: 6, stiffness: 200 }),
      withSpring(1.4, { damping: 10 })
    );
    glowOpacity.value = withTiming(1, { duration: 600 });
  };

  const target = config.glowTarget || { x: 0.5, y: 0.5, size: 64, icon: "❤️" };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        onPress={handleGlow}
        style={[
          iStyles.glowPressable,
          {
            left: target.x * containerWidth - target.size / 2,
            top: target.y * containerHeight - target.size / 2,
          },
        ]}
      >
        <Animated.View style={glowAnim}>
          <Text style={{ fontSize: target.size }}>{target.icon}</Text>
        </Animated.View>
        {glowing && (
          <Animated.View
            entering={FadeIn.duration(600)}
            style={[
              iStyles.glowRing,
              {
                width: target.size * 2.5,
                height: target.size * 2.5,
                borderRadius: target.size * 1.25,
                borderColor: config.glowColor || "#FFD700",
              },
            ]}
          />
        )}
      </Pressable>
      {glowing && config.revealText && (
        <Animated.View entering={FadeInUp.delay(400).springify()} style={iStyles.revealTextWrap}>
          <Text style={[iStyles.revealText, { color: config.glowColor || "#FFD700" }]}>
            {config.revealText}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

function TapCollectInteraction({ config, containerWidth, containerHeight }: Omit<InteractionProps, "type">) {
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const total = config.totalItems || 5;
  const positions = config.positions || [];
  const allCollected = collected.size >= total;

  const handleCollect = (idx: number) => {
    if (collected.has(idx)) return;
    haptic("light");
    setCollected(prev => new Set([...prev, idx]));
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {positions.map((pos: any, i: number) => (
        <CollectableItem
          key={i}
          index={i}
          pos={pos}
          icon={config.itemIcon || "🪨"}
          collected={collected.has(i)}
          onCollect={() => handleCollect(i)}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
        />
      ))}
      <View style={iStyles.collectCounter}>
        <Animated.View
          key={collected.size}
          entering={FadeIn.duration(200)}
        >
          <Text style={iStyles.collectCountText}>
            {allCollected
              ? config.completeText || `All ${total} collected!`
              : `${collected.size} of ${total} ${config.collectText || "collected"}`}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

function CollectableItem({
  index,
  pos,
  icon,
  collected,
  onCollect,
  containerWidth,
  containerHeight,
}: {
  index: number;
  pos: any;
  icon: string;
  collected: boolean;
  onCollect: () => void;
  containerWidth: number;
  containerHeight: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    if (collected) return;
    onCollect();
    scale.value = withSequence(
      withSpring(1.5, { damping: 6 }),
      withSpring(0, { damping: 12 })
    );
    opacity.value = withTiming(0, { duration: 400 });
  };

  if (collected) return null;

  return (
    <Animated.View
      entering={FadeIn.delay(index * 150).duration(300)}
      style={[
        iStyles.collectItem,
        animStyle,
        {
          left: pos.x * containerWidth - 24,
          top: pos.y * containerHeight - 24,
        },
      ]}
    >
      <Pressable onPress={handlePress} hitSlop={16}>
        <Text style={{ fontSize: 40 }}>{icon}</Text>
      </Pressable>
    </Animated.View>
  );
}

function DragReleaseInteraction({ config, containerWidth, containerHeight }: Omit<InteractionProps, "type">) {
  const [dragAngle, setDragAngle] = useState(0);
  const [released, setReleased] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const slingRotation = useSharedValue(0);
  const projectileX = useSharedValue(0);
  const projectileY = useSharedValue(0);
  const projectileOpacity = useSharedValue(0);
  const projectileScale = useSharedValue(1);

  const slingAnim = useAnimatedStyle(() => ({
    transform: [{ rotate: `${slingRotation.value}deg` }],
  }));

  const projectileAnim = useAnimatedStyle(() => ({
    transform: [
      { translateX: projectileX.value },
      { translateY: projectileY.value },
      { scale: projectileScale.value },
    ],
    opacity: projectileOpacity.value,
  }));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !released,
      onMoveShouldSetPanResponder: () => !released,
      onPanResponderMove: (_, gs) => {
        if (released) return;
        const angle = Math.atan2(gs.dy, gs.dx) * (180 / Math.PI);
        setDragAngle(angle);
        slingRotation.value = angle * 2;
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const handleRelease = () => {
    if (released) return;
    haptic("success");
    setReleased(true);

    const targetX = (config.targetArea?.x || 0.75) * containerWidth - containerWidth / 2;
    const targetY = (config.targetArea?.y || 0.35) * containerHeight - containerHeight / 2;

    projectileOpacity.value = 1;
    projectileX.value = withTiming(targetX, { duration: 500, easing: Easing.out(Easing.quad) });
    projectileY.value = withTiming(targetY - 60, { duration: 500, easing: Easing.out(Easing.quad) });
    projectileScale.value = withSequence(
      withTiming(1.5, { duration: 250 }),
      withTiming(0.5, { duration: 250 })
    );

    setTimeout(() => {
      haptic("medium");
      setShowResult(true);
    }, 600);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {!released && (
        <View
          {...panResponder.panHandlers}
          style={[iStyles.dragArea, { width: containerWidth, height: containerHeight }]}
        >
          <View style={iStyles.dragCenter}>
            <Animated.View style={slingAnim}>
              <Text style={{ fontSize: 48 }}>🪢</Text>
            </Animated.View>
            <Text style={iStyles.dragHint}>Swirl your finger, then tap Release!</Text>
          </View>
        </View>
      )}

      {!released && (
        <Animated.View
          entering={FadeIn.delay(800).duration(400)}
          style={iStyles.releaseButtonWrap}
        >
          <Pressable
            onPress={handleRelease}
            style={iStyles.releaseButton}
          >
            <Text style={iStyles.releaseButtonText}>
              {config.releaseLabel || "Release!"}
            </Text>
          </Pressable>
        </Animated.View>
      )}

      <Animated.View
        style={[
          iStyles.projectile,
          projectileAnim,
          {
            left: containerWidth / 2 - 20,
            top: containerHeight / 2 - 20,
          },
        ]}
      >
        <Text style={{ fontSize: 36 }}>{config.projectileIcon || "🪨"}</Text>
      </Animated.View>

      {showResult && (
        <Animated.View entering={FadeInUp.springify().damping(10)} style={iStyles.resultBubbleLarge}>
          <Text style={iStyles.resultTextLarge}>{config.resultText}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function TapCheerInteraction({ config, containerWidth, containerHeight }: Omit<InteractionProps, "type">) {
  const targets = config.targets || [];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {targets.map((t: any, i: number) => (
        <CheerTarget
          key={t.id || i}
          target={t}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          delay={i * 120}
        />
      ))}
    </View>
  );
}

function CheerTarget({
  target,
  containerWidth,
  containerHeight,
  delay,
}: {
  target: any;
  containerWidth: number;
  containerHeight: number;
  delay: number;
}) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const [showLabel, setShowLabel] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const handleTap = () => {
    haptic("light");
    setTapCount(prev => prev + 1);
    setShowLabel(true);
    setTimeout(() => setShowLabel(false), 1000);

    if (target.animation === "bounce") {
      scale.value = withSequence(
        withSpring(1.4, { damping: 5 }),
        withSpring(1)
      );
      translateY.value = withSequence(
        withSpring(-20, { damping: 5 }),
        withSpring(0)
      );
    } else if (target.animation === "wave") {
      rotation.value = withSequence(
        withTiming(-20, { duration: 100 }),
        withTiming(20, { duration: 100 }),
        withTiming(-15, { duration: 80 }),
        withTiming(15, { duration: 80 }),
        withTiming(0, { duration: 100 })
      );
    } else if (target.animation === "glow") {
      scale.value = withSequence(
        withSpring(1.6, { damping: 4, stiffness: 200 }),
        withSpring(1.2, { damping: 8 }),
        withSpring(1)
      );
    }
  };

  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(400)}
      style={[
        iStyles.targetWrap,
        {
          left: target.x * containerWidth - 28,
          top: target.y * containerHeight - 28,
        },
      ]}
    >
      <Animated.View style={animStyle}>
        <Pressable onPress={handleTap} style={iStyles.cheerPressable}>
          <Text style={{ fontSize: 44 }}>{target.icon}</Text>
        </Pressable>
      </Animated.View>
      {showLabel && target.label && (
        <Animated.View entering={FadeInUp.duration(200)} style={iStyles.labelBubble}>
          <Text style={iStyles.labelText}>{target.label}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default function SceneInteraction({ type, config, containerWidth, containerHeight }: InteractionProps) {
  if (!type || !config) return null;

  switch (type) {
    case "tap_wiggle":
      return <TapWiggleInteraction config={config} containerWidth={containerWidth} containerHeight={containerHeight} />;
    case "tap_compare":
      return <TapCompareInteraction config={config} containerWidth={containerWidth} containerHeight={containerHeight} />;
    case "tap_glow":
      return <TapGlowInteraction config={config} containerWidth={containerWidth} containerHeight={containerHeight} />;
    case "tap_collect":
      return <TapCollectInteraction config={config} containerWidth={containerWidth} containerHeight={containerHeight} />;
    case "drag_release":
      return <DragReleaseInteraction config={config} containerWidth={containerWidth} containerHeight={containerHeight} />;
    case "tap_cheer":
      return <TapCheerInteraction config={config} containerWidth={containerWidth} containerHeight={containerHeight} />;
    default:
      return null;
  }
}

const iStyles = StyleSheet.create({
  targetWrap: {
    position: "absolute",
    alignItems: "center",
    zIndex: 10,
  },
  targetPressable: {
    padding: 4,
  },
  cheerPressable: {
    padding: 2,
  },
  labelBubble: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
    position: "absolute",
    bottom: -30,
  },
  labelText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  compareContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 40,
    paddingTop: 20,
  },
  compareItem: {
    alignItems: "center",
    gap: 4,
  },
  compareLabel: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  resultBubble: {
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
  },
  resultText: {
    color: "#FFD700",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  glowPressable: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  glowRing: {
    position: "absolute",
    borderWidth: 3,
    opacity: 0.4,
  },
  revealTextWrap: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  revealText: {
    fontSize: 20,
    fontFamily: "Lora_700Bold",
    textAlign: "center",
  },
  collectItem: {
    position: "absolute",
    zIndex: 10,
  },
  collectCounter: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  collectCountText: {
    color: "#FFD700",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  dragArea: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  dragCenter: {
    alignItems: "center",
    gap: 12,
  },
  dragHint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  releaseButtonWrap: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    zIndex: 20,
  },
  releaseButton: {
    backgroundColor: "#E55100",
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  releaseButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  projectile: {
    position: "absolute",
    zIndex: 15,
  },
  resultBubbleLarge: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  resultTextLarge: {
    color: "#FFD700",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
});
