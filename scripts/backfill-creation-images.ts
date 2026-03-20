import { db } from "../server/db";
import { kidsStories, kidsCollections, kidsStoryScenes } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const STORY_IMAGES: Record<string, string> = {
  "God Made the Light": "/assets/kids-scenes/creation-light-scene-0.png",
  "God Made the Animals": "/assets/kids-scenes/creation-animals-scene-0.png",
  "God Made Me": "/assets/kids-scenes/creation-me-scene-0.png",
  "God Made the Flowers and Trees": "/assets/kids-scenes/creation-flowers-scene-0.png",
  "God Made the Stars and Moon": "/assets/kids-scenes/creation-stars-scene-0.png",
};

const COLLECTION_IMAGE = "/assets/kids-scenes/creation-collection-cover.png";
const HEROES_COLLECTION_IMAGE = "/assets/kids-scenes/heroes-collection-cover.png";

const SCENE_IMAGES: Record<string, Record<number, string>> = {
  "God Made Me": {
    0: "/assets/kids-scenes/creation-me-scene-0.png",
    1: "/assets/kids-scenes/creation-me-scene-1.png",
    2: "/assets/kids-scenes/creation-me-scene-2.png",
    3: "/assets/kids-scenes/creation-me-scene-3.png",
    4: "/assets/kids-scenes/creation-me-scene-4.png",
    5: "/assets/kids-scenes/creation-me-scene-5.png",
  },
  "God Made the Animals": {
    0: "/assets/kids-scenes/creation-animals-scene-0.png",
    1: "/assets/kids-scenes/creation-animals-scene-1.png",
    2: "/assets/kids-scenes/creation-animals-scene-2.png",
    3: "/assets/kids-scenes/creation-animals-scene-3.png",
    4: "/assets/kids-scenes/creation-animals-scene-4.png",
  },
  "God Made the Light": {
    0: "/assets/kids-scenes/creation-light-scene-0.png",
    1: "/assets/kids-scenes/creation-light-scene-1.png",
    2: "/assets/kids-scenes/creation-light-scene-2.png",
    3: "/assets/kids-scenes/creation-light-scene-3.png",
    4: "/assets/kids-scenes/creation-light-scene-4.png",
    5: "/assets/kids-scenes/creation-light-scene-5.png",
  },
};

const STARS_SCENES = [
  {
    sceneIndex: 0,
    narration: "Have you ever looked up at the sky at night? What do you see? Stars! Lots and lots of twinkling stars. And the big, bright moon shining down. God made all of those!",
    illustrationPrompt: "Dark sky transforming as bright twinkling stars appear one by one. A large glowing moon rises, casting gentle silver light over hills.",
    imageUrl: "/assets/kids-scenes/creation-stars-scene-0.png",
    mood: "AWE",
  },
  {
    sceneIndex: 1,
    narration: "On the fourth day of creation, God made the sun, the moon, and all the stars. The sun is a giant ball of light that keeps us warm and helps plants grow. Without the sun, the world would be cold and dark. God knew we needed it!",
    illustrationPrompt: "Brilliant golden sun rising over a green landscape, warming flowers and trees. Morning light spreading across the world.",
    imageUrl: "/assets/kids-scenes/creation-stars-scene-1.png",
    mood: "JOY",
  },
  {
    sceneIndex: 2,
    narration: "God also made the moon. The moon is like a nightlight in the sky. Sometimes it is a big round circle, and sometimes it is just a tiny sliver. But it is always there, shining gently in the darkness.",
    illustrationPrompt: "Full moon glowing gently in deep blue night sky. Trees silhouetted below. Peaceful serene bedtime scene.",
    imageUrl: "/assets/kids-scenes/creation-stars-scene-2.png",
    mood: "PEACE",
  },
  {
    sceneIndex: 3,
    narration: "And then there are the stars! God made more stars than anyone could ever count. Billions and billions of them! Some are so far away that their light takes years and years to reach your eyes. Every twinkle you see is a star that God placed in the sky.",
    illustrationPrompt: "Night sky filled with billions of twinkling stars and constellations. A child sits on hillside gazing up in wonder.",
    imageUrl: "/assets/kids-scenes/creation-stars-scene-3.png",
    mood: "AWE",
  },
  {
    sceneIndex: 4,
    narration: "The Bible says that God knows every single star by name. He calls each one! If God cares about every star in the sky, just imagine how much He cares about you. You are worth more to God than all the stars put together.",
    illustrationPrompt: "Warm glowing stars with gentle divine light surrounding them. Each star has a soft unique glow. Loving warm atmosphere.",
    imageUrl: "/assets/kids-scenes/creation-stars-scene-4.png",
    mood: "LOVE",
  },
  {
    sceneIndex: 5,
    narration: "Tonight, if it is clear outside, ask a grown-up to take you out and look at the stars. As you look up at that big sky full of lights, remember that the same God who hung every star in space loves you and is watching over you right now.",
    illustrationPrompt: "Parent and child lying on blanket outdoors looking at star-filled sky. Fireflies glow nearby. Warm bonding moment.",
    imageUrl: "/assets/kids-scenes/creation-stars-scene-5.png",
    mood: "PEACE",
  },
];

