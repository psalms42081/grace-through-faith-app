import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioContext } from "@/contexts/AudioContext";
import { useTheme } from "@/hooks/useTheme";

export default function MiniPlayer() {
  const { isActive, isSpeaking, isPaused, sessionInfo, play, pause, stop } = useAudioContext();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const isOnChapterReader = pathname.startsWith("/read/") && pathname.split("/").length >= 4;

  if (!isActive || !sessionInfo || isOnChapterReader) return null;

  const handleTap = () => {
    router.push(
      `/read/${sessionInfo.bookId}/${sessionInfo.chapter}?translation=${sessionInfo.translation}`
    );
  };

  const bottomOffset = Platform.OS === "web" ? 84 + 34 : 84 + insets.bottom;

  return (
    <View style={[
      styles.container,
      {
        bottom: bottomOffset,
        backgroundColor: isDark ? "#1C1D22" : "#FFFDF6",
        borderColor: isDark ? "#2A2B30" : "#DDD0B8",
      },
    ]}>
      <Pressable style={styles.content} onPress={handleTap}>
        <View style={styles.left}>
          <View style={[styles.iconBg, { backgroundColor: theme.accent + "20" }]}>
            <Ionicons
              name={isSpeaking ? "volume-high" : "pause"}
              size={16}
              color={theme.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text
              style={[styles.title, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
              numberOfLines={1}
            >
              {sessionInfo.bookName} {sessionInfo.chapter}
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}
              numberOfLines={1}
            >
              {isSpeaking ? "Playing" : "Paused"} · {sessionInfo.translation}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (isSpeaking) {
                pause();
              } else {
                play();
              }
            }}
            hitSlop={8}
            style={[styles.playBtn, { backgroundColor: theme.accent }]}
          >
            <Ionicons
              name={isSpeaking ? "pause" : "play"}
              size={14}
              color="#fff"
            />
          </Pressable>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              stop();
            }}
            hitSlop={8}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={18} color={theme.textMuted} />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 8,
    right: 8,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
