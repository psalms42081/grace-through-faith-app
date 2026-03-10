import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  let failures = 0;

  function pass(label: string, detail: string) {
    console.log(`  [PASS] ${label}: ${detail}`);
  }
  function fail(label: string, detail: string) {
    console.error(`  [FAIL] ${label}: ${detail}`);
    failures++;
  }

  console.log("\n=== POST-DEPLOY VERIFICATION ===\n");

  console.log("--- 1. Admin accounts ---");
  const admins = await pool.query(
    "SELECT username, email, role FROM users WHERE email IN ('joehuber0881@gmail.com')"
  );
  for (const row of admins.rows) {
    if (row.role === "admin") {
      pass("Admin role", `${row.username} (${row.email}) role=${row.role}`);
    } else {
      fail("Admin role", `${row.username} (${row.email}) role=${row.role} — expected admin`);
    }
  }
  if (admins.rows.length === 0) {
    fail("Admin role", "No user found with expected admin email");
  }

  console.log("\n--- 2. David flagship scenes ---");
  const scenes = await pool.query(`
    SELECT s.scene_index, s.image_url
    FROM kids_story_scene s
    JOIN kids_story st ON st.id = s.story_id
    WHERE st.title = 'David and the Giant'
    ORDER BY s.scene_index
  `);
  if (scenes.rows.length === 6) {
    pass("Scene count", "6 scenes found");
  } else {
    fail("Scene count", `Expected 6, got ${scenes.rows.length}`);
  }
  for (const row of scenes.rows) {
    if (row.image_url && row.image_url.startsWith("/assets/kids-scenes/david-scene-")) {
      pass(`Scene ${row.scene_index} URL`, row.image_url);
    } else {
      fail(`Scene ${row.scene_index} URL`, `Unexpected: ${row.image_url || "NULL"}`);
    }
  }

  const cleanUrls = scenes.rows.every((r: any) => !r.image_url?.includes("?"));
  if (cleanUrls) {
    pass("Clean URLs", "No query parameters on any scene URL");
  } else {
    const dirty = scenes.rows.filter((r: any) => r.image_url?.includes("?"));
    fail("Clean URLs", `${dirty.length} scene(s) still have query parameters`);
  }

  console.log("\n--- 3. Critical tables ---");
  const tables = [
    ["bible_verse", 30000],
    ["kids_story", 1],
    ["kids_story_scene", 6],
    ["formation_track", 1],
    ["resources", 1],
  ] as const;
  for (const [table, minCount] of tables) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int as cnt FROM ${table}`);
    const cnt = rows[0].cnt;
    if (cnt >= minCount) {
      pass(table, `${cnt} rows (min ${minCount})`);
    } else {
      fail(table, `${cnt} rows — expected >= ${minCount}`);
    }
  }

  console.log("\n--- 4. Asset files ---");
  const fs = await import("fs");
  const path = await import("path");
  const assetsDir = path.resolve(process.cwd(), "assets", "kids-scenes");
  for (let i = 0; i <= 5; i++) {
    const file = `david-scene-${i}.png`;
    const fullPath = path.join(assetsDir, file);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      pass(`Asset ${file}`, `${(stat.size / 1024).toFixed(0)} KB`);
    } else {
      fail(`Asset ${file}`, "FILE MISSING");
    }
  }

  console.log("\n=========================================");
  if (failures === 0) {
    console.log("  ALL CHECKS PASSED");
  } else {
    console.log(`  ${failures} CHECK(S) FAILED`);
  }
  console.log("=========================================\n");

  await pool.end();
  process.exit(failures > 0 ? 1 : 0);
}

verify().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
