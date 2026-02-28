import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const BOOKS: [string, string][] = [
  ["Genesis", "Genesis"], ["Exodus", "Exodus"], ["Leviticus", "Leviticus"],
  ["Numbers", "Numbers"], ["Deuteronomy", "Deuteronomy"],
  ["Joshua", "Joshua"], ["Judges", "Judges"], ["Ruth", "Ruth"],
  ["1 Samuel", "1Samuel"], ["2 Samuel", "2Samuel"],
  ["1 Kings", "1Kings"], ["2 Kings", "2Kings"],
  ["1 Chronicles", "1Chronicles"], ["2 Chronicles", "2Chronicles"],
  ["Ezra", "Ezra"], ["Nehemiah", "Nehemiah"], ["Esther", "Esther"],
  ["Job", "Job"], ["Psalms", "Psalms"], ["Proverbs", "Proverbs"],
  ["Ecclesiastes", "Ecclesiastes"], ["Song of Solomon", "SongofSolomon"],
  ["Isaiah", "Isaiah"], ["Jeremiah", "Jeremiah"], ["Lamentations", "Lamentations"],
  ["Ezekiel", "Ezekiel"], ["Daniel", "Daniel"], ["Hosea", "Hosea"],
  ["Joel", "Joel"], ["Amos", "Amos"], ["Obadiah", "Obadiah"],
  ["Jonah", "Jonah"], ["Micah", "Micah"], ["Nahum", "Nahum"],
  ["Habakkuk", "Habakkuk"], ["Zephaniah", "Zephaniah"],
  ["Haggai", "Haggai"], ["Zechariah", "Zechariah"], ["Malachi", "Malachi"],
  ["Matthew", "Matthew"], ["Mark", "Mark"], ["Luke", "Luke"],
  ["John", "John"], ["Acts", "Acts"], ["Romans", "Romans"],
  ["1 Corinthians", "1Corinthians"], ["2 Corinthians", "2Corinthians"],
  ["Galatians", "Galatians"], ["Ephesians", "Ephesians"],
  ["Philippians", "Philippians"], ["Colossians", "Colossians"],
  ["1 Thessalonians", "1Thessalonians"], ["2 Thessalonians", "2Thessalonians"],
  ["1 Timothy", "1Timothy"], ["2 Timothy", "2Timothy"],
  ["Titus", "Titus"], ["Philemon", "Philemon"], ["Hebrews", "Hebrews"],
  ["James", "James"], ["1 Peter", "1Peter"], ["2 Peter", "2Peter"],
  ["1 John", "1John"], ["2 John", "2John"], ["3 John", "3John"],
  ["Jude", "Jude"], ["Revelation", "Revelation"],
];

const BASE_URL = "https://raw.githubusercontent.com/aruljohn/Bible-kjv/refs/heads/master";
const OUTPUT_PATH = path.resolve(process.cwd(), "data", "kjv.json");

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

async function main() {
  console.log("Downloading KJV Bible data (66 books) from public domain source...");
  const allBooks: any[] = [];

  for (let i = 0; i < BOOKS.length; i++) {
    const [bookName, fileName] = BOOKS[i];
    const url = `${BASE_URL}/${fileName}.json`;

    try {
      const data = await download(url);
      const parsed = JSON.parse(data);
      allBooks.push(parsed);
      process.stdout.write(`  [${i + 1}/66] ${bookName}\n`);
    } catch (err) {
      console.error(`  FAILED: ${bookName} - ${err}`);
    }
    if (i % 10 === 9) await sleep(200);
  }

  console.log(`\nDownloaded ${allBooks.length} books`);

  const dataDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allBooks));
  const sizeMB = (fs.statSync(OUTPUT_PATH).size / (1024 * 1024)).toFixed(1);
  console.log(`Saved to ${OUTPUT_PATH} (${sizeMB} MB)`);
  console.log("\nNext: npx tsx scripts/import-kjv.ts");
}

main();
