import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { SPEED_OPTIONS } from "@/hooks/useBibleAudio";
import type { UseBibleAudioReturn } from "@/hooks/useBibleAudio";

interface Verse {
  id: string;
  verse: number;
  text: string;
}

interface TTSPlayerBarProps {
  theme: typeof Colors.dark;
  isDark: boolean;
  audio: UseBibleAudioReturn;
  verses: Verse[];
  bookName: string;
  chapter: string;
  canGoPrev: boolean;
  canGoNext: boolean;
  goToPrev: () => void;
  goToNext: () => void;
  bottomPad: number;
}

// ── Waveform animation (3 bars that pulse while playing) ─────────────────────
function WaveformBars({ isPlaying, color }: { isPlaying: boolean; color: string }) {
  const bars = [useRef(new Animated.Value(0.4)).current, useRef(new Animated.Value(0.7)).current, useRef(new Animated.Value(0.5)).current];

  useEffect(() => {
    if (!isPlaying) {
      bars.forEach((b) => Animated.timing(b, { toValue: 0.4, duration: 200, useNativeDriver: false }).start());
      return;
    }
    const anims = bars.map((b, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(b, { toValue: 1, duration: 300 + i * 80, useNativeDriver: false }),
          Animated.timing(b, { toValue: 0.25, duration: 300 + i * 80, useNativeDriver: false }),
        ])
      )
    );
    // Stagger starts so they feel organic
    setTimeout(() => anims[0].start(), 0);
    setTimeout(() => anims[1].start(), 120);
    setTimeout(() => anims[2].start(), 240);
    return () => anims.forEach((a) => a.stop());
  }, [isPlaying]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2.5, height: 16 }}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: color,
            height: bar.interpolate({ inputRange: [0, 1], outputRange: [4, 16] }),
          }}
        />
      ))}
    </View>
  );
}

