import * as fs from "fs";
import * as path from "path";
import * as https from "https";

function download(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const makeRequest = (requestUrl: string) => {
      https.get(requestUrl, { headers: { "User-Agent": "scripture-study-app" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) { makeRequest(redirectUrl); return; }
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} for ${requestUrl}`)); return; }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        res.on("error", reject);
      }).on("error", reject);
    };
    makeRequest(url);
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const WEB_BOOKS: [string, string][] = [
  ["Genesis", "genesis"], ["Exodus", "exodus"], ["Leviticus", "leviticus"],
  ["Numbers", "numbers"], ["Deuteronomy", "deuteronomy"],
  ["Joshua", "joshua"], ["Judges", "judges"], ["Ruth", "ruth"],
  ["1 Samuel", "1samuel"], ["2 Samuel", "2samuel"],
  ["1 Kings", "1kings"], ["2 Kings", "2kings"],
  ["1 Chronicles", "1chronicles"], ["2 Chronicles", "2chronicles"],
  ["Ezra", "ezra"], ["Nehemiah", "nehemiah"], ["Esther", "esther"],
  ["Job", "job"], ["Psalms", "psalms"], ["Proverbs", "proverbs"],
  ["Ecclesiastes", "ecclesiastes"], ["Song of Solomon", "songofsolomon"],
  ["Isaiah", "isaiah"], ["Jeremiah", "jeremiah"], ["Lamentations", "lamentations"],
  ["Ezekiel", "ezekiel"], ["Daniel", "daniel"], ["Hosea", "hosea"],
  ["Joel", "joel"], ["Amos", "amos"], ["Obadiah", "obadiah"],
  ["Jonah", "jonah"], ["Micah", "micah"], ["Nahum", "nahum"],
  ["Habakkuk", "habakkuk"], ["Zephaniah", "zephaniah"],
  ["Haggai", "haggai"], ["Zechariah", "zechariah"], ["Malachi", "malachi"],
  ["Matthew", "matthew"], ["Mark", "mark"], ["Luke", "luke"],
  ["John", "john"], ["Acts", "acts"], ["Romans", "romans"],
  ["1 Corinthians", "1corinthians"], ["2 Corinthians", "2corinthians"],
  ["Galatians", "galatians"], ["Ephesians", "ephesians"],
  ["Philippians", "philippians"], ["Colossians", "colossians"],
  ["1 Thessalonians", "1thessalonians"], ["2 Thessalonians", "2thessalonians"],
  ["1 Timothy", "1timothy"], ["2 Timothy", "2timothy"],
  ["Titus", "titus"], ["Philemon", "philemon"], ["Hebrews", "hebrews"],
  ["James", "james"], ["1 Peter", "1peter"], ["2 Peter", "2peter"],
  ["1 John", "1john"], ["2 John", "2john"], ["3 John", "3john"],
  ["Jude", "jude"], ["Revelation", "revelation"],
];

const ASV_BOOK_IDS: Record<number, string> = {
  1: "Genesis", 2: "Exodus", 3: "Leviticus", 4: "Numbers", 5: "Deuteronomy",
  6: "Joshua", 7: "Judges", 8: "Ruth", 9: "1 Samuel", 10: "2 Samuel",
  11: "1 Kings", 12: "2 Kings", 13: "1 Chronicles", 14: "2 Chronicles",
  15: "Ezra", 16: "Nehemiah", 17: "Esther", 18: "Job", 19: "Psalms",
  20: "Proverbs", 21: "Ecclesiastes", 22: "Song of Solomon", 23: "Isaiah",
  24: "Jeremiah", 25: "Lamentations", 26: "Ezekiel", 27: "Daniel",
  28: "Hosea", 29: "Joel", 30: "Amos", 31: "Obadiah", 32: "Jonah",
  33: "Micah", 34: "Nahum", 35: "Habakkuk", 36: "Zephaniah", 37: "Haggai",
  38: "Zechariah", 39: "Malachi", 40: "Matthew", 41: "Mark", 42: "Luke",
  43: "John", 44: "Acts", 45: "Romans", 46: "1 Corinthians", 47: "2 Corinthians",
  48: "Galatians", 49: "Ephesians", 50: "Philippians", 51: "Colossians",
  52: "1 Thessalonians", 53: "2 Thessalonians", 54: "1 Timothy", 55: "2 Timothy",
  56: "Titus", 57: "Philemon", 58: "Hebrews", 59: "James", 60: "1 Peter",
  61: "2 Peter", 62: "1 John", 63: "2 John", 64: "3 John", 65: "Jude",
  66: "Revelation",
};

interface NormalizedVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

async function downloadASV(): Promise<NormalizedVerse[]> {
  console.log("Downloading ASV (American Standard Version)...");
  const url = "https://raw.githubusercontent.com/bibleapi/bibleapi-bibles-json/refs/heads/master/asv.json";
  const raw = await download(url);
  const data = JSON.parse(raw);
  const rows: { field: [number, number, number, number, string] }[] = data.resultset.row;

  const verses: NormalizedVerse[] = [];
  for (const row of rows) {
    const [, bookNum, chapter, verse, text] = row.field;
    const bookName = ASV_BOOK_IDS[bookNum];
    if (bookName && text) {
      verses.push({ book: bookName, chapter, verse, text: text.trim() });
    }
  }
  console.log(`  ASV: ${verses.length} verses downloaded`);
  return verses;
}

async function downloadWEB(): Promise<NormalizedVerse[]> {
  console.log("Downloading WEB (World English Bible) — 66 books...");
  const WEB_BASE = "https://raw.githubusercontent.com/TehShrike/world-english-bible/refs/heads/master/json";
  const allVerses: NormalizedVerse[] = [];

  for (let i = 0; i < WEB_BOOKS.length; i++) {
    const [bookName, fileName] = WEB_BOOKS[i];
    const url = `${WEB_BASE}/${fileName}.json`;

    try {
      const raw = await download(url);
      const data: any[] = JSON.parse(raw);

      const textItems = data.filter(
        (d: any) => (d.type === "paragraph text" || d.type === "line text") && d.chapterNumber && d.verseNumber && d.value
      );

      const verseMap = new Map<string, string>();
      for (const item of textItems) {
        const key = `${item.chapterNumber}:${item.verseNumber}`;
        if (verseMap.has(key)) {
          verseMap.set(key, verseMap.get(key)! + " " + item.value.trim());
        } else {
          verseMap.set(key, item.value.trim());
        }
      }

      for (const [key, text] of verseMap) {
        const [ch, v] = key.split(":").map(Number);
        allVerses.push({ book: bookName, chapter: ch, verse: v, text });
      }

      process.stdout.write(`  [${i + 1}/66] ${bookName} (${verseMap.size} verses)\n`);
    } catch (err) {
      console.error(`  FAILED: ${bookName} - ${err}`);
    }
    if (i % 10 === 9) await sleep(200);
  }

  console.log(`  WEB: ${allVerses.length} verses downloaded`);
  return allVerses;
}

async function main() {
  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const asvVerses = await downloadASV();
  const asvPath = path.join(dataDir, "asv.json");
  fs.writeFileSync(asvPath, JSON.stringify(asvVerses));
  const asvSizeMB = (fs.statSync(asvPath).size / (1024 * 1024)).toFixed(1);
  console.log(`  Saved to ${asvPath} (${asvSizeMB} MB)\n`);

  const webVerses = await downloadWEB();
  const webPath = path.join(dataDir, "web.json");
  fs.writeFileSync(webPath, JSON.stringify(webVerses));
  const webSizeMB = (fs.statSync(webPath).size / (1024 * 1024)).toFixed(1);
  console.log(`  Saved to ${webPath} (${webSizeMB} MB)\n`);

  console.log("Download complete! Next: npx tsx scripts/import-translations.ts");
}

main().catch((err) => {
  console.error("Download failed:", err);
  process.exit(1);
});
