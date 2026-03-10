import { db } from "../server/db";
import { kidsStoryScenes, kidsStories } from "../shared/schema";
import { eq, and } from "drizzle-orm";

const DAVID_STORY_ID = "843ef817-62c3-45f3-9cad-07a8af601de7";

async function seedDavidFlagship() {
  console.log("Seeding David and the Giant flagship story...");

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
  }).where(eq(kidsStories.id, DAVID_STORY_ID));

  await db.delete(kidsStoryScenes).where(eq(kidsStoryScenes.storyId, DAVID_STORY_ID));

  const scenes = [
    {
      storyId: DAVID_STORY_ID,
      sceneIndex: 0,
      narration: "David was a young shepherd boy. He loved God and cared for his sheep.",
      illustrationPrompt: "Warm children's storybook illustration: a young boy David with curly brown hair standing in a golden sunlit meadow with gentle rolling hills. He holds a simple shepherd's staff. Three fluffy white sheep graze peacefully nearby. Soft watercolor style, warm golden hour lighting, rounded friendly shapes, no text.",
      mood: "PEACE" as const,
      interactionType: "tap_wiggle",
      interactionConfig: {
        targets: [
          { id: "sheep1", label: "Baa!", x: 0.2, y: 0.65, icon: "🐑", size: 48 },
          { id: "sheep2", label: "Baa!", x: 0.55, y: 0.7, icon: "🐑", size: 44 },
          { id: "sheep3", label: "Baa!", x: 0.75, y: 0.6, icon: "🐑", size: 40 },
        ],
        feedbackText: null,
      },
      soundEffects: [
        { key: "sheep_baa", trigger: "tap" },
        { key: "gentle_breeze", trigger: "ambient" },
      ],
    },
    {
      storyId: DAVID_STORY_ID,
      sceneIndex: 1,
      narration: "A giant named Goliath shouted and scared the soldiers.",
      illustrationPrompt: "Children's storybook illustration: a very tall but cartoonish giant Goliath standing on one side of a valley, wearing simple armor. On the other side, small Israelite soldiers look worried behind their tents. The giant is big but NOT scary - rounded features, slightly comical expression. Warm desert tones, soft watercolor style, child-safe, no violence.",
      mood: "TENSION" as const,
      interactionType: "tap_compare",
      interactionConfig: {
        smallLabel: "David",
        bigLabel: "Goliath",
        smallIcon: "🧒",
        bigIcon: "🗿",
        resultText: "Wow, he is SO tall!",
        smallSize: 36,
        bigSize: 80,
      },
      soundEffects: [
        { key: "drum_thump", trigger: "tap" },
        { key: "crowd_murmur", trigger: "ambient" },
      ],
    },
    {
      storyId: DAVID_STORY_ID,
      sceneIndex: 2,
      narration: "David was not brave because he was strong. David was brave because he trusted God.",
      illustrationPrompt: "Children's storybook illustration: young David standing confidently before a seated King Saul in a simple tent. David points upward toward a warm golden light in the sky. David looks small but confident. Saul looks surprised but kind. Warm tones, soft watercolor, rounded shapes, storybook feel.",
      mood: "AWE" as const,
      interactionType: "tap_glow",
      interactionConfig: {
        glowTarget: { x: 0.5, y: 0.5, size: 64, icon: "❤️" },
        revealText: "God is with me.",
        glowColor: "#FFD700",
      },
      soundEffects: [
        { key: "soft_chime", trigger: "tap" },
      ],
    },
    {
      storyId: DAVID_STORY_ID,
      sceneIndex: 3,
      narration: "David picked up five smooth stones and took his sling.",
      illustrationPrompt: "Children's storybook illustration: David kneeling beside a clear stream, carefully picking up small round stones. Water sparkles gently. His leather sling is visible at his side. Green grass, blue sky, peaceful stream with rounded pebbles. Soft watercolor, warm lighting, child-friendly.",
      mood: "PEACE" as const,
      interactionType: "tap_collect",
      interactionConfig: {
        totalItems: 5,
        itemIcon: "🪨",
        itemLabel: "stone",
        collectText: "stones collected!",
        completeText: "You found all 5 stones!",
        positions: [
          { x: 0.25, y: 0.55 },
          { x: 0.45, y: 0.65 },
          { x: 0.65, y: 0.5 },
          { x: 0.35, y: 0.45 },
          { x: 0.55, y: 0.55 },
        ],
      },
      soundEffects: [
        { key: "water_plop", trigger: "collect" },
        { key: "water_trickle", trigger: "ambient" },
      ],
    },
    {
      storyId: DAVID_STORY_ID,
      sceneIndex: 4,
      narration: "David ran forward. He swung his sling and trusted God.",
      illustrationPrompt: "Children's storybook illustration: David mid-action, swinging a sling overhead with determination. He faces a large but softened Goliath in the distance. Dynamic but not violent - focus on David's courage. Dramatic sky with warm golden light breaking through clouds. Watercolor style, child-safe, heroic mood.",
      mood: "JOY" as const,
      interactionType: "drag_release",
      interactionConfig: {
        dragCircleRadius: 60,
        releaseLabel: "Release!",
        projectileIcon: "🪨",
        resultText: "The stone flew true!",
        targetArea: { x: 0.75, y: 0.35 },
      },
      soundEffects: [
        { key: "sling_whoosh", trigger: "drag" },
        { key: "soft_hit", trigger: "release" },
        { key: "victory_swell", trigger: "complete" },
      ],
    },
    {
      storyId: DAVID_STORY_ID,
      sceneIndex: 5,
      narration: "God helped David. Everyone saw that God is stronger than any giant.",
      illustrationPrompt: "Children's storybook illustration: David standing victorious, smiling warmly. Joyful people around him are cheering and waving colorful banners. Bright golden light from above. Festive, warm, celebratory mood. Everyone looks happy and relieved. Soft watercolor, rounded shapes, vibrant but gentle colors. No violence or fallen giant visible.",
      mood: "JOY" as const,
      interactionType: "tap_cheer",
      interactionConfig: {
        targets: [
          { id: "person1", label: "Hooray!", x: 0.2, y: 0.5, icon: "🙌", animation: "bounce" },
          { id: "person2", label: "Praise God!", x: 0.5, y: 0.45, icon: "🎉", animation: "bounce" },
          { id: "banner", label: "Wave!", x: 0.75, y: 0.35, icon: "🏴", animation: "wave" },
          { id: "david", label: "Victory!", x: 0.5, y: 0.6, icon: "⭐", animation: "glow" },
        ],
      },
      soundEffects: [
        { key: "crowd_cheer", trigger: "tap" },
        { key: "celebration_music", trigger: "ambient" },
      ],
    },
  ];

  for (const scene of scenes) {
    await db.insert(kidsStoryScenes).values(scene);
    console.log(`  Scene ${scene.sceneIndex}: ${scene.interactionType}`);
  }

  console.log("David and the Giant flagship story seeded successfully!");
}

seedDavidFlagship()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
