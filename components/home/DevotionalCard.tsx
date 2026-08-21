import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

const STUDY_GUIDE_IMAGE = require("@/assets/home-cards/study-guide.png");

interface DevotionalCardProps {
  hasActivePlan: boolean;
  progress: number;
  total: number;
  enrollmentPlanId?: string;
  theme: typeof Colors.dark;
  isDark: boolean;
}

export default function DevotionalCard({ hasActivePlan, progress, total, enrollmentPlanId, theme, isDark }: DevotionalCardProps) {
  return (
    <Pressable
      onPress={() => {
        if (hasActivePlan && enrollmentPlanId) {
          router.push(`/devotional-day?planId=${enrollmentPlanId}`);
        } else if (hasActivePlan) {
          router.push("/devotional-day");
        } else {
          router.push("/devotions" as any);
        }
      }}
      style={({ pressed }) => [
        styles.card,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={hasActivePlan ? "Continue your devotional plan" : "Browse devotional plans"}
    >
      <Image source={STUDY_GUIDE_IMAGE} style={styles.cardImage} resizeMode="cover" />
      <LinearGradient
        colors={["rgba(5,5,7,0.15)", "rgba(5,5,7,0.45)", "rgba(5,5,7,0.74)"]}
        locations={[0, 0.45, 1]}
        style={styles.cardOverlay}
      >
        <View style={styles.cardContent}>
          <View style={styles.labelRow}>
            <Ionicons name="book" size={14} color="#C9933A" />
            <Text style={[styles.labelText, { fontFamily: "Inter_500Medium" }]}>
              {hasActivePlan ? "Your Plan" : "Devotional Plans"}
            </Text>
          </View>
          <Text style={[styles.cardTitle, { fontFamily: "Lora_700Bold" }]}>
            {hasActivePlan ? "Continue Your Plan" : "Daily Reading & Reflection"}
          </Text>
          <Text style={[styles.cardSub, { fontFamily: "Inter_400Regular" }]}>
            {hasActivePlan
              ? `Day ${progress} of ${total}`
              : "Guided devotional journeys through Scripture"}
          </Text>
          {hasActivePlan ? (
            <View style={styles.progressSection}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${total > 0 ? Math.min((progress / total) * 100, 100) : 0}%` as any }]} />
              </View>
              <Text style={[styles.progressPct, { fontFamily: "Inter_600SemiBold" }]}>
                {total > 0 ? Math.round((progress / total) * 100) : 0}%
              </Text>
            </View>
          ) : (
            <View style={styles.ctaRow}>
              <LinearGradient
                colors={["#C9933A", "#A87828"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButton}
              >
                <Text style={[styles.ctaText, { fontFamily: "Inter_600SemiBold" }]}>Explore</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </LinearGradient>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 4,
    marginBottom: 20,
    height: 180,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 22,
  },
  cardContent: {
    gap: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  labelText: {
    fontSize: 11,
    color: "#C9933A",
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  cardTitle: {
    color: "#F5F0E8",
    fontSize: 20,
  },
  cardSub: {
    color: "rgba(245,240,232,0.5)",
    fontSize: 13,
    marginBottom: 4,
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C9933A",
  },
  progressPct: {
    color: "#C9933A",
    fontSize: 13,
  },
  ctaRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctaText: {
    color: "#fff",
    fontSize: 13,
  },
});
