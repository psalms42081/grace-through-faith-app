import { db } from "../server/db";
import {
  formationModules,
  formationLessons,
  lessonSections,
  assessmentItems,
  formationAssessments,
} from "../shared/schema";
import { eq, asc } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const LANGUAGES = ["es", "fr", "pt", "fil", "zh"];

async function generateStubs(moduleIds: string[], outputDir: string) {
  fs.mkdirSync(outputDir, { recursive: true });

  for (const moduleId of moduleIds) {
    const [mod] = await db
      .select()
      .from(formationModules)
      .where(eq(formationModules.id, moduleId));

    if (!mod) {
      console.log(`Module ${moduleId} not found, skipping.`);
      continue;
    }

    const lessons = await db
      .select()
      .from(formationLessons)
      .where(eq(formationLessons.moduleId, moduleId))
      .orderBy(asc(formationLessons.lessonOrder));

    const stub: Record<string, any> = {
      _meta: {
        moduleId,
        moduleTitleEn: mod.title,
        generatedAt: new Date().toISOString(),
        reviewed: false,
      },
      module: {
        title: mod.title,
        description: mod.description || "",
      },
      lessons: [],
    };

    for (const lesson of lessons) {
      const sections = await db
        .select()
        .from(lessonSections)
        .where(eq(lessonSections.lessonId, lesson.id))
        .orderBy(asc(lessonSections.sortOrder));

      const assessmentsForLesson = await db
        .select()
        .from(formationAssessments)
        .where(eq(formationAssessments.lessonId, lesson.id));

      let items: any[] = [];
      if (assessmentsForLesson.length > 0) {
        items = await db
          .select()
          .from(assessmentItems)
          .where(eq(assessmentItems.assessmentId, assessmentsForLesson[0].id));
      }

      const lessonStub: Record<string, any> = {
        lessonId: lesson.id,
        title: lesson.title,
        summary: lesson.description || "",
        sections: sections
          .filter((s) => s.sectionType !== "assessment")
          .map((s) => ({
            sectionId: s.id,
            sectionType: s.sectionType,
            heading: s.title,
            content: s.content || "",
          })),
        assessmentItems: items.map((item) => ({
          itemId: item.id,
          question: item.question,
          options: item.options,
          explanation: item.explanation || "",
        })),
      };

      stub.lessons.push(lessonStub);
    }

    for (const lang of LANGUAGES) {
      const langDir = path.join(outputDir, lang);
      fs.mkdirSync(langDir, { recursive: true });
      const filePath = path.join(langDir, `${moduleId}.json`);
      const output = { ...stub, _meta: { ...stub._meta, language: lang } };
      fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8");
      console.log(`Written: ${filePath}`);
    }
  }

  console.log("Stub generation complete.");
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: npx tsx scripts/generate-i18n-stubs.ts <moduleId1> [moduleId2] ...");
  console.log("       npx tsx scripts/generate-i18n-stubs.ts --beliefs 19-28");
  process.exit(1);
}

let moduleIds: string[] = [];

if (args[0] === "--beliefs") {
  const range = args[1];
  if (!range) {
    console.error("Provide a range like 19-28");
    process.exit(1);
  }
  const [start, end] = range.split("-").map(Number);
  for (let i = start; i <= end; i++) {
    moduleIds.push(`bmod-${String(i).padStart(3, "0")}`);
  }
} else {
  moduleIds = args;
}

const outputDir = path.join(__dirname, "..", "i18n-content");
generateStubs(moduleIds, outputDir);
