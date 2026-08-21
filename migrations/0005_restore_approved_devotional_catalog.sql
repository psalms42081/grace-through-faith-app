BEGIN;
-- Editorial review decision recorded 2026-08-21.
-- All 21 legacy series were reviewed by the Grace Through Faith editorial team,
-- confirmed human-authored, and approved for catalog publication.
-- AI-generated or uncertain series remain legacy_unclassified and hidden.
-- Provenance trigger fires automatically and creates audit records for each row.
--> statement-breakpoint
UPDATE "devotional_plan"
SET
  "provenance"      = 'human_curated',
  "curated_by"      = 'Test Devotionals',
  "curated_at"      = '2026-08-21 01:30:00+00'::timestamptz,
  "is_published"    = true,
  "is_ai_generated" = false
WHERE "title" = ANY(ARRAY[
  'Foundations of Faith',
  'The Life of Christ',
  'Psalms of Comfort',
  'Women of the Bible',
  'Prophets and Prophecy',
  'Parables of Jesus',
  'Walking Through the Wilderness',
  'The Armor of God',
  'The Sabbath Rest',
  'Daniel''s Prophecies — End-Time Visions',
  'God''s Health Blueprint',
  'The Heavenly Sanctuary',
  'Death, Sleep, and Resurrection',
  'A Life of Prayer',
  'Wisdom for Life',
  'God''s Unfailing Love',
  'Living in Hope',
  'Strength in Weakness',
  'Finding Peace',
  'Grace Upon Grace',
  'The Sermon on the Mount'
]::text[])
  AND "provenance" = 'legacy_unclassified'
  AND ("is_ai_generated" IS NOT TRUE);
--> statement-breakpoint
COMMIT;
