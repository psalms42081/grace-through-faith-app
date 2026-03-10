import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

function haptic(style: "light" | "success" = "light") {
  if (Platform.OS === "web") return;
  if (style === "success") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

interface StoryCompletionFlowProps {
  memoryVerse: string;
  memoryVerseRef: string;
  prayerPrompt: string;
  storyTitle: string;
  onComplete: () => void;
  theme: any;
}

type FlowStep = "verse" | "prayer" | "reward";

function MemoryVerseStep({
  verse,
  verseRef,
  onNext,
  theme,
}: {
  verse: string;
  verseRef: string;
  onNext: () => void;
  theme: any;
}) {
  const words = verse.split(/\s+/);
  const [tappedWords, setTappedWords] = useState<Set<number>>(new Set());
  const [nextExpected, setNextExpected] = useState(0);
  const allTapped = nextExpected >= words.length;

  const handleWordTap = (idx: number) => {
    if (idx !== nextExpected) return;
    haptic("light");
    setTappedWords(prev => new Set([...prev, idx]));
    setNextExpected(idx + 1);

    if (idx === words.length - 1) {
      haptic("success");
      setTimeout(onNext, 1200);
    }
  };

  return (
    <Animated.View entering={FadeInDown.springify().damping(14)} style={cStyles.stepContainer}>
      <View style={cStyles.verseIconWrap}>
        <Ionicons name="book-outline" size={36} color="#FFD700" />
      </View>
      <Text style={[cStyles.stepTitle, { fontFamily: "Lora_700Bold" }]}>Memory Verse</Text>
      <Text style={[cStyles.verseRef, { fontFamily: "Inter_500Medium" }]}>{verseRef}</Text>

      {!allTapped && (
        <View style={cStyles.verseHintWrap}>
          <Ionicons name="hand-left-outline" size={18} color="#FFD700" />
          <Text style={[cStyles.verseHintText, { fontFamily: "Inter_600SemiBold" }]}>
            Tap each word in order
          </Text>
        </View>
      )}

      <View style={cStyles.wordGrid}>
        {words.map((word, i) => {
          const isTapped = tappedWords.has(i);
          const isNext = i === nextExpected;

          return (
            <Pressable key={i} onPress={() => handleWordTap(i)}>
              <Animated.View
                style={[
                  cStyles.wordChip,
                  {
                    backgroundColor: isTapped
                      ? "rgba(255,215,0,0.25)"
                      : isNext
                      ? "rgba(255,215,0,0.12)"
                      : "rgba(255,255,255,0.06)",
                    borderColor: isTapped
                      ? "#FFD700"
                      : isNext
                      ? "rgba(255,215,0,0.7)"
                      : "rgba(255,255,255,0.1)",
                    borderWidth: isNext ? 2 : 1.5,
                    transform: [{ scale: isNext ? 1.1 : 1 }],
                    shadowColor: isNext ? "#FFD700" : "transparent",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isNext ? 0.5 : 0,
                    shadowRadius: isNext ? 8 : 0,
                    elevation: isNext ? 4 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    cStyles.wordText,
                    {
                      color: isTapped ? "#FFD700" : isNext ? "#fff" : "rgba(255,255,255,0.45)",
                      fontFamily: isTapped || isNext ? "Inter_700Bold" : "Inter_500Medium",
                    },
                  ]}
                >
                  {word}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>

      {!allTapped && (
        <Text style={[cStyles.progressCounter, { fontFamily: "Inter_500Medium" }]}>
          {nextExpected} of {words.length} words
        </Text>
      )}

      {allTapped && (
        <Animated.View entering={FadeInUp.springify()} style={cStyles.starRow}>
          <Ionicons name="star" size={28} color="#FFD700" />
          <Text style={[cStyles.starText, { fontFamily: "Inter_600SemiBold" }]}>
            You memorized it!
          </Text>
          <Ionicons name="star" size={28} color="#FFD700" />
        </Animated.View>
      )}
    </Animated.View>
  );
}

function PrayerStep({
  prayer,
  onNext,
  theme,
}: {
  prayer: string;
  onNext: () => void;
  theme: any;
}) {
  const [prayed, setPrayed] = useState(false);
  const heartScale = useSharedValue(1);

  const heartAnim = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handlePray = () => {
    if (prayed) return;
    haptic("success");
    setPrayed(true);
    heartScale.value = withSequence(
      withSpring(1.5, { damping: 4, stiffness: 200 }),
      withSpring(1.2, { damping: 8 }),
      withSpring(1)
    );
    setTimeout(onNext, 1800);
  };

  return (
    <Animated.View entering={FadeInDown.springify().damping(14)} style={cStyles.stepContainer}>
      <Animated.View style={heartAnim}>
        <Text style={{ fontSize: 48 }}>🙏</Text>
      </Animated.View>
      <Text style={[cStyles.stepTitle, { fontFamily: "Lora_700Bold" }]}>Let's Pray</Text>

      <Text style={[cStyles.prayerText, { fontFamily: "Lora_400Regular" }]}>
        {prayer}
      </Text>

      {!prayed && (
        <Pressable onPress={handlePray} style={cStyles.prayButton}>
          <Animated.View style={heartAnim}>
            <Text style={{ fontSize: 32 }}>❤️</Text>
          </Animated.View>
          <Text style={[cStyles.prayButtonText, { fontFamily: "Inter_600SemiBold" }]}>
            Amen
          </Text>
        </Pressable>
      )}

      {prayed && (
        <Animated.View entering={FadeIn.duration(600)} style={cStyles.amenConfirm}>
          <Ionicons name="heart" size={24} color="#FF6B6B" />
          <Text style={[cStyles.amenText, { fontFamily: "Inter_600SemiBold" }]}>
            Amen
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function RewardStep({
  storyTitle,
  onComplete,
  theme,
}: {
  storyTitle: string;
  onComplete: () => void;
  theme: any;
}) {
  const badgeScale = useSharedValue(0);
  const starScale = useSharedValue(0);

  React.useEffect(() => {
    badgeScale.value = withDelay(300, withSpring(1, { damping: 6, stiffness: 150 }));
    starScale.value = withDelay(600, withSpring(1, { damping: 8, stiffness: 200 }));
    haptic("success");
  }, []);

  const badgeAnim = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));
  const starAnim = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(500)} style={cStyles.stepContainer}>
      <Animated.View style={badgeAnim}>
        <View style={cStyles.badgeCircle}>
          <Text style={{ fontSize: 56 }}>🛡️</Text>
        </View>
      </Animated.View>

      <Animated.View style={starAnim}>
        <View style={cStyles.starsRow}>
          <Ionicons name="star" size={20} color="#FFD700" />
          <Ionicons name="star" size={28} color="#FFD700" />
          <Ionicons name="star" size={20} color="#FFD700" />
        </View>
      </Animated.View>

      <Text style={[cStyles.rewardTitle, { fontFamily: "Lora_700Bold" }]}>
        Brave Heart Star
      </Text>
      <Text style={[cStyles.rewardSubtitle, { fontFamily: "Inter_500Medium" }]}>
        You learned how David trusted God!
      </Text>
      <Text style={[cStyles.pointsText, { fontFamily: "Inter_600SemiBold" }]}>
        +25 Seed Points
      </Text>

      <Animated.View entering={FadeInUp.delay(1000).springify()}>
        <Pressable
          onPress={onComplete}
          style={cStyles.doneButton}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={[cStyles.doneButtonText, { fontFamily: "Inter_700Bold" }]}>
            Done
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function StoryCompletionFlow({
  memoryVerse,
  memoryVerseRef,
  prayerPrompt,
  storyTitle,
  onComplete,
  theme,
}: StoryCompletionFlowProps) {
  const [step, setStep] = useState<FlowStep>("verse");

  return (
    <View style={cStyles.container}>
      <View style={cStyles.progressDots}>
        {(["verse", "prayer", "reward"] as FlowStep[]).map((s) => (
          <View
            key={s}
            style={[
              cStyles.dot,
              {
                backgroundColor: s === step ? "#FFD700" : "rgba(255,255,255,0.2)",
                width: s === step ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {step === "verse" && (
        <MemoryVerseStep
          verse={memoryVerse}
          verseRef={memoryVerseRef}
          onNext={() => setStep("prayer")}
          theme={theme}
        />
      )}
      {step === "prayer" && (
        <PrayerStep
          prayer={prayerPrompt}
          onNext={() => setStep("reward")}
          theme={theme}
        />
      )}
      {step === "reward" && (
        <RewardStep
          storyTitle={storyTitle}
          onComplete={onComplete}
          theme={theme}
        />
      )}
    </View>
  );
}

const cStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  progressDots: {
    flexDirection: "row",
    gap: 8,
    position: "absolute",
    top: 60,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  stepContainer: {
    alignItems: "center",
    gap: 16,
    maxWidth: 340,
    width: "100%",
  },
  verseIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,215,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: 24,
    color: "#fff",
    textAlign: "center",
  },
  verseRef: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  wordGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  wordChip: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  wordText: {
    fontSize: 18,
  },
  verseHintWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,215,0,0.1)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
    marginBottom: 4,
  },
  verseHintText: {
    fontSize: 16,
    color: "#FFD700",
  },
  progressCounter: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 6,
  },
  hintText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    marginTop: 8,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  starText: {
    fontSize: 16,
    color: "#FFD700",
  },
  prayerText: {
    fontSize: 18,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 28,
    marginVertical: 8,
  },
  prayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,107,107,0.2)",
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,107,107,0.4)",
    marginTop: 8,
  },
  prayButtonText: {
    fontSize: 18,
    color: "#fff",
  },
  amenConfirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  amenText: {
    fontSize: 16,
    color: "#FF6B6B",
  },
  badgeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,215,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.3)",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -4,
  },
  rewardTitle: {
    fontSize: 24,
    color: "#FFD700",
    textAlign: "center",
  },
  rewardSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  pointsText: {
    fontSize: 16,
    color: "#7ED321",
    marginTop: 4,
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C9933A",
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 16,
  },
  doneButtonText: {
    fontSize: 16,
    color: "#fff",
  },
});
