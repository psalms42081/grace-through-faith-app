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
  "God Made the Stars and Moon": {
    0: "/assets/kids-scenes/creation-stars-scene-0.png",
    1: "/assets/kids-scenes/creation-stars-scene-1.png",
    2: "/assets/kids-scenes/creation-stars-scene-2.png",
    3: "/assets/kids-scenes/creation-stars-scene-3.png",
    4: "/assets/kids-scenes/creation-stars-scene-4.png",
    5: "/assets/kids-scenes/creation-stars-scene-5.png",
  },
  "God Made the Flowers and Trees": {
    0: "/assets/kids-scenes/creation-flowers-scene-0.png",
    1: "/assets/kids-scenes/creation-flowers-scene-1.png",
    2: "/assets/kids-scenes/creation-flowers-scene-2.png",
    3: "/assets/kids-scenes/creation-flowers-scene-3.png",
    4: "/assets/kids-scenes/creation-flowers-scene-4.png",
    5: "/assets/kids-scenes/creation-flowers-scene-5.png",
  },
};

type SceneData = {
  sceneIndex: number;
  narration: string;
  illustrationPrompt: string;
  imageUrl: string;
  mood: string;
};

const ME_SCENES: SceneData[] = [
  {
    sceneIndex: 0,
    narration: "God made the light, the sky, and the oceans. He made the plants and the animals. But the best thing He made was people! And that means you! Can you believe it? You are a special creation of God!",
    illustrationPrompt: "Soft watercolor, 2D animation style, warm earth tones, biblically inspired. A bright, sunny scene with a blue sky, fluffy clouds, and a sparkling ocean.",
    imageUrl: "/assets/kids-scenes/creation-me-scene-0.png",
    mood: "PEACE",
  },
  {
    sceneIndex: 1,
    narration: "God said, 'Let us make people in our image!' That means we can think and feel, love and be kind. Look at how special you are! You can talk to God every day!",
    illustrationPrompt: "Soft watercolor, 2D animation style. Smiling children of diverse backgrounds gathered around in a circle, their faces filled with joy and wonder.",
    imageUrl: "/assets/kids-scenes/creation-me-scene-1.png",
    mood: "JOY",
  },
  {
    sceneIndex: 2,
    narration: "When God made the first person, He didn't just say the words. He took His time, forming him with His own hands. God was gentle and careful, like an artist with beautiful clay.",
    illustrationPrompt: "Soft watercolor, 2D animation style. A loving image of God kneeling down, carefully shaping a figure from soft clay. Warm light and colors.",
    imageUrl: "/assets/kids-scenes/creation-me-scene-2.png",
    mood: "AWE",
  },
  {
    sceneIndex: 3,
    narration: "After creating everything, God looked around. He saw the stars, the oceans, the animals, and people. And He didn't just say it was good. He said it was VERY good! Can you imagine that?",
    illustrationPrompt: "Soft watercolor, 2D animation style. Panoramic view of beautiful created world: stars, oceans, forests, diverse people in a vibrant meadow under sunset.",
    imageUrl: "/assets/kids-scenes/creation-me-scene-3.png",
    mood: "JOY",
  },
  {
    sceneIndex: 4,
    narration: "You are special! God made you with love. He chose the color of your eyes and the sound of your laugh. You are not an accident. You are His masterpiece!",
    illustrationPrompt: "Soft watercolor, 2D animation style. A joyful child looking in a mirror with a big smile. Vibrant colors and sparkles around them. Sunlight streams through window.",
    imageUrl: "/assets/kids-scenes/creation-me-scene-4.png",
    mood: "PEACE",
  },
  {
    sceneIndex: 5,
    narration: "Every person you meet is made by God too! That's why we should be kind and loving. Everyone is special, just like you! Remember, you are loved and wanted!",
    illustrationPrompt: "Soft watercolor, 2D animation style. A park scene with children of different backgrounds holding hands, playing games, sharing smiles. Trees and flowers bloom.",
    imageUrl: "/assets/kids-scenes/creation-me-scene-5.png",
    mood: "JOY",
  },
];

