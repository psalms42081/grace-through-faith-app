import { db } from "../server/db";
import { kidsStoryScenes, kidsStories } from "../shared/schema";
import { eq } from "drizzle-orm";

interface StoryFlagshipData {
  title: string;
  imagePrefix: string;
  memoryVerse: string;
  memoryVerseRef: string;
  prayerPrompt: string;
  thinkQuestions: string[];
  activitySuggestion: string;
  scenes: Array<{
    narration: string;
    illustrationPrompt: string;
    mood: "PEACE" | "TENSION" | "AWE" | "JOY";
    interactionType: string;
    interactionConfig: Record<string, unknown>;
    soundEffects: Array<{ key: string; trigger: string }>;
  }>;
}

const FLAGSHIP_STORIES: StoryFlagshipData[] = [
  {
    title: "Noah Trusts God",
    imagePrefix: "noah",
    memoryVerse: "Noah did everything just as God commanded him.",
    memoryVerseRef: "Genesis 6:22",
    prayerPrompt: "Dear God, help me to trust You and obey You, even when it is hard. Thank You for always keeping Your promises. Amen.",
    thinkQuestions: [
      "Why did Noah keep building even when people laughed?",
      "How did God keep Noah's family safe?",
      "What does the rainbow remind us about?",
    ],
    activitySuggestion: "Draw a rainbow and write one promise from God underneath it. Hang it where you can see it every day!",
    scenes: [
      {
        narration: "Noah was a good man who loved God. He talked to God every day. But everyone around him had forgotten about God.",
        illustrationPrompt: "Noah kneeling in prayer in a green meadow with morning light",
        mood: "PEACE",
        interactionType: "tap_wiggle",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Can you find Noah?",
          sequential: true,
          hotspots: [
            { x: 0.50, y: 0.45, size: 44, label: "Hi Noah!" },
            { x: 0.75, y: 0.55, size: 40, label: "A little bird!" },
          ],
          cinematicConfig: {
            effects: [
              { type: "particles", count: 6, color: "rgba(144,238,144,0.4)", speed: "slow" },
            ],
          },
        },
        soundEffects: [{ key: "gentle_breeze", trigger: "ambient" }],
      },
      {
        narration: "God spoke to Noah. 'Build a big boat called an ark! I will send rain to wash the earth clean.' Noah was amazed, but he trusted God.",
        illustrationPrompt: "God speaking to Noah through golden light from the sky",
        mood: "AWE",
        interactionType: "tap_compare",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Tap the golden light!",
          hotspot: { x: 0.50, y: 0.25, size: 50 },
          resultText: "God speaks! Noah listens.",
          cinematicConfig: {
            effects: [
              { type: "glow", x: 0.50, y: 0.25, color: "rgba(255,215,0,0.2)", size: 180, delay: 800, duration: 5000 },
            ],
          },
        },
        soundEffects: [{ key: "soft_chime", trigger: "tap" }],
      },
      {
        narration: "Noah started building the ark. He cut big trees and hammered day after day. People laughed at him, but Noah kept going because he trusted God.",
        illustrationPrompt: "Noah and family building a huge wooden ark",
        mood: "TENSION",
        interactionType: "tap_glow",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Tap Noah's heart!",
          hotspot: { x: 0.35, y: 0.50 },
          revealText: "I trust God's plan.",
          glowColor: "rgba(255,165,0,0.3)",
          cinematicConfig: {
            effects: [
              { type: "glow", x: 0.35, y: 0.50, color: "rgba(255,165,0,0.18)", size: 120, delay: 1200, duration: 5000 },
              { type: "particles", count: 4, color: "rgba(210,180,140,0.4)", speed: "slow" },
            ],
          },
        },
        soundEffects: [{ key: "soft_chime", trigger: "tap" }],
      },
      {
        narration: "The ark was finished! God told Noah to bring two of every animal. Elephants, giraffes, bunnies, and birds all walked in two by two!",
        illustrationPrompt: "Pairs of animals walking into the completed ark at sunset",
        mood: "JOY",
        interactionType: "tap_collect",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Help the animals get on board!",
          totalItems: 4,
          sequential: true,
          completeText: "All the animals are safe!",
          hotspots: [
            { x: 0.25, y: 0.60, size: 38, label: "Elephants!" },
            { x: 0.40, y: 0.50, size: 38, label: "Giraffes!" },
            { x: 0.55, y: 0.65, size: 38, label: "Bunnies!" },
            { x: 0.70, y: 0.45, size: 38, label: "Birds!" },
          ],
          cinematicConfig: {
            effects: [
              { type: "shimmer", y: 0.55, width: 0.5, delay: 0 },
              { type: "particles", count: 5, color: "rgba(255,228,181,0.4)", speed: "slow" },
            ],
          },
        },
        soundEffects: [{ key: "water_plop", trigger: "collect" }],
      },
      {
        narration: "Then it rained and rained! Water covered the whole earth. But inside the ark, Noah and all the animals were safe and warm. God kept His promise.",
        illustrationPrompt: "The ark floating on stormy water with warm light inside",
        mood: "PEACE",
        interactionType: "drag_release",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Rock the ark through the waves!",
          slingArea: { x: 0.40, y: 0.45 },
          targetArea: { x: 0.60, y: 0.45 },
          resultText: "Safe inside with God!",
          cinematicConfig: {
            effects: [
              { type: "particles", count: 8, color: "rgba(100,149,237,0.3)", speed: "medium" },
            ],
            slingArea: { x: 0.40, y: 0.45 },
            targetArea: { x: 0.60, y: 0.45 },
            revealText: "Safe inside with God!",
          },
        },
        soundEffects: [
          { key: "gentle_breeze", trigger: "ambient" },
        ],
      },
      {
        narration: "The rain stopped! A dove brought back a green leaf. Then God put a beautiful rainbow in the sky. 'I will always keep my promises,' God said.",
        illustrationPrompt: "Rainbow over dry land with Noah's family and the ark, dove with olive branch",
        mood: "JOY",
        interactionType: "tap_cheer",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Tap to celebrate God's rainbow!",
          sequential: true,
          hotspots: [
            { x: 0.50, y: 0.25, size: 44, label: "Beautiful rainbow!" },
            { x: 0.35, y: 0.50, size: 36, label: "Thank God!" },
            { x: 0.65, y: 0.50, size: 36, label: "Hooray!" },
            { x: 0.50, y: 0.65, size: 36, label: "God keeps promises!" },
          ],
          cinematicConfig: {
            effects: [{ type: "celebration" }],
            revealText: "God always keeps His promises!",
            revealColor: "#F5C451",
            revealDelay: 1000,
          },
        },
        soundEffects: [{ key: "crowd_cheer", trigger: "tap" }],
      },
    ],
  },

  {
    title: "Daniel and the Lions",
    imagePrefix: "daniel",
    memoryVerse: "My God sent His angel and shut the lions' mouths.",
    memoryVerseRef: "Daniel 6:22",
    prayerPrompt: "Dear God, help me to be brave and keep talking to You every day, no matter what. Thank You for protecting me. Amen.",
    thinkQuestions: [
      "Why did Daniel keep praying even when it was against the law?",
      "Who did God send to protect Daniel?",
      "How can you be brave like Daniel?",
    ],
    activitySuggestion: "Set a special prayer time each day this week, just like Daniel did. You can pray by your window or anywhere you feel close to God!",
    scenes: [
      {
        narration: "Daniel loved God very much. Every day, three times a day, he knelt by his window and prayed. He never forgot his special time with God.",
        illustrationPrompt: "Daniel kneeling by an open window praying with sunlight streaming in",
        mood: "PEACE",
        interactionType: "tap_wiggle",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Can you find Daniel praying?",
          sequential: true,
          hotspots: [
            { x: 0.45, y: 0.50, size: 44, label: "Hi Daniel!" },
            { x: 0.70, y: 0.30, size: 40, label: "Warm sunshine!" },
          ],
          cinematicConfig: {
            effects: [
              { type: "particles", count: 5, color: "rgba(255,248,220,0.5)", speed: "slow" },
            ],
          },
        },
        soundEffects: [{ key: "gentle_breeze", trigger: "ambient" }],
      },
      {
        narration: "Some jealous men tricked the king into making a bad law. 'No one can pray for thirty days!' the law said. But Daniel was not afraid.",
        illustrationPrompt: "Jealous officials scheming in a palace hallway with the king on his throne",
        mood: "TENSION",
        interactionType: "tap_compare",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Tap the sneaky men!",
          hotspot: { x: 0.35, y: 0.45, size: 50 },
          resultText: "They made a tricky plan! But God sees everything.",
          cinematicConfig: {
            effects: [
              { type: "glow", x: 0.35, y: 0.45, color: "rgba(100,60,30,0.12)", size: 140, delay: 800, duration: 4000 },
            ],
          },
        },
        soundEffects: [{ key: "drum_thump", trigger: "tap" }],
      },
      {
        narration: "Did Daniel stop praying? No way! He opened his window wide and prayed to God just like always. Daniel loved God too much to stop.",
        illustrationPrompt: "Daniel bravely kneeling at his open window praying with golden light",
        mood: "AWE",
        interactionType: "tap_glow",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Tap Daniel's brave heart!",
          hotspot: { x: 0.45, y: 0.50 },
          revealText: "I will always pray to God.",
          glowColor: "rgba(255,215,0,0.3)",
          cinematicConfig: {
            effects: [
              { type: "glow", x: 0.45, y: 0.50, color: "rgba(255,215,0,0.18)", size: 120, delay: 1200, duration: 5000 },
              { type: "particles", count: 5, color: "rgba(255,215,0,0.4)", speed: "slow" },
            ],
          },
        },
        soundEffects: [{ key: "soft_chime", trigger: "tap" }],
      },
      {
        narration: "The jealous men caught Daniel praying! The king was very sad. He liked Daniel, but he had to follow the law. Daniel was thrown into the den of lions!",
        illustrationPrompt: "Daniel being lowered into the lions den with the king watching sadly",
        mood: "TENSION",
        interactionType: "tap_collect",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Count the lions in the den!",
          totalItems: 4,
          sequential: true,
          completeText: "So many lions! But God is with Daniel.",
          hotspots: [
            { x: 0.25, y: 0.65, size: 36, label: "Lion 1!" },
            { x: 0.45, y: 0.70, size: 36, label: "Lion 2!" },
            { x: 0.60, y: 0.60, size: 36, label: "Lion 3!" },
            { x: 0.75, y: 0.68, size: 36, label: "Lion 4!" },
          ],
          cinematicConfig: {
            effects: [
              { type: "shimmer", y: 0.60, width: 0.5, delay: 0 },
              { type: "particles", count: 3, color: "rgba(255,200,100,0.3)", speed: "slow" },
            ],
          },
        },
        soundEffects: [{ key: "drum_thump", trigger: "collect" }],
      },
      {
        narration: "But Daniel was not alone! God sent a shining angel who shut the lions' mouths. The lions lay down peacefully. Daniel was safe all night long!",
        illustrationPrompt: "A glowing angel protecting Daniel in the lions den with golden light",
        mood: "AWE",
        interactionType: "drag_release",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Shine the angel's light on the lions!",
          slingArea: { x: 0.50, y: 0.30 },
          targetArea: { x: 0.40, y: 0.65 },
          resultText: "God's angel keeps Daniel safe!",
          cinematicConfig: {
            effects: [
              { type: "glow", x: 0.50, y: 0.35, color: "rgba(255,215,0,0.25)", size: 200, delay: 0, duration: 6000 },
            ],
            slingArea: { x: 0.50, y: 0.30 },
            targetArea: { x: 0.40, y: 0.65 },
            revealText: "God's angel keeps Daniel safe!",
          },
        },
        soundEffects: [
          { key: "soft_chime", trigger: "drag" },
        ],
      },
      {
        narration: "In the morning, the king ran to the den. 'Daniel! Did your God save you?' 'Yes!' Daniel said. 'God sent His angel!' The king was so happy!",
        illustrationPrompt: "Daniel standing safely outside the lions den with the king and cheering crowd",
        mood: "JOY",
        interactionType: "tap_cheer",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Celebrate with Daniel!",
          sequential: true,
          hotspots: [
            { x: 0.40, y: 0.45, size: 40, label: "Daniel is safe!" },
            { x: 0.60, y: 0.40, size: 36, label: "The king is happy!" },
            { x: 0.25, y: 0.55, size: 36, label: "Praise God!" },
            { x: 0.75, y: 0.55, size: 36, label: "God is great!" },
          ],
          cinematicConfig: {
            effects: [{ type: "celebration" }],
            revealText: "You can always pray to God!",
            revealColor: "#F5C451",
            revealDelay: 1000,
          },
        },
        soundEffects: [{ key: "crowd_cheer", trigger: "tap" }],
      },
    ],
  },

  {
    title: "Miriam Watches Over Baby Moses",
    imagePrefix: "miriam",
    memoryVerse: "The Lord is my helper; I will not be afraid.",
    memoryVerseRef: "Hebrews 13:6",
    prayerPrompt: "Dear God, help me to be brave and watch over the people I love, just like Miriam did. Thank You for taking care of my family. Amen.",
    thinkQuestions: [
      "Why did Miriam's mother put baby Moses in a basket?",
      "How was Miriam brave when she spoke to the princess?",
      "How does God take care of your family?",
    ],
    activitySuggestion: "Make a small basket out of paper or craft supplies and put a toy inside. Tell someone the story of baby Moses!",
    scenes: [
      {
        narration: "A mother in Egypt loved her baby boy very much. But it was not safe for baby Moses. She needed a plan to keep him safe.",
        illustrationPrompt: "A Hebrew mother lovingly wrapping baby Moses in a blanket in a humble home",
        mood: "PEACE",
        interactionType: "tap_wiggle",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Can you find baby Moses?",
          sequential: true,
          hotspots: [
            { x: 0.50, y: 0.50, size: 44, label: "Sweet baby Moses!" },
            { x: 0.35, y: 0.45, size: 40, label: "His loving mother!" },
          ],
          cinematicConfig: {
            effects: [
              { type: "particles", count: 5, color: "rgba(255,228,196,0.5)", speed: "slow" },
            ],
          },
        },
        soundEffects: [{ key: "gentle_breeze", trigger: "ambient" }],
      },
      {
        narration: "Moses' mother and his big sister Miriam wove a special basket from reeds. They covered it so no water could get in. It would be a tiny boat for baby Moses!",
        illustrationPrompt: "Miriam and her mother weaving a basket near the Nile with papyrus plants",
        mood: "TENSION",
        interactionType: "tap_compare",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Tap the basket they are making!",
          hotspot: { x: 0.45, y: 0.55, size: 50 },
          resultText: "A tiny boat for a tiny baby! God has a plan.",
          cinematicConfig: {
            effects: [
              { type: "glow", x: 0.45, y: 0.55, color: "rgba(139,119,75,0.15)", size: 130, delay: 800, duration: 4000 },
            ],
          },
        },
        soundEffects: [{ key: "soft_chime", trigger: "tap" }],
      },
      {
        narration: "Mother gently placed baby Moses in the basket among the tall reeds by the river. Miriam hid nearby to watch over her little brother. She was so brave!",
        illustrationPrompt: "Basket with baby Moses among reeds at river edge with Miriam hiding behind plants",
        mood: "AWE",
        interactionType: "tap_glow",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Tap Miriam's brave heart!",
          hotspot: { x: 0.70, y: 0.45 },
          revealText: "I will watch over my brother.",
          glowColor: "rgba(147,197,253,0.3)",
          cinematicConfig: {
            effects: [
              { type: "glow", x: 0.70, y: 0.45, color: "rgba(147,197,253,0.18)", size: 110, delay: 1200, duration: 5000 },
              { type: "particles", count: 4, color: "rgba(147,197,253,0.4)", speed: "slow" },
            ],
          },
        },
        soundEffects: [{ key: "soft_chime", trigger: "tap" }],
      },
      {
        narration: "A princess came to the river! She found the basket and saw baby Moses. 'Oh, what a beautiful baby!' she said. Miriam watched from behind the plants.",
        illustrationPrompt: "Egyptian princess discovering baby Moses in basket among reeds with attendants",
        mood: "TENSION",
        interactionType: "tap_collect",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Find everyone by the river!",
          totalItems: 3,
          sequential: true,
          completeText: "The princess found baby Moses!",
          hotspots: [
            { x: 0.45, y: 0.50, size: 38, label: "The princess!" },
            { x: 0.35, y: 0.60, size: 36, label: "Baby Moses!" },
            { x: 0.75, y: 0.45, size: 34, label: "Miriam is watching!" },
          ],
          cinematicConfig: {
            effects: [
              { type: "shimmer", y: 0.55, width: 0.5, delay: 0 },
              { type: "particles", count: 4, color: "rgba(173,216,230,0.4)", speed: "slow" },
            ],
          },
        },
        soundEffects: [{ key: "water_plop", trigger: "collect" }],
      },
      {
        narration: "Miriam stepped forward bravely. 'I can find someone to take care of this baby!' she said to the princess. Miriam ran to get her own mother!",
        illustrationPrompt: "Miriam bravely stepping forward to speak to the Egyptian princess by the river",
        mood: "JOY",
        interactionType: "drag_release",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Help Miriam step forward!",
          slingArea: { x: 0.70, y: 0.50 },
          targetArea: { x: 0.40, y: 0.50 },
          resultText: "Brave Miriam speaks up!",
          cinematicConfig: {
            effects: [
              { type: "glow", x: 0.55, y: 0.45, color: "rgba(255,215,0,0.15)", size: 150, delay: 0, duration: 4000 },
            ],
            slingArea: { x: 0.70, y: 0.50 },
            targetArea: { x: 0.40, y: 0.50 },
            revealText: "Brave Miriam speaks up!",
          },
        },
        soundEffects: [{ key: "soft_chime", trigger: "drag" }],
      },
      {
        narration: "God used Miriam's bravery to keep Moses safe! Moses' own mother got to take care of him. God had a wonderful plan for baby Moses and brave Miriam.",
        illustrationPrompt: "Happy reunion with Moses' mother holding baby, Miriam beside her, princess smiling",
        mood: "JOY",
        interactionType: "tap_cheer",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Celebrate with Miriam's family!",
          sequential: true,
          hotspots: [
            { x: 0.40, y: 0.45, size: 40, label: "Baby Moses is safe!" },
            { x: 0.55, y: 0.40, size: 36, label: "Brave Miriam!" },
            { x: 0.25, y: 0.55, size: 36, label: "Thank God!" },
            { x: 0.70, y: 0.50, size: 36, label: "What a plan!" },
          ],
          cinematicConfig: {
            effects: [{ type: "celebration" }],
            revealText: "God uses brave kids like you!",
            revealColor: "#F5C451",
            revealDelay: 1000,
          },
        },
        soundEffects: [{ key: "crowd_cheer", trigger: "tap" }],
      },
    ],
  },

  {
    title: "Esther the Brave Queen",
    imagePrefix: "esther",
    memoryVerse: "Who knows? Maybe you were made queen for such a time as this.",
    memoryVerseRef: "Esther 4:14",
    prayerPrompt: "Dear God, help me to be brave like Esther when I need to do the right thing. Thank You for putting me where I am for a reason. Amen.",
    thinkQuestions: [
      "Why was Esther afraid to go to the king?",
      "Who encouraged Esther to be brave?",
      "How can God use you to help others?",
    ],
    activitySuggestion: "Write down one brave thing you can do this week to help someone. Ask God for courage and then do it!",
    scenes: [
      {
        narration: "Esther was a beautiful young queen who lived in a grand palace. She was kind and gentle, and she loved God with all her heart.",
        illustrationPrompt: "Young Queen Esther in a royal palace wearing a crown, looking out a window",
        mood: "PEACE",
        interactionType: "tap_wiggle",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Can you find Queen Esther?",
          sequential: true,
          hotspots: [
            { x: 0.50, y: 0.45, size: 44, label: "Queen Esther!" },
            { x: 0.30, y: 0.55, size: 40, label: "Her beautiful crown!" },
          ],
          cinematicConfig: {
            effects: [
              { type: "particles", count: 6, color: "rgba(218,165,32,0.4)", speed: "slow" },
            ],
          },
        },
        soundEffects: [{ key: "gentle_breeze", trigger: "ambient" }],
      },
      {
        narration: "One day, Esther heard terrible news. A bad man wanted to hurt her people! Her cousin Mordecai told her, 'You must help! Maybe God made you queen for this very reason.'",
        illustrationPrompt: "Mordecai sitting sadly outside palace gates with worried people",
        mood: "TENSION",
        interactionType: "tap_compare",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Tap Mordecai!",
          hotspot: { x: 0.45, y: 0.50, size: 50 },
          resultText: "Mordecai says: 'Be brave, Esther! God chose you for this!'",
          cinematicConfig: {
            effects: [
              { type: "glow", x: 0.45, y: 0.50, color: "rgba(100,80,60,0.12)", size: 140, delay: 800, duration: 4000 },
            ],
          },
        },
        soundEffects: [{ key: "drum_thump", trigger: "tap" }],
      },
      {
        narration: "Esther was scared. Going to the king without being invited was very dangerous. But she knelt down and prayed. 'God, please help me be brave.'",
        illustrationPrompt: "Queen Esther kneeling in prayer in her royal chamber with golden light",
        mood: "AWE",
        interactionType: "tap_glow",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Tap Esther's praying heart!",
          hotspot: { x: 0.50, y: 0.50 },
          revealText: "God, give me courage.",
          glowColor: "rgba(218,165,32,0.3)",
          cinematicConfig: {
            effects: [
              { type: "glow", x: 0.50, y: 0.50, color: "rgba(218,165,32,0.18)", size: 130, delay: 1200, duration: 5000 },
              { type: "particles", count: 5, color: "rgba(218,165,32,0.4)", speed: "slow" },
            ],
          },
        },
        soundEffects: [{ key: "soft_chime", trigger: "tap" }],
      },
      {
        narration: "Esther put on her royal robes and walked bravely toward the king's throne room. Her heart was beating fast, but she knew God was with her.",
        illustrationPrompt: "Queen Esther walking bravely toward throne room with golden columns and guards",
        mood: "TENSION",
        interactionType: "tap_collect",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Walk with Esther to the throne!",
          totalItems: 3,
          sequential: true,
          completeText: "Esther is so brave!",
          hotspots: [
            { x: 0.70, y: 0.50, size: 38, label: "One brave step!" },
            { x: 0.50, y: 0.50, size: 38, label: "Keep going!" },
            { x: 0.30, y: 0.50, size: 38, label: "Almost there!" },
          ],
          cinematicConfig: {
            effects: [
              { type: "shimmer", y: 0.50, width: 0.6, delay: 0 },
              { type: "particles", count: 4, color: "rgba(218,165,32,0.3)", speed: "slow" },
            ],
          },
        },
        soundEffects: [{ key: "drum_thump", trigger: "collect" }],
      },
      {
        narration: "The king saw Esther and smiled! He held out his golden scepter. 'What do you need, Queen Esther?' Esther bravely asked him to save her people!",
        illustrationPrompt: "King extending golden scepter toward Queen Esther in the grand throne room",
        mood: "JOY",
        interactionType: "drag_release",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Touch the golden scepter!",
          slingArea: { x: 0.35, y: 0.40 },
          targetArea: { x: 0.60, y: 0.45 },
          resultText: "The king will help!",
          cinematicConfig: {
            effects: [
              { type: "glow", x: 0.50, y: 0.40, color: "rgba(255,215,0,0.2)", size: 160, delay: 0, duration: 5000 },
            ],
            slingArea: { x: 0.35, y: 0.40 },
            targetArea: { x: 0.60, y: 0.45 },
            revealText: "The king will help!",
          },
        },
        soundEffects: [{ key: "soft_chime", trigger: "drag" }],
      },
      {
        narration: "Because of Esther's bravery, all her people were saved! God used Esther for an important job. God has an important job for you too!",
        illustrationPrompt: "Queen Esther and Mordecai celebrating with joyful people, flowers, and banners",
        mood: "JOY",
        interactionType: "tap_cheer",
        interactionConfig: {
          isLivingScene: true,
          instruction: "Celebrate with Queen Esther!",
          sequential: true,
          hotspots: [
            { x: 0.45, y: 0.40, size: 40, label: "Brave Esther!" },
            { x: 0.60, y: 0.45, size: 36, label: "Mordecai is happy!" },
            { x: 0.25, y: 0.55, size: 36, label: "Everyone is safe!" },
            { x: 0.75, y: 0.50, size: 36, label: "Thank God!" },
          ],
          cinematicConfig: {
            effects: [{ type: "celebration" }],
            revealText: "God has a plan for you too!",
            revealColor: "#F5C451",
            revealDelay: 1000,
          },
        },
        soundEffects: [{ key: "crowd_cheer", trigger: "tap" }],
      },
    ],
  },
];

