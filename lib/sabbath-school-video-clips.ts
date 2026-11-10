export type SabbathSchoolVideoClip = {
  src: string;
  title: string;
  thumbnail: string;
  artist: string;
  youtubeId?: string;
};

/** Watch, embed, or youtu.be id. Shorts URLs are not lesson episodes. */
export function youtubeIdFromUrl(src: string): string | null {
  try {
    const url = new URL(src);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname.startsWith("/shorts/")) return null;
      const watchId = url.searchParams.get("v") ?? "";
      if (/^[A-Za-z0-9_-]{11}$/.test(watchId)) return watchId;
      const embed = /^\/embed\/([A-Za-z0-9_-]{11})/.exec(url.pathname);
      return embed ? embed[1] : null;
    }
  } catch {
    return null;
  }
  return null;
}

type ArtistGroup = {
  artist: string;
  clips?: Array<{
    src: string;
    title?: string;
    thumbnail?: string;
    target?: string;
    youtubeId?: string;
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
        ...(clip.youtubeId ? { youtubeId: clip.youtubeId } : {}),
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

export function earlierEpisodesHeading(trackLabel: string): string {
  return `Earlier ${trackLabel} episodes`;
}

export function showOtherTrackVideosLabel(trackLabel: string): string {
  return `Show ${trackLabel} videos on this lesson`;
}

/**
 * One row for each earlier lesson in the quarter that already has a video.
 * Newest lesson first. Lessons with no playable source are left out.
 */
export function earlierQuarterLessonClips(
  lessons: readonly {
    lessonNumber: number;
    title?: string | null;
    videoByArtist?: unknown;
  }[],
  currentLessonNumber: number,
): SabbathSchoolVideoClip[] {
  return lessons
    .filter((lesson) => lesson.lessonNumber < currentLessonNumber)
    .sort((a, b) => b.lessonNumber - a.lessonNumber)
    .flatMap((lesson) => {
      const clip = flattenSabbathSchoolLessonClips(
        lesson.videoByArtist as Parameters<typeof flattenSabbathSchoolLessonClips>[0],
        1,
      )[0];
      if (!clip) return [];
      const lessonTitle = lesson.title?.trim() ?? "";
      return [
        {
          ...clip,
          title: lessonTitle
            ? `Lesson ${lesson.lessonNumber} · ${lessonTitle}`
            : `Lesson ${lesson.lessonNumber}`,
        },
      ];
    });
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
