import OpenAI from "openai";
import { z } from "zod";
import { getTimeout } from "./api-client";
import { withAIConcurrency } from "./ai-semaphore";
import { db } from "../db";
import {
  resources,
  sabbathSchoolLessons,
  sabbathSchoolDays,
  lessonSourcePackets,
} from "../../shared/schema";
import { eq } from "drizzle-orm";
import { buildSourcePacket, type SourcePacketJson } from "./source-packet-builder";

const companionSchema = z.object({
  overview: z.string().min(400),
  dailyStudyPrompts: z.array(z.object({
    day: z.number(),
    dayTitle: z.string().min(5),
    focusText: z.string().min(5),
    studyPrompt: z.string().min(50),
    keyInsight: z.string().min(30),
  })).min(5).max(7),
  discussionQuestions: z.array(z.object({
    question: z.string().min(20),
    context: z.string().min(20),
    depth: z.enum(["surface", "intermediate", "deep"]),
  })).min(6).max(10),
  memoryVerseGuide: z.object({
    verse: z.string().min(10),
    reference: z.string().min(5),
    meditationSteps: z.array(z.string().min(10)).min(4).max(7),
    applicationPrompt: z.string().min(30),
  }),
  familyWorshipAdaptation: z.object({
    kidsVersion: z.string().min(300),
    activityIdea: z.string().min(30),
    discussionForKids: z.array(z.string().min(10)).min(2),
    prayer: z.string().min(20),
  }),
  egwConnections: z.array(z.object({
    topic: z.string().min(5),
    bookReference: z.string().min(10),
    relevance: z.string().min(30),
  })).min(3).max(7),
});

const COMPANION_PROMPT_VERSION = "v2.1";

function createOpenAIClient(): OpenAI {
  const client = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    timeout: getTimeout("openai"),
  });

  const originalCreate = client.chat.completions.create.bind(client.chat.completions);
  client.chat.completions.create = ((...args: any[]) =>
    withAIConcurrency(() => originalCreate(...args))) as any;

  return client;
}

function cleanJsonResponse(raw: string): string {
  return raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 200);
}

const SDA_SYSTEM_PROMPT = `You are a Seventh-day Adventist Bible study content generator. All content must:
- Be doctrinally sound from an SDA perspective
- Uphold the authority of Scripture as the Word of God
- Affirm the seventh-day Sabbath (Saturday) as God's holy day
- Support the Three Angels' Messages and the sanctuary doctrine
- Reference Ellen G. White writings topically (cite book and chapter, not inline quotes)
- Emphasize the soon return of Jesus Christ
- Promote health reform and wholistic living where contextually appropriate
- Be warm, accessible, and encouraging — not preachy or condemning
- Return valid JSON only, no markdown fences`;

export interface SabbathSchoolCompanionContent {
  overview: string;
  dailyStudyPrompts: Array<{
    day: number;
    dayTitle: string;
    focusText: string;
    studyPrompt: string;
    keyInsight: string;
  }>;
  discussionQuestions: Array<{
    question: string;
    context: string;
    depth: "surface" | "intermediate" | "deep";
  }>;
  memoryVerseGuide: {
    verse: string;
    reference: string;
    meditationSteps: string[];
    applicationPrompt: string;
  };
  familyWorshipAdaptation: {
    kidsVersion: string;
    activityIdea: string;
    discussionForKids: string[];
    prayer: string;
  };
  egwConnections: Array<{
    topic: string;
    bookReference: string;
    relevance: string;
  }>;
}

