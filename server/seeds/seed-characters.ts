import { db } from "../db";
import { characters } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { uploadCharacterImage } from "../services/characterService";
import { ELEVENLABS_VOICES } from "../elevenlabs-tts";
import path from "path";
import fs from "fs";

const INITIAL_CHARACTERS = [
  {
    name: "Jesus (Risen)",
    slug: "jesus-risen",
    characterType: "biblical",
    gender: "male",
    description: "The risen Christ, depicted in glowing white robes",
    voiceId: ELEVENLABS_VOICES.brian,
    aliases: ["jesus", "risen", "christ", "lord", "savior", "messiah", "son of god", "son of man", "lamb"],
    existingCloudinaryUrl: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774819850/grace-through-faith/character-refs/jesus-risen.png",
  },
  {
    name: "Mary Magdalene",
    slug: "mary-magdalene",
    characterType: "biblical",
    gender: "female",
    description: "Mary Magdalene, devoted follower of Jesus",
    voiceId: ELEVENLABS_VOICES.lily,
    aliases: ["mary magdalene", "magdalene", "mary of magdala"],
    existingCloudinaryUrl: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774819846/grace-through-faith/character-refs/mary-magdalene.png",
  },
  {
    name: "Elder Disciple",
    slug: "elder-disciple",
    characterType: "biblical",
    gender: "male",
    description: "An older, wise disciple character",
    voiceId: ELEVENLABS_VOICES.bill,
    aliases: ["elder", "elder disciple", "old disciple"],
    existingCloudinaryUrl: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774819847/grace-through-faith/character-refs/elder-disciple.png",
  },
  {
    name: "Young Disciple",
    slug: "young-disciple",
    characterType: "biblical",
    gender: "male",
    description: "A young, eager disciple character",
    voiceId: ELEVENLABS_VOICES.will,
    aliases: ["young disciple", "young man", "young follower"],
    existingCloudinaryUrl: "https://res.cloudinary.com/dy77gwpzu/image/upload/v1774819849/grace-through-faith/character-refs/young-disciple.png",
  },
  {
    name: "Elder Narrator",
    slug: "elder-narrator",
    characterType: "narrator",
    gender: "male",
    description: "Biblical elder narrator character for storytelling",
    voiceId: ELEVENLABS_VOICES.george,
    aliases: ["elder narrator"],
    localAsset: "attached_assets/biblical-elder-narrator-character.png",
  },
  {
    name: "Biblical Narrator",
    slug: "biblical-narrator",
    characterType: "narrator",
    gender: "male",
    description: "Primary biblical narrator character",
    voiceId: ELEVENLABS_VOICES.george,
    aliases: ["narrator", "biblical narrator"],
    localAsset: "attached_assets/biblical-narrator-character.png",
  },
  {
    name: "Witness Woman",
    slug: "witness-woman",
    characterType: "narrator",
    gender: "female",
    description: "Female witness narrator character",
    voiceId: ELEVENLABS_VOICES.sarah_velvety,
    aliases: ["witness woman", "woman narrator", "female witness"],
    localAsset: "attached_assets/biblical-witness-woman-character.png",
  },
  {
    name: "Young Disciple Narrator",
    slug: "young-disciple-narrator",
    characterType: "narrator",
    gender: "male",
    description: "Young disciple narrator character for storytelling",
    voiceId: ELEVENLABS_VOICES.will,
    aliases: ["young narrator", "young disciple narrator"],
    localAsset: "attached_assets/biblical-young-disciple-character.png",
  },
  {
    name: "The Woman of Revelation",
    slug: "woman-of-revelation",
    characterType: "biblical",
    gender: "female",
    description: "The Woman clothed with the sun from Revelation 12",
    voiceId: ELEVENLABS_VOICES.sarah_warm,
    aliases: ["woman of revelation", "woman clothed with the sun", "woman clothed in the sun", "revelation woman"],
    localAsset: "attached_assets/d1380efd-9f74-48ba-9096-e401ee8eb1c3_1774865413794.webp",
  },
  {
    name: "The Red Dragon",
    slug: "red-dragon",
    characterType: "biblical",
    gender: "male",
    description: "The great red dragon from Revelation 12",
    voiceId: ELEVENLABS_VOICES.callum,
    aliases: ["red dragon", "dragon", "great dragon", "serpent", "devil"],
    localAsset: "attached_assets/0b2a9a49-9366-4270-a9a8-a7e8dfd34a6c_1774865793080.webp",
  },
  {
    name: "Mary (Mother of Jesus)",
    slug: "mary-mother",
    characterType: "biblical",
    gender: "female",
    description: "Mary, the mother of Jesus",
    voiceId: ELEVENLABS_VOICES.sarah_warm,
    aliases: ["mary mother", "mother mary", "virgin mary", "the virgin"],
  },
  {
    name: "Sarah",
    slug: "sarah-presenter",
    characterType: "presenter",
    gender: "female",
    description: "Young woman presenter/host character with dark wavy hair and cross necklace",
    voiceId: "tzWbJkiOdmIRHTvWzqUi",
    aliases: ["sarah", "sarah presenter"],
    localAssets: [
      "attached_assets/Video_Editing_Project_In_a_clean_studio_portrait_style_a_young_1776150727021.png",
      "attached_assets/Video_Editing_Project_A_young_woman_with_dark_wavy_hair_stands_1776150727022.png",
    ],
  },
  {
    name: "Rachel",
    slug: "rachel-presenter",
    characterType: "presenter",
    gender: "female",
    description: "Young Black woman presenter/host character with curly hair",
    voiceId: "9it9e7YrudC3YYtEwZq8",
    aliases: ["rachel", "rachel presenter"],
    localAssets: [
      "attached_assets/Video_Editing_Project_In_a_photographic_portrait_style_a_perso_1776150727021.png",
      "attached_assets/Video_Editing_Project_A_young_Black_woman_stands_centered_agai_1776150727022.png",
      "attached_assets/Video_Editing_Project_In_a_natural_light_portrait_photography__1776150727022.png",
    ],
  },
];

