import { db } from "./db";
import { devotionalDays } from "../shared/schema";
import { eq } from "drizzle-orm";
import { searchWritings } from "./services/egwService";

function stripHtml(html: string): string {
  return html
    .replace(/<mark>/g, "")
    .replace(/<\/mark>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const EXCLUDED_BOOK_PATTERNS = [
  /strong'?s/i,
  /concordance/i,
  /dictionary/i,
  /scripture index/i,
  /new english translation/i,
  /andrews bible commentary/i,
  /bible commentary/i,
  /topical index/i,
];

const PREFERRED_BOOKS = [
  "Steps to Christ",
  "The Desire of Ages",
  "Patriarchs and Prophets",
  "The Great Controversy",
  "Prophets and Kings",
  "The Acts of the Apostles",
  "Christ's Object Lessons",
  "The Ministry of Healing",
  "Thoughts from the Mount of Blessing",
  "Education",
  "Story of Redemption",
  "Selected Messages",
  "Testimonies for the Church",
  "Gospel Workers",
  "Christian Service",
];

function isExcludedBook(bookTitle: string): boolean {
  return EXCLUDED_BOOK_PATTERNS.some(p => p.test(bookTitle));
}

function pickBestResult(results: Array<{ refcode: string; text: string; bookTitle: string; paraId: string }>): { text: string; refcode: string; bookTitle: string } | null {
  const withText = results
    .filter(r => r.text && stripHtml(r.text).length > 40)
    .filter(r => !isExcludedBook(r.bookTitle));

  if (withText.length === 0) return null;

  const preferred = withText.find(r =>
    PREFERRED_BOOKS.some(b => r.bookTitle.toLowerCase().includes(b.toLowerCase()))
  );

  const best = preferred || withText[0];
  return {
    text: stripHtml(best.text),
    refcode: best.refcode,
    bookTitle: best.bookTitle,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function seedEgwExcerpts(): Promise<{ updated: number; skipped: number; failed: number }> {
  const allDays = await db
    .select({
      id: devotionalDays.id,
      passageLabel: devotionalDays.passageLabel,
      title: devotionalDays.title,
      historicVoiceExcerpt: devotionalDays.historicVoiceExcerpt,
    })
    .from(devotionalDays);

  function isBadExcerpt(excerpt: string): boolean {
    if (!excerpt || excerpt.trim() === "") return true;
    if (excerpt.includes("Strong's")) return true;
    if (excerpt.includes("Concordance")) return true;
    const verseRefPattern = /(\w+\s+\d+:\d+\s+){5,}/;
    if (verseRefPattern.test(excerpt)) return true;
    if (excerpt.includes("Scripture Index")) return true;
    return false;
  }

  const toProcess = allDays.filter(
    d => d.passageLabel && (!d.historicVoiceExcerpt || isBadExcerpt(d.historicVoiceExcerpt))
  );

  console.log(`[egw-seed] Found ${toProcess.length} devotional days to process (${allDays.length} total)`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const day of toProcess) {
    try {
      const query = day.title;
      console.log(`[egw-seed] Searching for "${query}" (passage: ${day.passageLabel})`);

      const results = await searchWritings(query);
      const best = pickBestResult(results);

      if (!best) {
        console.log(`[egw-seed] No usable EGW quote found for "${day.title}"`);
        skipped++;
        await sleep(500);
        continue;
      }

      const excerpt = `"${best.text.substring(0, 500)}${best.text.length > 500 ? "…" : ""}" — Ellen G. White, ${best.bookTitle} (${best.refcode})`;

      await db
        .update(devotionalDays)
        .set({ historicVoiceExcerpt: excerpt })
        .where(eq(devotionalDays.id, day.id));

      console.log(`[egw-seed] ✓ Updated "${day.title}" with quote from ${best.bookTitle}`);
      updated++;

      await sleep(800);
    } catch (err: any) {
      console.error(`[egw-seed] ✗ Failed for "${day.title}":`, err.message);
      failed++;
      await sleep(1000);
    }
  }

  console.log(`[egw-seed] Complete: ${updated} updated, ${skipped} skipped, ${failed} failed`);
  return { updated, skipped, failed };
}
