import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, Platform } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/contexts/ToastContext";
import { usePioneer } from "@/contexts/PioneerContext";
import { PIONEERS } from "@/constants/pioneers";

const BG = "#050507";
const GOLD = "#C9933A";
const INACTIVE_BG = "rgba(255,255,255,0.04)";
const INACTIVE_BORDER = "rgba(255,255,255,0.08)";
const ACTIVE_BG = "rgba(201,147,58,0.08)";
const NARRATOR_VOICE_KEY = "@grace-through-faith/tts-voice";

const PIONEER_META: Record<string, { initials: string; descriptor: string }> = {
  "ellen-white": { initials: "EW", descriptor: "Prophet & Author" },
  "james-white": { initials: "JW", descriptor: "Co-founder & Pastor" },
  "joseph-bates": { initials: "JB", descriptor: "Sabbath Advocate" },
  "uriah-smith": { initials: "US", descriptor: "Prophecy Scholar" },
  "jn-andrews": { initials: "JA", descriptor: "First SDA Missionary" },
};

type SelectorPioneer = {
  id: string;
  name: string;
  years: string;
  descriptor: string;
  initials: string;
};

export default function PioneerSelectorScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { selectedPioneer, selectPioneer } = usePioneer();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 28 : insets.bottom;

  const rows = useMemo<SelectorPioneer[]>(
    () =>
      PIONEERS.map((p) => {
        const meta = PIONEER_META[p.id] || {
          initials: p.shortName.slice(0, 2).toUpperCase(),
          descriptor: p.role,
        };
        return {
          id: p.id,
          name: p.name.replace("G. ", "").replace("Springer ", "").replace("John Nevins ", "J.N. "),
          years: p.era.replace("-", "–"),
          descriptor: meta.descriptor,
          initials: meta.initials,
        };
      }),
    []
  );

  const activeId = selectedPioneer?.id || "ellen-white";

  const onSelect = async (pioneerId: string) => {
    selectPioneer(pioneerId);
    const pioneer = PIONEERS.find((p) => p.id === pioneerId);
    if (pioneer?.voiceKey) {
      await AsyncStorage.setItem(NARRATOR_VOICE_KEY, pioneer.voiceKey);
    }
    showToast("Guide updated", "info");
    router.back();
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Choose Your Guide</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Your pioneer will narrate SDA study content
      </Text>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnRow}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad + 24 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const active = item.id === activeId;
          return (
            <Pressable
              onPress={() => onSelect(item.id)}
              style={({ pressed }) => [
                styles.card,
                active ? styles.cardActive : styles.cardInactive,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{item.initials}</Text>
              </View>

              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.years} numberOfLines={1}>
                {item.years}
              </Text>
              <Text style={styles.descriptor} numberOfLines={1}>
                {item.descriptor}
              </Text>

              {active && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={12} color="#050507" />
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: "#F0EBE0",
    fontFamily: "Lora_700Bold",
    fontSize: 22,
    letterSpacing: 0.1,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  columnRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    width: "48.5%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    position: "relative",
  },
  cardActive: {
    borderColor: GOLD,
    borderWidth: 2,
    backgroundColor: ACTIVE_BG,
  },
  cardInactive: {
    borderColor: INACTIVE_BORDER,
    borderWidth: 1,
    backgroundColor: INACTIVE_BG,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarText: {
    color: "#050507",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  name: {
    color: "#F0EBE0",
    fontFamily: "Lora_700Bold",
    fontSize: 15,
    lineHeight: 20,
  },
  years: {
    color: "rgba(255,255,255,0.62)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  descriptor: {
    color: "rgba(255,255,255,0.82)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 6,
  },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
});
