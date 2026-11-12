import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { HV2, F } from "./theme";
import {
  getSabbathSchoolQuarterTheme,
  SABBATH_SCHOOL_PENDING_SURFACE,
} from "@/lib/sabbath-school-quarter-theme";
import { HomeTrackSwitch } from "@/components/sabbath-school/TrackSwitch";
import { SabbathSchoolArtwork } from "@/components/sabbath-school/SabbathSchoolArtwork";
import { sabbathSchoolCoverUrl } from "@/lib/sabbath-school-artwork";
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

  return (
    <View style={[s.wrap, { backgroundColor: quarterTheme.primary }]}>
      <LinearGradient
        colors={[...quarterTheme.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={s.inner}
      >
        <View style={s.topRow}>
          <Text style={s.eyebrow} numberOfLines={1}>
            SABBATH SCHOOL{quarterTitle ? ` · ${quarterTitle}` : ""}
          </Text>
          {lessonNumber != null && (
            <View style={s.badge}>
              <Text style={s.badgeText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                Lesson {lessonNumber} of 13
              </Text>
            </View>
          )}
        </View>
        {onSelectTrack ? (
          <View
            style={s.trackRow}
            onStartShouldSetResponder={() => true}
            testID="home-ss-track-row"
          >
            <HomeTrackSwitch tracks={tracks} selected={selectedTrack} onSelect={onSelectTrack} />
          </View>
        ) : null}
        <View style={s.titleRow}>
          <Pressable
            onPress={onOpenOverview}
            accessibilityRole="button"
            accessibilityLabel="Open lesson overview"
            style={{ flex: 1 }}
          >
            <Text style={s.title} numberOfLines={3}>
              {lessonTitle ?? "This week's lesson"}
            </Text>
          </Pressable>
          <SabbathSchoolArtwork
            uri={sabbathSchoolCoverUrl(quarterCode, coverUrl)}
            title={quarterTitle || "Sabbath School"}
            color="rgba(255,255,255,0.28)"
            width={56}
            height={74}
            radius={8}
            testID="home-ss-cover"
          />
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
            <Text style={[s.continueLabel, { color: quarterTheme.primary }]}>Continue — {dayLabel}</Text>
          </Pressable>
          {showWatch && (
            <Pressable
              style={s.watchBtn}
              onPress={onWatch}
              accessibilityRole="button"
              accessibilityLabel="Watch this lesson"
            >
              <Text style={s.watchLabel}>▶ Watch</Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>
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
  inner: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  eyebrow: {
    flex: 1,
    flexShrink: 1,
    fontFamily: F.interBold,
    fontSize: 11.5,
    letterSpacing: 1.6,
    color: "#FFFFFF",
  },
  badge: {
    flexShrink: 0,
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontFamily: F.interSemi, fontSize: 11, color: "#FFFFFF" },
  // Own row under the eyebrow so the pill stays tappable at 390px / large text.
  trackRow: { marginTop: 10, alignSelf: "flex-start" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 12 },
  title: { fontFamily: F.loraSemi, fontSize: 21, lineHeight: 28, color: "#FFFFFF" },
  track: {
    marginTop: 16,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  continueBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  continueLabel: { fontFamily: F.interSemi, fontSize: 13.5 },
  watchBtn: {
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  watchLabel: { fontFamily: F.interSemi, fontSize: 13.5, color: "#FFFFFF" },
});
