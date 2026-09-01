import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import {
  CURRICULUM_STORAGE_KEY,
  curriculumStorageKey,
  parseSabbathSchoolTrackId,
  resolveSabbathSchoolTrack,
  sabbathSchoolTrackChipLabel,
  SABBATH_SCHOOL_TRACKS,
  tracksFromAvailableIds,
  type SabbathSchoolTrackId,
  type SabbathSchoolTrackMeta,
} from "@/lib/sabbath-school-tracks";

type PreferencesResponse = { preferredCurriculum?: string | null };
type TracksResponse = { tracks: Array<{ id: string }> };

function isSabbathSchoolCurrentQuery(queryKey: readonly unknown[]): boolean {
  const head = queryKey[0];
  return (
    typeof head === "string" &&
    (head === "sabbath-school-current" ||
      head === "home-sabbath-school-current" ||
      head.includes("/api/sabbath-school/current") ||
      head.includes("/api/sabbath-school/quarters"))
  );
}

export function invalidateSabbathSchoolTrackQueries(
  queryClient: { invalidateQueries: (opts: unknown) => Promise<unknown> },
): void {
  void queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
  void queryClient.invalidateQueries({
    predicate: (query: { queryKey: readonly unknown[] }) =>
      isSabbathSchoolCurrentQuery(query.queryKey),
  });
}

export function useSabbathSchoolTrack() {
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [localTrack, setLocalTrack] = useState<SabbathSchoolTrackId>("adult");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const scopedKey = curriculumStorageKey(userId);
      const scoped = await AsyncStorage.getItem(scopedKey);
      const legacy =
        scopedKey !== CURRICULUM_STORAGE_KEY
          ? await AsyncStorage.getItem(CURRICULUM_STORAGE_KEY)
          : null;
      const raw = scoped ?? legacy;
      if (cancelled || !raw) return;
      const parsed = parseSabbathSchoolTrackId(raw);
      setLocalTrack(parsed);
      if (!scoped && legacy) {
        await AsyncStorage.setItem(scopedKey, parsed);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const { data: prefs } = useQuery<PreferencesResponse>({
    queryKey: ["/api/user/preferences"],
    enabled: isAuthenticated,
  });

  const { data: tracksData } = useQuery<TracksResponse>({
    queryKey: ["/api/sabbath-school/tracks"],
  });

  const availableTracks: SabbathSchoolTrackMeta[] = tracksFromAvailableIds(
    (tracksData?.tracks ?? []).map((track) => track.id),
  );

  const preferred = isAuthenticated
    ? (prefs?.preferredCurriculum ?? localTrack)
    : localTrack;
  const selectedTrack = resolveSabbathSchoolTrack(
    preferred,
    availableTracks.map((track) => track.id),
  );
  const chipLabel = sabbathSchoolTrackChipLabel(selectedTrack);

  const setTrack = useCallback(
    async (value: SabbathSchoolTrackId) => {
      const allowed =
        availableTracks.length === 0 ||
        availableTracks.some((track) => track.id === value);
      if (!allowed) return;
      setLocalTrack(value);
      await AsyncStorage.setItem(curriculumStorageKey(userId), value);
      if (isAuthenticated) {
        try {
          await apiRequest("PUT", "/api/user/preferences", {
            preferredCurriculum: value,
          });
        } catch {}
      }
      invalidateSabbathSchoolTrackQueries(queryClient);
    },
    [availableTracks, isAuthenticated, queryClient, userId],
  );

  return {
    selectedTrack,
    availableTracks,
    chipLabel,
    setTrack,
    trackMeta: SABBATH_SCHOOL_TRACKS[selectedTrack],
  };
}
