import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  FlatList,
  Modal,
  ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  FadeInUp,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTutorial, type TutorialId } from "@/contexts/TutorialContext";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { SWEEP_LIGHT } from "@/constants/light-sweep";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CORAL_DIM = "rgba(232, 96, 76, 0.15)";
const CORAL_SOFT = "rgba(232, 96, 76, 0.08)";

export interface TutorialStep {
  illustration: React.ReactNode;
  label: string;
  title: string;
  description: string;
}

interface FeatureTutorialProps {
  tutorialId: TutorialId;
  steps: TutorialStep[];
  onComplete?: () => void;
}

function PulsingRing({ delay = 0, size = 120 }: { delay?: number; size?: number }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, [delay, pulse]);

  const style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: `rgba(232, 96, 76, ${interpolate(pulse.value, [0, 1], [0.4, 0])})`,
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.6]) }],
  }));

  return <Animated.View style={style} />;
}

function FloatingParticle({ delay = 0, x = 0, y = 0 }: { delay?: number; x?: number; y?: number }) {
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, float]);

  const style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: `rgba(232, 96, 76, ${interpolate(float.value, [0, 0.5, 1], [0.15, 0.5, 0.15])})`,
    left: x,
    top: interpolate(float.value, [0, 1], [y, y - 12]),
  }));

  return <Animated.View style={style} />;
}

function IllustrationContainer({ children }: { children: React.ReactNode }) {
  return (
    <View style={illStyles.container}>
      <PulsingRing delay={0} size={140} />
      <PulsingRing delay={900} size={140} />
      <FloatingParticle delay={0} x={-60} y={-20} />
      <FloatingParticle delay={600} x={50} y={-40} />
      <FloatingParticle delay={1200} x={-40} y={30} />
      <FloatingParticle delay={1800} x={60} y={10} />
      <View style={illStyles.innerCircle}>
        <LinearGradient
          colors={[CORAL_DIM, CORAL_SOFT]}
          style={illStyles.gradient}
        />
        {children}
      </View>
    </View>
  );
}

const illStyles = StyleSheet.create({
  container: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  innerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(232, 96, 76, 0.25)",
    overflow: "hidden",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
  },
});

function StepPage({ step, index }: { step: TutorialStep; index: number }) {
  return (
    <View style={stepStyles.page}>
      <View style={stepStyles.topSpace} />
      <Animated.View entering={FadeInUp.delay(200).duration(700).springify()} style={stepStyles.illustrationWrap}>
        <IllustrationContainer>
          {step.illustration}
        </IllustrationContainer>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(350).duration(600)} style={stepStyles.labelRow}>
        <View style={stepStyles.labelLine} />
        <Text style={[stepStyles.label, { fontFamily: "Inter_600SemiBold" }]}>
          {step.label}
        </Text>
        <View style={stepStyles.labelLine} />
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(450).duration(600)}>
        <Text style={[stepStyles.title, { fontFamily: "Lora_700Bold" }]}>
          {step.title}
        </Text>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(550).duration(600)}>
        <Text style={[stepStyles.description, { fontFamily: "Inter_400Regular" }]}>
          {step.description}
        </Text>
      </Animated.View>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 36,
  },
  topSpace: {
    flex: 0.15,
  },
  illustrationWrap: {
    alignItems: "center",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  labelLine: {
    width: 24,
    height: 1,
    backgroundColor: "rgba(31, 26, 18, 0.18)",
  },
  label: {
    fontSize: 11,
    color: PathB.coralInk,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    color: PathB.ink,
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: HV2.inkMutedText,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
  },
});

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            dotStyles.dot,
            i === current ? dotStyles.active : dotStyles.inactive,
          ]}
          layout={undefined}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    borderRadius: 4,
  },
  active: {
    width: 24,
    height: 8,
    backgroundColor: PathB.ink,
    borderRadius: 4,
  },
  inactive: {
    width: 8,
    height: 8,
    backgroundColor: "rgba(31, 26, 18, 0.18)",
    borderRadius: 4,
  },
});

export default function FeatureTutorial({ tutorialId, steps, onComplete }: FeatureTutorialProps) {
  const { hasSeenTutorial, markTutorialSeen, isLoaded } = useTutorial();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (isLoaded && !hasSeenTutorial(tutorialId)) {
      setCurrentStep(0);
      try { flatListRef.current?.scrollToIndex({ index: 0, animated: false }); } catch {}
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, tutorialId, hasSeenTutorial]);

  const handleDismiss = useCallback(() => {
    markTutorialSeen(tutorialId);
    setVisible(false);
    onComplete?.();
  }, [tutorialId, markTutorialSeen, onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      handleDismiss();
    }
  }, [currentStep, steps.length, handleDismiss]);

  const handleSkip = useCallback(() => {
    handleDismiss();
  }, [handleDismiss]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentStep(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const isLastStep = currentStep === steps.length - 1;

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleSkip}>
      <View style={[modalStyles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <LinearGradient
          colors={[PathB.surface, SWEEP_LIGHT.backgroundSecondary, PathB.surface]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          entering={FadeIn.duration(400)}
          style={modalStyles.skipRow}
        >
          {!isLastStep && (
            <Pressable
              onPress={handleSkip}
              hitSlop={16}
              accessibilityLabel="Skip tutorial"
              accessibilityRole="button"
              style={({ pressed }) => [modalStyles.skipBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={[modalStyles.skipText, { fontFamily: "Inter_500Medium" }]}>
                Skip Tour
              </Text>
            </Pressable>
          )}
        </Animated.View>

        <FlatList
          ref={flatListRef}
          data={steps}
          renderItem={({ item, index }) => <StepPage step={item} index={index} />}
          keyExtractor={(_, i) => i.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEnabled
          bounces={false}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          style={modalStyles.list}
        />

        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={[modalStyles.bottomSection, { paddingBottom: Math.max(bottomPad, 16) + 8 }]}
        >
          {steps.length > 1 ? (
            <ProgressDots current={currentStep} total={steps.length} />
          ) : null}
          <View style={modalStyles.buttonRow}>
            {isLastStep ? (
              <Pressable
                onPress={handleDismiss}
                accessibilityLabel="Start exploring"
                accessibilityRole="button"
                style={({ pressed }) => [
                  modalStyles.primaryBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Text style={[modalStyles.primaryBtnText, { fontFamily: "Inter_700Bold" }]}>
                  Start Exploring
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            ) : (
              <Pressable
                onPress={handleNext}
                accessibilityLabel="Continue to next step"
                accessibilityRole="button"
                style={({ pressed }) => [
                  modalStyles.primaryBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Text style={[modalStyles.primaryBtnText, { fontFamily: "Inter_700Bold" }]}>
                  Continue
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            )}
          </View>
          {steps.length > 1 ? (
            <View style={modalStyles.stepCounter}>
              <Text style={[modalStyles.stepCounterText, { fontFamily: "Inter_400Regular" }]}>
                {currentStep + 1} of {steps.length}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  skipRow: {
    alignItems: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 8,
    minHeight: 44,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SWEEP_LIGHT.border,
  },
  skipText: {
    color: HV2.inkMutedText,
    fontSize: 13,
  },
  list: {
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 28,
    gap: 20,
  },
  buttonRow: {
    alignItems: "center",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PathB.coral,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    gap: 10,
    width: "100%",
    maxWidth: 320,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
  },
  stepCounter: {
    alignItems: "center",
  },
  stepCounterText: {
    color: HV2.inkMutedText,
    fontSize: 12,
  },
});