const FLOWERS_SCENES = [
  {
    sceneIndex: 0,
    narration: "After God made the dry land and the oceans, the land looked very bare and brown. There were no flowers, no trees, no grass — nothing green at all. But God had a beautiful plan!",
    illustrationPrompt: "Bare brown empty land with first tiny green shoots pushing through the soil. Hopeful new beginnings.",
    imageUrl: "/assets/kids-scenes/creation-flowers-scene-0.png",
    mood: "AWE",
  },
  {
    sceneIndex: 1,
    narration: "God said, 'Let the land grow plants and trees!' And right away, the most wonderful things started to happen. Green grass pushed up out of the ground. Tiny flowers began to bloom in every color you can think of — red, yellow, purple, blue, pink, and white!",
    illustrationPrompt: "Explosion of colorful flowers blooming — red roses, yellow daisies, purple tulips, pink orchids. A rainbow of colors filling a garden.",
    imageUrl: "/assets/kids-scenes/creation-flowers-scene-1.png",
    mood: "JOY",
  },
  {
    sceneIndex: 2,
    narration: "Trees grew tall and strong with big green leaves. Some trees grew apples. Some grew oranges. Some grew bananas and peaches and cherries. Yummy! God made fruit trees so people and animals would have delicious food to eat.",
    illustrationPrompt: "Tall strong trees with big green leaves. Apple trees, orange trees, cherry trees heavy with colorful fruit. A lush orchard paradise.",
    imageUrl: "/assets/kids-scenes/creation-flowers-scene-2.png",
    mood: "JOY",
  },
  {
    sceneIndex: 3,
    narration: "God also made bushes with berries, vines with grapes, and fields of wheat that could be made into bread. He made giant sunflowers that turn their faces toward the sun. He made tiny daisies and roses that smell so sweet.",
    illustrationPrompt: "Giant sunflowers turning toward the sun. Tiny daisies, sweet-smelling roses. A child kneeling to smell a beautiful flower.",
    imageUrl: "/assets/kids-scenes/creation-flowers-scene-3.png",
    mood: "PEACE",
  },
  {
    sceneIndex: 4,
    narration: "Have you ever held a flower up close and looked at it really carefully? Each petal is so soft and perfectly shaped. The colors are so beautiful. That is because God designed every single one. He painted every petal. He shaped every leaf.",
    illustrationPrompt: "Close-up of a beautiful flower with detailed soft petals, dewdrops glistening. A child's hands gently holding the flower.",
    imageUrl: "/assets/kids-scenes/creation-flowers-scene-4.png",
    mood: "AWE",
  },
  {
    sceneIndex: 5,
    narration: "God looked at all the plants and flowers and trees and said, 'This is good.' The whole earth was becoming a beautiful garden, all because of God's love and creativity. The next time you see a pretty flower or a big tall tree, remember — God made that!",
    illustrationPrompt: "Beautiful lush garden in full bloom. Every type of plant and flower imaginable. Butterflies flying. A nature path inviting exploration.",
    imageUrl: "/assets/kids-scenes/creation-flowers-scene-5.png",
    mood: "LOVE",
  },
];

