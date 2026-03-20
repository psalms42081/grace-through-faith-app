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

const BOOK_NAMES: string[] = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
  "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah",
  "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah",
  "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
  "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
  "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
  "Jude", "Revelation",
];

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

interface GetBibleTranslation {
  apiCode: string;
  outputFile: string;
  label: string;
}

const GETBIBLE_TRANSLATIONS: GetBibleTranslation[] = [
  { apiCode: "valera", outputFile: "rv1909.json", label: "RV1909 (Reina Valera 1909)" },
  { apiCode: "ls1910", outputFile: "lsg.json", label: "LSG (Louis Segond 1910)" },
  { apiCode: "almeida", outputFile: "arc.json", label: "ARC (Almeida Atualizada)" },
  { apiCode: "tagalog", outputFile: "tagv.json", label: "TAGV (Ang Dating Biblia 1905)" },
];

async function downloadFromGetBible(config: GetBibleTranslation): Promise<NormalizedVerse[]> {
  console.log(`Downloading ${config.label} from api.getbible.net...`);
  const allVerses: NormalizedVerse[] = [];

  for (let bookIdx = 0; bookIdx < BOOK_NAMES.length; bookIdx++) {
    const bookNum = bookIdx + 1;
    const bookName = BOOK_NAMES[bookIdx];
    const url = `https://api.getbible.net/v2/${config.apiCode}/${bookNum}.json`;

    try {
      const raw = await download(url);
      const data = JSON.parse(raw);

      if (data.chapters) {
        for (const ch of data.chapters) {
          const chNum = ch.chapter;
          if (ch.verses) {
            for (const v of ch.verses) {
              const text = stripHtml(String(v.text || "").trim());
              if (text) {
                allVerses.push({ book: bookName, chapter: chNum, verse: v.verse, text });
              }
            }
          }
        }
      }

      process.stdout.write(`  [${bookNum}/66] ${bookName}\n`);
    } catch (err: any) {
      console.error(`  FAILED: ${bookName} - ${err.message || err}`);
    }
    if (bookIdx % 5 === 4) await sleep(300);
  }

  console.log(`  ${config.label}: ${allVerses.length} verses downloaded`);
  return allVerses;
}

async function main() {
  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  for (const config of GETBIBLE_TRANSLATIONS) {
    try {
      const verses = await downloadFromGetBible(config);
      const outPath = path.join(dataDir, config.outputFile);
      fs.writeFileSync(outPath, JSON.stringify(verses));
      const sizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(1);
      console.log(`  Saved to ${outPath} (${sizeMB} MB)\n`);
    } catch (err) {
      console.error(`  FAILED to download ${config.label}: ${err}\n`);
    }
  }

  console.log("Download complete! Next: npx tsx scripts/import-multilingual-translations.ts");
}

main().catch((err) => {
  console.error("Download failed:", err);
  process.exit(1);
});
