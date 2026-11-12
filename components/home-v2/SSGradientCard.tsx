import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { HV2, F } from "./theme";
import {
  getSabbathSchoolQuarterTheme,
  SABBATH_SCHOOL_PENDING_SURFACE,
} from "@/lib/sabbath-school-quarter-theme";
import { HomeTrackSwitch } from "@/components/sabbath-school/TrackSwitch";
import { SabbathSchoolCardSurface } from "@/components/sabbath-school/SabbathSchoolCardSurface";
import type { SabbathSchoolTrackId, SabbathSchoolTrackMeta } from "@/lib/sabbath-school-tracks";

interface Props {
  quarterTitle?: string | null;
  quarterColor?: string | null;
  quarterCode?: string | null;
  coverUrl?: string | null;
  lessonTitle?: string | null;
  lessonNumber?: number | null;
  progressDays: number;
  dayLabel: string; // e.g. "Tuesday" — the Continue target weekday
  onContinue: () => void;
  onOpenOverview: () => void;
  onWatch: () => void;
  showWatch?: boolean;
  /** Tracks with content; the switch renders when there are two or more. */
  tracks?: readonly SabbathSchoolTrackMeta[];
  selectedTrack?: SabbathSchoolTrackId;
  onSelectTrack?: (track: SabbathSchoolTrackId) => void;
}

// The ONE gradient on this screen (§1.3). All other cards are flat white.
export default function SSGradientCard({
  quarterTitle, quarterColor, quarterCode, coverUrl, lessonTitle, lessonNumber, progressDays, dayLabel,
  onContinue, onOpenOverview, onWatch, showWatch = false,
  tracks = [], selectedTrack = "adult", onSelectTrack,
}: Props) {
  const progress = Math.min(Math.max(progressDays / 7, 0), 1);
  const quarterTheme = getSabbathSchoolQuarterTheme(
    quarterColor || SABBATH_SCHOOL_PENDING_SURFACE,
  );
  const surfaceColor = quarterColor || SABBATH_SCHOOL_PENDING_SURFACE;
  const lessonPill = lessonNumber != null ? (
    <View style={s.badge}>
      <Text style={s.badgeText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        Lesson {lessonNumber} of 13
      </Text>
    </View>
  ) : null;

  return (
    <View style={[s.wrap, { backgroundColor: quarterTheme.primary }]}>
      <SabbathSchoolCardSurface
        quarterCode={quarterCode}
        coverUrl={coverUrl}
        color={surfaceColor}
        bannerAccessory={lessonPill}
      >
        <View style={s.inner}>
          <Text style={s.eyebrow} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            SABBATH SCHOOL
          </Text>
          {quarterTitle ? (
            <Text style={s.quarterTitle} numberOfLines={2}>
              {quarterTitle}
            </Text>
          ) : null}
          {onSelectTrack ? (
            <View
              style={s.trackRow}
              onStartShouldSetResponder={() => true}
              testID="home-ss-track-row"
            >
              <HomeTrackSwitch tracks={tracks} selected={selectedTrack} onSelect={onSelectTrack} />
            </View>
          ) : null}
          <Pressable
            onPress={onOpenOverview}
            accessibilityRole="button"
            accessibilityLabel="Open lesson overview"
            style={s.titlePress}
          >
            <Text style={s.title} numberOfLines={3}>
              {lessonTitle ?? "This week's lesson"}
            </Text>
          </Pressable>
          <View style={s.track}>
            <View style={[s.fill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <View style={s.btnRow}>
            <Pressable
              style={s.continueBtn}
              onPress={onContinue}
              accessibilityRole="button"
              accessibilityLabel={`Continue ${dayLabel}`}
            >
              <Text style={[s.continueLabel, { color: quarterTheme.primary }]} numberOfLines={2}>
                Continue — {dayLabel}
              </Text>
            </Pressable>
            {showWatch && (
              <Pressable
                style={s.watchBtn}
                onPress={onWatch}
                accessibilityRole="button"
                accessibilityLabel="Watch this lesson"
              >
                <Text style={s.watchLabel} numberOfLines={1}>▶ Watch</Text>
              </Pressable>
            )}
          </View>
        </View>
      </SabbathSchoolCardSurface>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 28,
    overflow: "hidden",
    ...HV2.cardShadow,
  },
  inner: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 18 },
  eyebrow: {
    flexShrink: 0,
    fontFamily: F.interBold,
    fontSize: 11.5,
    letterSpacing: 1.4,
    color: "#FFFFFF",
  },
  badge: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontFamily: F.interSemi, fontSize: 11, color: "#FFFFFF" },
  quarterTitle: {
    marginTop: 6,
    fontFamily: F.interSemi,
    fontSize: 15,
    lineHeight: 20,
    color: "#FFFFFF",
  },
  trackRow: { marginTop: 10, alignSelf: "flex-start" },
  titlePress: { marginTop: 8 },
  title: { fontFamily: F.loraSemi, fontSize: 21, lineHeight: 28, color: "#FFFFFF" },
  track: {
    marginTop: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  continueBtn: {
    flexShrink: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  continueLabel: { fontFamily: F.interSemi, fontSize: 13.5, lineHeight: 18 },
  watchBtn: {
    backgroundColor: "rgba(255,255,255,0.24)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  watchLabel: { fontFamily: F.interSemi, fontSize: 13.5, lineHeight: 18, color: "#FFFFFF" },
});