async function seedFlagshipStories() {
  console.log("[flagship-stories] Starting flagship story seeds...");

  for (const storyData of FLAGSHIP_STORIES) {
    console.log(`\n[flagship-stories] Processing: ${storyData.title}`);

    const [story] = await db
      .select({ id: kidsStories.id, title: kidsStories.title })
      .from(kidsStories)
      .where(eq(kidsStories.title, storyData.title))
      .limit(1);

    if (!story) {
      console.error(`[flagship-stories] FATAL: '${storyData.title}' not found in kids_story table.`);
      console.error("[flagship-stories] Ensure seed-kids-content.ts runs before this script.");
      process.exit(1);
    }

    const storyId = story.id;
    console.log(`[flagship-stories] Found story ID: ${storyId}`);

    await db.transaction(async (tx) => {
      await tx.update(kidsStories).set({
        memoryVerse: storyData.memoryVerse,
        memoryVerseRef: storyData.memoryVerseRef,
        prayerPrompt: storyData.prayerPrompt,
        thinkQuestions: storyData.thinkQuestions,
        activitySuggestion: storyData.activitySuggestion,
        imageUrl: `/assets/kids-scenes/${storyData.imagePrefix}-scene-0.png`,
      }).where(eq(kidsStories.id, storyId));
      console.log(`[flagship-stories]   Updated story metadata`);

      await tx.delete(kidsStoryScenes).where(eq(kidsStoryScenes.storyId, storyId));
      console.log(`[flagship-stories]   Cleared existing scenes`);

      for (let i = 0; i < storyData.scenes.length; i++) {
        const scene = storyData.scenes[i];
        await tx.insert(kidsStoryScenes).values({
          storyId,
          sceneIndex: i,
          narration: scene.narration,
          illustrationPrompt: scene.illustrationPrompt,
          imageUrl: `/assets/kids-scenes/${storyData.imagePrefix}-scene-${i}.png`,
          mood: scene.mood,
          interactionType: scene.interactionType,
          interactionConfig: scene.interactionConfig,
          soundEffects: scene.soundEffects,
        });
        console.log(`[flagship-stories]   Scene ${i}: ${scene.interactionType}`);
      }

      const verifyCount = await tx
        .select({ id: kidsStoryScenes.id })
        .from(kidsStoryScenes)
        .where(eq(kidsStoryScenes.storyId, storyId));

      if (verifyCount.length !== 6) {
        throw new Error(`VERIFY FAILED: Expected 6 scenes for ${storyData.title}, found ${verifyCount.length}`);
      }

      const [updatedStory] = await tx
        .select({ imageUrl: kidsStories.imageUrl, memoryVerse: kidsStories.memoryVerse })
        .from(kidsStories)
        .where(eq(kidsStories.id, storyId));

      if (!updatedStory.imageUrl || !updatedStory.memoryVerse) {
        throw new Error(`VERIFY FAILED: Story metadata not updated for ${storyData.title}`);
      }
    });

    console.log(`[flagship-stories] SUCCESS: ${storyData.title} - 6 cinematic scenes + metadata verified`);
  }

  console.log("\n[flagship-stories] All flagship stories seeded successfully!");
}

seedFlagshipStories()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[flagship-stories] FATAL:", err);
    process.exit(1);
  });
