import { db } from "../db";
import { videoAvatars, videoTopics } from "../../shared/schema";
import { eq } from "drizzle-orm";

const JUNIPER_HEYGEN_AVATAR_ID = "June_expressive_2024112701";

const voiceOptions = [
  { name: "Voice 01", heygenVoiceId: "42d00d4aac5441279d8536cd6b52c53c" },
  { name: "Voice 02", heygenVoiceId: "09d88c036bf449fa905900c08b235a37" },
  { name: "Voice 03", heygenVoiceId: "41332f3d53e148aab6956b92d3e5503e" },
  { name: "Voice 04", heygenVoiceId: "5c90cf027f8640409263562d8a856353" },
  { name: "Voice 05", heygenVoiceId: "6dd171c356f94a138cdbb5bd11ea8ee8" },
  { name: "Voice 06", heygenVoiceId: "84ebf1075bdf456ebd9bf7d72622f6b1" },
  { name: "Voice 07", heygenVoiceId: "8f03500c019542408bf387e224237f36" },
  { name: "Voice 08", heygenVoiceId: "9bfc54ad124e4e038c42d048fd17ab5f" },
  { name: "Voice 09", heygenVoiceId: "9ef379ab5a224478b122ed6238cb9e06" },
  { name: "Voice 10", heygenVoiceId: "a37818640892463e9f0bea71a3eb2c55" },
  { name: "Voice 11", heygenVoiceId: "00c1335e20a547639d4ac7ebd7f9df29" },
  { name: "Voice 12", heygenVoiceId: "0495e14c2bd74eb3aeeef03583e0bce5" },
  { name: "Voice 13", heygenVoiceId: "06d2e8048b9244259f89a30e36e65134" },
  { name: "Voice 14", heygenVoiceId: "06e6facd99654b9dbb9308f67bf3a31c" },
  { name: "Voice 15", heygenVoiceId: "084760b4922a44599575c770070ec2d7" },
];

async function seed() {
  console.log("Seeding video avatars...");

  const [juniper] = await db
    .insert(videoAvatars)
    .values({
      name: "Juniper",
      heygenAvatarId: JUNIPER_HEYGEN_AVATAR_ID,
      heygenVoiceId: "68dedac41a9f46a6a4271a95c733823c",
      gender: "female",
      ethnicity: "mixed",
      ageGroup: "teens",
      description: "Friendly teenage girl with natural delivery",
      isDefault: true,
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  if (juniper) {
    console.log(`Inserted avatar: ${juniper.name} (${juniper.id})`);

    const result = await db
      .update(videoTopics)
      .set({ avatarId: juniper.id })
      .returning();

    console.log(`Updated ${result.length} video topics with avatarId=${juniper.id}`);
  } else {
    const existing = await db
      .select()
      .from(videoAvatars)
      .where(eq(videoAvatars.name, "Juniper"));

    if (existing.length > 0) {
      console.log(`Avatar Juniper already exists (${existing[0].id}), skipping.`);
    }
  }

  const youngMaleAvatars = [
    {
      name: "Jude",
      heygenAvatarId: "702eaba7afc04f92a1575cddc71214e3",
      heygenVoiceId: "bb9907f77f44479996299a56bb04ac49",
      gender: "male",
      ethnicity: "mixed",
      ageGroup: "teens",
      description: "Natural mixed race teenage boy 17-18 authentic and relatable",
      isDefault: false,
      isActive: true,
    },
    {
      name: "Young Male 2",
      heygenAvatarId: "b7a479adf7c649e8b0684ea114fd399c",
      heygenVoiceId: "3ea8b0a942c44f23bc70653495718682",
      gender: "male",
      ethnicity: "white",
      ageGroup: "teens",
      description: "Young white male early 20s",
      isDefault: false,
      isActive: true,
    },
    {
      name: "Sienna",
      heygenAvatarId: "1beb510ef661478d86765c20473a8451",
      heygenVoiceId: "c4756a97db104a0786158f2a1f362f9d",
      gender: "female",
      ethnicity: "mixed",
      ageGroup: "teens",
      description: "Natural teenage girl 17-18 relatable and authentic",
      isDefault: false,
      isActive: true,
    },
  ];

  const maleInserted = await db
    .insert(videoAvatars)
    .values(youngMaleAvatars)
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${maleInserted.length} young male avatars.`);

  const voiceValues = voiceOptions.map((v) => ({
    name: v.name,
    heygenAvatarId: JUNIPER_HEYGEN_AVATAR_ID,
    heygenVoiceId: v.heygenVoiceId,
    gender: "female",
    ageGroup: "teens and young adults",
    description: `Female young voice option (${v.name})`,
    isDefault: false,
    isActive: true,
  }));

  const inserted = await db
    .insert(videoAvatars)
    .values(voiceValues)
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${inserted.length} voice options.`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
