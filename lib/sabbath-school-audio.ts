export const SABBATH_SCHOOL_AUDIO_UNAVAILABLE_MESSAGE =
  "Audio isn't available right now. Please try again later.";

export const SABBATH_SCHOOL_PLAYBACK_START_MS = 5000;

export function sabbathSchoolPlaybackHasStarted(status: {
  playing?: boolean;
  currentTime?: number;
  duration?: number;
}): boolean {
  if (!status.playing) return false;
  return (status.duration ?? 0) > 0 || (status.currentTime ?? 0) > 0;
}

export async function waitForSabbathSchoolPlaybackStart(
  check: () => boolean,
  timeoutMs = SABBATH_SCHOOL_PLAYBACK_START_MS,
): Promise<boolean> {
  if (check()) return true;
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const id = setInterval(() => {
      if (check()) {
        clearInterval(id);
        resolve(true);
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(id);
        resolve(false);
      }
    }, 100);
  });
}

export type SabbathSchoolPlaybackStatus =
  | {
      isLoaded: true;
      isPlaying?: boolean;
      didJustFinish?: boolean;
    }
  | {
      isLoaded: false;
      error?: string;
    };

export type SabbathSchoolSound = {
  getStatusAsync(): Promise<SabbathSchoolPlaybackStatus>;
  pauseAsync(): Promise<unknown>;
  playAsync(): Promise<unknown>;
  replayAsync(): Promise<unknown>;
  unloadAsync(): Promise<unknown>;
};

type CreateSound = (
  url: string,
  onStatus: (status: SabbathSchoolPlaybackStatus) => void
) => Promise<{
  sound: SabbathSchoolSound;
  status: SabbathSchoolPlaybackStatus;
}>;

export type SabbathSchoolAudioToggleResult =
  | {
      kind: "playing" | "paused";
      sound: SabbathSchoolSound;
    }
  | {
      kind: "unavailable";
      sound: null;
    };

export async function toggleSabbathSchoolAudio({
  url,
  sound,
  hasFinished,
  prepareAudio,
  createSound,
  onStatus,
}: {
  url: string | null | undefined;
  sound: SabbathSchoolSound | null;
  hasFinished: boolean;
  prepareAudio: () => Promise<unknown>;
  createSound: CreateSound;
  onStatus: (status: SabbathSchoolPlaybackStatus) => void;
}): Promise<SabbathSchoolAudioToggleResult> {
  if (!url) return { kind: "unavailable", sound: null };

  try {
    if (sound) {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        await sound.unloadAsync().catch(() => {});
        return { kind: "unavailable", sound: null };
      }

      if (status.isPlaying) {
        await sound.pauseAsync();
        return { kind: "paused", sound };
      }

      if (hasFinished) {
        await sound.replayAsync();
      } else {
        await sound.playAsync();
      }
      return { kind: "playing", sound };
    }

    await prepareAudio();
    const created = await createSound(url, onStatus);
    if (!created.status.isLoaded) {
      await created.sound.unloadAsync().catch(() => {});
      return { kind: "unavailable", sound: null };
    }

    return { kind: "playing", sound: created.sound };
  } catch {
    if (sound) await sound.unloadAsync().catch(() => {});
    return { kind: "unavailable", sound: null };
  }
}