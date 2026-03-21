import { bibleTranslations, bibleBooks } from "../shared/schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const BOOKS = [
  { id: 1, name: "Genesis", abbreviation: "Gen", testament: "OT", chapterCount: 50, orderIndex: 1 },
  { id: 2, name: "Exodus", abbreviation: "Exo", testament: "OT", chapterCount: 40, orderIndex: 2 },
  { id: 3, name: "Leviticus", abbreviation: "Lev", testament: "OT", chapterCount: 27, orderIndex: 3 },
  { id: 4, name: "Numbers", abbreviation: "Num", testament: "OT", chapterCount: 36, orderIndex: 4 },
  { id: 5, name: "Deuteronomy", abbreviation: "Deu", testament: "OT", chapterCount: 34, orderIndex: 5 },
  { id: 6, name: "Joshua", abbreviation: "Jos", testament: "OT", chapterCount: 24, orderIndex: 6 },
  { id: 7, name: "Judges", abbreviation: "Jdg", testament: "OT", chapterCount: 21, orderIndex: 7 },
  { id: 8, name: "Ruth", abbreviation: "Rut", testament: "OT", chapterCount: 4, orderIndex: 8 },
  { id: 9, name: "1 Samuel", abbreviation: "1Sa", testament: "OT", chapterCount: 31, orderIndex: 9 },
  { id: 10, name: "2 Samuel", abbreviation: "2Sa", testament: "OT", chapterCount: 24, orderIndex: 10 },
  { id: 11, name: "1 Kings", abbreviation: "1Ki", testament: "OT", chapterCount: 22, orderIndex: 11 },
  { id: 12, name: "2 Kings", abbreviation: "2Ki", testament: "OT", chapterCount: 25, orderIndex: 12 },
  { id: 13, name: "1 Chronicles", abbreviation: "1Ch", testament: "OT", chapterCount: 29, orderIndex: 13 },
  { id: 14, name: "2 Chronicles", abbreviation: "2Ch", testament: "OT", chapterCount: 36, orderIndex: 14 },
  { id: 15, name: "Ezra", abbreviation: "Ezr", testament: "OT", chapterCount: 10, orderIndex: 15 },
  { id: 16, name: "Nehemiah", abbreviation: "Neh", testament: "OT", chapterCount: 13, orderIndex: 16 },
  { id: 17, name: "Esther", abbreviation: "Est", testament: "OT", chapterCount: 10, orderIndex: 17 },
  { id: 18, name: "Job", abbreviation: "Job", testament: "OT", chapterCount: 42, orderIndex: 18 },
  { id: 19, name: "Psalms", abbreviation: "Psa", testament: "OT", chapterCount: 150, orderIndex: 19 },
  { id: 20, name: "Proverbs", abbreviation: "Pro", testament: "OT", chapterCount: 31, orderIndex: 20 },
  { id: 21, name: "Ecclesiastes", abbreviation: "Ecc", testament: "OT", chapterCount: 12, orderIndex: 21 },
  { id: 22, name: "Song of Solomon", abbreviation: "Sol", testament: "OT", chapterCount: 8, orderIndex: 22 },
  { id: 23, name: "Isaiah", abbreviation: "Isa", testament: "OT", chapterCount: 66, orderIndex: 23 },
  { id: 24, name: "Jeremiah", abbreviation: "Jer", testament: "OT", chapterCount: 52, orderIndex: 24 },
  { id: 25, name: "Lamentations", abbreviation: "Lam", testament: "OT", chapterCount: 5, orderIndex: 25 },
  { id: 26, name: "Ezekiel", abbreviation: "Eze", testament: "OT", chapterCount: 48, orderIndex: 26 },
  { id: 27, name: "Daniel", abbreviation: "Dan", testament: "OT", chapterCount: 12, orderIndex: 27 },
  { id: 28, name: "Hosea", abbreviation: "Hos", testament: "OT", chapterCount: 14, orderIndex: 28 },
  { id: 29, name: "Joel", abbreviation: "Joe", testament: "OT", chapterCount: 3, orderIndex: 29 },
  { id: 30, name: "Amos", abbreviation: "Amo", testament: "OT", chapterCount: 9, orderIndex: 30 },
  { id: 31, name: "Obadiah", abbreviation: "Oba", testament: "OT", chapterCount: 1, orderIndex: 31 },
  { id: 32, name: "Jonah", abbreviation: "Jon", testament: "OT", chapterCount: 4, orderIndex: 32 },
  { id: 33, name: "Micah", abbreviation: "Mic", testament: "OT", chapterCount: 7, orderIndex: 33 },
  { id: 34, name: "Nahum", abbreviation: "Nah", testament: "OT", chapterCount: 3, orderIndex: 34 },
  { id: 35, name: "Habakkuk", abbreviation: "Hab", testament: "OT", chapterCount: 3, orderIndex: 35 },
  { id: 36, name: "Zephaniah", abbreviation: "Zep", testament: "OT", chapterCount: 3, orderIndex: 36 },
  { id: 37, name: "Haggai", abbreviation: "Hag", testament: "OT", chapterCount: 2, orderIndex: 37 },
  { id: 38, name: "Zechariah", abbreviation: "Zec", testament: "OT", chapterCount: 14, orderIndex: 38 },
  { id: 39, name: "Malachi", abbreviation: "Mal", testament: "OT", chapterCount: 4, orderIndex: 39 },
  { id: 40, name: "Matthew", abbreviation: "Mat", testament: "NT", chapterCount: 28, orderIndex: 40 },
  { id: 41, name: "Mark", abbreviation: "Mar", testament: "NT", chapterCount: 16, orderIndex: 41 },
  { id: 42, name: "Luke", abbreviation: "Luk", testament: "NT", chapterCount: 24, orderIndex: 42 },
  { id: 43, name: "John", abbreviation: "Joh", testament: "NT", chapterCount: 21, orderIndex: 43 },
  { id: 44, name: "Acts", abbreviation: "Act", testament: "NT", chapterCount: 28, orderIndex: 44 },
  { id: 45, name: "Romans", abbreviation: "Rom", testament: "NT", chapterCount: 16, orderIndex: 45 },
  { id: 46, name: "1 Corinthians", abbreviation: "1Co", testament: "NT", chapterCount: 16, orderIndex: 46 },
  { id: 47, name: "2 Corinthians", abbreviation: "2Co", testament: "NT", chapterCount: 13, orderIndex: 47 },
  { id: 48, name: "Galatians", abbreviation: "Gal", testament: "NT", chapterCount: 6, orderIndex: 48 },
  { id: 49, name: "Ephesians", abbreviation: "Eph", testament: "NT", chapterCount: 6, orderIndex: 49 },
  { id: 50, name: "Philippians", abbreviation: "Php", testament: "NT", chapterCount: 4, orderIndex: 50 },
  { id: 51, name: "Colossians", abbreviation: "Col", testament: "NT", chapterCount: 4, orderIndex: 51 },
  { id: 52, name: "1 Thessalonians", abbreviation: "1Th", testament: "NT", chapterCount: 5, orderIndex: 52 },
  { id: 53, name: "2 Thessalonians", abbreviation: "2Th", testament: "NT", chapterCount: 3, orderIndex: 53 },
  { id: 54, name: "1 Timothy", abbreviation: "1Ti", testament: "NT", chapterCount: 6, orderIndex: 54 },
  { id: 55, name: "2 Timothy", abbreviation: "2Ti", testament: "NT", chapterCount: 4, orderIndex: 55 },
  { id: 56, name: "Titus", abbreviation: "Tit", testament: "NT", chapterCount: 3, orderIndex: 56 },
  { id: 57, name: "Philemon", abbreviation: "Phm", testament: "NT", chapterCount: 1, orderIndex: 57 },
  { id: 58, name: "Hebrews", abbreviation: "Heb", testament: "NT", chapterCount: 13, orderIndex: 58 },
  { id: 59, name: "James", abbreviation: "Jam", testament: "NT", chapterCount: 5, orderIndex: 59 },
  { id: 60, name: "1 Peter", abbreviation: "1Pe", testament: "NT", chapterCount: 5, orderIndex: 60 },
  { id: 61, name: "2 Peter", abbreviation: "2Pe", testament: "NT", chapterCount: 3, orderIndex: 61 },
  { id: 62, name: "1 John", abbreviation: "1Jo", testament: "NT", chapterCount: 5, orderIndex: 62 },
  { id: 63, name: "2 John", abbreviation: "2Jo", testament: "NT", chapterCount: 1, orderIndex: 63 },
  { id: 64, name: "3 John", abbreviation: "3Jo", testament: "NT", chapterCount: 1, orderIndex: 64 },
  { id: 65, name: "Jude", abbreviation: "Jud", testament: "NT", chapterCount: 1, orderIndex: 65 },
  { id: 66, name: "Revelation", abbreviation: "Rev", testament: "NT", chapterCount: 22, orderIndex: 66 },
];

