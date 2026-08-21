import React from "react";
import { View, Text, StyleSheet, ImageBackground, ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface VerseOfTheDayProps {
  verse: { text: string; reference: string };
  bgImage: string;
  bookImage?: ImageSourcePropType | null;
  /** The translation label to display (e.g. "KJV", "ASV"). If omitted, no label is shown. */
  translation?: string;
}

export default function VerseOfTheDay({ verse, bgImage, bookImage, translation }: VerseOfTheDayProps) {
  const imageSource = bookImage || { uri: bgImage };
  return (
    <View style={styles.verseCardWrap}>
      <ImageBackground
        source={imageSource}
        style={styles.verseImageBg}
        imageStyle={styles.verseImageStyle}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.06)", "rgba(0,0,0,0.40)", "rgba(0,0,0,0.68)"]}
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
              {translation ? (
                <Text style={[styles.verseTrans, { fontFamily: "Inter_400Regular" }]}>{translation}</Text>
              ) : null}
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  verseCardWrap: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
  },
  verseImageBg: {
    width: "100%",
    minHeight: 220,
  },
  verseImageStyle: {
    borderRadius: 18,
  },
  verseOverlay: {
    flex: 1,
    padding: 20,
    paddingTop: 22,
    justifyContent: "flex-end",
    minHeight: 220,
  },
  verseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  verseBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#C9933A",
  },
  verseBadgeText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  verseText: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 27,
    marginBottom: 14,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  verseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  verseRef: { color: "#C9933A", fontSize: 15, marginBottom: 2 },
  verseTrans: { color: "rgba(255,255,255,0.5)", fontSize: 10 },
});
