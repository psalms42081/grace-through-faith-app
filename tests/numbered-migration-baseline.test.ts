import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { ADOPTED_SCHEMA_MIGRATIONS } from "../scripts/run-numbered-migrations";

const MUST_BASELINE = [
  "0000_sharp_slyde.sql",
  "0003_remove_hologram_and_scholarly_persona.sql",
  "0008_rebuild_sda_church.sql",
  "0009_bible_small_groups.sql",
  "0010_bible_small_group_live_session.sql",
  "0011_odb_posts.sql",
  "0012_pioneer_chapters.sql",
  "0013_pioneer_readings.sql",
];

const MUST_STILL_APPLY = [
  "0001_sabbath_curriculum_tracks.sql",
  "0002_sabbath_media_columns.sql",
  "0004_devotional_human_authorship.sql",
  "0005_restore_approved_devotional_catalog.sql",
  "0006_egw_chapters.sql",
  "0007_users_sda_church_id.sql",
  "0014_verse_strong_map_source.sql",
];

describe("ADOPTED_SCHEMA_MIGRATIONS", () => {
  it("baselines 0000, 0003, and 0008–0013 on existing schemas", () => {
    assert.deepEqual([...ADOPTED_SCHEMA_MIGRATIONS].sort(), MUST_BASELINE);
  });

  it("only names numbered SQL files that exist in migrations/", () => {
    const files = new Set(
      readdirSync(path.resolve(process.cwd(), "migrations")).filter((name) =>
        /^\d{4}_.+\.sql$/.test(name),
      ),
    );
    for (const filename of ADOPTED_SCHEMA_MIGRATIONS) {
      assert.ok(files.has(filename), `missing ${filename}`);
    }
  });

  it("does not baseline incremental migrations that must still apply", () => {
    for (const filename of MUST_STILL_APPLY) {
      assert.equal(ADOPTED_SCHEMA_MIGRATIONS.has(filename), false, filename);
    }
  });
});
