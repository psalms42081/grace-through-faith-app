import { db } from "../server/db";
import { kidsStories, kidsCollections } from "../shared/schema";
import { eq } from "drizzle-orm";

const STORY_IMAGES: Record<string, string> = {
  "God Made the Light": "/assets/kids-scenes/creation-light-scene-0.png",
  "God Made the Animals": "/assets/kids-scenes/creation-animals-scene-0.png",
  "God Made Me": "/assets/kids-scenes/creation-people-scene-0.png",
  "God Made the Flowers and Trees": "/assets/kids-scenes/creation-flowers-scene-0.png",
  "God Made the Stars and Moon": "/assets/kids-scenes/creation-stars-scene-0.png",
};

const COLLECTION_IMAGE = "/assets/kids-scenes/creation-collection-cover.png";

async function backfill() {
  console.log("[backfill-creation-images] Updating creation story thumbnails...");

  for (const [title, imageUrl] of Object.entries(STORY_IMAGES)) {
    const result = await db
      .update(kidsStories)
      .set({ imageUrl })
      .where(eq(kidsStories.title, title))
      .returning({ id: kidsStories.id });
    if (result.length > 0) {
      console.log(`  Updated: ${title}`);
    } else {
      console.log(`  Not found (skipped): ${title}`);
    }
  }

  const colResult = await db
    .update(kidsCollections)
    .set({ imageUrl: COLLECTION_IMAGE })
    .where(eq(kidsCollections.title, "God Made Everything"))
    .returning({ id: kidsCollections.id });
  if (colResult.length > 0) {
    console.log(`  Updated collection: God Made Everything`);
  } else {
    console.log(`  Collection not found (skipped): God Made Everything`);
  }

  console.log("[backfill-creation-images] Done.");
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill-creation-images] ERROR:", err);
    process.exit(1);
  });
