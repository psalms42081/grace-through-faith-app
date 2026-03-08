import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";

function GoldSparkle({ index }: { index: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    const delay = index * 100 + Math.random() * 300;
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 800 })
    ));
    translateY.value = withDelay(delay, withTiming(-60 - Math.random() * 80, { duration: 1100 }));
    scale.value = withDelay(delay, withSequence(
      withTiming(1 + Math.random() * 0.5, { duration: 400 }),
      withTiming(0, { duration: 700 })
    ));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: (index - 5) * 20 + Math.random() * 10 },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[sparkStyles.particle, animStyle]}>
      <Ionicons name="star" size={14 + Math.random() * 8} color="#C9933A" />
    </Animated.View>
  );
}

const sparkStyles = StyleSheet.create({
  particle: { position: "absolute", bottom: "50%" },
});

interface MissionInviteModalProps {
  visible: boolean;
  onClose: () => void;
  onDonate: (amount: number) => Promise<void>;
  isDonating: boolean;
}

export default function MissionInviteModal({
  visible,
  onClose,
  onDonate,
  isDonating,
}: MissionInviteModalProps) {
  const { theme, isDark } = useTheme();
  const [showThankYou, setShowThankYou] = useState(false);

  const handleDonate = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await onDonate(0);
    setShowThankYou(true);
  }, [onDonate]);

  const handleClose = useCallback(() => {
    setShowThankYou(false);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={ms.overlay}>
        {Platform.OS !== "web" ? (
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.75)" }]} />
        )}

        {showThankYou ? (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={[ms.card, { backgroundColor: isDark ? "#111116" : "#FFFDF6", alignItems: "center" }]}
          >
            <View style={ms.sparkleContainer}>
              {Array.from({ length: 12 }).map((_, i) => (
                <GoldSparkle key={i} index={i} />
              ))}
            </View>

            <View style={ms.thankIconWrap}>
              <Ionicons name="heart" size={40} color="#C9933A" />
            </View>

            <Text style={[ms.thankTitle, { color: theme.text }]}>
              Thank You, Partner
            </Text>
            <Text style={[ms.thankSubtitle, { color: theme.textSecondary }]}>
              Your generosity keeps deep Bible study available to every home. You are now a Mission Partner.
            </Text>

            <View style={[ms.patronBadge, { borderColor: "#C9933A" }]}>
              <Ionicons name="shield-checkmark" size={20} color="#C9933A" />
              <Text style={[ms.patronBadgeText, { color: "#C9933A" }]}>
                Mission Partner
              </Text>
            </View>

            <Pressable style={ms.primaryBtn} onPress={handleClose} testID="mission-done-btn">
              <Text style={ms.primaryBtnText}>Continue Studying</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            style={[ms.card, { backgroundColor: isDark ? "#111116" : "#FFFDF6" }]}
          >
            <Pressable onPress={handleClose} style={ms.closeBtn} testID="mission-close-btn">
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>

            <View style={ms.iconWrap}>
              <Ionicons name="heart-circle" size={36} color="#C9933A" />
            </View>

            <Text style={[ms.title, { color: theme.text }]}>
              You're Diving Deep
            </Text>

            <Text style={[ms.body, { color: theme.textSecondary }]}>
              Our mission is to make deep Bible study available to every home.
            </Text>

            <Text style={[ms.body, { color: theme.textSecondary, marginTop: 10 }]}>
              This app stays free because people choose to support it. Your support helps bring Scripture, study tools, and discipleship resources to families around the world.
            </Text>

            <View style={[ms.impactRow, { backgroundColor: isDark ? "#1A1A24" : "#F0EBE0" }]}>
              <Ionicons name="people-outline" size={18} color={theme.accent} />
              <Text style={[ms.impactText, { color: theme.textSecondary }]}>
                Helping families grow in Scripture every day.
              </Text>
            </View>

            <Text style={[ms.closingLine, { color: theme.textMuted }]}>
              If you'd like to be part of that mission, you can contribute any amount.
            </Text>

            <View style={[ms.comingSoonBox, { backgroundColor: isDark ? "#1A1A24" : "#F0EBE0", borderColor: theme.border }]}>
              <Ionicons name="time-outline" size={20} color={theme.accent} />
              <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Inter_500Medium", textAlign: "center" }}>
                Donations will be available soon. For now, enjoy the full experience on us.
              </Text>
            </View>

            <Pressable
              style={ms.dismissBtn}
              onPress={handleClose}
              testID="mission-dismiss-btn"
            >
              <Text style={[ms.dismissText, { color: theme.accent }]}>
                Continue Studying
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    paddingTop: 40,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(201,147,58,0.12)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Lora_700Bold",
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 4,
  },
  impactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 12,
    alignSelf: "center",
  },
  impactText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
  },
  closingLine: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  comingSoonBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  primaryBtn: {
    backgroundColor: "#C9933A",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    alignSelf: "stretch",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  dismissBtn: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 8,
  },
  dismissText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textDecorationLine: "underline" as const,
  },
  sparkleContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thankIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(201,147,58,0.15)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  thankTitle: {
    fontSize: 24,
    fontFamily: "Lora_700Bold",
    textAlign: "center",
    marginBottom: 12,
  },
  thankSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  patronBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  patronBadgeText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
