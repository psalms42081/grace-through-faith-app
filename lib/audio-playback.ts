import type { AudioPlayer, AudioStatus } from "expo-audio";

type PlaybackSubscription = { remove(): void };

/**
 * expo-audio's AudioPlayer is a SharedObject, but its event map is declared
 * with method syntax that does not satisfy EventEmitter's EventsMap, so
 * addListener disappears from the instance type. The method exists at runtime.
 */
type PlaybackStatusEvents = {
  addListener(
    eventName: "playbackStatusUpdate",
    listener: (status: AudioStatus) => void,
  ): PlaybackSubscription;
};

export function addPlaybackStatusListener(
  player: AudioPlayer,
  listener: (status: AudioStatus) => void,
): PlaybackSubscription {
  const emitter = player as AudioPlayer & PlaybackStatusEvents;
  return emitter.addListener("playbackStatusUpdate", listener);
}
