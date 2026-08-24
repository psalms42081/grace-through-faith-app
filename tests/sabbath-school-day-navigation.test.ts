import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  buildSabbathSchoolDayNavigator,
  buildSabbathSchoolDayRoute,
} from "../lib/sabbath-school-day-navigation";

const dayReaderSource = readFileSync(
  new URL("../app/sabbath-school-day.tsx", import.meta.url),
  "utf8",
);

describe("Sabbath School direct day navigation", () => {
  it("keeps the lesson sequence and creates one-tap weekday labels", () => {
    const items = buildSabbathSchoolDayNavigator([
      { dayNumber: 4, date: "19/08/2026" },
      { dayNumber: 1, date: "16/08/2026" },
      { dayNumber: 2, date: "17/08/2026" },
      { dayNumber: 3, date: "18/08/2026" },
    ]);

    assert.deepEqual(
      items.map((item) => [item.dayNumber, item.shortLabel]),
      [
        [1, "SUN"],
        [2, "MON"],
        [3, "TUE"],
        [4, "WED"],
      ],
    );
  });

  it("preserves the selected quarter when opening any day directly", () => {
    assert.equal(
      buildSabbathSchoolDayRoute({
        lessonNumber: 7,
        dayNumber: 6,
        quarterCode: "2026-03-cq",
      }),
      "/sabbath-school-day?lessonNumber=7&dayNumber=6&quarterCode=2026-03-cq",
    );
  });

  it("renders a persistent, accessible day picker alongside previous/next controls", () => {
    assert.match(dayReaderSource, /testID="ss-day-picker"/);
    assert.match(dayReaderSource, /testID=\{`ss-day-picker-\$\{item\.dayNumber\}`\}/);
    assert.match(dayReaderSource, /accessibilityRole="tab"/);
    assert.match(dayReaderSource, /accessibilityLabel="Previous lesson day"/);
    assert.match(dayReaderSource, /accessibilityLabel="Next lesson day"/);
    assert.match(dayReaderSource, /buildSabbathSchoolDayRoute/);
  });
});