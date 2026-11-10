import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { notifyToast } from "@/contexts/ToastContext";
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

export function invalidateSabbathSchoolTrackQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
  void queryClient.invalidateQueries({
    predicate: (query) => isSabbathSchoolCurrentQuery(query.queryKey),
  });
}

export function useSabbathSchoolTrack() {
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [localTrack, setLocalTrack] = useState<SabbathSchoolTrackId>("adult");
  const [optimisticTrack, setOptimisticTrack] = useState<SabbathSchoolTrackId | null>(null);
  const saveSeq = useRef(0);

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

  const persisted = isAuthenticated
    ? parseSabbathSchoolTrackId(prefs?.preferredCurriculum ?? localTrack)
    : localTrack;
  const preferred = optimisticTrack ?? persisted;
  const selectedTrack = resolveSabbathSchoolTrack(
    preferred,
    availableTracks.map((track) => track.id),
  );

  useEffect(() => {
    if (!optimisticTrack) return;
    if (!isAuthenticated || prefs?.preferredCurriculum === optimisticTrack) {
      setOptimisticTrack(null);
    }
  }, [isAuthenticated, optimisticTrack, prefs?.preferredCurriculum]);
  const chipLabel = sabbathSchoolTrackChipLabel(selectedTrack);

  const setTrack = useCallback(
    (value: SabbathSchoolTrackId) => {
      const allowed =
        availableTracks.length === 0 ||
        availableTracks.some((track) => track.id === value);
      if (!allowed || value === (optimisticTrack ?? persisted)) return;
      const confirmed = persisted;
      const seq = ++saveSeq.current;
      // The switch and every lesson query follow this on the same frame.
      // Saving the preference happens after, and a failure puts the old track back.
      setOptimisticTrack(value);
      setLocalTrack(value);
      void (async () => {
        const storageKey = curriculumStorageKey(userId);
        try {
          await AsyncStorage.setItem(storageKey, value);
          if (isAuthenticated) {
            await apiRequest("PUT", "/api/user/preferences", {
              preferredCurriculum: value,
            });
          }
          if (seq !== saveSeq.current) return;
          invalidateSabbathSchoolTrackQueries(queryClient);
        } catch {
          if (seq !== saveSeq.current) return;
          await AsyncStorage.setItem(storageKey, confirmed).catch(() => {});
          setLocalTrack(confirmed);
          setOptimisticTrack(null);
          notifyToast("Couldn't save your lesson track.", "error");
        }
      })();
    },
    [availableTracks, isAuthenticated, optimisticTrack, persisted, queryClient, userId],
  );

  return {
    selectedTrack,
    availableTracks,
    chipLabel,
    setTrack,
    trackMeta: SABBATH_SCHOOL_TRACKS[selectedTrack],
  };
}
