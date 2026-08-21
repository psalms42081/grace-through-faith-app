import React, { useEffect, useMemo, useRef } from "react";
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

// ── Waveform animation ────────────────────────────────────────────────────────
function WaveformBars({ isPlaying, color }: { isPlaying: boolean; color: string }) {
  const bar0 = useRef(new Animated.Value(0.4)).current;
  const bar1 = useRef(new Animated.Value(0.7)).current;
  const bar2 = useRef(new Animated.Value(0.5)).current;
  const bars = useMemo(() => [bar0, bar1, bar2], [bar0, bar1, bar2]);

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
    setTimeout(() => anims[0].start(), 0);
    setTimeout(() => anims[1].start(), 120);
    setTimeout(() => anims[2].start(), 240);
    return () => anims.forEach((a) => a.stop());
  }, [isPlaying, bars]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2.5, height: 14 }}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={{
            width: 2.5,
            borderRadius: 2,
            backgroundColor: color,
            height: bar.interpolate({ inputRange: [0, 1], outputRange: [3, 14] }),
          }}
        />
      ))}
    </View>
  );
}

// ── Main player ───────────────────────────────────────────────────────────────
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

  const loadingPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!audio.isLoadingAudio) { loadingPulse.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulse, { toValue: 0.88, duration: 700, useNativeDriver: true }),
        Animated.timing(loadingPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [audio.isLoadingAudio, loadingPulse]);

  const accentGold = theme.accent;

  if (!audio.isActive) {
    return (
      <View style={[styles.container, styles.shadow]}>
        <View style={[styles.minimalBar, { paddingBottom: bottomPad + 8 }]}>
          <Pressable
            onPress={audio.handlePlay}
            style={styles.minimalPlayBtn}
          >
            <Ionicons name="play" size={20} color="#fff" />
          </Pressable>
          <Pressable style={styles.minimalChapterPill}>
            <Pressable onPress={goToPrev} disabled={!canGoPrev} hitSlop={8} style={{ opacity: canGoPrev ? 1 : 0.3 }}>
              <Ionicons name="chevron-back" size={16} color={theme.text} />
            </Pressable>
            <Text style={[styles.minimalChapterText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
              {bookName} {chapter}
            </Text>
            <Pressable onPress={goToNext} disabled={!canGoNext} hitSlop={8} style={{ opacity: canGoNext ? 1 : 0.3 }}>
              <Ionicons name="chevron-forward" size={16} color={theme.text} />
            </Pressable>
          </Pressable>
          <View style={{ width: 36 }} />
        </View>
      </View>
    );
  }

  const content = (
    <View style={[styles.playerWrap, { paddingBottom: bottomPad + 10 }]}>

      {/* ── Speed picker sheet ──────────────────────────────────── */}
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

      {/* ── Full-width progress bar ─────────────────────────────── */}
      {audio.isActive && totalVerses > 1 && (
        <View style={[styles.progressTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]}>
          <LinearGradient
            colors={[accentGold + "cc", accentGold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]}
          />
          <View style={[styles.progressThumb, { backgroundColor: accentGold, left: `${Math.round(progress * 100)}%` as any }]} />
        </View>
      )}

      {/* ── Verse label ────────────────────────────────────────── */}
      {audio.isActive && (
        <View style={styles.verseLabel}>
          {audio.isLoadingAudio ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={accentGold} style={{ transform: [{ scale: 0.7 }] }} />
              <Text style={[styles.statusText, { color: accentGold }]}>Loading…</Text>
            </View>
          ) : audio.usingFallback ? (
            <View style={styles.statusRow}>
              <Ionicons name="alert-circle-outline" size={12} color="#ff9800" />
              <Text style={[styles.statusText, { color: "#ff9800" }]}>Device voice</Text>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <WaveformBars isPlaying={audio.isSpeaking && !audio.isPaused} color={accentGold} />
              <Text style={[styles.statusText, { color: accentGold }]}>
                {audio.isPaused ? "Paused" : `Verse ${currentVerseNumber} / ${totalVerses}`}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Main control row ───────────────────────────────────── */}
      {/* Layout: [stop · chapter label]  [prev · PLAY · next]  [speed] */}
      <View style={styles.controlRow}>

        {/* Left: stop + chapter label */}
        <View style={styles.controlLeft}>
          {audio.isActive ? (
            <Pressable onPress={audio.handleStop} hitSlop={10} testID="stop-button">
              <Ionicons name="stop-circle-outline" size={20} color={theme.textMuted} />
            </Pressable>
          ) : (
            <View style={{ width: 20 }} />
          )}
        </View>

        {/* Center: prev · PLAY · next */}
        <View style={styles.controlCenter}>
          <Pressable
            onPress={goToPrev}
            disabled={!canGoPrev}
            hitSlop={12}
            style={({ pressed }) => [styles.skipBtn, { opacity: canGoPrev ? (pressed ? 0.5 : 1) : 0.2 }]}
          >
            <Ionicons name="play-skip-back" size={22} color={theme.text} />
          </Pressable>

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
                style={styles.playBtn}
              >
                {audio.isLoadingAudio ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name={audio.isSpeaking && !audio.isPaused ? "pause" : "play"}
                    size={28}
                    color="#fff"
                    style={audio.isSpeaking && !audio.isPaused ? {} : { marginLeft: 3 }}
                  />
                )}
              </LinearGradient>
            </Animated.View>
          </Pressable>

          <Pressable
            onPress={goToNext}
            disabled={!canGoNext}
            hitSlop={12}
            style={({ pressed }) => [styles.skipBtn, { opacity: canGoNext ? (pressed ? 0.5 : 1) : 0.2 }]}
          >
            <Ionicons name="play-skip-forward" size={22} color={theme.text} />
          </Pressable>
        </View>

        {/* Right: speed pill */}
        <View style={styles.controlRight}>
          <Pressable
            onPress={() => audio.setShowSpeedPicker(!audio.showSpeedPicker)}
            hitSlop={10}
            testID="speed-button"
            style={({ pressed }) => [
              styles.speedBtn,
              {
                backgroundColor: audio.showSpeedPicker
                  ? accentGold + "20"
                  : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                borderColor: audio.showSpeedPicker ? accentGold : "transparent",
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{
              fontSize: 13,
              fontFamily: "Inter_700Bold",
              color: audio.showSpeedPicker ? accentGold : theme.textSecondary,
              letterSpacing: -0.3,
            }}>
              {audio.speechRate}×
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Chapter label ──────────────────────────────────────── */}
      <Text style={[styles.chapterLabel, { color: theme.textMuted }]}>
        {bookName}  ·  Chapter {chapter}
      </Text>

    </View>
  );

  if (isIOS) {
    return (
      <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={[styles.container, styles.shadow]}>
        {content}
      </BlurView>
    );
  }

  return (
    <LinearGradient
      colors={isDark
        ? ["rgba(10,12,22,0)", "rgba(10,12,22,0.97)", "rgba(10,12,22,1)"]
        : ["rgba(248,246,240,0)", "rgba(248,246,240,0.97)", "rgba(248,246,240,1)"]}
      locations={[0, 0.18, 1]}
      style={[styles.container, styles.shadow]}
    >
      <View style={[styles.surfaceAndroid, { backgroundColor: isDark ? "rgba(14,16,28,0.97)" : "rgba(255,255,255,0.98)" }]}>
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
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  surfaceAndroid: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
  playerWrap: {
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  minimalBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#050507",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  minimalPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#C9933A",
    alignItems: "center",
    justifyContent: "center",
  },
  minimalChapterPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    gap: 12,
  },
  minimalChapterText: {
    fontSize: 14,
    fontWeight: "500",
  },

  // ── Speed sheet ────────────────────────────────────────────
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

  // ── Progress bar ───────────────────────────────────────────
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginBottom: 10,
    overflow: "visible",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    minWidth: 6,
  },
  progressThumb: {
    position: "absolute",
    top: -3.5,
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    shadowColor: "#C9933A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },

  // ── Verse label ────────────────────────────────────────────
  verseLabel: {
    alignItems: "center",
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.1,
  },

  // ── Controls ───────────────────────────────────────────────
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  controlLeft: {
    width: 52,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  controlCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  controlRight: {
    width: 52,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  skipBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C9933A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 44,
  },

  // ── Chapter label ──────────────────────────────────────────
  chapterLabel: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Lora_500Medium",
    letterSpacing: 0.3,
    opacity: 0.55,
    marginBottom: 2,
  },
});
