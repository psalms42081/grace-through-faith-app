import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { HV2, F } from "./theme";
import {
  getSabbathSchoolQuarterTheme,
  SABBATH_SCHOOL_PENDING_SURFACE,
} from "@/lib/sabbath-school-quarter-theme";
import { HomeTrackSwitch } from "@/components/sabbath-school/TrackSwitch";
import { SabbathSchoolArtwork } from "@/components/sabbath-school/SabbathSchoolArtwork";
import { SabbathSchoolCardSurface } from "@/components/sabbath-school/SabbathSchoolCardSurface";
import { SABBATH_SCHOOL_COVER_FRAME } from "@/lib/sabbath-school-artwork";
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

  return (
    <View style={[s.wrap, { backgroundColor: quarterTheme.primary }]}>
      <SabbathSchoolCardSurface
        quarterCode={quarterCode}
        coverUrl={coverUrl}
        color={surfaceColor}
      >
        {({ showCover, coverUri, onCoverError }) => (
          <View style={s.inner}>
            <View style={s.topRow}>
              <Text style={s.eyebrow} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                SABBATH SCHOOL
              </Text>
              {lessonNumber != null && (
                <View style={s.badge}>
                  <Text style={s.badgeText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                    Lesson {lessonNumber} of 13
                  </Text>
                </View>
              )}
            </View>
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
            <View style={[s.titleRow, showCover && s.titleRowWithCover]}>
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
              {showCover && coverUri ? (
                <SabbathSchoolArtwork
                  uri={coverUri}
                  title={quarterTitle || "Sabbath School"}
                  color={quarterTheme.primary}
                  width={SABBATH_SCHOOL_COVER_FRAME.width}
                  height={SABBATH_SCHOOL_COVER_FRAME.height}
                  radius={10}
                  style={s.coverShadow}
                  onError={onCoverError}
                  testID="home-ss-cover"
                />
              ) : null}
            </View>
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
        )}
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
  inner: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 18 },
  topRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  eyebrow: {
    flexShrink: 0,
    fontFamily: F.interBold,
    fontSize: 11.5,
    letterSpacing: 1.4,
    color: "#FFFFFF",
  },
  badge: {
    flexShrink: 0,
    backgroundColor: "rgba(0,0,0,0.28)",
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
  // Own row under the eyebrow so the pill stays tappable at 390px / large text.
  trackRow: { marginTop: 10, alignSelf: "flex-start" },
  titleRow: { marginTop: 8 },
  titleRowWithCover: { flexDirection: "row", alignItems: "center", gap: 12 },
  titlePress: { flex: 1 },
  title: { fontFamily: F.loraSemi, fontSize: 21, lineHeight: 28, color: "#FFFFFF" },
  coverShadow: {
    shadowColor: "#1F1A12",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
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
    backgroundColor: "rgba(0,0,0,0.32)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  watchLabel: { fontFamily: F.interSemi, fontSize: 13.5, lineHeight: 18, color: "#FFFFFF" },
});
