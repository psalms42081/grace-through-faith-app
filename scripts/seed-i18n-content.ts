import OpenAI from "openai";
import { db } from "../server/db";
import {
  formationModules,
  formationLessons,
  formationModuleI18n,
  formationLessonI18n,
  lessonSections,
  lessonSectionI18n,
} from "../shared/schema";
import { eq, and, asc, sql, inArray } from "drizzle-orm";

const LANGUAGES: Record<string, string> = {
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
  fil: "Filipino (Tagalog)",
  zh: "Simplified Chinese",
};

function createOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    timeout: 60000,
  });
}

async function translateBatch(
  client: OpenAI,
  items: { key: string; text: string }[],
  lang: string,
  langName: string
): Promise<Record<string, string>> {
  const filtered = items.filter((i) => i.text && i.text.trim());
  if (filtered.length === 0) return {};

  const prompt = filtered.map((i) => `[${i.key}]: ${i.text}`).join("\n\n");

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `You are a professional translator for a Seventh-day Adventist spiritual formation app. Translate the following English texts to ${langName} (${lang}). Preserve theological accuracy, reverent tone, and Bible references (e.g. "Genesis 1:1"). Return ONLY a valid JSON object with the same keys and translated values. No markdown fences, no explanation.`,
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = response.choices[0]?.message?.content || "{}";
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

async function seedI18n() {
  const client = createOpenAIClient();

  const modules = await db
    .select()
    .from(formationModules)
    .orderBy(asc(formationModules.id));
  console.log(`[i18n] Found ${modules.length} formation modules`);

  for (const lang of Object.keys(LANGUAGES)) {
    const langName = LANGUAGES[lang];

    const existingModCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(formationModuleI18n)
      .where(eq(formationModuleI18n.language, lang));
    const modsDone = Number(existingModCount[0]?.count ?? 0);

    if (modsDone >= modules.length) {
      console.log(
        `[i18n] ${langName} (${lang}): all modules translated, skipping.`
      );
      continue;
    }
    console.log(
      `\n[i18n] === ${langName} (${lang}): ${modsDone}/${modules.length} done ===`
    );

    for (const mod of modules) {
      const existingMod = await db
        .select()
        .from(formationModuleI18n)
        .where(
          and(
            eq(formationModuleI18n.moduleId, mod.id),
            eq(formationModuleI18n.language, lang)
          )
        )
        .limit(1);

      if (existingMod.length > 0) continue;

      const lessons = await db
        .select()
        .from(formationLessons)
        .where(eq(formationLessons.moduleId, mod.id))
        .orderBy(asc(formationLessons.lessonOrder));

      const batchItems: { key: string; text: string }[] = [
        { key: "mod_title", text: mod.title },
        { key: "mod_desc", text: mod.description || "" },
      ];

      for (let i = 0; i < lessons.length; i++) {
        batchItems.push({ key: `l${i}_title`, text: lessons[i].title });
        batchItems.push({
          key: `l${i}_summary`,
          text: lessons[i].description || "",
        });
      }

      let translated: Record<string, string>;
      try {
        translated = await translateBatch(client, batchItems, lang, langName);
      } catch (err: any) {
        console.error(
          `  [${lang}] Error translating "${mod.title}": ${err.message}`
        );
        continue;
      }

      await db
        .insert(formationModuleI18n)
        .values({
          moduleId: mod.id,
          language: lang,
          title: translated.mod_title || mod.title,
          description: translated.mod_desc || null,
        })
        .onConflictDoNothing();

      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        await db
          .insert(formationLessonI18n)
          .values({
            lessonId: lesson.id,
            language: lang,
            title: translated[`l${i}_title`] || lesson.title,
            summary: translated[`l${i}_summary`] || null,
          })
          .onConflictDoNothing();
      }

      const lessonIds = lessons.map((l) => l.id);
      if (lessonIds.length > 0) {
        const allSections = await db
          .select()
          .from(lessonSections)
          .where(inArray(lessonSections.lessonId, lessonIds))
          .orderBy(asc(lessonSections.sortOrder));

        const contentSections = allSections.filter(
          (s) => s.sectionType !== "assessment"
        );

        for (let chunk = 0; chunk < contentSections.length; chunk += 15) {
          const batch = contentSections.slice(chunk, chunk + 15);
          const sectionItems = batch.flatMap((s, idx) => [
            { key: `s${idx}_h`, text: s.title || "" },
            { key: `s${idx}_c`, text: s.content || "" },
          ]);

          let sTranslated: Record<string, string>;
          try {
            sTranslated = await translateBatch(
              client,
              sectionItems,
              lang,
              langName
            );
          } catch (err: any) {
            console.error(
              `    [${lang}] Section translation error: ${err.message}`
            );
            continue;
          }

          for (let idx = 0; idx < batch.length; idx++) {
            await db
              .insert(lessonSectionI18n)
              .values({
                sectionId: batch[idx].id,
                language: lang,
                heading: sTranslated[`s${idx}_h`] || null,
                content:
                  sTranslated[`s${idx}_c`] || batch[idx].content || "",
              })
              .onConflictDoNothing();
          }
        }
      }

      console.log(`  [${lang}] ${mod.title}`);
    }
  }

  const modCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(formationModuleI18n);
  const lessonCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(formationLessonI18n);
  const sectionCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(lessonSectionI18n);
  console.log(`\n[i18n] Complete:`);
  console.log(`  Modules: ${Number(modCount[0]?.c)}`);
  console.log(`  Lessons: ${Number(lessonCount[0]?.c)}`);
  console.log(`  Sections: ${Number(sectionCount[0]?.c)}`);
}

seedI18n()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[i18n] FATAL:", err);
    process.exit(1);
  });
