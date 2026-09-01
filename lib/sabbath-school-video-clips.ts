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

export function firstPlayableSabbathSchoolClip(
  clips: SabbathSchoolVideoClip[],
): SabbathSchoolVideoClip | null {
  return (
    clips.find((clip) => canInlinePlaySabbathSchoolVideo(clip.src)) ??
    clips[0] ??
    null
  );
}
