import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ImageSourcePropType,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

interface VotdHeroCardProps {
  verse: { text: string; reference: string };
  bgImage?: string;
  bookImage?: ImageSourcePropType | null;
  onPress?: () => void;
}

export default function VotdHeroCard({ verse, bgImage, bookImage, onPress }: VotdHeroCardProps) {
  const imageSource = bookImage || (bgImage ? { uri: bgImage } : undefined);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.wrapper, pressed && { opacity: 0.95 }]}>
      <ImageBackground
        source={imageSource}
        style={s.imageBg}
        imageStyle={s.imageStyle}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.75)"]}
          locations={[0, 0.5, 1]}
          style={s.overlay}
        >
          <Text style={[s.label, { fontFamily: "Inter_600SemiBold" }]}>VERSE OF THE DAY</Text>
          <Text style={[s.reference, { fontFamily: "Lora_600SemiBold" }]}>{verse.reference}</Text>
          <Text style={[s.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>{verse.text}</Text>
          <View style={s.engagementRow}>
            {ACTIONS.map((a) => (
              <View key={a.label} style={s.engageItem}>
                <Ionicons name={a.icon as any} size={18} color="rgba(255,255,255,0.8)" />
                <Text style={[s.engageLabel, { fontFamily: "Inter_400Regular" }]}>{a.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

const ACTIONS = [
  { icon: "heart-outline", label: "Like" },
  { icon: "chatbubble-outline", label: "Reflect" },
  { icon: "share-outline", label: "Share" },
  { icon: "ellipsis-horizontal", label: "More" },
];

const s = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  imageBg: {
    width: "100%",
    height: 280,
  },
  imageStyle: {
    borderRadius: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  label: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  reference: {
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 6,
  },
  verseText: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 30,
    marginBottom: 16,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  engagementRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
    paddingTop: 10,
  },
  engageItem: {
    alignItems: "center",
    gap: 2,
  },
  engageLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
});
