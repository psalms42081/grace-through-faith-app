import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  lastReadMatchesCurrentLesson,
  parseSabbathSchoolLastRead,
  resolveSabbathSchoolContinueDay,
  sabbathSchoolContinueProgressCount,
} from "../lib/sabbath-school-continue";
import { weekdayNameForSabbathSchoolDay } from "../lib/sabbath-school-day-navigation";

const homeSource = readFileSync(
  new URL("../app/(tabs)/home-v2.tsx", import.meta.url),
  "utf8",
);
const cardSource = readFileSync(
  new URL("../components/home-v2/SSGradientCard.tsx", import.meta.url),
  "utf8",
);
const overviewSource = readFileSync(
  new URL("../app/sabbath-school.tsx", import.meta.url),
  "utf8",
);
const dayReaderSource = readFileSync(
  new URL("../app/(tabs)/sabbath-school-day.tsx", import.meta.url),
  "utf8",
);
const containmentSource = readFileSync(
  new URL("../lib/sabbath-school-route-containment.ts", import.meta.url),
  "utf8",
);

const lesson10Days = [
  { dayNumber: 1, date: "29/08/2026", title: "Authentic Christian Ministry" },
  { dayNumber: 2, date: "30/08/2026", title: "Fruits of an Authentic Ministry" },
  { dayNumber: 3, date: "31/08/2026", title: "Suffering and Glory" },
  { dayNumber: 4, date: "01/09/2026", title: "Christ-focused Ministry of Reconciliation" },
  { dayNumber: 5, date: "02/09/2026", title: "Call to Holiness" },
  { dayNumber: 6, date: "03/09/2026", title: "Comfort and Joy" },
  { dayNumber: 7, date: "04/09/2026", title: "Further Thought" },
];

describe("Sabbath School continue target", () => {
  it("uses last-read in the current lesson and falls back to today", () => {
    const today = resolveSabbathSchoolContinueDay({
      days: lesson10Days,
      todayDayNumber: 4,
      lastRead: null,
      currentLessonNumber: 10,
      currentQuarterCode: "2026-03",
    });
    assert.equal(today?.dayNumber, 4);
    assert.equal(weekdayNameForSabbathSchoolDay(today!), "Tuesday");
    assert.equal(sabbathSchoolContinueProgressCount(today), 4);

    const resumed = resolveSabbathSchoolContinueDay({
      days: lesson10Days,
      todayDayNumber: 4,
      lastRead: { lessonNumber: 10, dayNumber: 3, quarterCode: "2026-03" },
      currentLessonNumber: 10,
      currentQuarterCode: "2026-03",
    });
    assert.equal(resumed?.dayNumber, 3);
    assert.equal(weekdayNameForSabbathSchoolDay(resumed!), "Monday");
    assert.equal(sabbathSchoolContinueProgressCount(resumed), 3);
  });

  it("Home Continue card ignores last-read and always uses today", () => {
    assert.doesNotMatch(homeSource, /useSabbathSchoolLastRead/);
    assert.match(homeSource, /lastRead:\s*null/);
    assert.match(cardSource, /Continue — \{dayLabel\}/);
  });

  it("ignores last-read from a previous lesson", () => {
    const continueDay = resolveSabbathSchoolContinueDay({
      days: lesson10Days,
      todayDayNumber: 4,
      lastRead: { lessonNumber: 9, dayNumber: 7, quarterCode: "2026-03" },
      currentLessonNumber: 10,
      currentQuarterCode: "2026-03",
    });
    assert.equal(continueDay?.dayNumber, 4);
    assert.equal(
      lastReadMatchesCurrentLesson(
        { lessonNumber: 9, dayNumber: 7 },
        10,
        "2026-03",
      ),
      false,
    );
  });

  it("does not treat completed-only 0 of 7 as the continue position", () => {
    const continueDay = resolveSabbathSchoolContinueDay({
      days: lesson10Days.map((day) => ({ ...day, completed: false })),
      todayDayNumber: 4,
      lastRead: null,
      currentLessonNumber: 10,
      currentQuarterCode: "2026-03",
    });
    assert.equal(sabbathSchoolContinueProgressCount(continueDay), 4);
    assert.equal(parseSabbathSchoolLastRead("{not json"), null);
  });

  it("sends Home Continue and Daily Rhythm to the day reader, overview via the lesson title", () => {
    assert.match(homeSource, /resolveSabbathSchoolContinueDay/);
    assert.match(
      homeSource,
      /buildSabbathSchoolTabRoute\(\s*"sabbath-school-day"/,
    );
    assert.match(homeSource, /onContinue=\{goToContinueDay\}/);
    assert.match(homeSource, /onOpenOverview=\{goToOverview\}/);
    assert.match(homeSource, /onWatch=\{goToWatch\}/);
    assert.match(homeSource, /SABBATH_SCHOOL_TAB_ROOT/);
    assert.match(homeSource, /buildSabbathSchoolTabRoute\(\s*"sabbath-school-video"/);
    assert.doesNotMatch(
      cardSource,
      /router\.push\("\/\(tabs\)\/ss\/sabbath-school"/,
    );
    assert.match(cardSource, /onPress=\{onContinue\}/);
    assert.match(cardSource, /onPress=\{onOpenOverview\}/);
    assert.match(cardSource, /onPress=\{onWatch\}/);
    assert.match(overviewSource, /resolveSabbathSchoolContinueDay/);
    assert.match(
      overviewSource,
      /sabbathSchoolContinueProgressCount\(\s*currentDay/,
    );
    assert.match(dayReaderSource, /recordLastRead/);
    assert.match(containmentSource, /"sabbath-school-video"/);
  });
});
