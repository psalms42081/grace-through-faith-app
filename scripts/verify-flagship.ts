import { db } from "../server/db";
import { kidsStoryScenes, kidsStories } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as crypto from "crypto";
import * as path from "path";

const CANONICAL_CHECKSUMS: Record<string, string> = {
  "david-scene-0.png": "f095e9c64b9fc25f4842df51d5f39b4d",
  "david-scene-1.png": "72f3509f904ee67618a08daaa6989d7f",
  "david-scene-2.png": "783522481d2a2843748daaca23c0f32b",
  "david-scene-3.png": "b1f051f0d220acfca6ee52bad2623fd4",
  "david-scene-4.png": "415c571cabf084d7c21332770ccecb80",
  "david-scene-5.png": "f2b3a26613a1a10f029d1629bf8de0cf",
};

function md5File(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(data).digest("hex");
}

async function verify() {
  console.log("[verify-flagship] Checking David and the Giant flagship story...");
  let failures = 0;

  console.log("\n--- Asset file verification ---");
  const assetsDir = path.resolve(process.cwd(), "assets", "kids-scenes");
  for (const [filename, expectedMd5] of Object.entries(CANONICAL_CHECKSUMS)) {
    const filePath = path.join(assetsDir, filename);
    if (!fs.existsSync(filePath)) {
      console.error(`[FAIL] Asset missing: ${filename}`);
      failures++;
      continue;
    }
    const actualMd5 = md5File(filePath);
    if (actualMd5 !== expectedMd5) {
      console.error(`[FAIL] Asset changed: ${filename} (expected ${expectedMd5}, got ${actualMd5})`);
      failures++;
    } else {
      console.log(`[PASS] ${filename} checksum verified`);
    }
  }

  console.log("\n--- Database verification ---");
  const [story] = await db
    .select()
    .from(kidsStories)
    .where(eq(kidsStories.title, "David and the Giant"))
    .limit(1);

  if (!story) {
    console.error("[FAIL] Story 'David and the Giant' not found in kids_story");
    process.exit(1);
  }

  console.log(`[verify-flagship] Story ID: ${story.id}`);

  if (story.imageUrl !== "/assets/kids-scenes/david-scene-0.png") {
    console.error(`[FAIL] imageUrl: expected '/assets/kids-scenes/david-scene-0.png', got '${story.imageUrl}'`);
    failures++;
  } else {
    console.log("[PASS] imageUrl correct");
  }

  if (story.memoryVerse !== "The battle is the Lord's.") {
    console.error(`[FAIL] memoryVerse: expected flagship verse, got '${story.memoryVerse}'`);
    failures++;
  } else {
    console.log("[PASS] memoryVerse correct");
  }

  if (story.ageGroup !== "little_lambs") {
    console.error(`[FAIL] ageGroup: expected 'little_lambs', got '${story.ageGroup}'`);
    failures++;
  } else {
    console.log("[PASS] ageGroup correct");
  }

  const scenes = await db
    .select()
    .from(kidsStoryScenes)
    .where(eq(kidsStoryScenes.storyId, story.id))
    .orderBy(kidsStoryScenes.sceneIndex);

  if (scenes.length !== 6) {
    console.error(`[FAIL] Scene count: expected 6, got ${scenes.length}`);
    failures++;
  } else {
    console.log("[PASS] Scene count: 6");
  }

  const expectedImages = [
    "/assets/kids-scenes/david-scene-0.png",
    "/assets/kids-scenes/david-scene-1.png",
    "/assets/kids-scenes/david-scene-2.png",
    "/assets/kids-scenes/david-scene-3.png",
    "/assets/kids-scenes/david-scene-4.png",
    "/assets/kids-scenes/david-scene-5.png",
  ];

  const expectedInteractions = [
    "tap_wiggle", "tap_compare", "tap_glow", "tap_collect", "drag_release", "tap_cheer",
  ];

  for (let i = 0; i < 6; i++) {
    const scene = scenes[i];
    if (!scene) {
      console.error(`[FAIL] Scene ${i}: missing`);
      failures++;
      continue;
    }

    if (scene.imageUrl !== expectedImages[i]) {
      console.error(`[FAIL] Scene ${i} imageUrl: expected '${expectedImages[i]}', got '${scene.imageUrl}'`);
      failures++;
    }

    if (scene.interactionType !== expectedInteractions[i]) {
      console.error(`[FAIL] Scene ${i} interactionType: expected '${expectedInteractions[i]}', got '${scene.interactionType}'`);
      failures++;
    }

    const config = scene.interactionConfig as any;
    if (!config?.isLivingScene) {
      console.error(`[FAIL] Scene ${i}: interactionConfig.isLivingScene not set`);
      failures++;
    }

    if (!config?.cinematicConfig) {
      console.error(`[FAIL] Scene ${i}: interactionConfig.cinematicConfig missing`);
      failures++;
    }
  }

  console.log("\n--- Scene 4 sling calibration ---");
  const EXPECTED_SLING = { x: 0.62, y: 0.30 };
  const EXPECTED_TARGET = { x: 0.18, y: 0.28 };
  const scene4 = scenes[4];
  if (scene4) {
    const config = scene4.interactionConfig as any;
    const sling = config?.cinematicConfig?.slingArea;
    const target = config?.cinematicConfig?.targetArea;
    const slingTop = config?.slingArea;
    const targetTop = config?.targetArea;
    if (!sling || !target) {
      console.error("[FAIL] Scene 4: cinematicConfig slingArea/targetArea missing");
      failures++;
    } else {
      console.log(`  cinematicConfig.slingArea: (${sling.x}, ${sling.y})`);
      console.log(`  cinematicConfig.targetArea: (${target.x}, ${target.y})`);
      if (sling.x !== EXPECTED_SLING.x || sling.y !== EXPECTED_SLING.y) {
        console.error(`[FAIL] Scene 4 slingArea mismatch: expected (${EXPECTED_SLING.x}, ${EXPECTED_SLING.y})`);
        failures++;
      } else {
        console.log("[PASS] Scene 4 slingArea exact match");
      }
      if (target.x !== EXPECTED_TARGET.x || target.y !== EXPECTED_TARGET.y) {
        console.error(`[FAIL] Scene 4 targetArea mismatch: expected (${EXPECTED_TARGET.x}, ${EXPECTED_TARGET.y})`);
        failures++;
      } else {
        console.log("[PASS] Scene 4 targetArea exact match");
      }
    }
    if (slingTop && targetTop) {
      if (slingTop.x !== EXPECTED_SLING.x || slingTop.y !== EXPECTED_SLING.y ||
          targetTop.x !== EXPECTED_TARGET.x || targetTop.y !== EXPECTED_TARGET.y) {
        console.error("[FAIL] Scene 4 top-level slingArea/targetArea don't match cinematicConfig");
        failures++;
      } else {
        console.log("[PASS] Scene 4 top-level coordinates match cinematicConfig");
      }
    }
  }

  if (failures === 0) {
    console.log("\n[verify-flagship] ALL CHECKS PASSED");
  } else {
    console.error(`\n[verify-flagship] ${failures} CHECK(S) FAILED`);
    process.exit(1);
  }
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[verify-flagship] FATAL:", err);
    process.exit(1);
  });
