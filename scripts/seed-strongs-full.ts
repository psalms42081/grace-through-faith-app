import { db } from "../server/db";
import { strongEntries } from "../shared/schema";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

interface StrongEntryData {
  id: string;
  language: string;
  lemma: string;
  transliteration: string | null;
  pronunciation: string | null;
  definition: string;
  extendedDefinition: string | null;
  kjvUsage: string | null;
  derivation: string | null;
}

function stripXmlTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGreekXml(xmlContent: string): StrongEntryData[] {
  const entries: StrongEntryData[] = [];
  const entryRegex = /<entry strongs="(\d+)">([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlContent)) !== null) {
    const num = match[1];
    const content = match[2];

    const greekMatch = content.match(/<greek[^>]*unicode="([^"]*)"[^>]*translit="([^"]*)"[^>]*\/>/);
    const pronMatch = content.match(/<pronunciation strongs="([^"]*)"[^>]*\/>/);
    const defMatch = content.match(/<strongs_def>([\s\S]*?)<\/strongs_def>/);
    const derivMatch = content.match(/<strongs_derivation>([\s\S]*?)<\/strongs_derivation>/);
    const kjvMatch = content.match(/<kjv_def>([\s\S]*?)<\/kjv_def>/);

    const lemma = greekMatch?.[1] || "";
    const translit = greekMatch?.[2] || null;
    const pronunciation = pronMatch?.[1] || null;
    const definition = defMatch ? stripXmlTags(defMatch[1]) : "";
    const derivation = derivMatch ? stripXmlTags(derivMatch[1]) : null;
    const kjvUsage = kjvMatch ? stripXmlTags(kjvMatch[1]) : null;

    if (lemma && definition) {
      entries.push({
        id: `G${num}`,
        language: "gr",
        lemma,
        transliteration: translit,
        pronunciation,
        definition,
        extendedDefinition: derivation,
        kjvUsage,
        derivation,
      });
    }
  }

  return entries;
}

function parseHebrewXml(xmlContent: string): StrongEntryData[] {
  const entries: StrongEntryData[] = [];
  const entryRegex = /<entry id="(H\d+)">([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlContent)) !== null) {
    const id = match[1];
    const content = match[2];

    const wMatch = content.match(/<w\s([^>]*)>([^<]*)<\/w>/);
    if (!wMatch) continue;
    const attrs = wMatch[1];
    const lemma = wMatch[2]?.trim() || "";

    const langAttr = attrs.match(/xml:lang="([^"]*)"/);
    const pronAttr = attrs.match(/pron="([^"]*)"/);
    const xlitAttr = attrs.match(/xlit="([^"]*)"/);

    const lang = langAttr?.[1] || "heb";
    const pronunciation = pronAttr?.[1] || null;
    const transliteration = xlitAttr?.[1] || null;

    const sourceMatch = content.match(/<source>([\s\S]*?)<\/source>/);
    const meaningMatch = content.match(/<meaning>([\s\S]*?)<\/meaning>/);
    const usageMatch = content.match(/<usage>([\s\S]*?)<\/usage>/);

    const derivation = sourceMatch ? stripXmlTags(sourceMatch[1]) : null;
    const defText = meaningMatch ? stripXmlTags(meaningMatch[1]) : null;
    const kjvUsage = usageMatch ? stripXmlTags(usageMatch[1]) : null;

    const definition = defText || kjvUsage || "";

    if (lemma && definition) {
      entries.push({
        id,
        language: "he",
        lemma,
        transliteration,
        pronunciation,
        definition,
        extendedDefinition: derivation,
        kjvUsage,
        derivation,
      });
    }
  }

  return entries;
}

async function main() {
  console.log("Loading Strong's Concordance data...");

  const greekPath = "/tmp/strongsgreek.xml";
  const hebrewPath = "/tmp/strongshebrew.xml";

  if (!fs.existsSync(greekPath) || !fs.existsSync(hebrewPath)) {
    console.error("XML files not found in /tmp/. Please download them first.");
    process.exit(1);
  }

  const greekXml = fs.readFileSync(greekPath, "utf-8");
  const hebrewXml = fs.readFileSync(hebrewPath, "utf-8");

  console.log("Parsing Greek dictionary...");
  const greekEntries = parseGreekXml(greekXml);
  console.log(`  Parsed ${greekEntries.length} Greek entries`);

  console.log("Parsing Hebrew dictionary...");
  const hebrewEntries = parseHebrewXml(hebrewXml);
  console.log(`  Parsed ${hebrewEntries.length} Hebrew entries`);

  const allEntries = [...hebrewEntries, ...greekEntries];
  console.log(`Total: ${allEntries.length} Strong's entries to insert`);

  const BATCH_SIZE = 200;
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
    const batch = allEntries.slice(i, i + BATCH_SIZE);
    
    const result = await db
      .insert(strongEntries)
      .values(batch)
      .onConflictDoUpdate({
        target: strongEntries.id,
        set: {
          lemma: sql`EXCLUDED.lemma`,
          transliteration: sql`EXCLUDED.transliteration`,
          pronunciation: sql`EXCLUDED.pronunciation`,
          definition: sql`EXCLUDED.definition`,
          extendedDefinition: sql`EXCLUDED.extended_definition`,
          kjvUsage: sql`EXCLUDED.kjv_usage`,
          derivation: sql`EXCLUDED.derivation`,
        },
      });

    inserted += batch.length;

    if (inserted % 1000 === 0 || i + BATCH_SIZE >= allEntries.length) {
      console.log(`  Processed ${inserted}/${allEntries.length} entries...`);
    }
  }

  const count = await db.execute(sql`SELECT COUNT(*) as total FROM strong_entry`);
  console.log(`\nDone! Total Strong's entries in database: ${(count as any).rows?.[0]?.total ?? "unknown"}`);
  
  const langCount = await db.execute(sql`SELECT language, COUNT(*) as cnt FROM strong_entry GROUP BY language`);
  console.log("By language:", JSON.stringify((langCount as any).rows));

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
