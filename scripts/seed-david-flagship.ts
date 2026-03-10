import { db } from "../server/db";
import { kidsStoryScenes, kidsStories } from "../shared/schema";
import { eq, and } from "drizzle-orm";

const DAVID_STORY_ID = "843ef817-62c3-45f3-9cad-07a8af601de7";

async function seedDavidFlagship() {
  console.log("Seeding David and the Giant flagship story (living scenes)...");

  await db.update(kidsStories).set({
    memoryVerse: "The battle is the Lord's.",
    memoryVerseRef: "1 Samuel 17:47",
    prayerPrompt: "Dear God, please help me be brave when I feel scared. Thank You for being with me. Amen.",
    thinkQuestions: [
      "Who helped David be brave?",
      "What did David use to fight the giant?",
      "How does God help you when you feel scared?",
    ],
    activitySuggestion: "Find 5 smooth stones outside and use them to retell the story of David and Goliath to a friend or family member!",
    imageUrl: "/kids/david-goliath/scene-0-shepherd.png",
  }).where(eq(kidsStories.id, DAVID_STORY_ID));

  await db.delete(kidsStoryScenes).where(eq(kidsStoryScenes.storyId, DAVID_STORY_ID));

  const scenes = [
    {
      storyId: DAVID_STORY_ID,
      sceneIndex: 0,
      narration: "One day, David walked out to the valley. He saw a giant far away and brave soldiers nearby.",
      illustrationPrompt: "David the shepherd boy standing in a valley with Goliath in the distance",
      imageUrl: "/kids/david-goliath/scene-0-shepherd.png",
      mood: "PEACE" as const,
      interactionType: "tap_wiggle",
      interactionConfig: {
        isLivingScene: true,
        instruction: "Can you find David?",
        sequential: true,
        hotspots: [
          { x: 0.68, y: 0.52, size: 44, label: "Hi David!" },
          { x: 0.22, y: 0.42, size: 44, label: "That's the giant!" },
        ],
      },
      soundEffects: [
        { key: "gentle_breeze", trigger: "ambient" },
      ],
    },
    {
      storyId: DAVID_STORY_ID,
      sceneIndex: 1,
      narration: "A giant named Goliath shouted and scared the soldiers.",
      illustrationPrompt: "Goliath towering over David and soldiers in the valley",
      imageUrl: "/kids/david-goliath/scene-1-giant.png",
      mood: "TENSION" as const,
      interactionType: "tap_compare",
      interactionConfig: {
        isLivingScene: true,
        instruction: "Tap the giant!",
        hotspot: { x: 0.20, y: 0.40, size: 50 },
        resultText: "He is SO tall! But God is bigger.",
      },
      soundEffects: [
        { key: "drum_thump", trigger: "tap" },
      ],
    },
    {
      storyId: DAVID_STORY_ID,
      sceneIndex: 2,
      narration: "David was not brave because he was strong. David was brave because he trusted God.",
      illustrationPrompt: "David standing with hand on heart trusting God",
      imageUrl: "/kids/david-goliath/scene-2-trust.png",
      mood: "AWE" as const,
      interactionType: "tap_glow",
      interactionConfig: {
        isLivingScene: true,
        instruction: "Tap David's heart!",
        hotspot: { x: 0.48, y: 0.48 },
        revealText: "God is with me.",
        glowColor: "rgba(255,215,0,0.3)",
      },
      soundEffects: [
        { key: "soft_chime", trigger: "tap" },
      ],
    },
    {
      storyId: DAVID_STORY_ID,
      sceneIndex: 3,
      narration: "David picked up five smooth stones and took his sling.",
      illustrationPrompt: "David kneeling by stream collecting smooth stones",
      imageUrl: "/kids/david-goliath/scene-3-stones.png",
      mood: "PEACE" as const,
      interactionType: "tap_collect",
      interactionConfig: {
        isLivingScene: true,
        instruction: "Pick up each stone!",
        totalItems: 5,
        sequential: true,
        completeText: "You found all 5 stones!",
        hotspots: [
          { x: 0.35, y: 0.80, size: 34, label: "Stone 1!" },
          { x: 0.40, y: 0.84, size: 34, label: "Stone 2!" },
          { x: 0.45, y: 0.80, size: 34, label: "Stone 3!" },
          { x: 0.50, y: 0.84, size: 34, label: "Stone 4!" },
          { x: 0.43, y: 0.76, size: 34, label: "Stone 5!" },
        ],
      },
      soundEffects: [
        { key: "water_plop", trigger: "collect" },
      ],
    },
    {
      storyId: DAVID_STORY_ID,
      sceneIndex: 4,
      narration: "David ran forward. He swung his sling and trusted God.",
      illustrationPrompt: "David swinging his sling at Goliath across the battlefield",
      imageUrl: "/kids/david-goliath/scene-4-sling.png",
      mood: "JOY" as const,
      interactionType: "drag_release",
      interactionConfig: {
        isLivingScene: true,
        instruction: "Swirl the sling, then let go!",
        slingArea: { x: 0.70, y: 0.38 },
        targetArea: { x: 0.22, y: 0.40 },
        resultText: "The stone flew true!",
      },
      soundEffects: [
        { key: "sling_whoosh", trigger: "drag" },
        { key: "soft_hit", trigger: "release" },
      ],
    },
    {
      storyId: DAVID_STORY_ID,
      sceneIndex: 5,
      narration: "God helped David. Everyone saw that God is stronger than any giant.",
      illustrationPrompt: "David victorious with cheering crowd and waving banners",
      imageUrl: "/kids/david-goliath/scene-5-victory.png",
      mood: "JOY" as const,
      interactionType: "tap_cheer",
      interactionConfig: {
        isLivingScene: true,
        instruction: "Tap David to celebrate!",
        sequential: true,
        hotspots: [
          { x: 0.55, y: 0.42, size: 40, label: "Hooray David!" },
          { x: 0.15, y: 0.55, size: 36, label: "Praise God!" },
          { x: 0.85, y: 0.50, size: 36, label: "Thank God!" },
          { x: 0.35, y: 0.60, size: 36, label: "We won!" },
        ],
      },
      soundEffects: [
        { key: "crowd_cheer", trigger: "tap" },
      ],
    },
  ];

  for (const scene of scenes) {
    await db.insert(kidsStoryScenes).values(scene);
    console.log(`  Scene ${scene.sceneIndex}: ${scene.interactionType} (living)`);
  }

  console.log("David and the Giant flagship story seeded (living scenes)!");
}

seedDavidFlagship()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
