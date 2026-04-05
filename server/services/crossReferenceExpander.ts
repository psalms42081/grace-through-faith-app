import OpenAI from "openai";
import { db } from "../db";
import { videoTopics, topicVideos } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

function createOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

export interface CrossReference {
  scripture: string;
  angle: string;
  emotionalTone: string;
}

export interface ExpansionResult {
  topicId: string;
  topicTitle: string;
  anchorScripture: string;
  crossReferences: CrossReference[];
  inserted: number;
  skipped: number;
}

export async function expandTopicCrossReferences(
  topicId: string,
  maxReferences: number = 7
): Promise<ExpansionResult> {
  const [topic] = await db
    .select()
    .from(videoTopics)
    .where(eq(videoTopics.id, topicId));

  if (!topic) throw new Error(`Topic not found: ${topicId}`);

  const anchorScripture = topic.scriptureAnchor || "";
  const client = createOpenAIClient();

  const prompt = `You are a Bible scholar with deep knowledge of scripture cross-references. Given a topic and its anchor scripture, return cross-reference scriptures that offer DIFFERENT ANGLES on the same topic.

RULES:
- Return exactly ${maxReferences} cross-references
- Each must be a real, accurate Bible verse reference (book chapter:verse format)
- Each should approach the topic from a DIFFERENT emotional angle or life stage
- Include a mix: some that speak to teens, some to young adults, some to adults
- Vary between Old Testament and New Testament
- Include lesser-known verses, not just the obvious ones everyone quotes
- The "angle" should be a 5-10 word description of how this verse hits the topic differently
- The "emotionalTone" should describe the feeling: "raw honesty", "quiet comfort", "fierce hope", "gentle conviction", etc.
- Do NOT repeat the anchor scripture

Topic: "${topic.title}"
Category: ${topic.category || "Faith"}
Description: ${topic.description || ""}
Anchor Scripture: ${anchorScripture}

Return ONLY a JSON array of objects with: "scripture", "angle", "emotionalTone"
No markdown, no explanation.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
    max_tokens: 1500,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "[]";
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  let crossRefs: CrossReference[];

  try {
    crossRefs = JSON.parse(cleaned);
  } catch {
    console.error("[cross-ref] Failed to parse GPT response:", raw.substring(0, 200));
    throw new Error("Failed to parse cross-reference response");
  }

  if (!Array.isArray(crossRefs)) {
    throw new Error("Cross-reference response is not an array");
  }

  let inserted = 0;
  let skipped = 0;

  for (const ref of crossRefs) {
    if (!ref.scripture?.trim()) continue;

    const scripture = ref.scripture.trim();

    const existing = await db
      .select({ id: topicVideos.id })
      .from(topicVideos)
      .where(
        and(
          eq(topicVideos.topicId, topicId),
          eq(topicVideos.scriptureAnchor, scripture)
        )
      );

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await db.insert(topicVideos).values({
      topicId,
      scriptureAnchor: scripture,
      crossRefOf: anchorScripture || null,
    });
    inserted++;
  }

  console.log(
    `[cross-ref] Topic "${topic.title}": ${crossRefs.length} cross-references found, ${inserted} inserted, ${skipped} already existed`
  );

  return {
    topicId,
    topicTitle: topic.title,
    anchorScripture,
    crossReferences: crossRefs,
    inserted,
    skipped,
  };
}

export async function expandAllTopicsCrossReferences(
  maxReferences: number = 7
): Promise<{ total: number; expanded: number; errors: string[] }> {
  const topics = await db.select().from(videoTopics);

  let expanded = 0;
  const errors: string[] = [];

  for (const topic of topics) {
    try {
      const result = await expandTopicCrossReferences(topic.id, maxReferences);
      if (result.inserted > 0) expanded++;
      console.log(
        `[cross-ref] ${expanded}/${topics.length}: "${topic.title}" +${result.inserted} scriptures`
      );
    } catch (err: any) {
      const msg = `${topic.title}: ${err.message}`;
      errors.push(msg);
      console.error(`[cross-ref] Error expanding "${topic.title}":`, err.message);
    }
  }

  return { total: topics.length, expanded, errors };
}
