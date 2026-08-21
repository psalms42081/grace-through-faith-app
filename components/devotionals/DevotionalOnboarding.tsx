import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import OnboardingCategoryCard from "./OnboardingCategoryCard";
import OnboardingPlanCard from "./OnboardingPlanCard";

type Category = "foundations" | "thematic" | "prophetic";

interface PlanItem {
  id: string;
  title: string;
  description: string | null;
  totalDays: number;
  category: string | null;
}

const CATEGORIES: {
  key: Category;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  {
    key: "foundations",
    label: "Foundations",
    description: "Core biblical truths for new and returning believers",
    icon: "compass-outline",
    color: "#D4A245",
  },
  {
    key: "thematic",
    label: "Thematic Study",
    description: "Go deep on one topic: faith, prayer, prophecy, hope",
    icon: "layers-outline",
    color: "#5B86E5",
  },
  {
    key: "prophetic",
    label: "Prophetic",
    description: "Daniel, Revelation, and the Adventist understanding of history",
    icon: "telescope-outline",
    color: "#7C3AED",
  },
];

interface DevotionalOnboardingProps {
  plans: PlanItem[];
  theme: typeof Colors.dark;
  onComplete: (planId: string) => void;
  onSkip: () => void;
}

export default function DevotionalOnboarding({
  plans,
  theme,
  onComplete,
  onSkip,
}: DevotionalOnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [enrollingPlanId, setEnrollingPlanId] = useState<string | null>(null);
  const [enrolledPlanTitle, setEnrolledPlanTitle] = useState("");

  const fadeIn = useSharedValue(0);
  const slideY = useSharedValue(20);

  const confirmScale = useSharedValue(1);
  const confirmOpacity = useSharedValue(0);

  useEffect(() => {
    fadeIn.value = 0;
    slideY.value = 20;
    fadeIn.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    slideY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
  }, [step, fadeIn, slideY]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: slideY.value }],
  }));

  const confirmStyle = useAnimatedStyle(() => ({
    opacity: confirmOpacity.value,
    transform: [{ scale: confirmScale.value }],
  }));

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setStep(2);
  };

  const handleEnroll = async (planId: string, planTitle: string) => {
    setEnrollingPlanId(planId);
    setEnrolledPlanTitle(planTitle);
    setStep(3);

    confirmScale.value = 0.95;
    confirmOpacity.value = 0;
    confirmScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    confirmOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });

    setTimeout(() => {
      onComplete(planId);
    }, 1400);
  };

  const filteredPlans = selectedCategory
    ? plans.filter(p => p.category === selectedCategory).slice(0, 3)
    : [];

  if (step === 3) {
    return (
      <Animated.View style={[styles.confirmWrap, confirmStyle]}>
        <View style={[styles.confirmCard, { backgroundColor: theme.accent + "12", borderColor: theme.accent + "30" }]}>
          <View style={[styles.checkCircle, { backgroundColor: theme.accent }]}>
            <Ionicons name="checkmark" size={28} color="#fff" />
          </View>
          <Text style={[styles.confirmTitle, { color: theme.text }]}>
            {enrolledPlanTitle}
          </Text>
          <Text style={[styles.confirmSub, { color: theme.textSecondary }]}>
            You're enrolled — Day 1 starts today
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={contentStyle}>
      {step === 1 && (
        <View>
          <View style={styles.headerWrap}>
            <View style={[styles.heroIcon, { backgroundColor: theme.accent + "15" }]}>
              <Ionicons name="sparkles" size={24} color={theme.accent} />
            </View>
            <Text style={[styles.heading, { color: theme.text }]}>
              What would you like to focus on?
            </Text>
            <Text style={[styles.subheading, { color: theme.textSecondary }]}>
              We'll suggest a plan to get you started.
            </Text>
          </View>
          {CATEGORIES.map(cat => (
            <OnboardingCategoryCard
              key={cat.key}
              icon={cat.icon}
              label={cat.label}
              description={cat.description}
              color={cat.color}
              theme={theme}
              onPress={() => handleCategorySelect(cat.key)}
            />
          ))}
        </View>
      )}

      {step === 2 && (
        <View>
          <Pressable
            onPress={() => setStep(1)}
            style={styles.backRow}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
          </Pressable>
          <Text style={[styles.step2Heading, { color: theme.text }]}>
            Pick a plan to start
          </Text>
          {filteredPlans.map(plan => (
            <OnboardingPlanCard
              key={plan.id}
              title={plan.title}
              description={plan.description}
              totalDays={plan.totalDays}
              theme={theme}
              enrolling={enrollingPlanId === plan.id}
              onEnroll={() => handleEnroll(plan.id, plan.title)}
            />
          ))}
          {filteredPlans.length === 0 && (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              No plans found for this category yet.
            </Text>
          )}
        </View>
      )}

      <Pressable onPress={onSkip} style={styles.skipWrap} hitSlop={8}>
        <Text style={[styles.skipText, { color: theme.textMuted }]}>
          Skip for now
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontFamily: "Lora_700Bold",
    textAlign: "center",
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  step2Heading: {
    fontSize: 18,
    fontFamily: "Lora_700Bold",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 20,
  },
  skipWrap: {
    alignSelf: "flex-end",
    paddingVertical: 12,
    marginTop: 8,
  },
  skipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "underline",
  },
  confirmWrap: {
    alignItems: "center",
    paddingTop: 40,
  },
  confirmCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    gap: 12,
    width: "100%",
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: "Lora_700Bold",
    textAlign: "center",
  },
  confirmSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
