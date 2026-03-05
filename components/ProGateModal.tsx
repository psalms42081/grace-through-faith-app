import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

const PRO_BENEFITS = [
  { icon: "school-outline" as const, title: "Socratic Study Guide", desc: "AI-guided inductive Bible study" },
  { icon: "layers-outline" as const, title: "Chapter Insights", desc: "Locations, timeline, figures & culture" },
  { icon: "map-outline" as const, title: "Visual Verse Mapper", desc: "Cross-references & original language" },
  { icon: "language-outline" as const, title: "Greek & Hebrew Deep Dive", desc: "Full Strong's word analysis" },
  { icon: "share-social-outline" as const, title: "Share Insight Cards", desc: "Premium shareable study cards" },
  { icon: "cloud-offline-outline" as const, title: "Offline Deep Study", desc: "Cache all study data locally" },
];

interface ProGateModalProps {
  visible: boolean;
  onClose: () => void;
  onStartTrial: () => void;
  isLoading?: boolean;
}

export default function ProGateModal({ visible, onClose, onStartTrial, isLoading }: ProGateModalProps) {
  const { theme, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={ms.overlay}>
        {Platform.OS !== "web" ? (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.7)" }]} />
        )}

        <View style={[ms.card, { backgroundColor: isDark ? "#111116" : "#FFFDF6" }]}>
          <Pressable onPress={onClose} style={ms.closeBtn} testID="pro-modal-close">
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </Pressable>

          <View style={ms.iconWrap}>
            <Ionicons name="diamond" size={32} color="#C9933A" />
          </View>

          <Text style={[ms.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Unlock Deep Study
          </Text>
          <Text style={[ms.subtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Go deeper with Pro features designed for serious Bible students
          </Text>

          <View style={ms.benefitsList}>
            {PRO_BENEFITS.map((b) => (
              <View key={b.title} style={ms.benefitRow}>
                <View style={[ms.benefitIcon, { backgroundColor: "rgba(201,147,58,0.1)" }]}>
                  <Ionicons name={b.icon} size={18} color="#C9933A" />
                </View>
                <View style={ms.benefitText}>
                  <Text style={[ms.benefitTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {b.title}
                  </Text>
                  <Text style={[ms.benefitDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {b.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable
            onPress={onStartTrial}
            disabled={isLoading}
            style={({ pressed }) => [ms.trialBtn, { opacity: pressed ? 0.85 : 1 }]}
            testID="start-trial-btn"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[ms.trialBtnText, { fontFamily: "Inter_700Bold" }]}>
                Start 7-Day Trial
              </Text>
            )}
          </Pressable>

          <Text style={[ms.terms, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Free for 7 days, then $4.99/month
          </Text>
        </View>
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
    maxWidth: 380,
    borderRadius: 24,
    padding: 28,
    paddingTop: 40,
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(201,147,58,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  benefitsList: {
    width: "100%",
    gap: 12,
    marginBottom: 28,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
  },
  benefitDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  trialBtn: {
    width: "100%",
    backgroundColor: "#C9933A",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  trialBtnText: {
    color: "#fff",
    fontSize: 16,
  },
  terms: {
    fontSize: 12,
    textAlign: "center",
  },
});
