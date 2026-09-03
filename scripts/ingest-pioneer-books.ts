/**
 * One-time pioneer EPUB ingestion. Never imported by the server or deploy build.
 *
 *   npx tsx scripts/ingest-pioneer-books.ts
 *   npx tsx scripts/ingest-pioneer-books.ts --dry-run
 *   npx tsx scripts/ingest-pioneer-books.ts --dry-run --rebuild
 *
 * Reads server/data/pioneer-source/manifest.json. If an EPUB is missing, downloads
 * the official egwwritings.org json-v4 zip (the site Download control — pioneer
 * books have no media2 EPUB) and wraps it as an EPUB for the same ZIP/OPF/NCX
 * parser used by scripts/ingest-egw-books.ts.
 */
import { inflateRawSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const SOURCE_DIR = path.resolve(process.cwd(), "server/data/pioneer-source");
const MANIFEST_PATH = path.join(SOURCE_DIR, "manifest.json");
const UA =
  "GraceThroughFaith/1.0 (joseph@gracethroughfaith.app; +https://gracethroughfaith.app)";

const SKIP_TITLE =
  /^(contents|table of contents|copyright|title page|cover|titlepage|nav|information about this book|illustrations|index(\s+of\b.*)?)$/i;

type ManifestBook = {
  author: string;
  author_slug: string;
  book: string;
  book_slug: string;
  year: number;
  book_id: number;
  code: string;
  epub: string;
  source_url: string;
  json_v4_url: string;
  exclude_titles: string[];
};

type Manifest = {
  userAgent?: string;
  books: ManifestBook[];
};

export type IngestedPioneerChapter = {
  author: string;
  authorSlug: string;
  book: string;
  bookSlug: string;
  year: number;
  chapterNumber: number;
  chapterTitle: string;
  paragraphs: string[];
  sourceUrl: string;
};

type TocEntry = {
  para_id: string;
  level: number;
  heading_level?: number;
  title: string;
};

type JsonPara = {
  para_id?: string;
  element_type?: string;
  content?: string;
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

function loadManifest(): Manifest {
  const raw = readFileSync(MANIFEST_PATH, "utf8");
  const parsed = JSON.parse(raw) as Manifest;
  if (!parsed?.books?.length) throw new Error(`No books in ${MANIFEST_PATH}`);
  return parsed;
}

function normalizeTitle(title: string): string {
  return title
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function titleMatchesExclude(title: string, excludes: string[]): boolean {
  const norm = normalizeTitle(title);
  if (!norm) return false;
  return excludes.some((raw) => {
    const exclude = normalizeTitle(raw);
    if (!exclude) return false;
    if (norm === exclude) return true;
    return norm.startsWith(`${exclude} `) || norm.startsWith(`${exclude}-`);
  });
}

function isChapterEntry(entry: TocEntry): boolean {
  const title = entry.title.trim();
  if (!title) return false;
  if (entry.level === 1) return true;
  if (entry.level === 2 && /^\d+\s*[-–—.]/.test(title)) return true;
  if (entry.level === 2 && /^(chapter|appendix)\b/i.test(title)) return true;
  return false;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name.replace(/\\/g, "/"), "utf8");
    const data = file.data;
    const crc = crc32(data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    locals.push(local, data);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += local.length + data.length;
  }

  const centralDir = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, centralDir, eocd]);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlChapter(title: string, paragraphsHtml: string[]): string {
  const body = [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<html xmlns="http://www.w3.org/1999/xhtml">`,
    `<head><title>${escapeXml(title)}</title></head>`,
    `<body>`,
    `<h1>${escapeXml(title)}</h1>`,
    ...paragraphsHtml.map((html) => `<p>${html}</p>`),
    `</body></html>`,
  ];
  return body.join("\n");
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

function loadJsonParas(files: Map<string, Buffer>, paraId: string): JsonPara[] {
  const suffix = `${paraId}.json`.toLowerCase();
  for (const [name, data] of files) {
    const base = name.split("/").pop()?.toLowerCase() ?? "";
    if (base === suffix) {
      const parsed = JSON.parse(data.toString("utf8"));
      return Array.isArray(parsed) ? parsed : [];
    }
  }
  return [];
}

function hasJsonFile(files: Map<string, Buffer>, paraId: string): boolean {
  const suffix = `${paraId}.json`.toLowerCase();
  for (const name of files.keys()) {
    const base = name.split("/").pop()?.toLowerCase() ?? "";
    if (base === suffix) return true;
  }
  return false;
}

function extractParagraphHtml(paras: JsonPara[], chapterTitle: string): string[] {
  const out: string[] = [];
  for (const para of paras) {
    const content = typeof para.content === "string" ? para.content.trim() : "";
    if (!content) continue;
    const type = (para.element_type || "p").toLowerCase();
    const text = stripTags(content);
    if (!text) continue;
    if (text === chapterTitle && out.length === 0) continue;
    if (/^h[1-6]$/.test(type) && text === chapterTitle) continue;
    if (/^h[1-6]$/.test(type)) {
      out.push(`<strong>${content}</strong>`);
      continue;
    }
    if (type === "p" || type.startsWith("p") || type === "blockquote") {
      out.push(content);
    }
  }
  return out;
}

function chaptersFromJsonV4(
  zip: Map<string, Buffer>,
  spec: ManifestBook,
): { title: string; paragraphsHtml: string[] }[] {
  const tocBuf = findFile(zip, "toc.json");
  if (!tocBuf) throw new Error(`${spec.code}: json-v4 zip missing toc.json`);
  const toc = JSON.parse(tocBuf.toString("utf8")) as TocEntry[];
  if (!Array.isArray(toc) || !toc.length) {
    throw new Error(`${spec.code}: json-v4 toc.json is empty`);
  }

  const chapterIdx: number[] = [];
  toc.forEach((entry, i) => {
    if (
      isChapterEntry(entry) &&
      entry.title?.trim() &&
      hasJsonFile(zip, entry.para_id)
    ) {
      chapterIdx.push(i);
    }
  });
  if (!chapterIdx.length) {
    toc.forEach((entry, i) => {
      if (entry.level !== 0 && entry.title?.trim()) chapterIdx.push(i);
    });
  }
  if (!chapterIdx.length) {
    throw new Error(`${spec.code}: no chapter-level TOC entries in json-v4`);
  }

  const chapters: { title: string; paragraphsHtml: string[] }[] = [];
  for (let n = 0; n < chapterIdx.length; n++) {
    const start = chapterIdx[n];
    const end = n + 1 < chapterIdx.length ? chapterIdx[n + 1] : toc.length;
    const title = toc[start].title.trim();
    const html: string[] = [];
    for (let i = start; i < end; i++) {
      const entry = toc[i];
      const paras = loadJsonParas(zip, entry.para_id);
      html.push(...extractParagraphHtml(paras, title));
    }
    chapters.push({ title, paragraphsHtml: html });
  }
  return chapters;
}

function buildEpubFromJsonV4(zipBuf: Buffer, spec: ManifestBook): Buffer {
  const zip = readZip(zipBuf);
  const chapters = chaptersFromJsonV4(zip, spec);
  if (!chapters.length) throw new Error(`${spec.code}: no chapters to wrap as EPUB`);

  const manifestItems: string[] = [
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
  ];
  const spineItems: string[] = [];
  const ncxPoints: string[] = [];
  const files: { name: string; data: Buffer }[] = [
    { name: "mimetype", data: Buffer.from("application/epub+zip", "utf8") },
    {
      name: "META-INF/container.xml",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`,
        "utf8",
      ),
    },
  ];

  chapters.forEach((ch, i) => {
    const id = `ch${String(i + 1).padStart(3, "0")}`;
    const href = `${id}.xhtml`;
    files.push({
      name: `OEBPS/${href}`,
      data: Buffer.from(xmlChapter(ch.title, ch.paragraphsHtml), "utf8"),
    });
    manifestItems.push(
      `<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`,
    );
    spineItems.push(`<itemref idref="${id}"/>`);
    ncxPoints.push(
      `<navPoint id="${id}" playOrder="${i + 1}"><navLabel><text>${escapeXml(ch.title)}</text></navLabel><content src="${href}"/></navPoint>`,
    );
  });

  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(spec.book)}</dc:title>
    <dc:creator>${escapeXml(spec.author)}</dc:creator>
    <dc:language>en</dc:language>
    <dc:date>${spec.year}</dc:date>
    <dc:identifier id="bookid">egwwritings-b${spec.book_id}</dc:identifier>
  </metadata>
  <manifest>
    ${manifestItems.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join("\n    ")}
  </spine>
