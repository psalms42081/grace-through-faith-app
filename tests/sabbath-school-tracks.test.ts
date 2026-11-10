import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  adjacentQuarterCodesToSync,
  curriculumStorageKey,
  nextQuarterBaseCode,
  nextSabbathSchoolTrack,
  parseSabbathSchoolTrackId,
  previousQuarterBaseCode,
  quarterBaseCode,
  quarterCodeForTrack,
  resolveSabbathSchoolTrack,
  sabbathSchoolTrackChipLabel,
  SABBATH_SCHOOL_BACKFILL_FLOOR,
  SABBATH_SCHOOL_TRACKS,
  SYNCED_SABBATH_SCHOOL_TRACKS,
  trackForQuarterCode,
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
const daySource = read("app/(tabs)/sabbath-school-day.tsx");
const quarterSource = read("app/(tabs)/sabbath-school-quarter.tsx");
const gradientCardSource = read("components/home-v2/SSGradientCard.tsx");
const trackSwitchSource = read("components/sabbath-school/TrackSwitch.tsx");
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

  it("keeps the track choice out of Settings", () => {
    assert.doesNotMatch(settingsSource, /InVerse \(Youth\)/);
    assert.doesNotMatch(settingsSource, /handleSelectCurriculum/);
    assert.doesNotMatch(settingsSource, /preferredCurriculum/);
    assert.doesNotMatch(settingsSource, /renderRow\("school-outline", "Adult"/);
  });

  it("shows a two-segment Adult | InVerse control under the Sabbath School title", () => {
    assert.match(overviewSource, /<TrackSegmentedControl/);
    assert.match(overviewSource, /availableTracks\.length > 1 \?/);
    assert.match(overviewSource, /onSelect=\{\(id\) => void setTrack\(id\)\}/);
    // The old header chip and modal picker are gone.
    assert.doesNotMatch(overviewSource, /ss-track-chip/);
    assert.doesNotMatch(overviewSource, /ss-track-picker/);
    assert.doesNotMatch(overviewSource, /showTrackPicker/);
    assert.doesNotMatch(overviewSource, /<Modal/);
    // Segments: one per available track, radio semantics, labels on one line.
    assert.match(trackSwitchSource, /if \(tracks\.length < 2\) return null;/);
    assert.match(trackSwitchSource, /testID="ss-track-segment"/);
    assert.match(trackSwitchSource, /testID=\{`ss-track-option-\$\{track\.id\}`\}/);
    assert.match(trackSwitchSource, /accessibilityRole="radio"/);
    assert.match(trackSwitchSource, /accessibilityState=\{\{ checked: isSelected \}\}/);
    assert.match(trackSwitchSource, /\{track\.shortLabel\}/);
    assert.match(trackSwitchSource, /maxFontSizeMultiplier=\{1\.5\}/);
    assert.match(trackSwitchSource, /segment: \{[\s\S]*?flex: 1,[\s\S]*?minHeight: 38/);
    assert.doesNotMatch(overviewSource, /Cornerstone Connections \(Youth\)/);
  });

  it("lets Home switch tracks from the Sabbath School card", () => {
    assert.match(gradientCardSource, /<TrackSwitchPill/);
    assert.match(gradientCardSource, /onSelectTrack \?/);
    assert.match(homeSource, /tracks=\{availableTracks\}/);
    assert.match(homeSource, /selectedTrack=\{selectedTrack\}/);
    assert.match(homeSource, /onSelectTrack=\{\(id\) => void setTrack\(id\)\}/);
    assert.match(trackSwitchSource, /testID="home-ss-track-pill"/);
    assert.match(trackSwitchSource, /onPress=\{\(\) => onSelect\(next\)\}/);
    assert.match(trackSwitchSource, /Switch to \$\{target\.shortLabel\}/);
    assert.equal(nextSabbathSchoolTrack("adult", ["adult", "inverse"]), "inverse");
    assert.equal(nextSabbathSchoolTrack("inverse", ["adult", "inverse"]), "adult");
    assert.equal(nextSabbathSchoolTrack("adult", ["adult"]), "adult");
  });

  it("picker only lists tracks the API reports with content", () => {
    assert.match(routesSource, /\/api\/sabbath-school\/tracks/);
    assert.match(routesSource, /coalesce\(\$\{sabbathSchoolDays\.contentMarkdown\}, ''\) <> ''/);
    assert.match(trackSwitchSource, /tracks\.map\(\(track\)/);
    assert.doesNotMatch(overviewSource, /SABBATH_SCHOOL_TRACK_IDS\.map/);
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

  it("maps quarter codes to and from tracks", () => {
    assert.equal(quarterBaseCode("2026-04"), "2026-04");
    assert.equal(quarterBaseCode("2026-04-cq"), "2026-04");
    assert.equal(quarterBaseCode("2026-04-cc"), "2026-04");
    assert.equal(quarterBaseCode("2026-01-yaijbgtgtg"), "2026-01");
    assert.equal(quarterBaseCode("latest"), null);
    assert.equal(quarterCodeForTrack("2026-04", "adult"), "2026-04");
    assert.equal(quarterCodeForTrack("2026-04", "inverse"), "2026-04-cq");
    assert.equal(trackForQuarterCode("2026-04"), "adult");
    assert.equal(trackForQuarterCode("2026-04-cq"), "inverse");
    assert.equal(trackForQuarterCode("2026-04-cc"), "cornerstone");
    assert.equal(trackForQuarterCode("2026-04-rt"), null);
    assert.equal(previousQuarterBaseCode("2026-01"), "2025-04");
    assert.equal(nextQuarterBaseCode("2026-04"), "2027-01");
  });

  it("day and quarter readers resolve the chosen track when no quarter code is given", () => {
    assert.match(daySource, /useSabbathSchoolTrack\(\)/);
    assert.match(
      daySource,
      /\/api\/sabbath-school\/lesson\/\$\{lessonNumber\}\?userId=\$\{userId\}&quarterCode=\$\{quarterCode\}&curriculum=\$\{selectedTrack\}/,
    );
    assert.match(
      daySource,
      /\/api\/sabbath-school\/lesson\/\$\{lessonNumber\}\?userId=\$\{userId\}&curriculum=\$\{selectedTrack\}/,
    );
    assert.match(quarterSource, /\/api\/sabbath-school\/quarter\/\$\{quarterCode\}\?curriculum=\$\{selectedTrack\}/);
    // Server: exact code wins, then the same quarter on the track, then the track's current quarterly.
    assert.match(routesSource, /function requestedCurriculum\(req: Request\)/);
    assert.match(routesSource, /resolveQuarterlyForRequest\(quarterCode, requestedCurriculum\(req\)\)/);
    assert.match(routesSource, /const exact = await findQuarterlyByCode\(quarterCode\);\s*if \(exact\) return exact;/);
    assert.match(routesSource, /findQuarterlyByCode\(quarterCodeForTrack\(base, curriculum\)\)/);
    assert.match(routesSource, /return getMostRecentQuarterly\(curriculum \?\? "adult"\);/);
    const quarterRoute = routesSource.split('router.get("/api/sabbath-school/quarter/:quarterCode"')[1].split("router.get(")[0];
    assert.match(quarterRoute, /requestedCurriculum\(req\)/);
    assert.match(quarterRoute, /quarterCodeForTrack\(base, curriculum\)/);
    assert.match(syncSource, /export async function getMostRecentQuarterly\(curriculum: CurriculumType = "adult"\)/);
    assert.match(syncSource, /eq\(sabbathSchoolQuarterlies\.curriculumType, curriculum\)/);
  });

  it("syncs next-quarter prefetch, backfill and staleness per track", () => {
    assert.deepEqual(SABBATH_SCHOOL_BACKFILL_FLOOR, { inverse: "2025-01" });
    const existing = new Set(["2026-04", "2026-03", "2026-04-cq"]);
    const codes = adjacentQuarterCodesToSync("2026-04", existing, 8);
    const adult = codes.filter((c) => c.type === "adult").map((c) => c.code);
    const inverse = codes.filter((c) => c.type === "inverse").map((c) => c.code);
    assert.deepEqual(adult, [
      "2027-01", "2026-02", "2026-01", "2025-04", "2025-03", "2025-02", "2025-01", "2024-04",
    ]);
    // InVerse: next quarter, then history back to the 2025-01 floor only.
    assert.deepEqual(inverse, [
      "2027-01-cq", "2026-03-cq", "2026-02-cq", "2026-01-cq", "2025-04-cq", "2025-03-cq", "2025-02-cq", "2025-01-cq",
    ]);
    assert.match(syncSource, /adjacentQuarterCodesToSync\(currentCode, existingCodes, pastCount\)/);
    assert.match(syncSource, /syncQuarter\(code, lang, false, type\)/);
    assert.match(syncSource, /async function trackNeedsSync\(type: CurriculumType\)/);
    assert.match(syncSource, /SYNCED_SABBATH_SCHOOL_TRACKS\.map\(\(type\) => trackNeedsSync\(type\)\)/);
    assert.match(syncSource, /return results\.some\(Boolean\);/);
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
