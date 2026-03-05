import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  withRepeat,
  FadeInDown,
  FadeIn,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";

const DONATION_PRESETS = [5, 10, 25, 50];

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

  const [selectedAmount, setSelectedAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  const handleDonate = useCallback(async () => {
    const amount = showCustom ? Math.max(1, parseInt(customAmount) || 5) : selectedAmount;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await onDonate(amount);
    setShowThankYou(true);
  }, [selectedAmount, customAmount, showCustom, onDonate]);

  const handleClose = useCallback(() => {
    setShowThankYou(false);
    setShowCustom(false);
    setCustomAmount("");
    setSelectedAmount(10);
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

            <Pressable style={ms.doneBtn} onPress={handleClose} testID="mission-done-btn">
              <Text style={ms.doneBtnText}>Continue Studying</Text>
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
              Our mission is to make deep Bible study available to every home. We don't believe in paywalls, but we do rely on partners. Would you consider a one-time donation of any amount to keep this tool running for everyone?
            </Text>

            <Text style={[ms.body, { color: theme.textMuted, marginTop: 4 }]}>
              If not, no worries -- enjoy the full experience on us.
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
  amountLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  presetRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  presetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 56,
    alignItems: "center",
  },
  presetText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  dollarSign: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  customInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    paddingVertical: 12,
    paddingLeft: 4,
  },
  donateBtn: {
    backgroundColor: "#C9933A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  donateBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
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
  doneBtn: {
    backgroundColor: "#C9933A",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    alignSelf: "stretch",
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
