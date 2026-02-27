import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { strongEntries, verseStrongMaps, bibleVerses } from "../shared/schema";
import { eq, and } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const STRONG_ENTRIES = [
  { id: "H430", language: "he", lemma: "\u05D0\u05DC\u05D4\u05D9\u05DD", transliteration: "Elohim", pronunciation: "el-o-heem", definition: "God, gods, judges, angels", extendedDefinition: "Plural of H433; gods in the ordinary sense; but specifically used (in the plural thus, especially with the article) of the supreme God; occasionally applied by way of deference to magistrates; and sometimes as a superlative.", kjvUsage: "angels, exceeding, God (gods), very great, judges, mighty", derivation: "Plural of H433" },
  { id: "H1254", language: "he", lemma: "\u05D1\u05E8\u05D0", transliteration: "bara", pronunciation: "baw-raw", definition: "to create, shape, form", extendedDefinition: "A primitive root; (absolutely) to create; (qualified) to cut down (a wood), select, feed (as formative processes).", kjvUsage: "choose, create (creator), cut down, dispatch, do, make (fat)", derivation: "A primitive root" },
  { id: "H8064", language: "he", lemma: "\u05E9\u05C1\u05DE\u05D9\u05DD", transliteration: "shamayim", pronunciation: "shaw-mah-yim", definition: "heaven, heavens, sky", extendedDefinition: "The second form being dual of an unused singular; from an unused root meaning to be lofty; the sky (as aloft; the dual perhaps alluding to the visible arch in which the clouds move, as well as to the higher ether where the celestial bodies revolve).", kjvUsage: "air, astrologer, heaven(-s)", derivation: "From an unused root meaning to be lofty" },
  { id: "H776", language: "he", lemma: "\u05D0\u05E8\u05E5", transliteration: "erets", pronunciation: "eh-rets", definition: "earth, land, ground", extendedDefinition: "From an unused root probably meaning to be firm; the earth (at large, or partitively a land).", kjvUsage: "common, country, earth, field, ground, land, nations, way, wilderness, world", derivation: "From an unused root meaning to be firm" },
  { id: "H7225", language: "he", lemma: "\u05E8\u05D0\u05E9\u05C1\u05D9\u05EA", transliteration: "reshith", pronunciation: "ray-sheeth", definition: "beginning, chief, first", extendedDefinition: "From the same as H7218; the first, in place, time, order or rank (specifically, a firstfruit).", kjvUsage: "beginning, chief(-est), first(-fruits, part, time), principal thing", derivation: "From H7218" },
  { id: "G3056", language: "gr", lemma: "\u03BB\u03CC\u03B3\u03BF\u03C2", transliteration: "logos", pronunciation: "log-os", definition: "word, speech, reason", extendedDefinition: "From G3004; something said (including the thought); by implication, a topic (subject of discourse), also reasoning (the mental faculty) or motive; by extension, a computation; specifically, the Divine Expression (i.e. Christ).", kjvUsage: "account, cause, communication, concerning, doctrine, fame, intent, matter, mouth, preaching, question, reason, reckon, remove, say(-ing), shew, speaker, speech, talk, thing, tidings, treatise, utterance, word, work", derivation: "From G3004" },
  { id: "G2316", language: "gr", lemma: "\u03B8\u03B5\u03CC\u03C2", transliteration: "theos", pronunciation: "theh-os", definition: "God, a deity", extendedDefinition: "Of uncertain affinity; a deity, especially (with G3588) the supreme Divinity; figuratively, a magistrate; by Hebraism, very.", kjvUsage: "exceeding, God, god(-ly, -ward)", derivation: "Of uncertain affinity" },
  { id: "G26", language: "gr", lemma: "\u03B1\u03B3\u03AC\u03C0\u03B7", transliteration: "agape", pronunciation: "ag-ah-pay", definition: "love, charity, dear", extendedDefinition: "From G25; love, i.e. affection or benevolence; specially a love-feast.", kjvUsage: "charity, dear, love", derivation: "From G25" },
  { id: "G4100", language: "gr", lemma: "\u03C0\u03B9\u03C3\u03C4\u03B5\u03CD\u03C9", transliteration: "pisteuo", pronunciation: "pist-yoo-o", definition: "to believe, trust, have faith in", extendedDefinition: "From G4102; to have faith (in, upon, or with respect to, a person or thing), i.e. credit; by implication, to entrust (especially one's spiritual well-being to Christ).", kjvUsage: "believe(-r), commit (to trust), put in trust with", derivation: "From G4102" },
  { id: "G2889", language: "gr", lemma: "\u03BA\u03CC\u03C3\u03BC\u03BF\u03C2", transliteration: "kosmos", pronunciation: "kos-mos", definition: "world, universe, adornment", extendedDefinition: "Probably from the base of G2865; orderly arrangement, i.e. decoration; by implication, the world (in a wide or narrow sense, including its inhabitants, literally or figuratively [morally]).", kjvUsage: "adorning, world", derivation: "Probably from the base of G2865" },
  { id: "G3439", language: "gr", lemma: "\u03BC\u03BF\u03BD\u03BF\u03B3\u03B5\u03BD\u03AE\u03C2", transliteration: "monogenes", pronunciation: "mon-og-en-ace", definition: "only begotten, unique, one and only", extendedDefinition: "From G3441 and G1096; only-born, i.e. sole.", kjvUsage: "only (begotten, child)", derivation: "From G3441 and G1096" },
  { id: "G166", language: "gr", lemma: "\u03B1\u03B9\u03CE\u03BD\u03B9\u03BF\u03C2", transliteration: "aionios", pronunciation: "ahee-o-nee-os", definition: "eternal, everlasting, forever", extendedDefinition: "From G165; perpetual (also used of past time, or past and future as well).", kjvUsage: "eternal, for ever, everlasting, world (began)", derivation: "From G165" },
  { id: "G2222", language: "gr", lemma: "\u03B6\u03C9\u03AE", transliteration: "zoe", pronunciation: "dzo-ay", definition: "life, living", extendedDefinition: "From G2198; life (literally or figuratively).", kjvUsage: "life(-time)", derivation: "From G2198" },
  { id: "G5485", language: "gr", lemma: "\u03C7\u03AC\u03C1\u03B9\u03C2", transliteration: "charis", pronunciation: "khar-ece", definition: "grace, favor, gratitude", extendedDefinition: "From G5463; graciousness (as gratifying), of manner or act (abstract or concrete; literal, figurative or spiritual; especially the divine influence upon the heart, and its reflection in the life; including gratitude).", kjvUsage: "acceptable, benefit, favour, gift, grace(-ious), joy, liberality, pleasure, thank(-s, -worthy)", derivation: "From G5463" },
  { id: "G4151", language: "gr", lemma: "\u03C0\u03BD\u03B5\u1FE6\u03BC\u03B1", transliteration: "pneuma", pronunciation: "pnyoo-mah", definition: "spirit, breath, wind", extendedDefinition: "From G4154; a current of air, i.e. breath (blast) or a breeze; by analogy or figuratively, a spirit, i.e. (human) the rational soul, (by implication) vital principle, mental disposition, etc., or (superhuman) an angel, demon, or (divine) God, Christ's spirit, the Holy Spirit.", kjvUsage: "ghost, life, spirit(-ual, -ually), mind", derivation: "From G4154" },
  { id: "H3068", language: "he", lemma: "\u05D9\u05D4\u05D5\u05D4", transliteration: "Yehovah", pronunciation: "yeh-ho-vaw", definition: "LORD, Jehovah, the self-Existent One", extendedDefinition: "From H1961; (the) self-Existent or Eternal; Jehovah, Jewish national name of God.", kjvUsage: "Jehovah, the LORD", derivation: "From H1961" },
  { id: "H7462", language: "he", lemma: "\u05E8\u05E2\u05D4", transliteration: "raah", pronunciation: "raw-aw", definition: "to tend, pasture, shepherd", extendedDefinition: "A primitive root; to tend a flock; i.e. pasture it; intransitively, to graze (literally or figuratively); generally to rule; by extension, to associate with (as a friend).", kjvUsage: "break, companion, keep company with, devour, eat up, evil entreat, feed, use as a friend, make friendship with, herdman, keep [sheep](-er), pastor, shearing house, shepherd, wander, waste", derivation: "A primitive root" },
];

