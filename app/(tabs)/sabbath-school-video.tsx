import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useSabbathSchoolTrack } from "@/hooks/useSabbathSchoolTrack";
import { HV2, F } from "@/components/home-v2/theme";
import { withDeviceTimeZone } from "@/lib/device-time-zone";
import { getHomeLocalDay } from "@/components/home-v2/home-data";
import LessonVideoPlayer from "@/components/sabbath-school/LessonVideoPlayer";
import {
  earlierEpisodesHeading,
  flattenSabbathSchoolLessonClips,
  relatedLessonVideoGroups,
  type RelatedLessonVideoGroup,
  type SabbathSchoolVideoClip,
} from "@/lib/sabbath-school-video-clips";
import { SABBATH_SCHOOL_TRACKS } from "@/lib/sabbath-school-tracks";
import { resolveSabbathSchoolContinueDay } from "@/lib/sabbath-school-continue";
import {
  buildSabbathSchoolTabRoute,
  SABBATH_SCHOOL_TAB_ROOT,
  sabbathSchoolTabBarClearance,
  useSabbathSchoolTabContainment,
} from "@/lib/sabbath-school-route-containment";
import { safeGoBack } from "@/lib/safe-back";
import { HOME_TAB_PATH } from "@/lib/bible-tab-navigation";

const SS2 = {
  surface: "#FBF7EE",
  card: "#FFFFFF",
  ink: "#1F1A12",
  inkMuted: HV2.inkMutedText,
  teal: "#1F7A70",
  coral: HV2.coral,
};

export default function SabbathSchoolVideoScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { selectedTrack, availableTracks } = useSabbathSchoolTrack();
  const [clock, setClock] = useState(() => new Date());
  const [screenVisit, setScreenVisit] = useState(0);
  const isTabContained = useSabbathSchoolTabContainment("sabbath-school-video");
  const localDay = useMemo(() => getHomeLocalDay(clock), [clock]);
  const localDateKey = localDay.dateKey;

  React.useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setScreenVisit((visit) => visit + 1);
    }, []),
  );

  const { data, isLoading } = useQuery<{
    quarterly: { quarterCode?: string } | null;
    currentLesson: {
      title: string;
      lessonNumber: number;
      days: {
        dayNumber: number;
        title: string | null;
        date: string | null;
      }[];
      videoByArtist?: Array<{
        artist: string;
        clips: Array<{ src: string; title: string; thumbnail: string; target: string }>;
      }> | null;
    } | null;
    currentLessonNumber?: number;
    todayDayNumber?: number | null;
    earlierLessonVideos?: SabbathSchoolVideoClip[];
  }>({
    queryKey: [
      "sabbath-school-current",
      userId,
      selectedTrack,
      localDateKey,
    ],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        withDeviceTimeZone(
          `/api/sabbath-school/current?userId=${userId}&curriculum=${selectedTrack}`,
        ),
      );
      return response.json();
    },
  });

  const clips = flattenSabbathSchoolLessonClips(data?.currentLesson?.videoByArtist);
  const lessonNumber =
    data?.currentLesson?.lessonNumber ?? data?.currentLessonNumber ?? null;
  const otherTracks = availableTracks.filter((track) => track.id !== selectedTrack);
  const otherTrackKey = otherTracks.map((track) => track.id).join(",");
  const { data: otherTrackVideos } = useQuery<RelatedLessonVideoGroup[]>({
    queryKey: ["sabbath-school-other-videos", lessonNumber, otherTrackKey],
    enabled: lessonNumber != null && otherTracks.length > 0,
    queryFn: async () => {
      const groups: RelatedLessonVideoGroup[] = [];
      for (const track of otherTracks) {
        const response = await apiRequest(
          "GET",
          `/api/sabbath-school/lesson/${lessonNumber}?userId=${userId}&curriculum=${track.id}`,
        );
        const json = await response.json();
        groups.push({
          label: track.shortLabel,
          clips: flattenSabbathSchoolLessonClips(json?.lesson?.videoByArtist, 8),
        });
      }
      return groups;
    },
  });
  const earlierVideos = data?.earlierLessonVideos ?? [];
  const earlier =
    earlierVideos.length > 0
      ? {
          heading: earlierEpisodesHeading(SABBATH_SCHOOL_TRACKS[selectedTrack].shortLabel),
          clips: earlierVideos,
        }
      : undefined;
  const moreVideos = useMemo(
    () =>
      relatedLessonVideoGroups(
        otherTrackVideos ?? [],
        new Set(clips.map((clip) => clip.src)),
      ),
    [otherTrackVideos, clips],
  );
  const continueDay = resolveSabbathSchoolContinueDay({
    days: data?.currentLesson?.days ?? [],
    todayDayNumber: data?.todayDayNumber ?? localDay.sabbathSchoolDayNumber,
    lastRead: null,
    currentLessonNumber: lessonNumber,
    currentQuarterCode: data?.quarterly?.quarterCode,
  });
  const goToContinueDay = () => {
    if (!continueDay || lessonNumber == null) {
      router.push(SABBATH_SCHOOL_TAB_ROOT as any);
      return;
    }
    router.push(
      buildSabbathSchoolTabRoute("sabbath-school-day", {
        lessonNumber,
        dayNumber: continueDay.dayNumber,
        quarterCode: data?.quarterly?.quarterCode,
      }) as any,
    );
  };
  const bottomPad =
    (Platform.OS === "web" ? 34 : insets.bottom) +
    sabbathSchoolTabBarClearance(isTabContained, Platform.OS);

  if (!isTabContained) return null;

  return (
    <View style={s.container}>
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => safeGoBack(router, HOME_TAB_PATH)}
          style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={SS2.ink} />
        </Pressable>
        <Text style={s.topTitle} numberOfLines={1}>
          {data?.currentLesson?.title || "Watch this lesson"}
        </Text>
        <View style={s.backBtn} />
      </View>
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={SS2.teal} />
          <Text style={s.centerText}>Loading lesson video…</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.scrollContent, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {clips.length === 0 && moreVideos.length === 0 && earlierVideos.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>
                No lesson video is available for this week yet.
              </Text>
              <Pressable
                onPress={goToContinueDay}
                style={({ pressed }) => [s.readBtn, { opacity: pressed ? 0.85 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel="Read this week's lesson"
              >
                <Text style={s.readBtnText}>Read this week's lesson</Text>
              </Pressable>
            </View>
          ) : (
            <LessonVideoPlayer
              clips={clips}
              layout="page"
              more={moreVideos}
              earlier={earlier}
              revealKey={`${screenVisit}:${selectedTrack}`}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SS2.surface },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: F.interSemi,
    fontSize: 16,
    color: SS2.ink,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  centerText: {
    fontFamily: F.inter,
    fontSize: 14,
    color: SS2.inkMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  emptyCard: {
    backgroundColor: SS2.card,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 16,
    ...HV2.rowShadow,
  },
  emptyText: {
    fontFamily: F.inter,
    fontSize: 15,
    color: SS2.ink,
    lineHeight: 22,
  },
  readBtn: {
    alignSelf: "flex-start",
    backgroundColor: SS2.coral,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  readBtnText: {
    fontFamily: F.interSemi,
    fontSize: 13.5,
    color: "#FFFFFF",
  },
});
