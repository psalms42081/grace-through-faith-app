import { db } from "../server/db";
import {
  formationModuleI18n,
  formationLessonI18n,
  lessonSectionI18n,
  assessmentItemI18n,
} from "../shared/schema";
import * as fs from "fs";
import * as path from "path";

async function importTranslation(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  const meta = data._meta;
  if (!meta) {
    console.error(`No _meta field in ${filePath}, skipping.`);
    return;
  }

  if (!meta.reviewed) {
    console.log(`Skipping ${filePath} — not marked as reviewed.`);
    return;
  }

  const lang = meta.language;
  const moduleId = meta.moduleId;

  if (!lang || !moduleId) {
    console.error(`Missing language or moduleId in ${filePath}`);
    return;
  }

  console.log(`Importing ${lang} translations for module ${moduleId}...`);

  await db
    .insert(formationModuleI18n)
    .values({
      moduleId,
      language: lang,
      title: data.module.title,
      description: data.module.description || null,
    })
    .onConflictDoNothing();

  let lessonCount = 0;
  let sectionCount = 0;
  let itemCount = 0;

  for (const lesson of data.lessons || []) {
    await db
      .insert(formationLessonI18n)
      .values({
        lessonId: lesson.lessonId,
        language: lang,
        title: lesson.title,
        summary: lesson.summary || null,
      })
      .onConflictDoNothing();
    lessonCount++;

    for (const section of lesson.sections || []) {
      await db
        .insert(lessonSectionI18n)
        .values({
          sectionId: section.sectionId,
          language: lang,
          heading: section.heading || null,
          content: section.content,
        })
        .onConflictDoNothing();
      sectionCount++;
    }

    for (const item of lesson.assessmentItems || []) {
      await db
        .insert(assessmentItemI18n)
        .values({
          itemId: item.itemId,
          language: lang,
          question: item.question,
          options: item.options,
          explanation: item.explanation || null,
        })
        .onConflictDoNothing();
      itemCount++;
    }
  }

  console.log(`  ${lessonCount} lessons, ${sectionCount} sections, ${itemCount} assessment items imported.`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: npx tsx scripts/import-content-translations.ts <file1.json> [file2.json] ...");
  console.log("       npx tsx scripts/import-content-translations.ts i18n-content/es/bmod-019.json");
  console.log("       npx tsx scripts/import-content-translations.ts i18n-content/es/*.json");
  process.exit(1);
}

(async () => {
  for (const arg of args) {
    if (!fs.existsSync(arg)) {
      console.error(`File not found: ${arg}`);
      continue;
    }
    await importTranslation(arg);
  }
  console.log("Import complete.");
  process.exit(0);
})();
