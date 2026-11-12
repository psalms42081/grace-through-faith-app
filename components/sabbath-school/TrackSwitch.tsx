// Sabbath School track controls. Hidden by their callers when
// /api/sabbath-school/tracks reports a single track.
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { F } from "@/components/home-v2/theme";
import {
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

/**
 * Compact Adult | InVerse switch for the dark Home card. The white fill slides
 * between the two sides. The visual is 32px; hitSlop brings each side to 44px.
 */
export function HomeTrackSwitch({ tracks, selected, onSelect, style }: Props) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, tracks.findIndex((track) => track.id === selected));
  const slide = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: index,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, slide]);

  if (tracks.length < 2) return null;

  const inner = Math.max(0, width - 6);
  const segmentWidth = inner / tracks.length;
  const translateX = slide.interpolate({
    inputRange: [0, Math.max(tracks.length - 1, 1)],
    outputRange: [0, segmentWidth * Math.max(tracks.length - 1, 1)],
  });

  return (
    <View
      style={[s.homeWrap, style]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="radiogroup"
      accessibilityLabel="Sabbath School lesson"
      testID="home-ss-track-switch"
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[s.homeFill, { width: segmentWidth, transform: [{ translateX }] }]}
        />
      ) : null}
      {tracks.map((track) => {
        const isSelected = track.id === selected;
        const other = tracks.find((item) => item.id !== track.id);
        const label = isSelected
          ? `Sabbath School lesson: ${track.shortLabel}, selected. Double-tap to switch to ${other?.shortLabel ?? "the other lesson"}`
          : `Sabbath School lesson: ${track.shortLabel}. Double-tap to select.`;
        return (
          <Pressable
            key={track.id}
            onPressIn={() => {
              if (!isSelected) onSelect(track.id);
            }}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => [s.homeSegment, pressed && s.homeSegmentPressed]}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={label}
            testID={`home-ss-track-option-${track.id}`}
          >
            <Text
              style={[s.homeLabel, isSelected && s.homeLabelSelected]}
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
  homeWrap: {
    alignSelf: "flex-start",
    flexDirection: "row",
    position: "relative",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.40)",
    backgroundColor: "rgba(255,255,255,0.14)",
    padding: 3,
    overflow: "hidden",
  },
  homeFill: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  homeSegment: {
    minHeight: 32,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  homeSegmentPressed: { opacity: 0.65 },
  homeLabel: {
    fontFamily: F.interSemi,
    fontSize: 13,
    lineHeight: 18,
    color: "#FFFFFF",
  },
  homeLabelSelected: { color: "#1F1A12" },
});