// ── Main player component ─────────────────────────────────────────────────────
export default function TTSPlayerBar({
  theme,
  isDark,
  audio,
  verses,
  bookName,
  chapter,
  canGoPrev,
  canGoNext,
  goToPrev,
  goToNext,
  bottomPad,
}: TTSPlayerBarProps) {
  const isIOS = Platform.OS === "ios";
  const totalVerses = verses.length;
  const currentVerseNumber = verses[audio.speakingVerseIndex]?.verse ?? 1;
  const progress = totalVerses > 1 ? audio.speakingVerseIndex / (totalVerses - 1) : 0;

  // Play button scale pulse when loading
  const loadingPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!audio.isLoadingAudio) { loadingPulse.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulse, { toValue: 0.92, duration: 600, useNativeDriver: true }),
        Animated.timing(loadingPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [audio.isLoadingAudio]);

  const surfaceBg = isDark ? "rgba(14,16,28,0.96)" : "rgba(255,255,255,0.97)";
  const accentGold = theme.accent;

  const content = (
    <View style={[styles.playerWrap, { paddingBottom: bottomPad + 12 }]}>

      {/* ── Speed picker ───────────────────────────────────────── */}
      {audio.showSpeedPicker && (
        <View style={[styles.speedSheet, { backgroundColor: isDark ? "#1A1C2E" : "#FFFFFF" }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetLabel, { color: theme.textMuted }]}>PLAYBACK SPEED</Text>
          <View style={styles.speedRow}>
            {SPEED_OPTIONS.map((s) => {
              const sel = audio.speechRate === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => audio.handleSpeedChange(s)}
                  style={[
                    styles.speedPill,
                    {
                      backgroundColor: sel ? accentGold : "transparent",
                      borderColor: sel ? accentGold : theme.border,
                    },
                  ]}
                >
                  <Text style={{ color: sel ? "#fff" : theme.text, fontSize: 13, fontFamily: sel ? "Inter_700Bold" : "Inter_500Medium" }}>
                    {s}×
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Status chip (verse / loading / fallback) ───────────── */}
      {audio.isActive && (
        <View style={styles.statusRow}>
          {audio.isLoadingAudio ? (
            <View style={[styles.statusChip, { backgroundColor: accentGold + "18" }]}>
              <ActivityIndicator size="small" color={accentGold} style={{ transform: [{ scale: 0.75 }] }} />
              <Text style={[styles.statusText, { color: accentGold }]}>Loading audio…</Text>
            </View>
          ) : audio.usingFallback ? (
            <View style={[styles.statusChip, { backgroundColor: "#ff980018" }]}>
              <Ionicons name="alert-circle-outline" size={13} color="#ff9800" />
              <Text style={[styles.statusText, { color: "#ff9800" }]} numberOfLines={1}>
                Device voice · AI unavailable
              </Text>
            </View>
          ) : (
            <View style={[styles.statusChip, { backgroundColor: accentGold + "14" }]}>
              <WaveformBars isPlaying={audio.isSpeaking && !audio.isPaused} color={accentGold} />
              <Text style={[styles.statusText, { color: accentGold }]}>
                {audio.isPaused ? "Paused" : `Verse ${currentVerseNumber} of ${totalVerses}`}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Progress track ─────────────────────────────────────── */}
      {audio.isActive && totalVerses > 1 && (
        <View style={[styles.trackContainer, { backgroundColor: theme.border }]}>
          <LinearGradient
            colors={[accentGold + "cc", accentGold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.trackFill, { width: `${Math.round(progress * 100)}%` }]}
          />
          <View style={[styles.trackDot, { backgroundColor: accentGold, left: `${Math.round(progress * 100)}%` }]} />
        </View>
      )}

      {/* ── Main control row ───────────────────────────────────── */}
      <View style={styles.controlRow}>

        {/* Chapter prev */}
        <Pressable
          onPress={goToPrev}
          disabled={!canGoPrev}
          hitSlop={10}
          style={({ pressed }) => [styles.chapterBtn, { opacity: canGoPrev ? (pressed ? 0.6 : 1) : 0.2 }]}
        >
          <Ionicons name="play-skip-back" size={18} color={theme.text} />
        </Pressable>

        {/* Play / Pause — central hero button */}
        <Pressable
          onPress={audio.isSpeaking ? audio.handlePause : audio.handlePlay}
          hitSlop={4}
          testID="play-pause-button"
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <Animated.View style={{ transform: [{ scale: loadingPulse }] }}>
            <LinearGradient
              colors={[accentGold + "ee", accentGold, isDark ? "#7A5520" : "#B8791A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playBtnGradient}
            >
              {audio.isLoadingAudio ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name={audio.isSpeaking && !audio.isPaused ? "pause" : "play"}
                  size={24}
                  color="#fff"
                  style={audio.isSpeaking && !audio.isPaused ? {} : { marginLeft: 3 }}
                />
              )}
            </LinearGradient>
          </Animated.View>
        </Pressable>

        {/* Chapter next */}
        <Pressable
          onPress={goToNext}
          disabled={!canGoNext}
          hitSlop={10}
          style={({ pressed }) => [styles.chapterBtn, { opacity: canGoNext ? (pressed ? 0.6 : 1) : 0.2 }]}
        >
          <Ionicons name="play-skip-forward" size={18} color={theme.text} />
        </Pressable>

        {/* Speed button */}
        <Pressable
          onPress={() => audio.setShowSpeedPicker(!audio.showSpeedPicker)}
          hitSlop={10}
          testID="speed-button"
          style={({ pressed }) => [
            styles.sideBtn,
            { borderColor: audio.showSpeedPicker ? accentGold : theme.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={{ fontSize: 14, color: audio.showSpeedPicker ? accentGold : theme.textSecondary, fontFamily: "Inter_700Bold" }}>
            {audio.speechRate}×
          </Text>
          <Text style={{ fontSize: 9, color: audio.showSpeedPicker ? accentGold : theme.textMuted, fontFamily: "Inter_600SemiBold", marginTop: 3, letterSpacing: 0.3 }}>
            SPEED
          </Text>
        </Pressable>
      </View>

      {/* ── Chapter label + stop ───────────────────────────────── */}
      <View style={styles.footerRow}>
        <Pressable
          onPress={() => audio.setShowSpeedPicker(false)}
          style={{ flex: 1, alignItems: "center" }}
        >
          <Text style={[styles.chapterLabel, { color: theme.textSecondary, fontFamily: "Lora_600SemiBold" }]}>
            {bookName} · Chapter {chapter}
          </Text>
        </Pressable>
        {audio.isActive && (
          <Pressable onPress={audio.handleStop} hitSlop={10} testID="stop-button" style={styles.stopBtn}>
            <Ionicons name="stop-circle-outline" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

    </View>
  );

  // iOS: frosted glass surface via BlurView
  if (isIOS) {
    return (
      <BlurView
        intensity={75}
        tint={isDark ? "dark" : "light"}
        style={[styles.container, styles.shadow]}
      >
        {content}
      </BlurView>
    );
  }

  // Android / Web: rich dark gradient
  return (
    <LinearGradient
      colors={isDark
        ? ["rgba(10,12,22,0)", "rgba(10,12,22,0.97)", "rgba(10,12,22,1)"]
        : ["rgba(248,246,240,0)", "rgba(248,246,240,0.97)", "rgba(248,246,240,1)"]}
      locations={[0, 0.18, 1]}
      style={[styles.container, styles.shadow]}
    >
      <View style={[styles.surfaceAndroid, { backgroundColor: surfaceBg }]}>
        {content}
      </View>
    </LinearGradient>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
  },
  surfaceAndroid: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  playerWrap: {
    paddingTop: 6,
    paddingHorizontal: 20,
  },

  // ── Pickers ────────────────────────────────────────────────
  speedSheet: {
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    paddingBottom: 12,
  },
  sheetHandle: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  sheetLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    textTransform: "uppercase",
  },
  speedRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: 6,
    gap: 8,
  },
  speedPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },

  // ── Status ─────────────────────────────────────────────────
  statusRow: {
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },

  // ── Progress track ─────────────────────────────────────────
  trackContainer: {
    height: 3,
    borderRadius: 2,
    marginBottom: 16,
    marginHorizontal: 4,
    overflow: "visible",
  },
  trackFill: {
    height: "100%",
    borderRadius: 2,
    minWidth: 6,
  },
  trackDot: {
    position: "absolute",
    top: -3.5,
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    shadowColor: "#C9933A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  // ── Controls ───────────────────────────────────────────────
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chapterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtnGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C9933A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },

  // ── Footer ─────────────────────────────────────────────────
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    minHeight: 24,
  },
  chapterLabel: {
    fontSize: 13,
    opacity: 0.7,
    letterSpacing: 0.2,
  },
  stopBtn: {
    position: "absolute",
    right: 0,
    padding: 4,
  },
});