const VERSE_MAPPINGS = [
  { bookId: 1, chapter: 1, verse: 1, mappings: [
    { strongId: "H7225", wordPosition: 1, originalWord: "\u05D1\u05E8\u05D0\u05E9\u05C1\u05D9\u05EA", translatedWord: "beginning" },
    { strongId: "H1254", wordPosition: 2, originalWord: "\u05D1\u05E8\u05D0", translatedWord: "created" },
    { strongId: "H430", wordPosition: 3, originalWord: "\u05D0\u05DC\u05D4\u05D9\u05DD", translatedWord: "God" },
    { strongId: "H8064", wordPosition: 4, originalWord: "\u05E9\u05C1\u05DE\u05D9\u05DD", translatedWord: "heaven" },
    { strongId: "H776", wordPosition: 5, originalWord: "\u05D0\u05E8\u05E5", translatedWord: "earth" },
  ]},
  { bookId: 43, chapter: 3, verse: 16, mappings: [
    { strongId: "G2316", wordPosition: 1, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
    { strongId: "G26", wordPosition: 2, originalWord: "\u03B1\u03B3\u03AC\u03C0\u03B7", translatedWord: "loved" },
    { strongId: "G2889", wordPosition: 3, originalWord: "\u03BA\u03CC\u03C3\u03BC\u03BF\u03C2", translatedWord: "world" },
    { strongId: "G3439", wordPosition: 4, originalWord: "\u03BC\u03BF\u03BD\u03BF\u03B3\u03B5\u03BD\u03AE\u03C2", translatedWord: "begotten" },
    { strongId: "G4100", wordPosition: 5, originalWord: "\u03C0\u03B9\u03C3\u03C4\u03B5\u03CD\u03C9", translatedWord: "believeth" },
    { strongId: "G166", wordPosition: 6, originalWord: "\u03B1\u03B9\u03CE\u03BD\u03B9\u03BF\u03C2", translatedWord: "everlasting" },
    { strongId: "G2222", wordPosition: 7, originalWord: "\u03B6\u03C9\u03AE", translatedWord: "life" },
  ]},
  { bookId: 43, chapter: 1, verse: 1, mappings: [
    { strongId: "G3056", wordPosition: 1, originalWord: "\u03BB\u03CC\u03B3\u03BF\u03C2", translatedWord: "Word" },
    { strongId: "G2316", wordPosition: 2, originalWord: "\u03B8\u03B5\u03CC\u03C2", translatedWord: "God" },
  ]},
  { bookId: 19, chapter: 23, verse: 1, mappings: [
    { strongId: "H3068", wordPosition: 1, originalWord: "\u05D9\u05D4\u05D5\u05D4", translatedWord: "LORD" },
    { strongId: "H7462", wordPosition: 2, originalWord: "\u05E8\u05E2\u05D4", translatedWord: "shepherd" },
  ]},
];

async function seed() {
  console.log("Seeding Strong's Concordance entries...");
  for (const entry of STRONG_ENTRIES) {
    await db.insert(strongEntries).values(entry).onConflictDoNothing();
  }
  console.log(`  ${STRONG_ENTRIES.length} Strong's entries inserted`);

  console.log("Seeding verse-Strong's mappings...");
  let mapCount = 0;
  for (const vm of VERSE_MAPPINGS) {
    const verseRecord = await db
      .select()
      .from(bibleVerses)
      .where(
        and(
          eq(bibleVerses.bookId, vm.bookId),
          eq(bibleVerses.chapter, vm.chapter),
          eq(bibleVerses.verse, vm.verse),
          eq(bibleVerses.translationId, "KJV")
        )
      )
      .limit(1);

    if (!verseRecord.length) {
      console.warn(`  Verse not found: book=${vm.bookId} ch=${vm.chapter} v=${vm.verse}`);
      continue;
    }

    for (const m of vm.mappings) {
      await db.insert(verseStrongMaps).values({
        verseId: verseRecord[0].id,
        strongId: m.strongId,
        wordPosition: m.wordPosition,
        originalWord: m.originalWord,
        translatedWord: m.translatedWord,
      }).onConflictDoNothing();
      mapCount++;
    }
  }
  console.log(`  ${mapCount} word mappings inserted`);

  console.log("\nStrong's seed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
