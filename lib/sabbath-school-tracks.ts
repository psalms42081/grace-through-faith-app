export const SABBATH_SCHOOL_TRACK_IDS = [
  "adult",
  "inverse",
  "cornerstone",
] as const;

export type SabbathSchoolTrackId = (typeof SABBATH_SCHOOL_TRACK_IDS)[number];

export type SabbathSchoolTrackMeta = {
  id: SabbathSchoolTrackId;
  adventechSuffix: string;
  shortLabel: string;
  pickerLabel: string;
};

export const SABBATH_SCHOOL_TRACKS: Record<
  SabbathSchoolTrackId,
  SabbathSchoolTrackMeta
> = {
  adult: {
    id: "adult",
    adventechSuffix: "",
    shortLabel: "Adult",
    pickerLabel: "Adult",
  },
  inverse: {
    id: "inverse",
    adventechSuffix: "-cq",
    shortLabel: "InVerse",
    pickerLabel: "InVerse (Young Adult)",
  },
  cornerstone: {
    id: "cornerstone",
    adventechSuffix: "-cc",
    shortLabel: "Cornerstone",
    pickerLabel: "Cornerstone Connections (Youth)",
  },
};

/** Tracks the Adventech markdown sync actually pulls. Cornerstone is PDF-only. */
export const SYNCED_SABBATH_SCHOOL_TRACKS: SabbathSchoolTrackId[] = [
  "adult",
  "inverse",
];

export const CURRICULUM_STORAGE_KEY = "@gtf/setting-curriculum";

export function isSabbathSchoolTrackId(
  value: unknown,
): value is SabbathSchoolTrackId {
  return (
    value === "adult" || value === "inverse" || value === "cornerstone"
  );
}

export function parseSabbathSchoolTrackId(
  value: unknown,
): SabbathSchoolTrackId {
  return isSabbathSchoolTrackId(value) ? value : "adult";
}

export function curriculumStorageKey(
  userId: string | null | undefined,
): string {
  if (userId && userId !== "guest") {
    return `${CURRICULUM_STORAGE_KEY}:${userId}`;
  }
  return CURRICULUM_STORAGE_KEY;
}

export function resolveSabbathSchoolTrack(
  preferred: unknown,
  available: readonly string[],
): SabbathSchoolTrackId {
  const parsed = parseSabbathSchoolTrackId(preferred);
  if (available.length === 0) return parsed;
  if (available.includes(parsed)) return parsed;
  if (available.includes("adult")) return "adult";
  const first = available.find((id) => isSabbathSchoolTrackId(id));
  return first ?? "adult";
}

export function sabbathSchoolTrackChipLabel(id: SabbathSchoolTrackId): string {
  return SABBATH_SCHOOL_TRACKS[id].shortLabel;
}

export function tracksFromAvailableIds(
  availableIds: readonly string[],
): SabbathSchoolTrackMeta[] {
  return SABBATH_SCHOOL_TRACK_IDS.filter((id) => availableIds.includes(id)).map(
    (id) => SABBATH_SCHOOL_TRACKS[id],
  );
}