export async function generateSabbathSchoolCompanion(
  lessonId: string,
  options?: { sourcePacketId?: string }
): Promise<string> {
  console.log(`[content:generate] Starting Sabbath School companion for lesson ${lessonId}`);

  let packetId = options?.sourcePacketId;
  let sourcePacket: { id: string; sourceJson: SourcePacketJson; quarterlyId: string; lessonId: string };

  if (packetId) {
    const existing = await db
      .select()
      .from(lessonSourcePackets)
      .where(eq(lessonSourcePackets.id, packetId))
      .limit(1);
    if (existing.length === 0) throw new Error(`Source packet ${packetId} not found`);
    sourcePacket = {
      id: existing[0].id,
      sourceJson: existing[0].sourceJson as SourcePacketJson,
      quarterlyId: existing[0].quarterlyId,
      lessonId: existing[0].lessonId,
    };
  } else {
    const result = await buildSourcePacket(lessonId);
    packetId = result.id;
    const packet = await db
      .select()
      .from(lessonSourcePackets)
      .where(eq(lessonSourcePackets.id, packetId))
      .limit(1);
    sourcePacket = {
      id: packet[0].id,
      sourceJson: packet[0].sourceJson as SourcePacketJson,
      quarterlyId: packet[0].quarterlyId,
      lessonId: packet[0].lessonId,
    };
  }

  const src = sourcePacket.sourceJson;
  const daysContent = src.dailyBreakdown
    .map((d) => `Day ${d.dayNumber}: ${d.title}\n${d.contentMarkdown || "(no content)"}`)
    .join("\n\n---\n\n");

  const themeContext = src.doctrinalThemes.length > 0
    ? `\nDetected doctrinal themes in this lesson: ${src.doctrinalThemes.join(", ")}`
    : "";

  const memoryVerseContext = src.memoryVerse
    ? `\nMemory verse for this lesson: ${src.memoryVerse}`
    : "";

  const openai = createOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: SDA_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Generate a comprehensive Sabbath School companion resource for the following lesson:

Quarter: "${src.quarterMeta.title}" (${src.quarterMeta.humanDate || src.quarterMeta.quarterCode})
Title: "${src.lessonTitle}" (Week ${src.weekNumber})
${memoryVerseContext}${themeContext}

Lesson Content:
${daysContent}

Return a JSON object with this exact structure:
{
  "overview": "Write 2-3 separate paragraphs (separated by \\n\\n). First paragraph: the lesson's core theme and why it matters for Adventists today. Second paragraph: how this connects to the broader Philippians/Colossians narrative arc. Third paragraph (optional): relevance to the Three Angels' Messages or the Great Controversy theme.",
  "dailyStudyPrompts": [
    {
      "day": 1,
      "dayTitle": "a concise title for this day's study",
      "focusText": "the specific scripture passage to focus on (e.g. 'Colossians 3:1-4')",
      "studyPrompt": "a thoughtful 2-3 sentence study prompt that adds depth beyond the lesson quarterly — ask a question that requires reflection, not just recall. Connect to lived experience.",
      "keyInsight": "one distinctive SDA insight — connect to a specific doctrine (sanctuary, state of the dead, Sabbath, health message, second coming) where naturally relevant. Be specific, not generic."
    }
  ],
  "discussionQuestions": [
    {
      "question": "a substantive discussion question that could sustain 5-10 minutes of group conversation",
      "context": "1-2 sentences explaining why this question matters for spiritual formation — what tension or growth opportunity does it surface?",
      "depth": "surface|intermediate|deep"
    }
  ],
  "memoryVerseGuide": {
    "verse": "the exact memory verse text from the lesson (NKJV preferred)",
    "reference": "the scripture reference (e.g. 'Colossians 3:14, NKJV')",
    "meditationSteps": [
      "Step 1: Read the verse aloud slowly three times",
      "Step 2: Identify the key action or command in the verse",
      "Step 3: Ask yourself: What does this reveal about God's character?",
      "Step 4: Connect the verse to a specific situation in your life this week",
      "Step 5: Write a one-sentence prayer response based on the verse"
    ],
    "applicationPrompt": "a specific, practical application prompt — not generic. Tie it to a real-life scenario (work, family, church, or personal struggle)."
  },
  "familyWorshipAdaptation": {
    "kidsVersion": "Write 2-3 full paragraphs retelling the lesson's theme for children ages 5-10. Use a story, analogy, or everyday scenario they can relate to. Avoid abstract theology — make it concrete and vivid. Aim for 400+ characters.",
    "activityIdea": "a specific, creative hands-on activity unique to THIS lesson's theme (avoid generic 'kindness chart' activities — tie it directly to the lesson's imagery or narrative)",
    "discussionForKids": ["age-appropriate question tied to the lesson theme", "question that connects to their daily life", "question about how God helps them with this"],
    "prayer": "a warm, simple prayer children can pray — 2-3 sentences, using language a 6-year-old would understand"
  },
  "egwConnections": [
    {
      "topic": "the specific lesson theme being connected",
      "bookReference": "Prefer major EGW works: The Desire of Ages, Steps to Christ, The Great Controversy, Patriarchs and Prophets, Christ's Object Lessons, The Ministry of Healing, Education, The Acts of the Apostles. Use 'Book Title, Chapter X' format consistently — avoid page numbers unless the work is a devotional compilation.",
      "relevance": "2-3 sentences explaining the specific connection — what does EGW add to the biblical discussion that enriches understanding?"
    }
  ]
}

Requirements:
- Generate exactly 7 daily study prompts (one per day, matching the lesson's day structure)
- Generate 7-8 discussion questions: 2 surface, 3 intermediate, 2-3 deep
- Generate 4-5 EGW connections from well-known major works
- Generate exactly 5 meditation steps that are actionable and progressive
- The overview MUST be 2-3 distinct paragraphs
- Key insights should be distinctively Adventist where possible, not generic Christian observations`,
      },
    ],
    temperature: 0.7,
    max_tokens: 6000,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const cleaned = cleanJsonResponse(raw);
  let contentJson: SabbathSchoolCompanionContent;

  function validateCompanion(json: unknown): SabbathSchoolCompanionContent {
    const result = companionSchema.safeParse(json);
    if (!result.success) {
      const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new Error(`Schema validation failed: ${issues}`);
    }
    return result.data as SabbathSchoolCompanionContent;
  }

  try {
    const parsed = JSON.parse(cleaned);
    contentJson = validateCompanion(parsed);
  } catch (firstError: any) {
    console.warn("[content:validate] First pass failed:", firstError.message?.substring(0, 300));
    console.log("[content:repair] Attempting JSON repair...");
    try {
      const repairCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Fix the following malformed or incomplete JSON. Ensure it is valid JSON with all required fields populated. Return ONLY valid JSON, no markdown fences or commentary." },
          { role: "user", content: raw },
        ],
        temperature: 0,
        max_tokens: 6000,
      });
      const repaired = cleanJsonResponse(repairCompletion.choices[0]?.message?.content ?? "{}");
      const repairedParsed = JSON.parse(repaired);
      contentJson = validateCompanion(repairedParsed);
      console.log("[content:repair] JSON repair and validation succeeded");
    } catch (repairError: any) {
      console.error("[content:generate] Repair also failed:", repairError.message?.substring(0, 300));
      throw new Error("Failed to generate valid companion content after repair attempt");
    }
  }

  const tokensUsed = completion.usage?.total_tokens ?? 0;
  const generationMeta = {
    generatedAt: new Date().toISOString(),
    promptVersion: COMPANION_PROMPT_VERSION,
    model: completion.model ?? "gpt-4o-mini",
    tokensUsed,
    regenerationCount: 0,
  };

  const contentWithMeta = { ...contentJson, _generation: generationMeta };

  const slug = slugify(`sabbath-school-companion-${src.lessonTitle}-${Date.now()}`);

  const [inserted] = await db.insert(resources).values({
    slug,
    title: `Companion: ${src.lessonTitle}`,
    description: contentJson.overview?.substring(0, 500) || `Study companion for the Sabbath School lesson "${src.lessonTitle}"`,
    resourceType: "sabbath-school-companion",
    category: "sabbath-school",
    tier: "pro",
    contentJson: contentWithMeta,
    sourceRef: { type: "sabbath-school", lessonId: sourcePacket.lessonId, quarterlyId: sourcePacket.quarterlyId },
    sourcePacketId: packetId,
    promptVersion: COMPANION_PROMPT_VERSION,
    generationStatus: "completed",
    reviewStatus: "pending",
    ageGroup: "adult",
    estimatedMinutes: 30,
    tags: ["sabbath-school", "companion", "weekly-study"],
    status: "draft",
    publishedAt: null,
    generatedBy: "ai",
  }).returning();

  console.log(`[content:ready] Sabbath School companion created: ${inserted.id} (${slug}) [${tokensUsed} tokens, ${COMPANION_PROMPT_VERSION}, packet: ${packetId}]`);
  return inserted.id;
}

export interface TopicalStudyContent {
  title: string;
  introduction: string;
  scriptureFoundation: Array<{
    reference: string;
    text: string;
    explanation: string;
  }>;
  historicalContext: string;
  sdaContext: string;
  applicationQuestions: Array<{
    question: string;
    guidanceNote: string;
  }>;
  prayerPrompts: string[];
  furtherStudy: Array<{
    resource: string;
    description: string;
  }>;
}

export async function generateTopicalStudy(
  topic: string,
  depth: "quick" | "standard" | "deep" = "standard"
): Promise<string> {
  console.log(`[content:generate] Starting topical study on "${topic}" (${depth})`);

  const depthInstructions = {
    quick: "Be concise. 5 key passages, brief explanations. Total content suitable for a 10-minute read.",
    standard: "Provide balanced depth. 6 key passages with moderate explanations. Suitable for a 20-minute study session.",
    deep: "Be thorough and scholarly. 8 key passages with detailed analysis, original language insights where relevant, and extensive cross-references. Suitable for a 45-minute deep study.",
  };

  const openai = createOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: SDA_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Generate a topical Bible study on: "${topic}"

Depth level: ${depth}
${depthInstructions[depth]}

Return a JSON object with this exact structure:
{
  "title": "A compelling title for this study",
  "introduction": "2-3 paragraphs introducing the topic and its significance from an SDA perspective",
  "scriptureFoundation": [
    {
      "reference": "Book Chapter:Verse",
      "text": "the verse text (KJV preferred)",
      "explanation": "explanation of how this passage relates to the topic"
    }
  ],
  "historicalContext": "1-2 paragraphs on the historical and biblical context of this topic",
  "sdaContext": "1-2 paragraphs on how Seventh-day Adventists understand this topic, including relevant fundamental beliefs",
  "applicationQuestions": [
    {
      "question": "a thoughtful application question",
      "guidanceNote": "brief guidance to help the student think through the question"
    }
  ],
  "prayerPrompts": ["prayer prompt 1", "prayer prompt 2", "prayer prompt 3"],
  "furtherStudy": [
    {
      "resource": "name of a relevant Ellen G. White book or SDA resource",
      "description": "brief description of what it covers related to this topic"
    }
  ]
}

Generate ${depth === "quick" ? "3" : depth === "deep" ? "6" : "4"} application questions and ${depth === "quick" ? "2" : depth === "deep" ? "4" : "3"} further study resources.`,
      },
    ],
    temperature: 0.7,
    max_tokens: depth === "deep" ? 4000 : depth === "quick" ? 2000 : 3000,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const cleaned = cleanJsonResponse(raw);
  let contentJson: TopicalStudyContent;
  try {
    contentJson = JSON.parse(cleaned);
  } catch {
    console.error("[content:generate] Failed to parse topical study JSON:", raw.substring(0, 500));
    throw new Error("Failed to parse AI-generated topical study content");
  }

  const estimatedMinutes = depth === "quick" ? 10 : depth === "deep" ? 45 : 20;
  const slug = slugify(`topical-study-${topic}-${Date.now()}`);

  const [inserted] = await db.insert(resources).values({
    slug,
    title: contentJson.title || `Topical Study: ${topic}`,
    description: contentJson.introduction?.substring(0, 500) || `A ${depth} study exploring "${topic}" from a biblical and SDA perspective.`,
    resourceType: "topical-study",
    category: "doctrine",
    tier: "free",
    contentJson,
    ageGroup: "adult",
    estimatedMinutes,
    tags: ["topical-study", topic.toLowerCase(), depth],
    status: "draft",
    generatedBy: "ai",
  }).returning();

  console.log(`[content:ready] Topical study created: ${inserted.id} (${slug})`);
  return inserted.id;
}

