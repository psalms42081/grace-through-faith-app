// Sabbath School track controls: a two-segment chooser for the overview and a
// small tap-to-switch pill for the Home card. Both are hidden by their callers
// when /api/sabbath-school/tracks reports a single track.
import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { F } from "@/components/home-v2/theme";
import {
  nextSabbathSchoolTrack,
  type SabbathSchoolTrackId,
  type SabbathSchoolTrackMeta,
} from "@/lib/sabbath-school-tracks";

const TEAL = "#1F7A70";
const TEAL_TINT = "rgba(31,122,112,0.08)";
const TEAL_BORDER = "rgba(31,122,112,0.25)";

type Props = {
  tracks: readonly SabbathSchoolTrackMeta[];
  selected: SabbathSchoolTrackId;
  onSelect: (track: SabbathSchoolTrackId) => void;
  style?: StyleProp<ViewStyle>;
};

/** "Adult" | "InVerse" segments. Labels stay on one line up to 1.5× text scaling. */
export function TrackSegmentedControl({ tracks, selected, onSelect, style }: Props) {
  if (tracks.length < 2) return null;
  return (
    <View
      style={[s.segmentWrap, style]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Lesson track"
      testID="ss-track-segment"
    >
      {tracks.map((track) => {
        const isSelected = track.id === selected;
        return (
          <Pressable
            key={track.id}
            onPress={() => {
              if (!isSelected) onSelect(track.id);
            }}
            style={({ pressed }) => [
              s.segment,
              isSelected && s.segmentSelected,
              pressed && !isSelected && { opacity: 0.7 },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={track.pickerLabel}
            testID={`ss-track-option-${track.id}`}
          >
            <Text
              style={[s.segmentLabel, isSelected && s.segmentLabelSelected]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.5}
            >
              {track.shortLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small translucent pill for the Home gradient card: shows the track, tap switches to the next one. */
export function TrackSwitchPill({ tracks, selected, onSelect, style }: Props) {
  if (tracks.length < 2) return null;
  const ids = tracks.map((track) => track.id);
  const next = nextSabbathSchoolTrack(selected, ids);
  const current = tracks.find((track) => track.id === selected) ?? tracks[0];
  const target = tracks.find((track) => track.id === next) ?? current;
  return (
    <Pressable
      onPress={() => onSelect(next)}
      hitSlop={8}
      style={({ pressed }) => [s.pill, style, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`Lesson track ${current.shortLabel}. Switch to ${target.shortLabel}`}
      testID="home-ss-track-pill"
    >
      <Text style={s.pillLabel} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {current.shortLabel}
      </Text>
      <Ionicons name="swap-horizontal" size={12} color="#FFFFFF" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  segmentWrap: {
    alignSelf: "stretch",
    width: "100%",
    flexDirection: "row",
    backgroundColor: TEAL_TINT,
    borderWidth: 1,
    borderColor: TEAL_BORDER,
    borderRadius: 12,
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  segmentSelected: { backgroundColor: TEAL },
  segmentLabel: { fontFamily: F.interSemi, fontSize: 14, lineHeight: 18, color: TEAL },
  segmentLabelSelected: { color: "#FFFFFF" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 24,
  },
  pillLabel: { fontFamily: F.interSemi, fontSize: 11, color: "#FFFFFF" },
});
