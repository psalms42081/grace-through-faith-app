import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  curriculumStorageKey,
  parseSabbathSchoolTrackId,
  resolveSabbathSchoolTrack,
  sabbathSchoolTrackChipLabel,
  SABBATH_SCHOOL_TRACKS,
  SYNCED_SABBATH_SCHOOL_TRACKS,
  tracksFromAvailableIds,
} from "../lib/sabbath-school-tracks";
import { PathB } from "../constants/colors";

function read(rel: string) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}

const settingsSource = read("app/settings.tsx");
const overviewSource = read("app/sabbath-school.tsx");
const homeSource = read("app/(tabs)/home-v2.tsx");
const videoSource = read("app/(tabs)/sabbath-school-video.tsx");
const syncSource = read("server/services/sabbath-school-sync.ts");
const routesSource = read("server/routes/sabbath-school.ts");
const notifSource = read("components/profile/NotificationSettings.tsx");
const switchSource = read("components/settings/PathBSwitch.tsx");

describe("Sabbath School track selection", () => {
  it("labels InVerse as Young Adult and Cornerstone as Youth", () => {
    assert.equal(SABBATH_SCHOOL_TRACKS.adult.pickerLabel, "Adult");
    assert.equal(SABBATH_SCHOOL_TRACKS.inverse.pickerLabel, "InVerse (Young Adult)");
    assert.equal(
      SABBATH_SCHOOL_TRACKS.cornerstone.pickerLabel,
      "Cornerstone Connections (Youth)",
    );
    assert.equal(sabbathSchoolTrackChipLabel("adult"), "Adult");
    assert.equal(sabbathSchoolTrackChipLabel("inverse"), "InVerse");
    assert.doesNotMatch(SABBATH_SCHOOL_TRACKS.inverse.pickerLabel, /Youth/i);
  });

  it("persists the preference per user and falls back off empty tracks", () => {
    assert.equal(curriculumStorageKey("user-123"), "@gtf/setting-curriculum:user-123");
    assert.equal(curriculumStorageKey("guest"), "@gtf/setting-curriculum");
    assert.equal(parseSabbathSchoolTrackId("inverse"), "inverse");
    assert.equal(parseSabbathSchoolTrackId("nope"), "adult");
    assert.equal(resolveSabbathSchoolTrack("inverse", ["adult", "inverse"]), "inverse");
    assert.equal(resolveSabbathSchoolTrack("cornerstone", ["adult", "inverse"]), "adult");
    assert.equal(resolveSabbathSchoolTrack("inverse", ["adult"]), "adult");
    assert.deepEqual(
      tracksFromAvailableIds(["adult", "cornerstone", "inverse"]).map((t) => t.id),
      ["adult", "inverse", "cornerstone"],
    );
    assert.deepEqual(tracksFromAvailableIds(["adult"]).map((t) => t.id), ["adult"]);
  });

  it("removes the Adult / InVerse radio from Settings", () => {
    assert.doesNotMatch(settingsSource, /InVerse \(Youth\)/);
    assert.doesNotMatch(settingsSource, /handleSelectCurriculum/);
    assert.doesNotMatch(settingsSource, /preferredCurriculum/);
    assert.doesNotMatch(settingsSource, /renderRow\("school-outline", "Adult"/);
    assert.match(overviewSource, /testID="ss-track-chip"/);
    assert.match(overviewSource, /testID="ss-track-picker"/);
    assert.match(overviewSource, /track\.pickerLabel/);
    assert.match(overviewSource, /availableTracks\.map/);
    assert.doesNotMatch(overviewSource, /Cornerstone Connections \(Youth\)/);
  });

  it("picker only lists tracks the API reports with content", () => {
    assert.match(routesSource, /\/api\/sabbath-school\/tracks/);
    assert.match(routesSource, /coalesce\(\$\{sabbathSchoolDays\.contentMarkdown\}, ''\) <> ''/);
    assert.match(overviewSource, /availableTracks\.map/);
    assert.doesNotMatch(
      overviewSource,
      /SABBATH_SCHOOL_TRACK_IDS\.map/,
    );
    assert.deepEqual(SYNCED_SABBATH_SCHOOL_TRACKS, ["adult", "inverse"]);
    assert.match(syncSource, /SYNCED_SABBATH_SCHOOL_TRACKS/);
    assert.doesNotMatch(
      syncSource.split("getQuarterCodesForAllCurriculums")[1].split("function ")[0],
      /cornerstone/,
    );
  });

  it("swaps the Home SS card, Daily Rhythm, and Watch lesson with the selected track", () => {
    assert.match(homeSource, /useSabbathSchoolTrack/);
    assert.match(homeSource, /curriculum=\$\{selectedTrack\}/);
    assert.match(homeSource, /onContinue=\{goToContinueDay\}/);
    assert.match(videoSource, /curriculum=\$\{selectedTrack\}/);
    assert.match(overviewSource, /curriculum=\$\{selectedTrack\}/);
  });

  it("uses a coral track and white knob on Settings switches", () => {
    assert.equal(PathB.coral, "#E8604C");
    assert.match(switchSource, /true:\s*PathB\.coral/);
    assert.match(switchSource, /PATH_B_SWITCH_THUMB = "#FFFFFF"/);
    assert.match(settingsSource, /PathBSwitch/);
    assert.doesNotMatch(settingsSource, /goldSwitch/);
    assert.match(notifSource, /PathBSwitch/);
    assert.doesNotMatch(notifSource, /thumbColor=\{enabled \? theme\.accent/);
    assert.match(switchSource, /thumbColor=\{PATH_B_SWITCH_THUMB\}/);
  });
});
