import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useTheme } from "@/hooks/useTheme";
import { RADIO_STATIONS, RADIO_CATEGORIES, type RadioStation } from "@/data/radio-stations";

export default function MusicScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [activeStation, setActiveStation] = useState<RadioStation | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);

  const activeStationId = activeStation?.id;
  const player = useAudioPlayer(activeStation?.streamUrl ?? "");
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;

  useEffect(() => {
    if (activeStationId) {
      setIsBuffering(true);
      setPlayError(null);
      try {
        player.play();
      } catch {
        setPlayError("Unable to connect to this station");
        setIsBuffering(false);
      }
    }
  }, [activeStationId, player]);

  useEffect(() => {
    if (status.playing) {
      setIsBuffering(false);
    }
  }, [status.playing]);

  const handlePlay = useCallback((station: RadioStation) => {
    if (activeStation?.id === station.id) {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
      return;
    }
    setActiveStation(station);
  }, [activeStation, isPlaying, player]);

  const handleStop = useCallback(() => {
    player.pause();
    player.seekTo(0);
    setActiveStation(null);
    setIsBuffering(false);
    setPlayError(null);
  }, [player]);

  const filtered = activeFilter
    ? RADIO_STATIONS.filter(s => s.category === activeFilter)
    : RADIO_STATIONS;

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
        contentContainerStyle={{ paddingBottom: bottomPad + (activeStation ? 100 : 40) }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#C9933A", "#8B6914"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Ionicons name="radio" size={44} color="rgba(255,255,255,0.9)" />
          <Text style={[styles.heroTitle, { fontFamily: "Lora_700Bold" }]}>Christian Radio</Text>
          <Text style={[styles.heroDesc, { fontFamily: "Inter_400Regular" }]}>
            Live streams from Adventist and Christian stations worldwide
          </Text>
        </LinearGradient>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          <Pressable
            onPress={() => setActiveFilter(null)}
            style={[
              styles.filterChip,
              { backgroundColor: !activeFilter ? theme.accent : isDark ? theme.backgroundCard : "#F0EDE5" },
            ]}
          >
            <Text style={[
              styles.filterChipText,
              { color: !activeFilter ? "#fff" : theme.textMuted, fontFamily: "Inter_600SemiBold" },
            ]}>All</Text>
          </Pressable>
          {RADIO_CATEGORIES.map(cat => (
            <Pressable
              key={cat.id}
              onPress={() => setActiveFilter(activeFilter === cat.id ? null : cat.id)}
              style={[
                styles.filterChip,
                { backgroundColor: activeFilter === cat.id ? theme.accent : isDark ? theme.backgroundCard : "#F0EDE5" },
              ]}
            >
              <Ionicons
                name={cat.icon}
                size={14}
                color={activeFilter === cat.id ? "#fff" : theme.textMuted}
              />
              <Text style={[
                styles.filterChipText,
                { color: activeFilter === cat.id ? "#fff" : theme.textMuted, fontFamily: "Inter_600SemiBold" },
              ]}>{cat.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.stationList}>
          {filtered.length === 0 && (
            <View style={{ alignItems: "center", paddingTop: 32, paddingHorizontal: 24 }}>
              <Ionicons name="radio-outline" size={40} color={theme.textMuted} />
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 15, marginTop: 12, textAlign: "center" }}>
                No stations in this category
              </Text>
            </View>
          )}
          {filtered.map(station => {
            const isCurrent = activeStation?.id === station.id;
            const isThisPlaying = isCurrent && isPlaying;
            const isThisBuffering = isCurrent && isBuffering;

            return (
              <Pressable
                key={station.id}
                onPress={() => handlePlay(station)}
                style={({ pressed }) => [
                  styles.stationCard,
                  {
                    backgroundColor: isCurrent
                      ? theme.accent + "15"
                      : isDark ? theme.backgroundCard : "#FFFDF6",
                    borderColor: isCurrent ? theme.accent + "40" : "transparent",
                    borderWidth: isCurrent ? 1 : 0,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                testID={`station-${station.id}`}
              >
                <View style={[styles.stationIcon, { backgroundColor: station.color + "20" }]}>
                  <Ionicons name={station.icon} size={20} color={station.color} />
                </View>
                <View style={styles.stationInfo}>
                  <Text style={[styles.stationName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                    {station.name}
                  </Text>
                  <Text style={[styles.stationTagline, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                    {station.tagline}
                  </Text>
                  <Text style={[styles.stationCountry, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                    {station.country}
                  </Text>
                </View>
                <View style={styles.playBtnWrap}>
                  {isThisBuffering ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : (
                    <View style={[styles.playBtn, { backgroundColor: isThisPlaying ? theme.accent : station.color + "20" }]}>
                      <Ionicons
                        name={isThisPlaying ? "pause" : "play"}
                        size={18}
                        color={isThisPlaying ? "#fff" : station.color}
                      />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {activeStation && (
        <View style={[
          styles.nowPlaying,
          {
            backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6",
            borderTopColor: theme.accent + "30",
            paddingBottom: bottomPad + 8,
          },
        ]}>
          <View style={[styles.nowPlayingDot, { backgroundColor: isPlaying ? "#4CAF50" : theme.textMuted }]} />
          <View style={styles.nowPlayingInfo}>
            <Text style={[styles.nowPlayingLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              {isBuffering ? "Connecting..." : isPlaying ? "Now Playing" : "Paused"}
            </Text>
            <Text style={[styles.nowPlayingName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {activeStation.name}
            </Text>
          </View>
          {playError ? (
            <Text style={[styles.errorText, { color: "#C62828", fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
              {playError}
            </Text>
          ) : null}
          <Pressable
            onPress={() => isPlaying ? player.pause() : player.play()}
            style={[styles.nowPlayingBtn, { backgroundColor: theme.accent }]}
            hitSlop={8}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#fff" />
          </Pressable>
          <Pressable onPress={handleStop} hitSlop={8}>
            <Ionicons name="close-circle" size={28} color={theme.textMuted} />
          </Pressable>
        </View>
      )}
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
  filterScroll: { marginTop: 20 },
  filterRow: {
    paddingHorizontal: 22,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: { fontSize: 13 },
  stationList: {
    paddingHorizontal: 22,
    marginTop: 16,
    gap: 8,
  },
  stationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  stationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  stationInfo: { flex: 1, gap: 1 },
  stationName: { fontSize: 15 },
  stationTagline: { fontSize: 12 },
  stationCountry: { fontSize: 11, marginTop: 1 },
  playBtnWrap: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  nowPlaying: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  nowPlayingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nowPlayingInfo: { flex: 1 },
  nowPlayingLabel: { fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  nowPlayingName: { fontSize: 14 },
  nowPlayingBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { fontSize: 11, maxWidth: 100 },
});