</package>
`;
  const ncx = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="egwwritings-b${spec.book_id}"/></head>
  <docTitle><text>${escapeXml(spec.book)}</text></docTitle>
  <navMap>
    ${ncxPoints.join("\n    ")}
  </navMap>
</ncx>
`;
  files.push({ name: "OEBPS/content.opf", data: Buffer.from(opf, "utf8") });
  files.push({ name: "OEBPS/toc.ncx", data: Buffer.from(ncx, "utf8") });
  return zipStore(files);
}

async function downloadJsonV4(url: string, userAgent: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "application/zip,*/*" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}) ${url}`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 64 || bytes.readUInt32LE(0) !== 0x04034b50) {
    throw new Error(`Not a ZIP at ${url} (${bytes.length} bytes)`);
  }
  return bytes;
}

async function ensureEpub(
  spec: ManifestBook,
  userAgent: string,
  rebuild: boolean,
): Promise<string> {
  const epubPath = path.join(SOURCE_DIR, spec.epub);
  if (!rebuild) {
    try {
      const existing = await readFile(epubPath);
      if (existing.length > 64 && existing.readUInt32LE(0) === 0x04034b50) {
        return epubPath;
      }
    } catch {
      // rebuild
    }
  }
  console.log(`[pioneer-ingest] Downloading official json-v4 for ${spec.code} (b${spec.book_id})`);
  const zipBuf = await downloadJsonV4(spec.json_v4_url, userAgent);
  const epub = buildEpubFromJsonV4(zipBuf, spec);
  await mkdir(SOURCE_DIR, { recursive: true });
  await writeFile(epubPath, epub);
  console.log(`[pioneer-ingest] Wrote ${spec.epub} (${epub.length} bytes) from json-v4`);
  return epubPath;
}

export function parsePioneerEpub(
  buf: Buffer,
  spec: ManifestBook,
): { chapters: IngestedPioneerChapter[]; excluded: string[] } {
  const files = readZip(buf);
  const container = findFile(files, "meta-inf/container.xml");
  if (!container) throw new Error(`${spec.epub}: missing META-INF/container.xml`);
  const opfPath = parseContainerOpfPath(container.toString("utf8"));
  const opfBuf = files.get(opfPath);
  if (!opfBuf) throw new Error(`${spec.epub}: OPF not found at ${opfPath}`);
  const opf = opfBuf.toString("utf8");

  const toc = findTocEntries(files, opfPath, opf);
  const seen = new Set<string>();
  const chapters: IngestedPioneerChapter[] = [];
  const excluded: string[] = [];

  for (const entry of toc) {
    if (!isHtmlPath(entry.href)) continue;
    if (seen.has(entry.href)) continue;
    seen.add(entry.href);
    const htmlBuf = files.get(entry.href);
    if (!htmlBuf) continue;
    const parsed = htmlToParagraphs(htmlBuf.toString("utf8"));
    const chapterTitle = entry.title || parsed.title;
    if (!chapterTitle) continue;
    if (SKIP_TITLE.test(chapterTitle)) {
      excluded.push(chapterTitle);
      continue;
    }
    if (titleMatchesExclude(chapterTitle, spec.exclude_titles)) {
      excluded.push(chapterTitle);
      continue;
    }
    if (!parsed.paragraphs.length) continue;
    chapters.push({
      author: spec.author,
      authorSlug: spec.author_slug,
      book: spec.book,
      bookSlug: spec.book_slug,
      year: spec.year,
      chapterNumber: chapters.length + 1,
      chapterTitle,
      paragraphs: parsed.paragraphs,
      sourceUrl: spec.source_url,
    });
  }

  if (!chapters.length) {
    throw new Error(`${spec.epub}: no chapters extracted`);
  }
  return { chapters, excluded };
}

function reportOddities(spec: ManifestBook, chapters: IngestedPioneerChapter[]) {
  let pageOnly = 0;
  let runningHeads = 0;
  let footnoteish = 0;
  const bookNorm = normalizeTitle(spec.book);
  for (const ch of chapters) {
    for (const para of ch.paragraphs) {
      const t = para.trim();
      if (/^\d{1,4}$/.test(t) || /^[-–—]\s*\d{1,4}\s*[-–—]$/.test(t)) pageOnly += 1;
      if (t.length < 80 && normalizeTitle(t) === bookNorm) runningHeads += 1;
      if (/\[\d+\]/.test(t) || /\{\d+\}/.test(t)) footnoteish += 1;
    }
  }
  console.log(
    `    oddities: page-number-only=${pageOnly} running-heads=${runningHeads} footnote-markers=${footnoteish}`,
  );
}

async function ingest() {
  loadEnvFile();
  const dryRun = process.argv.includes("--dry-run");
  const rebuild = process.argv.includes("--rebuild");
  const manifest = loadManifest();
  const userAgent = manifest.userAgent || UA;

  const bySlug = new Map<string, IngestedPioneerChapter[]>();
  for (const spec of manifest.books) {
    if (bySlug.size > 0) await new Promise((resolve) => setTimeout(resolve, 750));
    const epubPath = await ensureEpub(spec, userAgent, rebuild);
    const buf = await readFile(epubPath);
    const { chapters, excluded } = parsePioneerEpub(buf, spec);
    const paras = chapters.reduce((n, ch) => n + ch.paragraphs.length, 0);
    console.log(
      `[pioneer-ingest] ${spec.epub} → ${spec.author}, ${spec.book} (${spec.book_slug}, ${spec.year}): ${chapters.length} chapters, ${paras} paragraphs`,
    );
    if (excluded.length) {
      console.log(`    excluded (${excluded.length}):`);
      for (const title of excluded) console.log(`      - ${title}`);
    } else {
      console.log("    excluded: (none)");
    }
    for (const ch of chapters) {
      console.log(
        `    ${String(ch.chapterNumber).padStart(3, " ")}. ${ch.chapterTitle} (${ch.paragraphs.length} paragraphs)`,
      );
    }
    reportOddities(spec, chapters);
    if (bySlug.has(spec.book_slug)) {
      throw new Error(`Duplicate book slug ${spec.book_slug}`);
    }
    bySlug.set(spec.book_slug, chapters);
  }

  console.log("\n[pioneer-ingest] Chapter counts");
  for (const spec of manifest.books) {
    const chapters = bySlug.get(spec.book_slug) ?? [];
    const paras = chapters.reduce((n, ch) => n + ch.paragraphs.length, 0);
    console.log(`  ${spec.book}: ${chapters.length} chapters / ${paras} paragraphs`);
  }

  if (dryRun) {
    console.log("[pioneer-ingest] Dry run — database unchanged.");
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to write public.pioneer_chapters. Run migrations/0012_pioneer_chapters.sql on Neon first.",
    );
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
  bySlug: Map<string, IngestedPioneerChapter[]>,
) {
  for (const [slug, chapters] of bySlug) {
    await client.query(`DELETE FROM public.pioneer_chapters WHERE book_slug = $1`, [slug]);
    for (const ch of chapters) {
      await client.query(
        `INSERT INTO public.pioneer_chapters
           (author, author_slug, book, book_slug, year, chapter_number, chapter_title, paragraphs, source_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
        [
          ch.author,
          ch.authorSlug,
          ch.book,
          ch.bookSlug,
          ch.year,
          ch.chapterNumber,
          ch.chapterTitle,
          JSON.stringify(ch.paragraphs),
          ch.sourceUrl,
        ],
      );
    }
    console.log(
      `[pioneer-ingest] Wrote ${chapters.length} chapters for ${slug} to public.pioneer_chapters`,
    );
  }
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("ingest-pioneer-books.ts") ||
    process.argv[1].endsWith("ingest-pioneer-books.js"));

if (isMain) {
  ingest().catch((err) => {
    console.error("[pioneer-ingest]", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
