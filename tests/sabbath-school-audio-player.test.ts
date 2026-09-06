import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  sabbathSchoolPlaybackHasStarted,
  toggleSabbathSchoolAudio,
  waitForSabbathSchoolPlaybackStart,
  type SabbathSchoolPlaybackStatus,
  type SabbathSchoolSound,
} from "../lib/sabbath-school-audio";

function makeSound(status: SabbathSchoolPlaybackStatus) {
  const calls: string[] = [];
  const sound: SabbathSchoolSound = {
    async getStatusAsync() {
      calls.push("status");
      return status;
    },
    async pauseAsync() {
      calls.push("pause");
    },
    async playAsync() {
      calls.push("play");
    },
    async replayAsync() {
      calls.push("replay");
    },
    async unloadAsync() {
      calls.push("unload");
    },
  };
  return { sound, calls };
}

const noopStatus = (_status: SabbathSchoolPlaybackStatus) => {};

describe("Sabbath School audio player", () => {
  it("does not create a player when no audio exists", async () => {
    let creates = 0;
    const result = await toggleSabbathSchoolAudio({
      url: null,
      sound: null,
      hasFinished: false,
      prepareAudio: async () => {},
      createSound: async () => {
        creates++;
        const created = makeSound({ isLoaded: true });
        return {
          sound: created.sound,
          status: { isLoaded: true },
        };
      },
      onStatus: noopStatus,
    });

    assert.equal(result.kind, "unavailable");
    assert.equal(creates, 0);
  });

  it("removes the control path when loading fails", async () => {
    const result = await toggleSabbathSchoolAudio({
      url: "https://media.example/broken.mp3",
      sound: null,
      hasFinished: false,
      prepareAudio: async () => {},
      createSound: async () => {
        throw new Error("network failure");
      },
      onStatus: noopStatus,
    });

    assert.deepEqual(result, { kind: "unavailable", sound: null });
  });

  it("pauses, resumes, and replays a loaded track", async () => {
    const playing = makeSound({ isLoaded: true, isPlaying: true });
    const paused = await toggleSabbathSchoolAudio({
      url: "https://media.example/lesson.mp3",
      sound: playing.sound,
      hasFinished: false,
      prepareAudio: async () => {},
      createSound: async () => {
        throw new Error("should not create");
      },
      onStatus: noopStatus,
    });
    assert.equal(paused.kind, "paused");
    assert.deepEqual(playing.calls, ["status", "pause"]);

    const finished = makeSound({ isLoaded: true, isPlaying: false });
    const replayed = await toggleSabbathSchoolAudio({
      url: "https://media.example/lesson.mp3",
      sound: finished.sound,
      hasFinished: true,
      prepareAudio: async () => {},
      createSound: async () => {
        throw new Error("should not create");
      },
      onStatus: noopStatus,
    });
    assert.equal(replayed.kind, "playing");
    assert.deepEqual(finished.calls, ["status", "replay"]);
  });

  it("treats silent play as not started until duration or currentTime is real", () => {
    assert.equal(sabbathSchoolPlaybackHasStarted({ playing: true }), false);
    assert.equal(
      sabbathSchoolPlaybackHasStarted({ playing: true, duration: 0, currentTime: 0 }),
      false,
    );
    assert.equal(
      sabbathSchoolPlaybackHasStarted({ playing: true, duration: 12 }),
      true,
    );
    assert.equal(
      sabbathSchoolPlaybackHasStarted({ playing: false, duration: 12 }),
      false,
    );
  });

  it("times out when playback never starts", async () => {
    const started = await waitForSabbathSchoolPlaybackStart(() => false, 80);
    assert.equal(started, false);
  });
});