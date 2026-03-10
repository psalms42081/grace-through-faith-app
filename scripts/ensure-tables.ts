import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function ensureTables() {
  const missing: string[] = [];

  const check = async (name: string) => {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${name}
      ) as exists
    `);
    return (result.rows[0] as any).exists === true;
  };

  if (!(await check("resources"))) {
    missing.push("resources");
    await db.execute(sql`
      CREATE TABLE resources (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(255) NOT NULL UNIQUE,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL,
        tier VARCHAR(10) NOT NULL DEFAULT 'free',
        cover_image_url TEXT,
        content_json JSONB NOT NULL,
        source_ref JSONB,
        source_packet_id VARCHAR,
        prompt_version VARCHAR(20),
        generation_status VARCHAR(20) DEFAULT 'completed',
        review_status VARCHAR(20) DEFAULT 'pending',
        age_group VARCHAR(20),
        estimated_minutes INTEGER DEFAULT 15,
        tags JSONB DEFAULT '[]',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        generated_by VARCHAR(20) NOT NULL DEFAULT 'ai',
        reviewed_at TIMESTAMP,
        reviewed_by VARCHAR,
        review_notes TEXT,
        previous_content_json JSONB,
        supersedes_resource_id VARCHAR,
        published_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS resources_status_idx ON resources(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS resources_category_idx ON resources(category)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS resources_tier_idx ON resources(tier)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS resources_type_idx ON resources(resource_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS resources_source_packet_idx ON resources(source_packet_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS resources_generation_status_idx ON resources(generation_status)`);
    console.log("Created table: resources");
  }

  if (!(await check("resource_review_notes"))) {
    missing.push("resource_review_notes");
    await db.execute(sql`
      CREATE TABLE resource_review_notes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_id VARCHAR NOT NULL,
        action VARCHAR(30) NOT NULL,
        status_from VARCHAR(20),
        status_to VARCHAR(20),
        notes TEXT,
        created_by VARCHAR NOT NULL,
        is_system BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS review_notes_resource_idx ON resource_review_notes(resource_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS review_notes_created_at_idx ON resource_review_notes(created_at)`);
    console.log("Created table: resource_review_notes");
  }

  if (!(await check("resource_progress"))) {
    missing.push("resource_progress");
    await db.execute(sql`
      CREATE TABLE resource_progress (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        resource_id VARCHAR NOT NULL,
        started BOOLEAN NOT NULL DEFAULT true,
        completed BOOLEAN NOT NULL DEFAULT false,
        progress_percent INTEGER NOT NULL DEFAULT 0,
        last_accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        notes TEXT
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS progress_user_resource ON resource_progress(user_id, resource_id)`);
    console.log("Created table: resource_progress");
  }

  if (!(await check("resource_bookmarks"))) {
    missing.push("resource_bookmarks");
    await db.execute(sql`
      CREATE TABLE resource_bookmarks (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        resource_id VARCHAR NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS bookmark_user_resource ON resource_bookmarks(user_id, resource_id)`);
    console.log("Created table: resource_bookmarks");
  }

  if (!(await check("user_feedback"))) {
    missing.push("user_feedback");
    await db.execute(sql`
      CREATE TABLE user_feedback (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        topic VARCHAR(32) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("Created table: user_feedback");
  }

  if (missing.length === 0) {
    console.log("All critical tables verified present");
  } else {
    console.log(`Created ${missing.length} missing table(s): ${missing.join(", ")}`);
  }

  process.exit(0);
}

ensureTables().catch((err) => {
  console.error("ensure-tables failed:", err);
  process.exit(1);
});
