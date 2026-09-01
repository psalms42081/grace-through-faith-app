import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors, { PathB } from "@/constants/colors";

const SABBATH_GOLD = "#D4A245"; // sun glyph only

interface SabbathBannerProps {
  theme: typeof Colors.dark;
}

export default function SabbathBanner({ theme }: SabbathBannerProps) {
  return (
    <Pressable
      onPress={() => router.push("/sabbath-experience" as any)}
      style={{
        backgroundColor: theme.backgroundCard,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}
      testID="sabbath-banner"
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: SABBATH_GOLD + "20",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Ionicons name="sunny" size={20} color={SABBATH_GOLD} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            color: theme.text,
            fontFamily: "Lora_600SemiBold",
            fontSize: 15,
          }}>
            Sabbath has begun. Enter sacred time.
          </Text>
        </View>
      </View>
      <View style={{
        backgroundColor: PathB.coral,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: "center",
        marginTop: 12,
      }}>
        <Text style={{
          color: "#fff",
          fontFamily: "Inter_600SemiBold",
          fontSize: 14,
        }}>
          Enter Sabbath
        </Text>
      </View>
    </Pressable>
  );
}
