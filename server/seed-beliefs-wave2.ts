import { eq } from "drizzle-orm";
import {
  formationModules,
  formationLessons,
  lessonSections,
  formationAssessments,
  assessmentItems,
} from "../shared/schema";

import {
  belief8Lessons, belief8Sections, belief8Assessments, belief8Items,
} from "./seeds/wave2-belief-8";

import {
  belief9Lessons, belief9Sections, belief9Assessments, belief9Items,
} from "./seeds/wave2-belief-9";

import {
  belief10Lessons, belief10Sections, belief10Assessments, belief10Items,
} from "./seeds/wave2-belief-10";

import {
  belief11Lessons, belief11Sections, belief11Assessments, belief11Items,
} from "./seeds/wave2-belief-11";

export async function seedBeliefsWave2(db: any) {
  const [check] = await db
    .select()
    .from(formationLessons)
    .where(eq(formationLessons.id, "w2l-8-1"))
    .limit(1);

  if (check) {
    return;
  }

  console.log("Seeding Wave 2 beliefs content (Beliefs 8-11)...");

  const moduleIds = ["bmod-008", "bmod-009", "bmod-010", "bmod-011"];
  for (const mid of moduleIds) {
    await db
      .update(formationModules)
      .set({ totalLessons: 4 })
      .where(eq(formationModules.id, mid));
  }

  const allLessons = [
    ...belief8Lessons, ...belief9Lessons, ...belief10Lessons, ...belief11Lessons,
  ];

  const allSections = [
    ...belief8Sections, ...belief9Sections, ...belief10Sections, ...belief11Sections,
  ];

  const allAssessments = [
    ...belief8Assessments, ...belief9Assessments, ...belief10Assessments, ...belief11Assessments,
  ];

  const allItems = [
    ...belief8Items, ...belief9Items, ...belief10Items, ...belief11Items,
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

  console.log("Wave 2 beliefs content seeded successfully.");
}