export interface FamilyWorshipPlanContent {
  title: string;
  theme: string;
  introduction: string;
  days: Array<{
    dayNumber: number;
    title: string;
    reading: {
      reference: string;
      summary: string;
    };
    activity: {
      description: string;
      materials: string[];
      ageAdaptations: {
        children: string;
        teen: string;
        adult: string;
      };
    };
    questions: {
      children: string[];
      teen: string[];
      adult: string[];
    };
    songSuggestion: {
      title: string;
      hymnalNumber?: string;
    };
    prayerFocus: string;
  }>;
  closingThought: string;
}

export async function generateFamilyWorshipPlan(
  theme: string,
  daysCount: number = 5
): Promise<string> {
  console.log(`[content:generate] Starting family worship plan: "${theme}" (${daysCount} days)`);

  const clampedDays = Math.min(Math.max(daysCount, 3), 7);

  const openai = createOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: SDA_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Generate a ${clampedDays}-day family worship plan on the theme: "${theme}"

This should be suitable for families with children, teens, and adults worshipping together. Each day should take about 15-20 minutes.

Return a JSON object with this exact structure:
{
  "title": "An engaging title for this worship plan",
  "theme": "${theme}",
  "introduction": "1-2 paragraphs welcoming the family and explaining the week's focus",
  "days": [
    {
      "dayNumber": 1,
      "title": "Day title",
      "reading": {
        "reference": "Scripture reference (e.g., Genesis 1:1-10)",
        "summary": "Brief summary of the passage for context"
      },
      "activity": {
        "description": "A hands-on family activity connected to the reading",
        "materials": ["material 1", "material 2"],
        "ageAdaptations": {
          "children": "How younger children (4-8) can participate",
          "teen": "How teens can engage at their level",
          "adult": "How adults can go deeper"
        }
      },
      "questions": {
        "children": ["simple question 1", "simple question 2"],
        "teen": ["teen-appropriate question 1", "teen-appropriate question 2"],
        "adult": ["deeper question 1", "deeper question 2"]
      },
      "songSuggestion": {
        "title": "A hymn or worship song title",
        "hymnalNumber": "SDA Hymnal number if applicable"
      },
      "prayerFocus": "What to pray about today"
    }
  ],
  "closingThought": "An encouraging closing thought for the family"
}

Generate exactly ${clampedDays} days. Use songs from the SDA Hymnal when possible. Activities should use common household items.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const cleaned = cleanJsonResponse(raw);
  let contentJson: FamilyWorshipPlanContent;
  try {
    contentJson = JSON.parse(cleaned);
  } catch {
    console.error("[content:generate] Failed to parse family worship JSON:", raw.substring(0, 500));
    throw new Error("Failed to parse AI-generated family worship plan");
  }

  const slug = slugify(`family-worship-${theme}-${Date.now()}`);

  const [inserted] = await db.insert(resources).values({
    slug,
    title: contentJson.title || `Family Worship: ${theme}`,
    description: contentJson.introduction?.substring(0, 500) || `A ${clampedDays}-day family worship plan exploring "${theme}".`,
    resourceType: "family-worship",
    category: "family",
    tier: "free",
    contentJson,
    ageGroup: null,
    estimatedMinutes: clampedDays * 15,
    tags: ["family-worship", "family", theme.toLowerCase()],
    status: "draft",
    generatedBy: "ai",
  }).returning();

  console.log(`[content:ready] Family worship plan created: ${inserted.id} (${slug})`);
  return inserted.id;
}
