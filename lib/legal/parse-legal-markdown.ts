export type LegalInline =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "em"; text: string };

export type LegalBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "banner"; text: string }
  | { type: "meta"; text: string }
  | { type: "p"; inlines: LegalInline[] }
  | { type: "ul"; items: LegalInline[][] };

export type LegalDocument = {
  title: string;
  banner: string | null;
  meta: string | null;
  blocks: LegalBlock[];
};

const DRAFTING_NOTES =
  /\n---\s*\n+\*Drafting notes for review[\s\S]*$/;

export function stripDraftingNotes(markdown: string): string {
  return markdown.replace(DRAFTING_NOTES, "\n").replace(/\s+$/, "\n");
}

export function parseInlines(text: string): LegalInline[] {
  const out: LegalInline[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      out.push({ type: "text", text: text.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      out.push({ type: "strong", text: match[1] });
    } else {
      out.push({ type: "em", text: match[2] });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    out.push({ type: "text", text: text.slice(last) });
  }
  return out.length ? out : [{ type: "text", text: "" }];
}

export function parseLegalMarkdown(markdown: string): LegalDocument {
  const source = stripDraftingNotes(markdown).replace(/\r\n/g, "\n");
  const lines = source.split("\n");
  const blocks: LegalBlock[] = [];
  let i = 0;

  const flushParagraph = (raw: string) => {
    const text = raw.replace(/\n+$/, "");
    if (!text.trim()) return;
    if (/^Version\s/i.test(text) && !text.includes("\n")) {
      blocks.push({ type: "meta", text });
      return;
    }
    blocks.push({ type: "p", inlines: parseInlines(text) });
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      i += 1;
      continue;
    }
    const bannerLine = /^\*\*[^*]+\*\*$/.test(line.trim());
    let beforeSections = true;
    for (const block of blocks) {
      if (block.type !== "h1") {
        beforeSections = false;
        break;
      }
    }
    if (bannerLine && beforeSections) {
      blocks.push({ type: "banner", text: line.trim().slice(2, -2) });
      i += 1;
      continue;
    }
    if (line.trim().startsWith("- ")) {
      const items: LegalInline[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(parseInlines(lines[i].trim().replace(/^- /, "").replace(/;$/, ";")));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    const para: string[] = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !/^(#{1,3} |- )/.test(lines[i])) {
      para.push(lines[i]);
      i += 1;
    }
    flushParagraph(para.join("\n"));
  }

  const title = blocks.find((b) => b.type === "h1")?.text ?? "Informed Ministries";
  const banner = blocks.find((b) => b.type === "banner")?.text ?? null;
  const meta = blocks.find((b) => b.type === "meta")?.text ?? null;
  return { title, banner, meta, blocks };
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlinesToHtml(inlines: LegalInline[]): string {
  return inlines
    .map((part) => {
      const safe = escapeHtml(part.text).replace(/\n/g, "<br />\n");
      if (part.type === "strong") return `<strong>${safe}</strong>`;
      if (part.type === "em") return `<em>${safe}</em>`;
      return safe;
    })
    .join("");
}

export function legalDocumentToHtml(doc: LegalDocument, opts: {
  pageTitle: string;
  description: string;
  canonicalPath: string;
  siblingHref: string;
  siblingLabel: string;
}): string {
  const body = doc.blocks
    .map((block) => {
      switch (block.type) {
        case "h1":
          return `<h1>${escapeHtml(block.text)}</h1>`;
        case "banner":
          return `<p class="banner">${escapeHtml(block.text)}</p>`;
        case "meta":
          return `<p class="updated">${escapeHtml(block.text)}</p>`;
        case "h2":
          return `<h2>${escapeHtml(block.text)}</h2>`;
        case "h3":
          return `<h3>${escapeHtml(block.text)}</h3>`;
        case "p":
          return `<p>${inlinesToHtml(block.inlines)}</p>`;
        case "ul":
          return `<ul>${block.items
            .map((item) => `<li>${inlinesToHtml(item)}</li>`)
            .join("\n")}</ul>`;
      }
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(opts.pageTitle)}</title>
    <meta name="description" content="${escapeHtml(opts.description)}" />
    <link rel="canonical" href="https://informedministries.app${opts.canonicalPath}" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✝️</text></svg>" />
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 0;
        padding: 32px 20px;
        background: #fff;
        color: #222;
        line-height: 1.7;
        min-height: 100vh;
      }
      .wrapper { max-width: 680px; margin: 0 auto; }
      h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px; color: #111; }
      h2 { font-size: 20px; font-weight: 600; margin: 32px 0 12px; color: #111; }
      h3 { font-size: 16px; font-weight: 600; margin: 24px 0 8px; color: #111; }
      .banner {
        font-size: 14px;
        font-weight: 600;
        color: #7A4E12;
        background: #FBF3E4;
        border: 1px solid #E8D4A8;
        border-radius: 8px;
        padding: 10px 12px;
        margin: 0 0 12px;
      }
      .updated { font-size: 13px; color: #999; margin-bottom: 32px; }
      p, li { font-size: 15px; color: #444; }
      ul { padding-left: 20px; }
      li { margin-bottom: 6px; }
      a { color: #555; text-decoration: underline; text-underline-offset: 2px; }
      a:hover { color: #111; }
      footer {
        margin-top: 48px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        font-size: 13px;
        color: #999;
      }
      @media (prefers-color-scheme: dark) {
        body { background: #0d0d0d; color: #e0e0e0; }
        h1, h2, h3 { color: #f5f5f5; }
        p, li { color: #bbb; }
        a { color: #999; }
        a:hover { color: #eee; }
        footer { border-color: #333; color: #666; }
        .updated { color: #666; }
        .banner { background: #2a2114; border-color: #5a4a2a; color: #e8d4a8; }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="wrapper">
${body}
        <footer>
          &copy; 2026 Informed Ministries &middot;
          <a href="${opts.siblingHref}">${escapeHtml(opts.siblingLabel)}</a>
        </footer>
      </div>
    </main>
  </body>
</html>
`;
}
