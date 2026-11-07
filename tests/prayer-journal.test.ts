import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isPrayerAnswered } from "../lib/prayer-journal";

describe("prayer answered state", () => {
  it("treats only an explicit true as answered", () => {
    assert.equal(isPrayerAnswered(true), true);
    assert.equal(isPrayerAnswered(false), false);
    assert.equal(isPrayerAnswered(null), false);
    assert.equal(isPrayerAnswered(undefined), false);
    assert.equal(isPrayerAnswered("false"), false);
    assert.equal(isPrayerAnswered("true"), false);
  });

  it("labels the action Mark answered and keeps new rows out of the Answered list", () => {
    const screen = readFileSync(new URL("../app/prayer-journal.tsx", import.meta.url), "utf8");
    const create = readFileSync(new URL("../server/routes/user.ts", import.meta.url), "utf8");
    assert.match(screen, /Mark answered/);
    assert.match(screen, /isPrayerAnswered\(p\.answered\)/);
    assert.match(screen, /!isPrayerAnswered\(p\.answered\)/);
    assert.doesNotMatch(screen, /: "Answered"/);
    assert.match(create, /answered: false/);
  });
});
