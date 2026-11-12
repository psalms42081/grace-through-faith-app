import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { pacePlanDays } from "../lib/plan-pacing";

describe("devotional plan pacing", () => {
  const days = [1, 2, 3];

  it("starts on day 1 and keeps later days locked", () => {
    const pace = pacePlanDays({ dayNumbers: days, completed: [], today: "2026-11-04" });
    assert.deepEqual(
      pace.map((day) => [day.dayNumber, day.status, day.canComplete]),
      [
        [1, "open", true],
        [2, "locked", false],
        [3, "locked", false],
      ],
    );
  });

  it("opens the next day the same local date and refuses a second completion", () => {
    const pace = pacePlanDays({
      dayNumbers: days,
      completed: [{ dayNumber: 1, localDate: "2026-11-04" }],
      today: "2026-11-04",
    });
    assert.equal(pace[0]?.status, "complete");
    assert.equal(pace[1]?.status, "open");
    assert.equal(pace[1]?.canComplete, false);
    assert.equal(pace[2]?.status, "locked");
    assert.equal(pace[2]?.canComplete, false);
  });

  it("allows the opened day on the next local date", () => {
    const pace = pacePlanDays({
      dayNumbers: days,
      completed: [{ dayNumber: 1, localDate: "2026-11-04" }],
      today: "2026-11-05",
    });
    assert.equal(pace[1]?.canComplete, true);
    assert.equal(pace[2]?.status, "locked");
  });
});

describe("devotional plan pacing wiring", () => {
  const root = process.cwd();

  it("clears the completed flag when the open day changes and asks the server to pace", () => {
    const screen = readFileSync(
      path.join(root, "components", "devotions-v2", "DevotionalDayPreview.tsx"),
      "utf8",
    );
    const complete = readFileSync(path.join(root, "server", "routes", "verse-tools.ts"), "utf8");
    assert.match(screen, /devotional-day-outline/);
    assert.match(screen, /canComplete/);
    assert.match(screen, /This day is complete when you reach the end of the reading/);
    assert.match(screen, /Next reading tomorrow/);
    assert.doesNotMatch(screen, /Mark day complete/);
    assert.doesNotMatch(screen, /setComplete\(true\)/);
    const progress = readFileSync(path.join(root, "server", "services", "plan-reading-progress.ts"), "utf8");
    const pacing = readFileSync(path.join(root, "lib", "plan-reading.ts"), "utf8");
    assert.match(pacing, /pacePlanDays/);
    assert.match(progress, /planCardState/);
    assert.match(progress, /completedLocalDate/);
    assert.match(complete, /recorded when its reading is finished/);
  });
});
