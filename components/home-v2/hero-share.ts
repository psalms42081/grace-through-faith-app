export type HeroTab = "verse" | "signpost" | "reflection";

export const SIGNPOST_SHARE_ORIGIN = "https://gracethroughfaith.app";

export function buildSignpostTopicUrl(
  topicId: string,
  origin = SIGNPOST_SHARE_ORIGIN,
): string {
  return `${origin.replace(/\/$/, "")}/touchpoint-topic?topicId=${encodeURIComponent(topicId)}`;
}

export function buildHeroShareMessage(input: {
  tab: HeroTab;
  verse: { text: string; reference: string };
  signpost?: { id?: string; title?: string; description?: string } | null;
  reflection: { thought: string; reference: string };
  origin?: string;
}): string {
  if (input.tab === "reflection") {
    return `${input.reflection.thought}\n\u2014 Reflection on ${input.reflection.reference}`;
  }

  if (input.tab === "signpost") {
    const title = input.signpost?.title?.trim() || "A signpost for today";
    const body = input.signpost?.description?.trim() ?? "";
    const parts = [title];
    if (body) parts.push(body);
    if (input.signpost?.id) {
      parts.push(buildSignpostTopicUrl(input.signpost.id, input.origin));
    }
    return parts.join("\n\n");
  }

  return `\u201C${input.verse.text}\u201D\n\u2014 ${input.verse.reference}`;
}