const ANIMALS_SCENES: SceneData[] = [
  {
    sceneIndex: 0,
    narration: "On the fifth day, God made all the sea creatures! Big whales and tiny fish, octopuses and sea horses, all swimming in the beautiful blue oceans God had made.",
    illustrationPrompt: "Soft watercolor, 2D animation style. Colorful underwater scene with whales, fish, octopuses, and seahorses swimming in blue ocean.",
    imageUrl: "/assets/kids-scenes/creation-animals-scene-0.png",
    mood: "AWE",
  },
  {
    sceneIndex: 1,
    narration: "Then God filled the sky with birds! Eagles soaring high, tiny hummingbirds zipping around flowers, colorful parrots, and friendly robins. The sky was alive with singing!",
    illustrationPrompt: "Soft watercolor, 2D animation style. Blue sky filled with colorful birds - eagles soaring, hummingbirds near flowers, parrots and robins.",
    imageUrl: "/assets/kids-scenes/creation-animals-scene-1.png",
    mood: "JOY",
  },
  {
    sceneIndex: 2,
    narration: "On the sixth day, God made the land animals! Big elephants, tall giraffes, bouncy rabbits, and cuddly kittens. Every animal is special and unique!",
    illustrationPrompt: "Soft watercolor, 2D animation style. A meadow with elephants, giraffes, rabbits, and kittens playing together in sunshine.",
    imageUrl: "/assets/kids-scenes/creation-animals-scene-2.png",
    mood: "JOY",
  },
  {
    sceneIndex: 3,
    narration: "God even made the tiny creatures - ladybugs with their pretty spots, butterflies with colorful wings, and busy little ants working together. God cares about the smallest things!",
    illustrationPrompt: "Soft watercolor, 2D animation style. Close-up garden scene with ladybugs, butterflies, and ants among flowers and leaves. Warm sunshine.",
    imageUrl: "/assets/kids-scenes/creation-animals-scene-3.png",
    mood: "PEACE",
  },
  {
    sceneIndex: 4,
    narration: "God asked people to take care of all the animals. We are their helpers! We can feed them, be kind to them, and love them. Every animal is a gift from God!",
    illustrationPrompt: "Soft watercolor, 2D animation style. A child gently petting a lamb while other animals gather around - a dog, a rabbit, birds perching nearby.",
    imageUrl: "/assets/kids-scenes/creation-animals-scene-4.png",
    mood: "LOVE",
  },
];

const LIGHT_SCENES: SceneData[] = [
  {
    sceneIndex: 0,
    narration: "A long, long time ago, there was nothing at all. No trees, no animals, and no people. It was very, very dark. But guess what? God was there, watching over the emptiness. He is always there.",
    illustrationPrompt: "Soft watercolor, 2D animation style. A vast dark void with soft shadows. A gentle glowing light starts to shimmer, symbolizing God's presence.",
    imageUrl: "/assets/kids-scenes/creation-light-scene-0.png",
    mood: "PEACE",
  },
  {
    sceneIndex: 1,
    narration: "God looked at the darkness. He had a bright idea! With a joyful voice, He said, 'Let there be light!' Suddenly, beautiful light burst into existence! It filled every corner, like the biggest sunrise you've ever seen.",
    illustrationPrompt: "Soft watercolor, 2D animation style. Radiant light spreading across the scene, illuminating the dark with soft gold and yellow hues.",
    imageUrl: "/assets/kids-scenes/creation-light-scene-1.png",
    mood: "PEACE",
  },
  {
    sceneIndex: 2,
    narration: "God looked at the light and smiled. 'This is good!' He said. God loved the light He had made. He named the light 'Day' and the dark 'Night.' Day was for playing, and Night was for sleeping.",
    illustrationPrompt: "Soft watercolor, 2D animation style. Split scene showing bright sunny day on one side and peaceful starry night on the other.",
    imageUrl: "/assets/kids-scenes/creation-light-scene-2.png",
    mood: "PEACE",
  },
  {
    sceneIndex: 3,
    narration: "Do you know what's amazing? God made light just by speaking! He didn't need a flashlight or a lamp. With just a few words, He created the light. That shows how powerful God is.",
    illustrationPrompt: "Soft watercolor, 2D animation style. Sparkles of light radiating outward, creating a magical effect against illuminated background.",
    imageUrl: "/assets/kids-scenes/creation-light-scene-3.png",
    mood: "PEACE",
  },
  {
    sceneIndex: 4,
    narration: "Every morning, when the sun rises, remember that God made the very first light! He made it to share something beautiful with you. God loves making wonderful things, just like light!",
    illustrationPrompt: "Soft watercolor, 2D animation style. Bright sun rising over a calm landscape with pink and orange sky. Children playing in the light.",
    imageUrl: "/assets/kids-scenes/creation-light-scene-4.png",
    mood: "PEACE",
  },
  {
    sceneIndex: 5,
    narration: "When you turn on a light at night, think about God. He made light to chase away the darkness. Just like the light, God is always with you, even when you feel scared.",
    illustrationPrompt: "Soft watercolor, 2D animation style. A child turning on a small lamp in a cozy room. Light pours from the lamp, warm and comforting.",
    imageUrl: "/assets/kids-scenes/creation-light-scene-5.png",
    mood: "PEACE",
  },
];

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

  const ALL_STORY_SCENES: Record<string, SceneData[]> = {
    "God Made Me": ME_SCENES,
    "God Made the Animals": ANIMALS_SCENES,
    "God Made the Light": LIGHT_SCENES,
    "God Made the Stars and Moon": STARS_SCENES,
    "God Made the Flowers and Trees": FLOWERS_SCENES,
  };

  console.log("[backfill] Replacing all creation story scenes with curated content...");
  for (const [storyTitle, scenes] of Object.entries(ALL_STORY_SCENES)) {
    const storyRows = await db
      .select({ id: kidsStories.id })
      .from(kidsStories)
      .where(eq(kidsStories.title, storyTitle));
    if (!storyRows.length) {
      console.log(`  Story not found (skipped): ${storyTitle}`);
      continue;
    }
    const storyId = storyRows[0].id;
    await db
      .delete(kidsStoryScenes)
      .where(eq(kidsStoryScenes.storyId, storyId));
    for (const scene of scenes) {
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
      `  Replaced with ${scenes.length} curated scenes for: ${storyTitle}`
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
