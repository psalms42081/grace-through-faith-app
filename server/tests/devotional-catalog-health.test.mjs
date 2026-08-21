import assert from "node:assert/strict";
import pg from "pg";

const { Pool } = pg;

const approvedTitles = [
  "Foundations of Faith",
  "The Life of Christ",
  "Psalms of Comfort",
  "Women of the Bible",
  "Prophets and Prophecy",
  "Parables of Jesus",
  "Walking Through the Wilderness",
  "The Armor of God",
  "The Sabbath Rest",
  "Daniel's Prophecies — End-Time Visions",
  "God's Health Blueprint",
  "The Heavenly Sanctuary",
  "Death, Sleep, and Resurrection",
  "A Life of Prayer",
  "Wisdom for Life",
  "God's Unfailing Love",
  "Living in Hope",
  "Strength in Weakness",
  "Finding Peace",
  "Grace Upon Grace",
  "The Sermon on the Mount",
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

try {
  const result = await pool.query(
    `SELECT title
       FROM devotional_plan
      WHERE is_published = true
        AND provenance = 'human_curated'
        AND is_ai_generated = false
        AND title = ANY($1::text[])`,
    [approvedTitles],
  );

  const catalogTitles = new Set(result.rows.map((row) => row.title));
  const missingTitles = approvedTitles.filter((title) => !catalogTitles.has(title));

  assert.ok(
    catalogTitles.size >= approvedTitles.length && missingTitles.length === 0,
    `approved devotional catalog must contain all ${approvedTitles.length} reviewed series; missing: ${missingTitles.join(", ") || "none"}`,
  );

  console.log(
    `Devotional catalog health check passed: ${catalogTitles.size}/${approvedTitles.length} approved series are catalog-eligible.`,
  );
} finally {
  await pool.end();
}