export async function seedBibleBooks(database: NodePgDatabase<any>) {
  const translations = [
    { id: "KJV", name: "King James Version", abbreviation: "KJV", language: "en" },
    { id: "ASV", name: "American Standard Version", abbreviation: "ASV", language: "en" },
    { id: "WEB", name: "World English Bible", abbreviation: "WEB", language: "en" },
    { id: "BBE", name: "Bible in Basic English", abbreviation: "BBE", language: "en" },
    { id: "YLT", name: "Young's Literal Translation", abbreviation: "YLT", language: "en" },
    { id: "RV1909", name: "Reina Valera 1909", abbreviation: "RV1909", language: "es" },
    { id: "LSG", name: "Louis Segond 1910", abbreviation: "LSG", language: "fr" },
    { id: "ARC", name: "Almeida Revista e Corrigida", abbreviation: "ARC", language: "pt" },
    { id: "TAGV", name: "Ang Biblia (Tagalog)", abbreviation: "TAGV", language: "tl" },
  ];
  for (const t of translations) {
    await database.insert(bibleTranslations).values(t).onConflictDoNothing();
  }

  const existing = await database.select().from(bibleBooks).limit(1);
  if (existing.length > 0) return;

  console.log("Seeding 66 Bible books...");
  for (const book of BOOKS) {
    await database.insert(bibleBooks).values(book).onConflictDoNothing();
  }
  console.log("Bible books seeded successfully.");
}
