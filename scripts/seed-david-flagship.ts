import { db } from "../server/db";
import { kidsStoryScenes, kidsStories } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedDavidFlagship() {
  console.log("[david-flagship] Starting flagship story seed...");

  const [davidStory] = await db
    .select({ id: kidsStories.id, title: kidsStories.title, imageUrl: kidsStories.imageUrl })
    .from(kidsStories)
    .where(eq(kidsStories.title, "David and the Giant"))
    .limit(1);

  if (!davidStory) {
    console.error("[david-flagship] FATAL: 'David and the Giant' story not found in kids_story table.");
    console.error("[david-flagship] Ensure seed-kids-content.ts runs before this script.");
    process.exit(1);
  }

  const storyId = davidStory.id;
  console.log(`[david-flagship] Found story ID: ${storyId}`);

  await db.transaction(async (tx) => {
    await tx.update(kidsStories).set({
      memoryVerse: "The battle is the Lord's.",
      memoryVerseRef: "1 Samuel 17:47",
      prayerPrompt: "Dear God, please help me be brave when I feel scared. Thank You for being with me. Amen.",
      thinkQuestions: [
        "Who helped David be brave?",
        "What did David use to fight the giant?",
        "How does God help you when you feel scared?",
      ],
      activitySuggestion: "Find 5 smooth stones outside and use them to retell the story of David and Goliath to a friend or family member!",
      imageUrl: "/assets/kids-scenes/david-scene-0.png",
    }).where(eq(kidsStories.id, storyId));
    console.log("[david-flagship] Updated story metadata");

    await tx.delete(kidsStoryScenes).where(eq(kidsStoryScenes.storyId, storyId));
    console.log("[david-flagship] Cleared existing scenes");

    const scenes = [
    {
      storyId,
      sceneIndex: 0,
      narration: "One day, David walked out to the valley. He saw a giant far away and brave soldiers nearby.",
      illustrationPrompt: "David the shepherd boy standing in a valley with Goliath in the distance",
      imageUrl: "/assets/kids-scenes/david-scene-0.png",
      mood: "PEACE" as const,
      interactionType: "tap_wiggle",
      interactionConfig: {
        isLivingScene: true,
        instruction: "Can you find David?",
        sequential: true,
        hotspots: [
          { x: 0.657, y: 0.469, size: 44, label: "Hi David!" },
          { x: 0.221, y: 0.383, size: 44, label: "That's the giant!" },
        ],
        cinematicConfig: {
          effects: [
            { type: "particles", count: 6, color: "rgba(255,248,220,0.5)", speed: "slow" },
          ],
        },
      },
      soundEffects: [
        { key: "gentle_breeze", trigger: "ambient" },
      ],
    },
    {
      storyId,
      sceneIndex: 1,
      narration: "A giant named Goliath shouted and scared the soldiers.",
      illustrationPrompt: "Goliath towering over David and soldiers in the valley",
      imageUrl: "/assets/kids-scenes/david-scene-1.png",
      mood: "TENSION" as const,
      interactionType: "tap_compare",
      interactionConfig: {
        isLivingScene: true,
        instruction: "Tap the giant!",
        hotspot: { x: 0.205, y: 0.366, size: 50 },
        resultText: "He is SO tall! But God is bigger.",
        cinematicConfig: {
          effects: [
            { type: "glow", x: 0.205, y: 0.25, color: "rgba(180,60,30,0.12)", size: 160, delay: 800, duration: 4000 },
          ],
        },
      },
      soundEffects: [
        { key: "drum_thump", trigger: "tap" },
      ],
    },
    {
      storyId,
      sceneIndex: 2,
      narration: "David was not brave because he was strong. David was brave because he trusted God.",
      illustrationPrompt: "David standing with hand on heart trusting God",
      imageUrl: "/assets/kids-scenes/david-scene-2.png",
      mood: "AWE" as const,
      interactionType: "tap_glow",
      interactionConfig: {
        isLivingScene: true,
        instruction: "Tap David's heart!",
        hotspot: { x: 0.456, y: 0.434 },
        revealText: "God is with me.",
        glowColor: "rgba(255,215,0,0.3)",
        cinematicConfig: {
          effects: [
            { type: "glow", x: 0.456, y: 0.434, color: "rgba(255,215,0,0.18)", size: 120, delay: 1200, duration: 5000 },
            { type: "particles", count: 5, color: "rgba(255,215,0,0.4)", speed: "slow" },
          ],
        },
      },
      soundEffects: [
        { key: "soft_chime", trigger: "tap" },
      ],
    },
    {
      storyId,
      sceneIndex: 3,
      narration: "David picked up five smooth stones and took his sling.",
      illustrationPrompt: "David kneeling by stream collecting smooth stones",
      imageUrl: "/assets/kids-scenes/david-scene-3.png",
      mood: "PEACE" as const,
      interactionType: "tap_collect",
      interactionConfig: {
        isLivingScene: true,
        instruction: "Pick up each stone!",
        totalItems: 5,
        sequential: true,
        completeText: "You found all 5 stones!",
        hotspots: [
          { x: 0.306, y: 0.742, size: 34, label: "Stone 1!" },
          { x: 0.352, y: 0.773, size: 34, label: "Stone 2!" },
          { x: 0.397, y: 0.752, size: 34, label: "Stone 3!" },
          { x: 0.436, y: 0.781, size: 34, label: "Stone 4!" },
          { x: 0.475, y: 0.756, size: 34, label: "Stone 5!" },
        ],
        cinematicConfig: {
          effects: [
            { type: "shimmer", y: 0.68, width: 0.5, delay: 0 },
            { type: "shimmer", y: 0.72, width: 0.4, delay: 800 },
            { type: "shimmer", y: 0.65, width: 0.35, delay: 1600 },
            { type: "particles", count: 4, color: "rgba(200,220,255,0.4)", speed: "slow" },
          ],
        },
      },
      soundEffects: [
        { key: "water_plop", trigger: "collect" },
      ],
    },
    {
      storyId,
      sceneIndex: 4,
      narration: "David ran forward. He swung his sling and trusted God.",
      illustrationPrompt: "David swinging his sling at Goliath across the battlefield",
      imageUrl: "/assets/kids-scenes/david-scene-4.png",
      mood: "JOY" as const,
      interactionType: "drag_release",
      interactionConfig: {
        isLivingScene: true,
        instruction: "Swirl the sling, then let go!",
        slingArea: { x: 0.62, y: 0.30 },
        targetArea: { x: 0.18, y: 0.28 },
        resultText: "The stone flew true!",
        cinematicConfig: {
          effects: [{ type: "sling" }],
          slingArea: { x: 0.62, y: 0.30 },
          targetArea: { x: 0.18, y: 0.28 },
          revealText: "The stone flew true!",
        },
      },
      soundEffects: [
        { key: "sling_whoosh", trigger: "drag" },
        { key: "soft_hit", trigger: "release" },
      ],
    },
    {
      storyId,
      sceneIndex: 5,
      narration: "God helped David. Everyone saw that God is stronger than any giant.",
      illustrationPrompt: "David victorious with cheering crowd and waving banners",
      imageUrl: "/assets/kids-scenes/david-scene-5.png",
      mood: "JOY" as const,
      interactionType: "tap_cheer",
      interactionConfig: {
        isLivingScene: true,
        instruction: "Tap David to celebrate!",
        sequential: true,
        hotspots: [
          { x: 0.540, y: 0.410, size: 40, label: "Hooray David!" },
          { x: 0.215, y: 0.555, size: 36, label: "Praise God!" },
          { x: 0.833, y: 0.498, size: 36, label: "Thank God!" },
          { x: 0.124, y: 0.516, size: 36, label: "We won!" },
        ],
        cinematicConfig: {
          effects: [{ type: "celebration" }],
          revealText: "You can trust God too!",
          revealColor: "#FFD700",
          revealDelay: 1000,
        },
      },
      soundEffects: [
        { key: "crowd_cheer", trigger: "tap" },
      ],
    },
  ];

    for (const scene of scenes) {
      await tx.insert(kidsStoryScenes).values(scene);
      console.log(`[david-flagship]   Scene ${scene.sceneIndex}: ${scene.interactionType}`);
    }

    const verifyCount = await tx
      .select({ id: kidsStoryScenes.id })
      .from(kidsStoryScenes)
      .where(eq(kidsStoryScenes.storyId, storyId));

    if (verifyCount.length !== 6) {
      throw new Error(`VERIFY FAILED: Expected 6 scenes, found ${verifyCount.length}`);
    }

    const [updatedStory] = await tx
      .select({ imageUrl: kidsStories.imageUrl, memoryVerse: kidsStories.memoryVerse })
      .from(kidsStories)
      .where(eq(kidsStories.id, storyId));

    if (!updatedStory.imageUrl || !updatedStory.memoryVerse) {
      throw new Error("VERIFY FAILED: Story metadata not updated");
    }
  });

  console.log("[david-flagship] SUCCESS: 6 cinematic scenes + metadata verified (transaction committed)");
}

seedDavidFlagship()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[david-flagship] FATAL:", err);
    process.exit(1);
  });
