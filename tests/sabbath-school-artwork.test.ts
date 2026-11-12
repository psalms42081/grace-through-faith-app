import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  SABBATH_SCHOOL_COVER_FRAME,
  sabbathSchoolCoverUrl,
  sabbathSchoolLessonCoverUrl,
  sabbathSchoolSplashUrl,
} from "../lib/sabbath-school-artwork";

describe("sabbath school artwork urls", () => {
  it("uses the stored quarterly cover and the published splash", () => {
    assert.equal(
      sabbathSchoolCoverUrl("2026-04", "https://sabbath-school.adventech.io/api/v2/en/quarterlies/2026-04/cover.png"),
      "https://sabbath-school.adventech.io/api/v2/en/quarterlies/2026-04/cover.png",
    );
    assert.equal(
      sabbathSchoolSplashUrl("2026-04"),
      "https://sabbath-school.adventech.io/api/v2/images/global/2026-04/splash.png",
    );
    assert.equal(
      sabbathSchoolSplashUrl("2026-04-cq"),
      "https://sabbath-school.adventech.io/api/v2/images/global/2026-04-cq/splash.png",
    );
  });

  it("uses each track's lesson cover path", () => {
    assert.equal(
      sabbathSchoolLessonCoverUrl("2026-04", 7),
      "https://sabbath-school.adventech.io/api/v2/images/global/2026-04/07/cover.png",
    );
    assert.equal(
      sabbathSchoolLessonCoverUrl("2026-04-cq", 1),
      "https://sabbath-school.adventech.io/api/v2/en/quarterlies/2026-04-cq/lessons/01/cover.png",
    );
    assert.equal(sabbathSchoolLessonCoverUrl("not-a-quarter", 1), null);
    assert.equal(sabbathSchoolCoverUrl("", "not-a-url"), null);
  });

  it("uses a 2:3 cover frame and the splash as the Home and lesson-screen background", () => {
    assert.equal(SABBATH_SCHOOL_COVER_FRAME.width / SABBATH_SCHOOL_COVER_FRAME.height, 2 / 3);
    const home = readFileSync(new URL("../components/home-v2/SSGradientCard.tsx", import.meta.url), "utf8");
    const overview = readFileSync(new URL("../app/sabbath-school.tsx", import.meta.url), "utf8");
    const surface = readFileSync(
      new URL("../components/sabbath-school/SabbathSchoolCardSurface.tsx", import.meta.url),
      "utf8",
    );
    assert.match(home, /SabbathSchoolCardSurface/);
    assert.match(overview, /SabbathSchoolCardSurface/);
    assert.match(surface, /contentFit="fill"/);
    assert.match(surface, /blurRadius=\{0\}/);
    assert.doesNotMatch(surface, /contentPosition/);
    assert.match(surface, /style=\{photo\}/);
    assert.match(surface, /width: bannerWidth/);
    assert.match(surface, /uri\.includes\("-cq\/"\)/);
    assert.match(surface, /SABBATH_SCHOOL_PHOTO_BANNER_HEIGHT = 170/);
    assert.match(surface, /FeColorMatrix/);
    assert.match(surface, /LINE_ART_KNOCKOUT/);
    assert.match(surface, /SABBATH_SCHOOL_BANNER_HEIGHT = 150/);
    assert.match(surface, /SABBATH_SCHOOL_BANNER_FADE = 24/);
    assert.match(surface, /cachePolicy="memory-disk"/);
    assert.match(surface, /SABBATH_SCHOOL_COVER_FRAME/);
    assert.match(home, />\s*SABBATH SCHOOL\s*</);
    assert.match(home, /numberOfLines=\{2\}/);
    assert.doesNotMatch(home, /SABBATH SCHOOL\$\{/);
    assert.doesNotMatch(home, /textShadow/);
    assert.doesNotMatch(overview, /textShadow/);
  });
});
