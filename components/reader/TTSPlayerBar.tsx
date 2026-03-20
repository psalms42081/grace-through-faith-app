import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { AI_VOICE_OPTIONS, SPEED_OPTIONS } from "@/hooks/useBibleAudio";
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
  return (
    <View style={[
      styles.bottomBar,
      {
        backgroundColor: theme.background,
        borderTopColor: theme.border,
        paddingBottom: bottomPad + 8,
      },
    ]}>
      {audio.showVoicePicker && (
        <View style={[styles.voicePopup, { backgroundColor: isDark ? theme.backgroundElevated : theme.backgroundCard }]}>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 4, textTransform: "uppercase" }}>
            Narrator
          </Text>
          {AI_VOICE_OPTIONS.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => audio.handleVoiceChange(v.id)}
              style={[
                styles.voiceOption,
                audio.selectedVoice === v.id && { backgroundColor: theme.accent + "15" },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <Ionicons
                  name={audio.selectedVoice === v.id ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={audio.selectedVoice === v.id ? theme.accent : theme.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.voiceOptionLabel,
                    {
                      color: audio.selectedVoice === v.id ? theme.accent : theme.text,
                      fontFamily: audio.selectedVoice === v.id ? "Inter_700Bold" : "Inter_500Medium",
                    },
                  ]}>
                    {v.label}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 }}>
                    {v.description}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {audio.showSpeedPicker && (
        <View style={[styles.speedPopup, { backgroundColor: isDark ? theme.backgroundElevated : theme.backgroundCard }]}>
          {SPEED_OPTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => audio.handleSpeedChange(s)}
              style={[
                styles.speedOption,
                audio.speechRate === s && { backgroundColor: theme.accent + "15" },
              ]}
            >
              <Text style={[
                styles.speedOptionText,
                {
                  color: audio.speechRate === s ? theme.accent : theme.text,
                  fontFamily: audio.speechRate === s ? "Inter_700Bold" : "Inter_500Medium",
                },
              ]}>
                {s}x
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {audio.isActive && (
        <View style={[styles.audioStatusBar, { backgroundColor: audio.usingFallback ? "#3a2200" : theme.backgroundCard }]}>
          {audio.isLoadingAudio ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Ionicons name={audio.usingFallback ? "alert-circle" : "volume-high"} size={14} color={audio.usingFallback ? "#ff9800" : theme.accent} />
          )}
          <Text style={[styles.audioStatusText, { color: audio.usingFallback ? "#ff9800" : theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {audio.isLoadingAudio
              ? "Loading..."
              : audio.usingFallback
                ? `Device voice (${audio.fallbackReason?.slice(0, 40) || "AI voice unavailable"})`
                : audio.isPaused
                  ? "Paused"
                  : `Verse ${verses[audio.speakingVerseIndex]?.verse ?? ""}`}
          </Text>
        </View>
      )}

      <View style={styles.navRow}>
        <Pressable
          onPress={() => { audio.setShowVoicePicker(!audio.showVoicePicker); audio.setShowSpeedPicker(false); }}
          hitSlop={8}
          testID="voice-button"
          style={[styles.iconBtn, { backgroundColor: theme.accent + "15" }]}
        >
          <Ionicons name="mic-outline" size={18} color={theme.accent} />
        </Pressable>

        <Pressable
          onPress={audio.isSpeaking ? audio.handlePause : audio.handlePlay}
          hitSlop={8}
          testID="play-pause-button"
          style={[styles.playBtn, { backgroundColor: theme.accent }]}
        >
          <Ionicons
            name={audio.isSpeaking ? "pause" : "play"}
            size={18}
            color="#fff"
          />
        </Pressable>

        {audio.isActive && (
          <Pressable onPress={audio.handleStop} hitSlop={8} testID="stop-button" style={styles.stopBtn}>
            <Ionicons name="stop" size={16} color={theme.textMuted} />
          </Pressable>
        )}

        <View style={styles.navCenter}>
          <Pressable
            onPress={goToPrev}
            disabled={!canGoPrev}
            hitSlop={8}
            style={[styles.navArrow, { opacity: canGoPrev ? 1 : 0.25 }]}
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </Pressable>

          <Text style={[styles.navChapterLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {bookName} {chapter}
          </Text>

          <Pressable
            onPress={goToNext}
            disabled={!canGoNext}
            hitSlop={8}
            style={[styles.navArrow, { opacity: canGoNext ? 1 : 0.25 }]}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => { audio.setShowSpeedPicker(!audio.showSpeedPicker); audio.setShowVoicePicker(false); }}
          hitSlop={8}
          testID="speed-button"
          style={[styles.speedChip, { backgroundColor: theme.accent + "15" }]}
        >
          <Text style={[styles.speedChipText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            {audio.speechRate}x
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  audioStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 6,
  },
  audioStatusText: { fontSize: 12 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  navCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  navChapterLabel: {
    fontSize: 14,
  },
  speedChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  speedChipText: { fontSize: 12 },
  voicePopup: {
    borderRadius: 14,
    marginBottom: 8,
    overflow: "hidden",
  },
  voiceOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  voiceOptionLabel: { fontSize: 15 },
  speedPopup: {
    flexDirection: "row",
    borderRadius: 14,
    marginBottom: 8,
    overflow: "hidden",
  },
  speedOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  speedOptionText: { fontSize: 13 },
});
