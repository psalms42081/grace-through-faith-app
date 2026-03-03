import { eq } from "drizzle-orm";
import {
  formationModules,
  formationLessons,
  lessonSections,
  formationAssessments,
  assessmentItems,
} from "../shared/schema";

import {
  belief19Lessons, belief19Sections, belief19Assessments, belief19Items,
  belief20Lessons, belief20Sections, belief20Assessments, belief20Items,
} from "./seeds/wave4-beliefs-19-20";

import {
  belief21Lessons, belief21Sections, belief21Assessments, belief21Items,
  belief22Lessons, belief22Sections, belief22Assessments, belief22Items,
} from "./seeds/wave4-beliefs-21-22";

import {
  belief23Lessons, belief23Sections, belief23Assessments, belief23Items,
  belief24Lessons, belief24Sections, belief24Assessments, belief24Items,
} from "./seeds/wave4-beliefs-23-24";

import {
  belief25Lessons, belief25Sections, belief25Assessments, belief25Items,
  belief26Lessons, belief26Sections, belief26Assessments, belief26Items,
} from "./seeds/wave4-beliefs-25-26";

import {
  belief27Lessons, belief27Sections, belief27Assessments, belief27Items,
  belief28Lessons, belief28Sections, belief28Assessments, belief28Items,
} from "./seeds/wave4-beliefs-27-28";

export async function seedBeliefsWave4(db: any) {
  const [check] = await db
    .select()
    .from(formationLessons)
    .where(eq(formationLessons.id, "w4l-19-1"))
    .limit(1);

  if (check) {
    return;
  }

  console.log("Seeding Wave 4 beliefs content (Beliefs 19-28)...");

  const moduleIds = [
    "bmod-019", "bmod-020", "bmod-021", "bmod-022", "bmod-023",
    "bmod-024", "bmod-025", "bmod-026", "bmod-027", "bmod-028",
  ];
  for (const mid of moduleIds) {
    await db
      .update(formationModules)
      .set({ totalLessons: 4 })
      .where(eq(formationModules.id, mid));
  }

  const allLessons = [
    ...belief19Lessons, ...belief20Lessons, ...belief21Lessons,
    ...belief22Lessons, ...belief23Lessons, ...belief24Lessons,
    ...belief25Lessons, ...belief26Lessons, ...belief27Lessons,
    ...belief28Lessons,
  ];

  const allSections = [
    ...belief19Sections, ...belief20Sections, ...belief21Sections,
    ...belief22Sections, ...belief23Sections, ...belief24Sections,
    ...belief25Sections, ...belief26Sections, ...belief27Sections,
    ...belief28Sections,
  ];

  const allAssessments = [
    ...belief19Assessments, ...belief20Assessments, ...belief21Assessments,
    ...belief22Assessments, ...belief23Assessments, ...belief24Assessments,
    ...belief25Assessments, ...belief26Assessments, ...belief27Assessments,
    ...belief28Assessments,
  ];

  const allItems = [
    ...belief19Items, ...belief20Items, ...belief21Items,
    ...belief22Items, ...belief23Items, ...belief24Items,
    ...belief25Items, ...belief26Items, ...belief27Items,
    ...belief28Items,
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

  console.log("Wave 4 beliefs content seeded successfully.");
}
