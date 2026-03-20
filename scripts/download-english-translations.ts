import * as fs from "fs";
import * as path from "path";
import * as https from "https";

function download(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const makeRequest = (requestUrl: string) => {
      https.get(requestUrl, { headers: { "User-Agent": "grace-through-faith-app" } }, (res) => {
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

interface NormalizedVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

const BOOK_NUM_MAP: Record<number, string> = {
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

const BOOK_NAMES = Object.values(BOOK_NUM_MAP);

function stripHtml(html: string): string {
  return html
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const SCROLLMAPPER_BASE = "https://raw.githubusercontent.com/scrollmapper/bible_databases/258c8b386894245bc2e8bfbd96d3600f0c2de8ae/json";

interface ScrollmapperSource {
  id: string;
  name: string;
  file: string;
}

const SCROLLMAPPER_SOURCES: ScrollmapperSource[] = [
  { id: "BBE", name: "Bible in Basic English", file: "t_bbe.json" },
  { id: "YLT", name: "Young's Literal Translation", file: "t_ylt.json" },
];

async function downloadScrollmapper(source: ScrollmapperSource): Promise<NormalizedVerse[]> {
  console.log(`Downloading ${source.id} (${source.name})...`);
  const url = `${SCROLLMAPPER_BASE}/${source.file}`;
  const raw = await download(url);
  const data = JSON.parse(raw);
  const rows: { field: (number | string)[] }[] = data.resultset.row;

  const verses: NormalizedVerse[] = [];
  for (const row of rows) {
    const [, bookNum, chapter, verse, text] = row.field;
    const bookName = BOOK_NUM_MAP[bookNum as number];
    if (bookName && text) {
      verses.push({
        book: bookName,
        chapter: chapter as number,
        verse: verse as number,
        text: String(text).trim(),
      });
    }
  }
  console.log(`  ${source.id}: ${verses.length} verses downloaded`);
  return verses;
}

async function main() {
  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  for (const source of SCROLLMAPPER_SOURCES) {
    try {
      const verses = await downloadScrollmapper(source);
      const outPath = path.join(dataDir, `${source.id.toLowerCase()}.json`);
      fs.writeFileSync(outPath, JSON.stringify(verses));
      const sizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(1);
      console.log(`  Saved to ${outPath} (${sizeMB} MB)\n`);
    } catch (err) {
      console.error(`  FAILED to download ${source.id}: ${err}\n`);
    }
  }

  console.log("Download complete! Next: npx tsx scripts/import-english-translations.ts");
}

main().catch((err) => {
  console.error("Download failed:", err);
  process.exit(1);
});
