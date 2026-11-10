export type SabbathSchoolVideoClip = {
  src: string;
  title: string;
  thumbnail: string;
  artist: string;
};

type ArtistGroup = {
  artist: string;
  clips?: Array<{
    src: string;
    title?: string;
    thumbnail?: string;
    target?: string;
  }>;
};

export function canInlinePlaySabbathSchoolVideo(src: string): boolean {
  return /\.(mp4|m3u8)(\?|$)/i.test(src);
}

export function isHttpsVideoSource(src: string): boolean {
  try {
    return new URL(src).protocol === "https:";
  } catch {
    return false;
  }
}

export function flattenSabbathSchoolLessonClips(
  videoByArtist: ArtistGroup[] | null | undefined,
  limit = 5,
): SabbathSchoolVideoClip[] {
  return (videoByArtist ?? [])
    .flatMap((group) =>
      (group?.clips ?? []).map((clip) => ({
        src: clip.src,
        title: clip.title || "Lesson Clip",
        thumbnail: clip.thumbnail || "",
        artist: group.artist,
      })),
    )
    .filter((clip) => !!clip.src && isHttpsVideoSource(clip.src))
    .slice(0, limit);
}

export type RelatedLessonVideoGroup = {
  label: string;
  clips: SabbathSchoolVideoClip[];
};

/**
 * Videos from the other lesson tracks, dropping empties and anything already
 * shown for the selected track. An empty result means the page should render
 * no "more" heading.
 */
export function relatedLessonVideoGroups(
  groups: readonly { label: string; clips: readonly SabbathSchoolVideoClip[] }[],
  alreadyShownSrcs: ReadonlySet<string> = new Set(),
): RelatedLessonVideoGroup[] {
  const seen = new Set(alreadyShownSrcs);
  const out: RelatedLessonVideoGroup[] = [];
  for (const group of groups) {
    const clips: SabbathSchoolVideoClip[] = [];
    for (const clip of group.clips) {
      if (!clip.src || seen.has(clip.src)) continue;
      seen.add(clip.src);
      clips.push(clip);
    }
    if (clips.length > 0) out.push({ label: group.label, clips });
  }
  return out;
}

export function hasSabbathSchoolLessonVideo(
  videoByArtist: ArtistGroup[] | null | undefined,
): boolean {
  return flattenSabbathSchoolLessonClips(videoByArtist).length > 0;
}

export function firstPlayableSabbathSchoolClip(
  clips: SabbathSchoolVideoClip[],
): SabbathSchoolVideoClip | null {
  return (
    clips.find((clip) => canInlinePlaySabbathSchoolVideo(clip.src)) ??
    clips[0] ??
    null
  );
}
