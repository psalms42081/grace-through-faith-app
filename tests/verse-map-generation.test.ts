import assert from "node:assert/strict";
import {
  VerseMapGenerationGate,
  refreshVerseMapAfterGeneration,
} from "../lib/verse-map-generation";

const firstVerseKey = "/api/verse-map/first?translation=KJV";
const secondVerseKey = "/api/verse-map/second?translation=KJV";

const gate = new VerseMapGenerationGate();
gate.resetFor(firstVerseKey);

assert.equal(gate.tryStart(firstVerseKey), true, "an uncached verse map starts one automatic generation");
assert.equal(gate.tryStart(firstVerseKey), false, "a pending request cannot start a duplicate generation");

// A failed request leaves the same active key in place, so the automatic gate
// remains closed rather than retrying in a render loop.
assert.equal(gate.tryStart(firstVerseKey), false, "a failed request does not immediately retry automatically");
gate.resetFor(firstVerseKey);
assert.equal(gate.tryStart(firstVerseKey), false, "resetting with the same key does not reopen the gate");

gate.resetFor(secondVerseKey);
assert.equal(gate.tryStart(secondVerseKey), true, "a different verse permits one new automatic generation");

const invalidatedQueries: { queryKey: [string] }[] = [];
refreshVerseMapAfterGeneration(
  {
    invalidateQueries: (filters) => {
      invalidatedQueries.push(filters);
    },
  },
  secondVerseKey,
);
assert.deepEqual(
  invalidatedQueries,
  [{ queryKey: [secondVerseKey] }],
  "a successful generation refreshes the active verse-map query",
);

console.log("Verse-map generation gate tests passed.");