import React from "react";
import { View, Text, StyleSheet, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface VerseOfTheDayProps {
  verse: { text: string; reference: string };
  bgImage: string;
}

export default function VerseOfTheDay({ verse, bgImage }: VerseOfTheDayProps) {
  return (
    <View style={styles.verseCardWrap}>
      <ImageBackground
        source={{ uri: bgImage }}
        style={styles.verseImageBg}
        imageStyle={styles.verseImageStyle}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.85)"]}
          style={styles.verseOverlay}
        >
          <View style={styles.verseBadge}>
            <View style={styles.verseBadgeDot} />
            <Text style={[styles.verseBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
              Verse of the Day
            </Text>
          </View>

          <Text style={[styles.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
            {"\u201C"}{verse.text}{"\u201D"}
          </Text>

          <View style={styles.verseFooter}>
            <View>
              <Text style={[styles.verseRef, { fontFamily: "Lora_600SemiBold" }]}>
                {verse.reference}
              </Text>
              <Text style={[styles.verseTrans, { fontFamily: "Inter_400Regular" }]}>KJV</Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  verseCardWrap: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 16,
  },
  verseImageBg: {
    width: "100%",
    minHeight: 280,
  },
  verseImageStyle: {
    borderRadius: 22,
  },
  verseOverlay: {
    flex: 1,
    padding: 24,
    paddingTop: 28,
    justifyContent: "flex-end",
    minHeight: 280,
  },
  verseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  verseBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C9933A",
  },
  verseBadgeText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  verseText: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 32,
    marginBottom: 20,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  verseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  verseRef: { color: "#C9933A", fontSize: 16, marginBottom: 2 },
  verseTrans: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
});
