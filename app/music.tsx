import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { getSpeakerColor, getSpeakerInitials } from "@/constants/speakers";
import { MUSIC_CATEGORIES } from "@/data/music";

export default function MusicScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const shuffledCategories = useMemo(() => {
    return MUSIC_CATEGORIES.map(cat => ({
      ...cat,
      items: [...cat.items].sort(() => Math.random() - 0.5),
    }));
  }, []);

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.text,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#C9933A", "#8B6914"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Ionicons name="musical-notes" size={44} color="rgba(255,255,255,0.9)" />
          <Text style={[styles.heroTitle, { fontFamily: "Lora_700Bold" }]}>Christian Music</Text>
          <Text style={[styles.heroDesc, { fontFamily: "Inter_400Regular" }]}>
            Worship, hymns, gospel, and more to fill your heart with praise
          </Text>
        </LinearGradient>

        {shuffledCategories.map((category, catIdx) => (
          <View key={catIdx} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <LinearGradient
                colors={category.gradient}
                style={styles.categoryIconWrap}
              >
                <Ionicons name={category.icon} size={18} color="#fff" />
              </LinearGradient>
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                  {category.title}
                </Text>
                <Text style={[styles.categoryDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {category.description}
                </Text>
              </View>
            </View>

            {category.items.map((item, idx) => {
              const avatarColor = getSpeakerColor(item.artist);
              const avatarInitials = getSpeakerInitials(item.artist);
              return (
                <Pressable
                  key={idx}
                  onPress={() => openLink(item.url)}
                  style={({ pressed }) => [
                    styles.musicItem,
                    { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View style={[styles.artistAvatar, { backgroundColor: avatarColor }]}>
                    <Text style={[styles.artistInitials, { fontFamily: "Inter_700Bold" }]}>{avatarInitials}</Text>
                  </View>
                  <View style={styles.musicItemInfo}>
                    <Text style={[styles.musicItemTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.musicItemArtist, { color: theme.accent, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                      {item.artist}
                    </Text>
                    <Text style={[styles.musicItemDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={16} color={theme.textMuted} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    marginHorizontal: 22,
    marginTop: 8,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  heroTitle: { color: "#fff", fontSize: 28 },
  heroDesc: { color: "rgba(255,255,255,0.85)", fontSize: 15, lineHeight: 22, textAlign: "center" },
  categorySection: {
    paddingHorizontal: 22,
    marginTop: 28,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryInfo: { flex: 1 },
  categoryTitle: { fontSize: 20, marginBottom: 2 },
  categoryDesc: { fontSize: 12 },
  musicItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  artistAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  artistInitials: {
    color: "#fff",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  musicItemInfo: { flex: 1 },
  musicItemTitle: { fontSize: 15, marginBottom: 1 },
  musicItemArtist: { fontSize: 12, marginBottom: 2 },
  musicItemDesc: { fontSize: 11 },
});
