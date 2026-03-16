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
          router.push("/devotionals");
        }
      }}
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={hasActivePlan ? "Continue your devotional plan" : "Browse devotional plans"}
    >
      <Image source={STUDY_GUIDE_IMAGE} style={styles.cardImage} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.82)"]}
        locations={[0, 0.4, 1]}
        style={styles.cardOverlay}
      >
        <View style={styles.cardContent}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardLabel, { fontFamily: "Inter_600SemiBold" }]}>
              {hasActivePlan ? "Continue Your Plan" : "Devotional Plans"}
            </Text>
            <Text style={[styles.cardSub, { fontFamily: "Inter_400Regular" }]}>
              {hasActivePlan
                ? `Day ${progress} of ${total}`
                : "Guided daily reading and reflection"}
            </Text>
          </View>
          {hasActivePlan ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${total > 0 ? Math.min((progress / total) * 100, 100) : 0}%` as any, backgroundColor: theme.accent }]} />
              </View>
              <Text style={[styles.progressPct, { fontFamily: "Inter_600SemiBold" }]}>
                {total > 0 ? Math.round((progress / total) * 100) : 0}%
              </Text>
            </View>
          ) : (
            <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" />
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
    marginBottom: 20,
    height: 100,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 8,
  },
  cardLabel: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 2,
  },
  cardSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  progressWrap: {
    alignItems: "center",
    gap: 4,
    marginLeft: 12,
  },
  progressTrack: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  progressPct: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
  },
});
