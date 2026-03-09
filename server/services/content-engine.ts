import OpenAI from "openai";
import { getTimeout } from "./api-client";
import { withAIConcurrency } from "./ai-semaphore";
import { db } from "../db";
import {
  resources,
  sabbathSchoolLessons,
  sabbathSchoolDays,
} from "../../shared/schema";
import { eq } from "drizzle-orm";

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

export async function generateSabbathSchoolCompanion(lessonId: string): Promise<string> {
  console.log(`[content:generate] Starting Sabbath School companion for lesson ${lessonId}`);

  const lesson = await db
    .select()
    .from(sabbathSchoolLessons)
    .where(eq(sabbathSchoolLessons.id, lessonId))
    .limit(1);

  if (lesson.length === 0) {
    throw new Error(`Lesson ${lessonId} not found`);
  }

  const days = await db
    .select()
    .from(sabbathSchoolDays)
    .where(eq(sabbathSchoolDays.lessonId, lessonId))
    .orderBy(sabbathSchoolDays.dayNumber);

  const daysContent = days
    .map((d) => `Day ${d.dayNumber}: ${d.title || "Untitled"}\n${d.contentMarkdown || "(no content)"}`)
    .join("\n\n---\n\n");

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

Title: "${lesson[0].title}"

Lesson Content:
${daysContent}

Return a JSON object with this exact structure:
{
  "overview": "2-3 paragraph SDA-perspective summary of the lesson's key themes and significance",
  "dailyStudyPrompts": [
    {
      "day": 1,
      "dayTitle": "title for this day's study",
      "focusText": "the specific scripture or passage to focus on",
      "studyPrompt": "a thoughtful study prompt that goes deeper than the lesson material",
      "keyInsight": "one key insight from an SDA perspective"
    }
  ],
  "discussionQuestions": [
    {
      "question": "a deeper discussion question",
      "context": "brief context for why this question matters",
      "depth": "surface|intermediate|deep"
    }
  ],
  "memoryVerseGuide": {
    "verse": "the memory verse text",
    "reference": "the scripture reference",
    "meditationSteps": ["step 1 for meditating on this verse", "step 2", "step 3"],
    "applicationPrompt": "how to apply this verse in daily life"
  },
  "familyWorshipAdaptation": {
    "kidsVersion": "a kid-friendly retelling of the lesson's main theme (2-3 paragraphs)",
    "activityIdea": "a hands-on activity for children related to the lesson",
    "discussionForKids": ["simple question 1", "simple question 2", "simple question 3"],
    "prayer": "a simple prayer children can pray"
  },
  "egwConnections": [
    {
      "topic": "the topic being connected",
      "bookReference": "Ellen G. White book and chapter reference",
      "relevance": "how this connects to the lesson"
    }
  ]
}

Generate 7 daily study prompts (one per day), 6-8 discussion questions with mixed depths, 3-5 EGW connections, and 3-4 meditation steps.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const cleaned = cleanJsonResponse(raw);
  let contentJson: SabbathSchoolCompanionContent;
  try {
    contentJson = JSON.parse(cleaned);
  } catch {
    console.error("[content:generate] Failed to parse companion JSON:", raw.substring(0, 500));
    throw new Error("Failed to parse AI-generated companion content");
  }

  const slug = slugify(`sabbath-school-companion-${lesson[0].title}-${Date.now()}`);

  const [inserted] = await db.insert(resources).values({
    slug,
    title: `Companion: ${lesson[0].title}`,
    description: contentJson.overview?.substring(0, 500) || `Study companion for the Sabbath School lesson "${lesson[0].title}"`,
    resourceType: "sabbath-school-companion",
    category: "sabbath-school",
    tier: "pro",
    contentJson,
    sourceRef: { type: "sabbath-school", lessonId: lesson[0].id, quarterlyId: lesson[0].quarterlyId },
    ageGroup: "adult",
    estimatedMinutes: 30,
    tags: ["sabbath-school", "companion", "weekly-study"],
    status: "published",
    publishedAt: new Date(),
    generatedBy: "ai",
  }).returning();

  console.log(`[content:ready] Sabbath School companion created: ${inserted.id} (${slug})`);
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
