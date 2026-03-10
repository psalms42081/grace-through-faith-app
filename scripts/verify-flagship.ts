import { db } from "../server/db";
import { kidsStoryScenes, kidsStories } from "../shared/schema";
import { eq } from "drizzle-orm";

async function verify() {
  console.log("[verify-flagship] Checking David and the Giant flagship story...");
  let failures = 0;

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

  if (failures === 0) {
    console.log("[verify-flagship] ALL CHECKS PASSED");
  } else {
    console.error(`[verify-flagship] ${failures} CHECK(S) FAILED`);
    process.exit(1);
  }
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[verify-flagship] FATAL:", err);
    process.exit(1);
  });
