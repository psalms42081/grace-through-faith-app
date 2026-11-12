import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
});
