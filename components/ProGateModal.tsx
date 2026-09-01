import React from "react";
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
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { SWEEP_LIGHT } from "@/constants/light-sweep";

const SUPPORTER_BENEFITS = [
  { icon: "people-outline" as const, title: "Family Dashboard", desc: "Track your family's spiritual growth" },
  { icon: "school-outline" as const, title: "Study Guide", desc: "AI-guided inductive Bible study" },
  { icon: "layers-outline" as const, title: "Chapter Insights", desc: "Locations, timeline, figures & culture" },
  { icon: "map-outline" as const, title: "Visual Verse Mapper", desc: "Cross-references & original language" },
  { icon: "language-outline" as const, title: "Greek & Hebrew Deep Dive", desc: "Full Strong's word analysis" },
];

interface ProGateModalProps {
  visible: boolean;
  onClose: () => void;
  onStartTrial: () => void;
  isLoading?: boolean;
}

export default function ProGateModal({ visible, onClose }: ProGateModalProps) {
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

        <View style={[ms.card, { backgroundColor: PathB.surfaceCard }]}>
          <Pressable onPress={onClose} style={ms.closeBtn} testID="pro-modal-close">
            <Ionicons name="close" size={22} color={HV2.inkMutedText} />
          </Pressable>

          <View style={ms.iconWrap}>
            <Ionicons name="heart-circle" size={32} color={PathB.ink} />
          </View>

          <Text style={[ms.title, { color: PathB.ink, fontFamily: "Lora_700Bold" }]}>
            Beta Preview
          </Text>
          <Text style={[ms.subtitle, { color: HV2.inkMutedText, fontFamily: "Inter_400Regular" }]}>
            These features are currently in beta and available free to all users. We're working to make deep Bible study accessible to every home.
          </Text>

          <View style={ms.benefitsList}>
            {SUPPORTER_BENEFITS.map((b) => (
              <View key={b.title} style={ms.benefitRow}>
                <View style={[ms.benefitIcon, { backgroundColor: "rgba(31,26,18,0.08)" }]}>
                  <Ionicons name={b.icon} size={18} color={PathB.ink} />
                </View>
                <View style={ms.benefitText}>
                  <Text style={[ms.benefitTitle, { color: PathB.ink, fontFamily: "Inter_600SemiBold" }]}>
                    {b.title}
                  </Text>
                  <Text style={[ms.benefitDesc, { color: HV2.inkMutedText, fontFamily: "Inter_400Regular" }]}>
                    {b.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={[ms.comingSoonBox, { backgroundColor: SWEEP_LIGHT.backgroundSecondary, borderColor: SWEEP_LIGHT.border }]}>
            <Ionicons name="time-outline" size={18} color={HV2.inkMutedText} />
            <Text style={{ fontSize: 13, color: HV2.inkMutedText, fontFamily: "Inter_500Medium", textAlign: "center", flex: 1 }}>
              Everything is free during beta. Donation support is coming soon.
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [ms.dismissBtn, { backgroundColor: PathB.coral, opacity: pressed ? 0.85 : 1 }]}
            testID="supporter-continue-btn"
          >
            <Text style={[ms.dismissText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
              Continue Studying
            </Text>
          </Pressable>
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
    backgroundColor: "rgba(31,26,18,0.08)",
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
    marginBottom: 24,
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
  comingSoonBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    width: "100%",
  },
  dismissBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: 14,
  },
  dismissText: {
    fontSize: 15,
  },
});
