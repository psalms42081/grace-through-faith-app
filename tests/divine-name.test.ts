import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitDivineNameRuns } from "../lib/divine-name";

describe("splitDivineNameRuns", () => {
  it("keeps LORD inline with surrounding punctuation", () => {
    assert.deepEqual(splitDivineNameRuns("the law of the LORD."), [
      { text: "the law of the ", isDivineName: false },
      { text: "LORD", isDivineName: true },
      { text: ".", isDivineName: false },
    ]);
  });

  it("does not mark Lord or other words", () => {
    assert.deepEqual(splitDivineNameRuns("The Lord is my shepherd"), [
      { text: "The Lord is my shepherd", isDivineName: false },
    ]);
  });

  it("returns empty for empty text", () => {
    assert.deepEqual(splitDivineNameRuns(""), []);
  });
});
