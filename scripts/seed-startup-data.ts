import { db } from "../server/db";

async function main() {
  console.log("=== Seeding startup data for production ===");

  const { seedBibleBooks } = await import("../server/seed-books");
  await seedBibleBooks(db);
  console.log("Bible books: done");

  const { seedFormationData } = await import("../server/seed-formation");
  await seedFormationData(db);
  console.log("Formation data: done");

  const { seedBeliefsWave1 } = await import("../server/seed-beliefs-wave1");
  await seedBeliefsWave1(db);
  console.log("Beliefs wave 1: done");

  const { seedBeliefsWave2 } = await import("../server/seed-beliefs-wave2");
  await seedBeliefsWave2(db);
  console.log("Beliefs wave 2: done");

  const { seedBeliefsWave3 } = await import("../server/seed-beliefs-wave3");
  await seedBeliefsWave3(db);
  console.log("Beliefs wave 3: done");

  const { seedBeliefsWave4 } = await import("../server/seed-beliefs-wave4");
  await seedBeliefsWave4(db);
  console.log("Beliefs wave 4: done");

  const { seedResources } = await import("../server/seed-resources");
  await seedResources(db);
  console.log("Resources: done");

  console.log("=== Startup data seeding complete ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Startup data seed error:", err);
  process.exit(1);
});
