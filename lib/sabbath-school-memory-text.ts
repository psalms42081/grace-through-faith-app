export interface MemoryText {
  verse: string;
  reference: string | null;
}

export interface MemoryTextExtraction {
  memoryText: MemoryText | null;
  remainingContent: string;
}

const MEMORY_LABEL = /^\s*(?:memory\s+(?:text|verse))\s*:\s*/i;

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&lsquo;": "‘",
    "&rsquo;": "’",
    "&ldquo;": "“",
    "&rdquo;": "”",
    "&mdash;": "—",
    "&ndash;": "–",
  };

  return value
    .replace(/&(nbsp|amp|quot|apos|lsquo|rsquo|ldquo|rdquo|mdash|ndash);/gi, (entity) => {
      return namedEntities[entity.toLowerCase()] ?? entity;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(parseInt(decimal, 10)));
}

function normalizeVisibleText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMemoryText(value: string): MemoryText | null {
  const visibleText = normalizeVisibleText(value);
  if (!MEMORY_LABEL.test(visibleText)) return null;

  const textWithoutLabel = visibleText.replace(MEMORY_LABEL, "").trim();
  const referenceMatch = textWithoutLabel.match(/\(([^()]+)\)\s*\.?\s*$/);
  const verse = (referenceMatch
    ? textWithoutLabel.slice(0, referenceMatch.index)
    : textWithoutLabel
  ).trim();

  return verse
    ? {
        verse,
        reference: referenceMatch ? referenceMatch[1].trim() : null,
      }
    : null;
}

function removeRange(content: string, start: number, end: number): string {
  const before = content.slice(0, start).trimEnd();
  const after = content.slice(end).trimStart();

  if (!before || !after) return before || after;
  return `${before}\n\n${after}`;
}

/**
 * Separates Adventech's Memory Text block from a daily lesson without altering
 * its words. The remaining source is passed through the usual lesson renderer.
 */
export function extractMemoryText(content: string | null | undefined): MemoryTextExtraction {
  if (!content) {
    return { memoryText: null, remainingContent: content ?? "" };
  }

  const htmlBlockquotePattern = /<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi;
  for (const match of content.matchAll(htmlBlockquotePattern)) {
    const memoryText = parseMemoryText(match[0]);
    if (memoryText && match.index !== undefined) {
      return {
        memoryText,
        remainingContent: removeRange(content, match.index, match.index + match[0].length),
      };
    }
  }

  const markdownBlockquotePattern = /(^|\r?\n)((?:[ \t]*>[^\r\n]*(?:\r?\n|$))+)/g;
  for (const match of content.matchAll(markdownBlockquotePattern)) {
    const block = match[2];
    const visibleBlock = block.replace(/^[ \t]*>\s?/gm, "");
    const memoryText = parseMemoryText(visibleBlock);
    if (memoryText && match.index !== undefined) {
      const start = match.index + match[1].length;
      return {
        memoryText,
        remainingContent: removeRange(content, start, start + block.length),
      };
    }
  }

  return { memoryText: null, remainingContent: content };
}