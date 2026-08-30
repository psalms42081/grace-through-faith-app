/**
 * One-time EGW EPUB ingestion. Never imported by the server or deploy build.
 *
 *   npx tsx scripts/ingest-egw-books.ts
 *   npx tsx scripts/ingest-egw-books.ts --dry-run
 *
 * Reads server/data/egw-source/*.epub, stores verbatim chapters in public.egw_chapters.
 */
import { inflateRawSync } from "node:zlib";
import { readdir, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const SOURCE_DIR = path.resolve(process.cwd(), "server/data/egw-source");

const BOOKS = [
  { slug: "steps-to-christ", book: "Steps to Christ", match: /steps\s*to\s*christ|(^|[^a-z])en_sc([^a-z]|$)|(^|[^a-z])sc\.epub/i },
  { slug: "desire-of-ages", book: "The Desire of Ages", match: /desire\s*of\s*(the\s*)?ages|(^|[^a-z])en_da([^a-z]|$)|(^|[^a-z])da\.epub/i },
  { slug: "christs-object-lessons", book: "Christ's Object Lessons", match: /object\s*lessons|christ'?s\s*object|(^|[^a-z])en_col([^a-z]|$)|(^|[^a-z])col\.epub/i },
] as const;

const SKIP_TITLE =
  /^(contents|table of contents|copyright|title page|cover|titlepage|nav|information about this book|preface|foreword|publisher'?s preface)$/i;

type BookMeta = (typeof BOOKS)[number];

export type IngestedChapter = {
  book: string;
  bookSlug: string;
  chapterNumber: number;
  chapterTitle: string;
  paragraphs: string[];
};

function loadEnvFile() {
  if (process.env.DATABASE_URL) return;
  try {
    const text = readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env is optional when DATABASE_URL is already set
  }
}

function readZip(buf: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a valid ZIP/EPUB (missing EOCD)");

  const cdOffset = buf.readUInt32LE(eocd + 16);
  const cdRecords = buf.readUInt16LE(eocd + 10);
  let offset = cdOffset;

  for (let n = 0; n < cdRecords; n++) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Corrupt ZIP central directory");
    }
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.subarray(offset + 46, offset + 46 + nameLen).toString("utf8");
    offset += 46 + nameLen + extraLen + commentLen;

    if (name.endsWith("/")) continue;

    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = buf.subarray(dataStart, dataStart + compressedSize);

    let data: Buffer;
    if (method === 0) data = Buffer.from(compressed);
    else if (method === 8) data = inflateRawSync(compressed);
    else throw new Error(`Unsupported ZIP method ${method} in ${name}`);

    files.set(name.replace(/\\/g, "/"), data);
  }
  return files;
}

function findFile(files: Map<string, Buffer>, suffix: string): Buffer | undefined {
  const lower = suffix.toLowerCase();
  for (const [name, data] of files) {
    if (name.toLowerCase().endsWith(lower) || name.toLowerCase() === lower) return data;
  }
  return undefined;
}

function resolveHref(base: string, href: string): string {
  const cleaned = href.split("#")[0].replace(/\\/g, "/");
  if (!base) return cleaned;
  const dir = base.includes("/") ? base.slice(0, base.lastIndexOf("/") + 1) : "";
  const parts = (dir + cleaned).split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019");
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToParagraphs(html: string): { title: string; paragraphs: string[] } {
  const heading =
    html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ||
    html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
  const title = heading ? stripTags(heading[1]) : "";
  const paragraphs: string[] = [];
  const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  while ((match = pRe.exec(html))) {
    const text = stripTags(match[1]);
    if (!text) continue;
    if (title && text === title && paragraphs.length === 0) continue;
    paragraphs.push(text);
  }
  return { title, paragraphs };
}

function parseContainerOpfPath(xml: string): string {
  const match = xml.match(/full-path=["']([^"']+)["']/i);
  if (!match) throw new Error("EPUB container.xml has no OPF path");
  return match[1].replace(/\\/g, "/");
}

function parseOpfSpine(opf: string, opfPath: string): string[] {
  const manifest = new Map<string, string>();
  const itemRe = /<item\b[^>]*>/gi;
  let item: RegExpExecArray | null;
  while ((item = itemRe.exec(opf))) {
    const tag = item[0];
    const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (id && href) manifest.set(id, resolveHref(opfPath, href));
  }
  const spine: string[] = [];
  const refRe = /<itemref\b[^>]*\bidref=["']([^"']+)["'][^>]*>/gi;
  let ref: RegExpExecArray | null;
  while ((ref = refRe.exec(opf))) {
    const href = manifest.get(ref[1]);
    if (href) spine.push(href);
  }
  return spine;
}

function parseNcxToc(ncx: string, ncxPath: string): { href: string; title: string }[] {
  const points: { href: string; title: string }[] = [];
  const re =
    /<navPoint\b[^>]*>[\s\S]*?<navLabel>[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<\/navLabel>[\s\S]*?<content\b[^>]*src=["']([^"']+)["'][^>]*\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(ncx))) {
    points.push({
      title: stripTags(match[1]),
      href: resolveHref(ncxPath, match[2]),
    });
  }
  return points;
}

function parseNavToc(nav: string, navPath: string): { href: string; title: string }[] {
  const block =
    nav.match(/<nav\b[^>]*epub:type=["']toc["'][^>]*>([\s\S]*?)<\/nav>/i)?.[1] ||
    nav.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/i)?.[1] ||
    "";
  const points: { href: string; title: string }[] = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(block))) {
    points.push({
      href: resolveHref(navPath, match[1]),
      title: stripTags(match[2]),
    });
  }
  return points;
}

