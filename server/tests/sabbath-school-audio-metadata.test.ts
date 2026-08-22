import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractSabbathSchoolAudioMetadata,
  normalizeSabbathSchoolAudioUrl,
} from "../services/sabbath-school-audio-metadata";

describe("Sabbath School audio metadata", () => {
  it("maps Adventech target paths to lesson days", () => {
    const result = extractSabbathSchoolAudioMetadata(
      [
        {
          artist: "Adult Bible Study Guides",
          src: "https://sabbath-school-media.adventech.io/audio/lesson-9.mp3",
          target: "en/2026-03/09/01",
        },
      ],
      "2026-03"
    );

    assert.deepEqual(result, [
      {
        lessonNumber: 9,
        dayNumber: 1,
        audioUrl:
          "https://sabbath-school-media.adventech.io/audio/lesson-9.mp3",
      },
    ]);
  });

  it("prefers the actual lesson track over duplicate EGW notes", () => {
    const result = extractSabbathSchoolAudioMetadata(
      [
        {
          artist: "Adult Bible Study Guides",
          src: "https://media.example/lesson.mp3",
          target: "en/2026-03/01/01",
        },
        {
          artist: "Ellen G. White Notes",
          src: "https://media.example/notes.mp3",
          target: "en/2026-03/01/01",
        },
      ],
      "2026-03"
    );

    assert.equal(result.length, 1);
    assert.equal(result[0].audioUrl, "https://media.example/lesson.mp3");
  });

  it("rejects insecure, malformed, and non-MP3 media URLs", () => {
    assert.equal(normalizeSabbathSchoolAudioUrl("http://media.example/a.mp3"), null);
    assert.equal(normalizeSabbathSchoolAudioUrl("https://media.example/a.m4a"), null);
    assert.equal(normalizeSabbathSchoolAudioUrl("relative/audio.mp3"), null);
    assert.equal(normalizeSabbathSchoolAudioUrl("not a media URL"), null);

    const result = extractSabbathSchoolAudioMetadata(
      [
        {
          src: "https://media.example/not-audio.pdf",
          target: "en/2026-03/09/01",
        },
      ],
      "2026-03"
    );
    assert.deepEqual(result, []);
  });

  it("ignores media for a different quarter", () => {
    const result = extractSabbathSchoolAudioMetadata(
      [
        {
          src: "https://media.example/old-quarter.mp3",
          target: "en/2026-02/09/01",
        },
      ],
      "2026-03"
    );
    assert.deepEqual(result, []);
  });
});