export async function seedCharacters() {
  console.log("[seed-characters] Starting character seed...");

  for (const charData of INITIAL_CHARACTERS) {
    const existing = await db
      .select()
      .from(characters)
      .where(eq(characters.slug, charData.slug));

    if (existing.length > 0) {
      console.log(`[seed-characters] Character "${charData.name}" already exists, skipping.`);
      continue;
    }

    let cloudinaryUrl: string | undefined = charData.existingCloudinaryUrl;
    let thumbnailUrl: string | undefined;

    if (!cloudinaryUrl && charData.localAsset) {
      const assetPath = path.resolve(process.cwd(), charData.localAsset);
      if (fs.existsSync(assetPath)) {
        try {
          const uploaded = await uploadCharacterImage(assetPath, charData.slug);
          cloudinaryUrl = uploaded.url;
          thumbnailUrl = uploaded.thumbnailUrl;
          console.log(`[seed-characters] Uploaded "${charData.name}" to Cloudinary: ${cloudinaryUrl.substring(0, 60)}...`);
        } catch (err) {
          console.error(`[seed-characters] Failed to upload "${charData.name}":`, err);
        }
      } else {
        console.warn(`[seed-characters] Local asset not found for "${charData.name}": ${assetPath}`);
      }
    }

    await db.insert(characters).values({
      name: charData.name,
      slug: charData.slug,
      characterType: charData.characterType,
      gender: charData.gender,
      description: charData.description,
      cloudinaryUrl,
      thumbnailUrl,
      voiceId: charData.voiceId,
      aliases: charData.aliases,
      isActive: true,
    });

    console.log(`[seed-characters] Seeded character: "${charData.name}" (${charData.characterType})`);
  }

  console.log("[seed-characters] Character seed complete.");
}

const _isDirectRun = (() => { try { return (typeof require !== 'undefined' && require.main === (typeof module !== 'undefined' ? module : undefined)); } catch { return false; } })();
if (_isDirectRun || process.argv[1]?.includes("seed-characters")) {
  seedCharacters()
    .then(() => {
      console.log("Character seed finished.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Character seed failed:", err);
      process.exit(1);
    });
}