function identifyBook(fileName: string, opf: string): BookMeta {
  const dcTitle = opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)?.[1] || "";
  const haystack = `${fileName} ${stripTags(dcTitle)}`;
  const found = BOOKS.find((b) => b.match.test(haystack));
  if (!found) {
    throw new Error(`Could not identify book from EPUB filename/title: ${fileName}`);
  }
  return found;
}

function isHtmlPath(name: string): boolean {
  return /\.(x?html?)$/i.test(name);
}

function findTocEntries(
  files: Map<string, Buffer>,
  opfPath: string,
  opf: string,
): { href: string; title: string }[] {
  for (const [name, data] of files) {
    if (/toc\.ncx$/i.test(name)) {
      const entries = parseNcxToc(data.toString("utf8"), name);
      if (entries.length) return entries;
    }
  }
  for (const [name, data] of files) {
    if (/nav\.(x?html?)$/i.test(name) || /toc\.(x?html?)$/i.test(name)) {
      const entries = parseNavToc(data.toString("utf8"), name);
      if (entries.length) return entries;
    }
  }
  return parseOpfSpine(opf, opfPath).filter(isHtmlPath).map((href) => ({ href, title: "" }));
}

export function parseEgwEpub(
  buf: Buffer,
  fileName: string,
): { meta: BookMeta; chapters: IngestedChapter[] } {
  const files = readZip(buf);
  const container = findFile(files, "meta-inf/container.xml");
  if (!container) throw new Error(`${fileName}: missing META-INF/container.xml`);
  const opfPath = parseContainerOpfPath(container.toString("utf8"));
  const opfBuf = files.get(opfPath);
  if (!opfBuf) throw new Error(`${fileName}: OPF not found at ${opfPath}`);
  const opf = opfBuf.toString("utf8");
  const meta = identifyBook(fileName, opf);

  const toc = findTocEntries(files, opfPath, opf);
  const seen = new Set<string>();
  const chapters: IngestedChapter[] = [];

  for (const entry of toc) {
    if (!isHtmlPath(entry.href)) continue;
    if (seen.has(entry.href)) continue;
    seen.add(entry.href);
    const htmlBuf = files.get(entry.href);
    if (!htmlBuf) continue;
    const parsed = htmlToParagraphs(htmlBuf.toString("utf8"));
    const chapterTitle = entry.title || parsed.title;
    if (!chapterTitle || SKIP_TITLE.test(chapterTitle)) continue;
    if (!parsed.paragraphs.length) continue;
    chapters.push({
      book: meta.book,
      bookSlug: meta.slug,
      chapterNumber: chapters.length + 1,
      chapterTitle,
      paragraphs: parsed.paragraphs,
    });
  }

  if (!chapters.length) {
    throw new Error(`${fileName}: no chapters extracted`);
  }
  return { meta, chapters };
}

async function ingest() {
  loadEnvFile();
  const dryRun = process.argv.includes("--dry-run");
  let names: string[];
  try {
    names = (await readdir(SOURCE_DIR)).filter((n) => /\.epub$/i.test(n));
  } catch {
    throw new Error(
      `No EPUB directory at ${SOURCE_DIR}. Place the three official egwwritings.org EPUBs there.`,
    );
  }
  if (!names.length) {
    throw new Error(
      `No .epub files in ${SOURCE_DIR}. Expected Steps to Christ, The Desire of Ages, and Christ's Object Lessons.`,
    );
  }

  const bySlug = new Map<string, IngestedChapter[]>();
  for (const name of names.sort()) {
    const buf = await readFile(path.join(SOURCE_DIR, name));
    const { meta, chapters } = parseEgwEpub(buf, name);
    console.log(`[egw-ingest] ${name} → ${meta.book} (${meta.slug}): ${chapters.length} chapters`);
    for (const ch of chapters) {
      console.log(`    ${String(ch.chapterNumber).padStart(3, " ")}. ${ch.chapterTitle} (${ch.paragraphs.length} paragraphs)`);
    }
    if (bySlug.has(meta.slug)) {
      throw new Error(`Duplicate book matched for slug ${meta.slug}`);
    }
    bySlug.set(meta.slug, chapters);
  }

  console.log("\n[egw-ingest] Chapter counts");
  for (const spec of BOOKS) {
    const count = bySlug.get(spec.slug)?.length ?? 0;
    console.log(`  ${spec.book}: ${count}`);
  }
  const missing = BOOKS.filter((b) => !bySlug.has(b.slug));
  if (missing.length) {
    throw new Error(`Missing EPUBs for: ${missing.map((b) => b.book).join(", ")}`);
  }

  if (dryRun) {
    console.log("[egw-ingest] Dry run — database unchanged.");
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to write public.egw_chapters");
  }
  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  try {
    await client.query("SET search_path TO public");
    await writeChapters(client, bySlug);
  } finally {
    await client.end();
  }
}

async function writeChapters(
  client: Client,
  bySlug: Map<string, IngestedChapter[]>,
) {
  for (const [slug, chapters] of bySlug) {
    await client.query(`DELETE FROM public.egw_chapters WHERE book_slug = $1`, [slug]);
    for (const ch of chapters) {
      await client.query(
        `INSERT INTO public.egw_chapters
           (book, book_slug, chapter_number, chapter_title, paragraphs)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [ch.book, ch.bookSlug, ch.chapterNumber, ch.chapterTitle, JSON.stringify(ch.paragraphs)],
      );
    }
    console.log(`[egw-ingest] Wrote ${chapters.length} chapters for ${slug} to public.egw_chapters`);
  }
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("ingest-egw-books.ts") ||
    process.argv[1].endsWith("ingest-egw-books.js"));

if (isMain) {
  ingest().catch((err) => {
    console.error("[egw-ingest]", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
