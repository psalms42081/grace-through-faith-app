import { eq } from "drizzle-orm";
import {
  formationModules,
  formationLessons,
  lessonSections,
  formationAssessments,
  assessmentItems,
} from "../shared/schema";

import {
  belief1Lessons, belief1Sections, belief1Assessments, belief1Items,
  belief2Lessons, belief2Sections, belief2Assessments, belief2Items,
} from "./seeds/wave1-beliefs-1-2";

import {
  belief3Lessons, belief3Sections, belief3Assessments, belief3Items,
  belief4Lessons, belief4Sections, belief4Assessments, belief4Items,
} from "./seeds/wave1-beliefs-3-4";

import {
  belief5Lessons, belief5Sections, belief5Assessments, belief5Items,
  belief6Lessons, belief6Sections, belief6Assessments, belief6Items,
} from "./seeds/wave1-beliefs-5-6";

import {
  belief7Lessons, belief7Sections, belief7Assessments, belief7Items,
} from "./seeds/wave1-belief-7";

export async function seedBeliefsWave1(db: any) {
  const [check] = await db
    .select()
    .from(formationLessons)
    .where(eq(formationLessons.id, "w1l-1-2"))
    .limit(1);

  if (check) {
    return;
  }

  console.log("Seeding Wave 1 beliefs content (Beliefs 1-7)...");

  const moduleIds = [
    "bmod-001", "bmod-002", "bmod-003", "bmod-004",
    "bmod-005", "bmod-006", "bmod-007",
  ];
  for (const mid of moduleIds) {
    await db
      .update(formationModules)
      .set({ totalLessons: 4 })
      .where(eq(formationModules.id, mid));
  }

  const allLessons = [
    ...belief1Lessons, ...belief2Lessons, ...belief3Lessons,
    ...belief4Lessons, ...belief5Lessons, ...belief6Lessons,
    ...belief7Lessons,
  ];

  const allSections = [
    ...belief1Sections, ...belief2Sections, ...belief3Sections,
    ...belief4Sections, ...belief5Sections, ...belief6Sections,
    ...belief7Sections,
  ];

  const allAssessments = [
    ...belief1Assessments, ...belief2Assessments, ...belief3Assessments,
    ...belief4Assessments, ...belief5Assessments, ...belief6Assessments,
    ...belief7Assessments,
  ];

  const allItems = [
    ...belief1Items, ...belief2Items, ...belief3Items,
    ...belief4Items, ...belief5Items, ...belief6Items,
    ...belief7Items,
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

  console.log("Wave 1 beliefs content seeded successfully.");
}
