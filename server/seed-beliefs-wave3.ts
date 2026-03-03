import { eq } from "drizzle-orm";
import {
  formationModules,
  formationLessons,
  lessonSections,
  formationAssessments,
  assessmentItems,
} from "../shared/schema";

import {
  belief12Lessons, belief12Sections, belief12Assessments, belief12Items,
  belief13Lessons, belief13Sections, belief13Assessments, belief13Items,
} from "./seeds/wave3-beliefs-12-13";

import {
  belief14Lessons, belief14Sections, belief14Assessments, belief14Items,
  belief15Lessons, belief15Sections, belief15Assessments, belief15Items,
} from "./seeds/wave3-beliefs-14-15";

import {
  belief16Lessons, belief16Sections, belief16Assessments, belief16Items,
} from "./seeds/wave3-belief-16";

import {
  belief17Lessons, belief17Sections, belief17Assessments, belief17Items,
} from "./seeds/wave3-belief-17";

import {
  belief18Lessons, belief18Sections, belief18Assessments, belief18Items,
} from "./seeds/wave3-belief-18";

export async function seedBeliefsWave3(db: any) {
  const [check] = await db
    .select()
    .from(formationLessons)
    .where(eq(formationLessons.id, "w3l-12-1"))
    .limit(1);

  if (check) {
    return;
  }

  console.log("Seeding Wave 3 beliefs content (Beliefs 12-18)...");

  const moduleIds = [
    "bmod-012", "bmod-013", "bmod-014", "bmod-015",
    "bmod-016", "bmod-017", "bmod-018",
  ];
  for (const mid of moduleIds) {
    await db
      .update(formationModules)
      .set({ totalLessons: 4 })
      .where(eq(formationModules.id, mid));
  }

  const allLessons = [
    ...belief12Lessons, ...belief13Lessons, ...belief14Lessons,
    ...belief15Lessons, ...belief16Lessons, ...belief17Lessons,
    ...belief18Lessons,
  ];

  const allSections = [
    ...belief12Sections, ...belief13Sections, ...belief14Sections,
    ...belief15Sections, ...belief16Sections, ...belief17Sections,
    ...belief18Sections,
  ];

  const allAssessments = [
    ...belief12Assessments, ...belief13Assessments, ...belief14Assessments,
    ...belief15Assessments, ...belief16Assessments, ...belief17Assessments,
    ...belief18Assessments,
  ];

  const allItems = [
    ...belief12Items, ...belief13Items, ...belief14Items,
    ...belief15Items, ...belief16Items, ...belief17Items,
    ...belief18Items,
  ];

  const BATCH = 20;

  for (let i = 0; i < allLessons.length; i += BATCH) {
    await db.insert(formationLessons).values(allLessons.slice(i, i + BATCH)).onConflictDoNothing();
  }
  console.log(`  Inserted ${allLessons.length} lessons`);

  for (let i = 0; i < allSections.length; i += BATCH) {
    await db.insert(lessonSections).values(allSections.slice(i, i + BATCH)).onConflictDoNothing();
  }
  console.log(`  Inserted ${allSections.length} sections`);

  for (let i = 0; i < allAssessments.length; i += BATCH) {
    await db.insert(formationAssessments).values(allAssessments.slice(i, i + BATCH)).onConflictDoNothing();
  }
  console.log(`  Inserted ${allAssessments.length} assessments`);

  for (let i = 0; i < allItems.length; i += BATCH) {
    await db.insert(assessmentItems).values(allItems.slice(i, i + BATCH)).onConflictDoNothing();
  }
  console.log(`  Inserted ${allItems.length} assessment items`);

  console.log("Wave 3 beliefs content seeded successfully.");
}
