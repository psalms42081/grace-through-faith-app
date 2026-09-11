import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AIGeneratedLabel } from "@/components/AIGeneratedLabel";
import { D2, F } from "@/components/devotions-v2/tokens";

/** Hidden audit preview: an AI-generated reading-plan tile with the shared marker. */
export default function AiPlanTilePreview() {
  return (
    <View style={styles.page} testID="ai-plan-tile-preview">
      <View style={styles.libraryCard} testID="ai-plan-tile">
        <View style={[styles.libraryArt, { backgroundColor: "#E4E9F5" }]} />
        <View style={{ marginBottom: 6 }}>
          <AIGeneratedLabel />
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          Walking in the Light
        </Text>
        <Text style={styles.cardSub}>Spiritual Growth · 7 days</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: D2.surface,
    justifyContent: "center",
    padding: 24,
  },
  libraryCard: {
    width: "48%",
    maxWidth: 220,
    backgroundColor: D2.card,
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: D2.border,
    minHeight: 125,
  },
  libraryArt: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginBottom: 9,
  },
  cardTitle: {
    color: D2.ink,
    fontFamily: F.interSemi,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 3,
  },
  cardSub: {
    color: D2.muted,
    fontFamily: F.inter,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
});
