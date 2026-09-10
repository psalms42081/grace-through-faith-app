import { db } from "../server/db";
import { strongEntries } from "../shared/schema";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { normalizeStrongId } from "../lib/step-bible-tagged";

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
    const kjvUsage = kjvMatch ? stripXmlTags(kjvMatch[1]) : null;
    const definition = defMatch
      ? stripXmlTags(defMatch[1])
      : derivMatch
        ? stripXmlTags(derivMatch[1])
        : (kjvUsage || "");
    const derivation = derivMatch ? stripXmlTags(derivMatch[1]) : null;

    const id = normalizeStrongId(`G${num}`) || `G${num}`;
    if (lemma && definition) {
      entries.push({
        id,
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
  if (xmlContent.includes('div type="entry"')) {
    return parseHebrewOsis(xmlContent);
  }
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

function parseHebrewOsis(xmlContent: string): StrongEntryData[] {
  const entries: StrongEntryData[] = [];
  const entryRegex = /<div type="entry" n="\d+">([\s\S]*?)<\/div>/g;
  let match;
  while ((match = entryRegex.exec(xmlContent)) !== null) {
    const content = match[1];
    const idMatch = content.match(/\bID="(H\d+)"/);
    const wMatch = content.match(/<w\b([^>]*)>([^<]*)<\/w>/);
    if (!idMatch || !wMatch) continue;
    const attrs = wMatch[1];
    const lemma = wMatch[2]?.trim() || "";
    const transliteration = attrs.match(/\bxlit="([^"]*)"/)?.[1] ?? null;
    const pronunciation = attrs.match(/\bPOS="([^"]*)"/)?.[1] ?? null;
    const langRaw = attrs.match(/\bxml:lang="([^"]*)"/)?.[1] ?? "heb";
    const explanation = content.match(/<note type="explanation">([\s\S]*?)<\/note>/);
    const translation = content.match(/<note type="translation">([\s\S]*?)<\/note>/);
    const exegesis = content.match(/<note type="exegesis">([\s\S]*?)<\/note>/);
    const items = [...content.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .map((item) => stripXmlTags(item[1]))
      .filter(Boolean);
    const definition =
      (explanation ? stripXmlTags(explanation[1]) : "")
      || items.slice(0, 4).join("; ")
      || (translation ? stripXmlTags(translation[1]) : "");
    const kjvUsage = translation ? stripXmlTags(translation[1]) : null;
    if (!lemma || !definition) continue;
    entries.push({
      id: idMatch[1],
      language: langRaw.startsWith("arc") ? "he" : "he",
      lemma,
      transliteration,
      pronunciation,
      definition,
      extendedDefinition: exegesis ? stripXmlTags(exegesis[1]) : null,
      kjvUsage,
      derivation: exegesis ? stripXmlTags(exegesis[1]) : null,
    });
  }
  return entries;
}

function resolveXmlPath(filename: string): string | null {
  const candidates = [
    path.join(process.cwd(), "data", filename),
    path.join("/tmp", filename),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

async function main() {
  console.log("Loading Strong's Concordance data...");

  const greekPath = resolveXmlPath("strongsgreek.xml");
  const hebrewPath = resolveXmlPath("strongshebrew.xml");

  if (!greekPath || !hebrewPath) {
    console.error("XML files not found in data/ or /tmp/. Need strongsgreek.xml and strongshebrew.xml.");
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

  const aliasFill = await db.execute(sql`
    UPDATE strong_entry AS dest
       SET lemma = src.lemma,
           transliteration = COALESCE(src.transliteration, dest.transliteration),
           pronunciation = COALESCE(src.pronunciation, dest.pronunciation),
           definition = src.definition,
           extended_definition = COALESCE(src.extended_definition, dest.extended_definition),
           kjv_usage = COALESCE(src.kjv_usage, dest.kjv_usage),
           derivation = COALESCE(src.derivation, dest.derivation)
      FROM strong_entry AS src
     WHERE dest.id <> src.id
       AND dest.kjv_usage IS NULL
       AND src.kjv_usage IS NOT NULL
       AND regexp_replace(upper(dest.id), '^([HG])0+', '\\1')
         = regexp_replace(upper(src.id), '^([HG])0+', '\\1')
  `);
  console.log(`Filled padded/stub aliases: ${(aliasFill as any).rowCount ?? 0}`);

  
  const langCount = await db.execute(sql`SELECT language, COUNT(*) as cnt FROM strong_entry GROUP BY language`);
  console.log("By language:", JSON.stringify((langCount as any).rows));

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
