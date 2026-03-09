import { createHash } from "crypto";
import { db } from "../db";
import {
  sabbathSchoolQuarterlies,
  sabbathSchoolLessons,
  sabbathSchoolDays,
  lessonSourcePackets,
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";

export interface SourcePacketJson {
  quarterMeta: {
    title: string;
    year: number;
    quarter: number;
    quarterCode: string;
    humanDate: string | null;
  };
  lessonTitle: string;
  weekNumber: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  memoryVerse: string | null;
  dailyBreakdown: Array<{
    dayNumber: number;
    title: string;
    contentMarkdown: string;
    scriptureRefs: string[];
  }>;
  keyScriptureRefs: string[];
  doctrinalThemes: string[];
}

const SDA_THEME_KEYWORDS: Record<string, string[]> = {
  sabbath: ["sabbath", "seventh day", "seventh-day", "rest day"],
  sanctuary: ["sanctuary", "most holy", "holy place", "heavenly temple", "investigative"],
  "second coming": ["second coming", "advent", "return of christ", "parousia", "soon return"],
  "state of the dead": ["death", "sleep", "resurrection", "immortality", "soul sleep"],
  "health message": ["health", "temperance", "diet", "body temple", "wholistic"],
  "three angels": ["three angels", "first angel", "second angel", "third angel", "revelation 14"],
  "great controversy": ["great controversy", "cosmic conflict", "good and evil", "spiritual warfare"],
  "law of god": ["ten commandments", "law of god", "moral law", "decalogue"],
  grace: ["grace", "justification", "righteousness by faith", "salvation"],
  prophecy: ["prophecy", "daniel", "revelation", "end time", "last days"],
};

function extractScriptureRefs(text: string): string[] {
  const pattern = /(?:[1-3]\s)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+\d+(?::\d+(?:[–-]\d+)?)?/gi;
  const matches = text.match(pattern) || [];
  return [...new Set(matches)];
}

function detectDoctrinalThemes(text: string): string[] {
  const lowerText = text.toLowerCase();
  const detected: string[] = [];
  for (const [theme, keywords] of Object.entries(SDA_THEME_KEYWORDS)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      detected.push(theme);
    }
  }
  return detected;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "").trim();
}

function extractMemoryVerse(days: Array<{ contentMarkdown: string | null }>): string | null {
  for (const day of days) {
    if (!day.contentMarkdown) continue;
    const content = stripHtml(day.contentMarkdown);
    const quoteMatch = content.match(/memory\s+(?:text|verse)[^"]*[""\u201C]([^""\u201D]+?)[""\u201D]/i);
    if (quoteMatch) return quoteMatch[1].trim();
    const blockquoteMatch = content.match(/memory\s+(?:text|verse)[^>]*>\s*[""\u201C]?([^""\u201D\n]+?)[""\u201D]?\s*\(/i);
    if (blockquoteMatch) return blockquoteMatch[1].trim();
    const readMatch = content.match(/[""\u201C]([^""\u201D]{20,150})[""\u201D].*?memory\s+verse/i);
    if (readMatch) return readMatch[1].trim();
  }
  return null;
}

function computeHash(data: unknown): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

export async function buildSourcePacket(lessonId: string): Promise<{
  id: string;
  isNew: boolean;
  changed: boolean;
}> {
  const lesson = await db
    .select()
    .from(sabbathSchoolLessons)
    .where(eq(sabbathSchoolLessons.id, lessonId))
    .limit(1);

  if (lesson.length === 0) {
    throw new Error(`Lesson not found: ${lessonId}`);
  }

  const quarterly = await db
    .select()
    .from(sabbathSchoolQuarterlies)
    .where(eq(sabbathSchoolQuarterlies.id, lesson[0].quarterlyId))
    .limit(1);

  if (quarterly.length === 0) {
    throw new Error(`Quarterly not found for lesson: ${lessonId}`);
  }

  const days = await db
    .select()
    .from(sabbathSchoolDays)
    .where(eq(sabbathSchoolDays.lessonId, lessonId))
    .orderBy(sabbathSchoolDays.dayNumber);

  const [yearStr, qStr] = (quarterly[0].quarterCode || "2025-02").split("-");
  const allContent = days.map(d => d.contentMarkdown || "").join("\n");

  const sourceJson: SourcePacketJson = {
    quarterMeta: {
      title: quarterly[0].title,
      year: parseInt(yearStr),
      quarter: parseInt(qStr),
      quarterCode: quarterly[0].quarterCode,
      humanDate: quarterly[0].humanDate || null,
    },
    lessonTitle: lesson[0].title,
    weekNumber: lesson[0].lessonNumber,
    dateRange: {
      start: lesson[0].startDate || null,
      end: lesson[0].endDate || null,
    },
    memoryVerse: extractMemoryVerse(days),
    dailyBreakdown: days.map(d => ({
      dayNumber: d.dayNumber,
      title: d.title || `Day ${d.dayNumber}`,
      contentMarkdown: d.contentMarkdown || "",
      scriptureRefs: extractScriptureRefs(d.contentMarkdown || ""),
    })),
    keyScriptureRefs: extractScriptureRefs(allContent),
    doctrinalThemes: detectDoctrinalThemes(allContent),
  };

  const sourceHash = computeHash(sourceJson);

  const existing = await db
    .select()
    .from(lessonSourcePackets)
    .where(eq(lessonSourcePackets.lessonId, lessonId))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].sourceHash === sourceHash) {
      return { id: existing[0].id, isNew: false, changed: false };
    }

    await db
      .update(lessonSourcePackets)
      .set({
        sourceJson,
        sourceHash,
        status: "normalized",
        updatedAt: new Date(),
      })
      .where(eq(lessonSourcePackets.id, existing[0].id));

    console.log(`[source-packet] Updated packet for "${lesson[0].title}" (hash changed)`);
    return { id: existing[0].id, isNew: false, changed: true };
  }

  const [inserted] = await db
    .insert(lessonSourcePackets)
    .values({
      quarterlyId: quarterly[0].id,
      lessonId: lessonId,
      weekNumber: lesson[0].lessonNumber,
      title: lesson[0].title,
      sourceJson,
      sourceHash,
      status: "normalized",
      sourceVersion: "adventech-v1",
    })
    .returning();

  console.log(`[source-packet] Created packet for "${lesson[0].title}" (${inserted.id})`);
  return { id: inserted.id, isNew: true, changed: true };
}

export async function buildAllSourcePackets(quarterlyId?: string): Promise<{
  total: number;
  created: number;
  updated: number;
  unchanged: number;
}> {
  let lessons;
  if (quarterlyId) {
    lessons = await db
      .select({ id: sabbathSchoolLessons.id })
      .from(sabbathSchoolLessons)
      .where(eq(sabbathSchoolLessons.quarterlyId, quarterlyId));
  } else {
    lessons = await db
      .select({ id: sabbathSchoolLessons.id })
      .from(sabbathSchoolLessons);
  }

  let created = 0, updated = 0, unchanged = 0;

  for (const lesson of lessons) {
    try {
      const result = await buildSourcePacket(lesson.id);
      if (result.isNew) created++;
      else if (result.changed) updated++;
      else unchanged++;
    } catch (err: any) {
      console.error(`[source-packet] Failed for lesson ${lesson.id}:`, err.message);
    }
  }

  console.log(`[source-packet] Built ${lessons.length} packets: ${created} created, ${updated} updated, ${unchanged} unchanged`);
  return { total: lessons.length, created, updated, unchanged };
}
