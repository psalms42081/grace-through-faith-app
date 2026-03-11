import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function dedup() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dupes = await client.query(`
      SELECT title, collection_id, array_agg(id ORDER BY 
        CASE WHEN image_url IS NOT NULL THEN 0 ELSE 1 END,
        (SELECT COUNT(*) FROM kids_story_scene WHERE story_id = kids_story.id) DESC,
        (SELECT COUNT(*) FROM kids_progress WHERE story_id = kids_story.id) DESC
      ) as ids
      FROM kids_story
      GROUP BY title, collection_id
      HAVING COUNT(*) > 1
    `);

    if (dupes.rows.length === 0) {
      console.log("[dedup-kids] No duplicates found. Clean.");
      await client.query("COMMIT");
      return;
    }

    console.log(`[dedup-kids] Found ${dupes.rows.length} duplicated title(s)`);

    let totalRemoved = 0;
    let quizzesMigrated = 0;
    let progressMigrated = 0;

    for (const row of dupes.rows) {
      const keepId = row.ids[0];
      const removeIds = row.ids.slice(1);

      console.log(`  "${row.title}": keeping ${keepId}, removing ${removeIds.join(", ")}`);

      for (const badId of removeIds) {
        const progResult = await client.query(
          `UPDATE kids_progress SET story_id = $1 
           WHERE story_id = $2 
           AND NOT EXISTS (SELECT 1 FROM kids_progress WHERE story_id = $1 AND user_id = kids_progress.user_id)`,
          [keepId, badId]
        );
        progressMigrated += progResult.rowCount || 0;

        await client.query("DELETE FROM kids_progress WHERE story_id = $1", [badId]);

        const existingQuestions = await client.query(
          "SELECT question FROM kids_quiz_question WHERE story_id = $1",
          [keepId]
        );
        const existingSet = new Set(existingQuestions.rows.map((r: any) => r.question));

        const badQuestions = await client.query(
          "SELECT id, question FROM kids_quiz_question WHERE story_id = $1",
          [badId]
        );
        for (const q of badQuestions.rows) {
          if (!existingSet.has(q.question)) {
            await client.query(
              "UPDATE kids_quiz_question SET story_id = $1 WHERE id = $2",
              [keepId, q.id]
            );
            quizzesMigrated++;
          }
        }

        await client.query("DELETE FROM kids_quiz_question WHERE story_id = $1", [badId]);
        await client.query("DELETE FROM kids_story_scene WHERE story_id = $1", [badId]);
        await client.query("DELETE FROM dinner_table_topic WHERE story_id = $1", [badId]);
        await client.query("DELETE FROM kids_wonder_cache WHERE story_id = $1", [badId]);
        await client.query("DELETE FROM kids_story WHERE id = $1", [badId]);
        totalRemoved++;
      }
    }

    await client.query("COMMIT");

    console.log(`[dedup-kids] Removed ${totalRemoved} duplicate(s)`);
    console.log(`[dedup-kids] Migrated ${progressMigrated} progress row(s), ${quizzesMigrated} quiz question(s)`);

    const final = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(*) - COUNT(DISTINCT (title, collection_id)) as dupes
      FROM kids_story
    `);
    console.log(`[dedup-kids] Final: ${final.rows[0].total} stories, ${final.rows[0].dupes} duplicate (title, collection_id) pairs`);

    if (parseInt(final.rows[0].dupes) > 0) {
      console.error("[dedup-kids] WARNING: Still have duplicates after cleanup!");
      process.exit(1);
    }
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("[dedup-kids] FAILED:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

dedup();