async function backfill() {
  console.log("[backfill] Updating creation story thumbnails...");

  for (const [title, imageUrl] of Object.entries(STORY_IMAGES)) {
    const result = await db
      .update(kidsStories)
      .set({ imageUrl })
      .where(eq(kidsStories.title, title))
      .returning({ id: kidsStories.id });
    if (result.length > 0) {
      console.log(`  Updated story thumbnail: ${title}`);
    } else {
      console.log(`  Not found (skipped): ${title}`);
    }
  }

  console.log("[backfill] Updating collection covers...");
  const colUpdates: [string, string][] = [
    ["God Made Everything", COLLECTION_IMAGE],
    ["Heroes of Faith", HEROES_COLLECTION_IMAGE],
  ];
  for (const [title, imageUrl] of colUpdates) {
    const result = await db
      .update(kidsCollections)
      .set({ imageUrl })
      .where(eq(kidsCollections.title, title))
      .returning({ id: kidsCollections.id });
    console.log(
      result.length > 0
        ? `  Updated collection: ${title}`
        : `  Collection not found (skipped): ${title}`
    );
  }

  console.log("[backfill] Updating existing scene images...");
  for (const [storyTitle, scenes] of Object.entries(SCENE_IMAGES)) {
    const storyRows = await db
      .select({ id: kidsStories.id })
      .from(kidsStories)
      .where(eq(kidsStories.title, storyTitle));
    if (!storyRows.length) {
      console.log(`  Story not found: ${storyTitle}`);
      continue;
    }
    const storyId = storyRows[0].id;
    for (const [idx, imageUrl] of Object.entries(scenes)) {
      await db
        .update(kidsStoryScenes)
        .set({ imageUrl })
        .where(
          and(
            eq(kidsStoryScenes.storyId, storyId),
            eq(kidsStoryScenes.sceneIndex, Number(idx))
          )
        );
    }
    console.log(
      `  Updated ${Object.keys(scenes).length} scene images for: ${storyTitle}`
    );
  }

  console.log("[backfill] Creating missing scenes for Stars and Moon...");
  const starsRows = await db
    .select({ id: kidsStories.id })
    .from(kidsStories)
    .where(eq(kidsStories.title, "God Made the Stars and Moon"));
  if (starsRows.length) {
    const storyId = starsRows[0].id;
    const existingScenes = await db
      .select({ sceneIndex: kidsStoryScenes.sceneIndex })
      .from(kidsStoryScenes)
      .where(eq(kidsStoryScenes.storyId, storyId));
    const existingIndexes = new Set(existingScenes.map((s) => s.sceneIndex));
    for (const scene of STARS_SCENES) {
      if (existingIndexes.has(scene.sceneIndex)) continue;
      await db.insert(kidsStoryScenes).values({
        id: randomUUID(),
        storyId,
        sceneIndex: scene.sceneIndex,
        narration: scene.narration,
        illustrationPrompt: scene.illustrationPrompt,
        imageUrl: scene.imageUrl,
        mood: scene.mood,
      });
    }
    console.log(
      `  Created ${STARS_SCENES.length - existingIndexes.size} scenes for Stars and Moon`
    );
  }

  console.log("[backfill] Creating missing scenes for Flowers and Trees...");
  const flowersRows = await db
    .select({ id: kidsStories.id })
    .from(kidsStories)
    .where(eq(kidsStories.title, "God Made the Flowers and Trees"));
  if (flowersRows.length) {
    const storyId = flowersRows[0].id;
    const existingScenes = await db
      .select({ sceneIndex: kidsStoryScenes.sceneIndex })
      .from(kidsStoryScenes)
      .where(eq(kidsStoryScenes.storyId, storyId));
    const existingIndexes = new Set(existingScenes.map((s) => s.sceneIndex));
    for (const scene of FLOWERS_SCENES) {
      if (existingIndexes.has(scene.sceneIndex)) continue;
      await db.insert(kidsStoryScenes).values({
        id: randomUUID(),
        storyId,
        sceneIndex: scene.sceneIndex,
        narration: scene.narration,
        illustrationPrompt: scene.illustrationPrompt,
        imageUrl: scene.imageUrl,
        mood: scene.mood,
      });
    }
    console.log(
      `  Created ${FLOWERS_SCENES.length - existingIndexes.size} scenes for Flowers and Trees`
    );
  }

  console.log("[backfill] Done.");
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill] ERROR:", err);
    process.exit(1);
  });
