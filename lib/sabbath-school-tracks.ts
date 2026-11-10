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

/** The track to switch to when the user taps a single toggle (cycles through available tracks). */
export function nextSabbathSchoolTrack(
  selected: SabbathSchoolTrackId,
  available: readonly SabbathSchoolTrackId[],
): SabbathSchoolTrackId {
  if (available.length < 2) return selected;
  const index = available.indexOf(selected);
  return available[(index + 1) % available.length] ?? available[0];
}

/** `2026-04` from `2026-04`, `2026-04-cq`, `2026-04-cc`; null for anything else. */
export function quarterBaseCode(quarterCode: string): string | null {
  const match = /^(\d{4}-(?:0[1-4]))(?:-|$)/.exec(quarterCode.trim());
  return match ? match[1] : null;
}

/** Adventech quarterly id for a base quarter on a given track: `2026-04` + `-cq` → `2026-04-cq`. */
export function quarterCodeForTrack(
  baseCode: string,
  track: SabbathSchoolTrackId,
): string {
  return `${baseCode}${SABBATH_SCHOOL_TRACKS[track].adventechSuffix}`;
}

/** Track implied by an Adventech quarterly id; bare `YYYY-QQ` is the adult quarterly. */
export function trackForQuarterCode(quarterCode: string): SabbathSchoolTrackId | null {
  const base = quarterBaseCode(quarterCode);
  if (!base) return null;
  const suffix = quarterCode.trim().slice(base.length);
  return (
    SABBATH_SCHOOL_TRACK_IDS.find(
      (id) => SABBATH_SCHOOL_TRACKS[id].adventechSuffix === suffix,
    ) ?? null
  );
}

/**
 * Earliest base quarter worth requesting per track. Adventech publishes
 * InVerse markdown (`-cq`) from 2025-01; older requests only 404.
 */
export const SABBATH_SCHOOL_BACKFILL_FLOOR: Partial<Record<SabbathSchoolTrackId, string>> = {
  inverse: "2025-01",
};

export function previousQuarterBaseCode(baseCode: string): string {
  const [yearStr, qStr] = baseCode.split("-");
  let year = parseInt(yearStr, 10);
  let q = parseInt(qStr, 10) - 1;
  if (q < 1) {
    q = 4;
    year--;
  }
  return `${year}-${String(q).padStart(2, "0")}`;
}

export function nextQuarterBaseCode(baseCode: string): string {
  const [yearStr, qStr] = baseCode.split("-");
  let year = parseInt(yearStr, 10);
  let q = parseInt(qStr, 10) + 1;
  if (q > 4) {
    q = 1;
    year++;
  }
  return `${year}-${String(q).padStart(2, "0")}`;
}

/**
 * Quarterly ids around the current quarter that each synced track still
 * needs: the next quarter plus `pastCount` previous ones, skipping quarters
 * already stored with lessons and quarters before the track's floor.
 */
export function adjacentQuarterCodesToSync(
  currentBaseCode: string,
  existingCodes: ReadonlySet<string>,
  pastCount: number,
  tracks: readonly SabbathSchoolTrackId[] = SYNCED_SABBATH_SCHOOL_TRACKS,
): Array<{ code: string; type: SabbathSchoolTrackId }> {
  const out: Array<{ code: string; type: SabbathSchoolTrackId }> = [];
  for (const type of tracks) {
    const floor = SABBATH_SCHOOL_BACKFILL_FLOOR[type];
    const consider = (base: string) => {
      if (floor != null && base < floor) return;
      const code = quarterCodeForTrack(base, type);
      if (!existingCodes.has(code)) out.push({ code, type });
    };
    consider(nextQuarterBaseCode(currentBaseCode));
    let prev = previousQuarterBaseCode(currentBaseCode);
    for (let i = 0; i < pastCount; i++) {
      consider(prev);
      prev = previousQuarterBaseCode(prev);
    }
  }
  return out;
}

export function tracksFromAvailableIds(
  availableIds: readonly string[],
): SabbathSchoolTrackMeta[] {
  return SABBATH_SCHOOL_TRACK_IDS.filter((id) => availableIds.includes(id)).map(
    (id) => SABBATH_SCHOOL_TRACKS[id],
  );
}
