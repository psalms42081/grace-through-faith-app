import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function reconcile() {
  const client = await pool.connect();
  try {
    const { rows: uniqueIndexes } = await client.query(`
      SELECT i.relname AS index_name, t.relname AS table_name,
             array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE ix.indisunique AND NOT ix.indisprimary
        AND t.relnamespace = 'public'::regnamespace
        AND NOT EXISTS (
          SELECT 1 FROM pg_constraint c
          WHERE c.conindid = ix.indexrelid AND c.contype = 'u'
        )
      GROUP BY i.relname, t.relname
    `);

    for (const idx of uniqueIndexes) {
      const cols = Array.isArray(idx.columns) ? idx.columns.join(', ') : String(idx.columns);
      console.log(`Converting index ${idx.index_name} on ${idx.table_name}(${cols}) to constraint...`);
      try {
        await client.query(`ALTER TABLE "${idx.table_name}" ADD CONSTRAINT "${idx.index_name}" UNIQUE USING INDEX "${idx.index_name}"`);
        console.log(`  OK`);
      } catch (err: any) {
        if (err.code === '42710') {
          console.log(`  Already exists, skipping`);
        } else {
          console.log(`  Failed: ${err.message}`);
        }
      }
    }

    try {
      const { rows: emailIdx } = await client.query(
        `SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_unique' AND indexdef LIKE '%WHERE%'`
      );
      if (emailIdx.length > 0) {
        await client.query(`DROP INDEX IF EXISTS users_email_unique`);
        await client.query(`ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)`);
        console.log("Converted partial index users_email_unique to full constraint");
      }
    } catch (err: any) {
      console.log(`users_email_unique fix: ${err.message}`);
    }

    const renames: [string, string, string][] = [
      ["families", "families_invite_code_key", "families_invite_code_unique"],
      ["prayer_groups", "prayer_groups_join_code_key", "prayer_groups_join_code_unique"],
      ["resources", "resources_slug_key", "resources_slug_unique"],
      ["gc_exploration_cache", "gc_exploration_cache_node_id_key", "gc_exploration_cache_node_id_unique"],
      ["sabbath_school_discussion_prep", "sabbath_school_discussion_prep_lesson_id_key", "sabbath_school_discussion_prep_lesson_id_unique"],
      ["sabbath_school_quarterly", "sabbath_school_quarterly_quarter_code_key", "sabbath_school_quarterly_quarter_code_unique"],
      ["search_cache", "search_cache_query_hash_key", "search_cache_query_hash_unique"],
    ];

    for (const [table, oldName, newName] of renames) {
      const { rows } = await client.query(
        `SELECT 1 FROM pg_constraint WHERE conname = $1`, [oldName]
      );
      if (rows.length > 0) {
        const { rows: existing } = await client.query(
          `SELECT 1 FROM pg_constraint WHERE conname = $1`, [newName]
        );
        if (existing.length === 0) {
          try {
            await client.query(`ALTER TABLE "${table}" RENAME CONSTRAINT "${oldName}" TO "${newName}"`);
            console.log(`Renamed ${oldName} -> ${newName}`);
          } catch (err: any) {
            console.log(`Failed to rename ${oldName}: ${err.message}`);
          }
        }
      }
    }

    console.log("Constraint reconciliation complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

reconcile().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
