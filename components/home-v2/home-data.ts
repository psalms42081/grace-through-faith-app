// Path B Home v2 — local daily content.
// Copied from app/(tabs)/index.tsx (monolith is under a "do not restructure" rule,
// so these are duplicated rather than exported from the route file).
// If the monolith's lists change, mirror the change here until index-legacy retires.

export const DAILY_VERSE_REFERENCES = [
  "John 3:16",
  "Psalm 23:1",
  "Proverbs 3:5",
  "Philippians 4:13",
  "Joshua 1:9",
  "Isaiah 40:31",
  "Romans 8:28",
];

export const DAILY_REFLECTIONS = [
  { thought: "Grace is not a doctrine to be memorised but a Person to be embraced. Today, let Christ's unmerited favour reshape every anxious thought.", source: "Reflection on Ephesians 2:8-9" },
  { thought: "The cross does not merely pardon the past; it empowers the present. Walk today in the strength of the One who conquered death.", source: "Reflection on Galatians 2:20" },
  { thought: "Sabbath rest is heaven's rhythm set in time \u2014 a weekly reminder that our worth is not in what we produce but in Whose we are.", source: "Reflection on Exodus 20:8-11" },
  { thought: "Prayer is not convincing God to act; it is aligning our hearts with the One who is already working all things for good.", source: "Reflection on Romans 8:28" },
  { thought: "When we behold Christ, we become like Him \u2014 not by straining to imitate, but by gazing until His character becomes our own.", source: "Reflection on 2 Corinthians 3:18" },
  { thought: "Hope is not wishful thinking. It is the anchor of the soul, fastened to the promise of a God who cannot lie.", source: "Reflection on Hebrews 6:19" },
  { thought: "Love your neighbour not because they deserve it, but because you have been loved beyond all deserving. Grace received becomes grace given.", source: "Reflection on 1 John 4:19" },
];

export function dayOfYear(): number {
  return Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
}

export function getTodaysVerse() {
  return {
    reference:
      DAILY_VERSE_REFERENCES[dayOfYear() % DAILY_VERSE_REFERENCES.length],
  };
}

export function getTodaysReflection() {
  return DAILY_REFLECTIONS[dayOfYear() % DAILY_REFLECTIONS.length];
}
