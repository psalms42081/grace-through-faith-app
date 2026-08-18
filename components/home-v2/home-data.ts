// Path B Home v2 — local daily content.
// Copied from app/(tabs)/index.tsx (monolith is under a "do not restructure" rule,
// so these are duplicated rather than exported from the route file).
// If the monolith's lists change, mirror the change here until index-legacy retires.

export const DAILY_VERSES = [
  { text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", reference: "John 3:16" },
  { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding.", reference: "Proverbs 3:5" },
  { text: "I can do all things through Christ which strengtheneth me.", reference: "Philippians 4:13" },
  { text: "Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest.", reference: "Joshua 1:9" },
  { text: "But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.", reference: "Isaiah 40:31" },
  { text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.", reference: "Romans 8:28" },
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
  return DAILY_VERSES[dayOfYear() % DAILY_VERSES.length];
}

export function getTodaysReflection() {
  return DAILY_REFLECTIONS[dayOfYear() % DAILY_REFLECTIONS.length];
}
