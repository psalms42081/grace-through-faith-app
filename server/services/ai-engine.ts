import OpenAI from "openai";
import { withSdaLens } from "./sda-lens";
import { buildSabbathSchoolTutorRequest } from "./sensitive-ai-prompts";
import { getTimeout } from "./api-client";
import { withAIConcurrency } from "./ai-semaphore";
import { openaiClientOptions } from "../openai-env";

function createOpenAIClient(): OpenAI {
  const client = new OpenAI({
    ...openaiClientOptions(),
    timeout: getTimeout("openai"),
  });

  const originalCreate: (...args: any[]) => any = client.chat.completions.create.bind(client.chat.completions);
  client.chat.completions.create = ((...args: any[]) =>
    withAIConcurrency(() => originalCreate(...args))) as any;

  return client;
}

function cleanJsonResponse(raw: string): string {
  return raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}

export type StudyDepth = "quick" | "standard" | "deep";

function getDepthInstructions(depth: StudyDepth): string {
  switch (depth) {
    case "quick":
      return "Be VERY concise. Provide only the essential insight in 2-3 sentences. No extended commentary, no lengthy historical background. Focus on ONE key takeaway and ONE practical action item.";
    case "deep":
      return "Provide extended, thorough content. Include Greek/Hebrew word studies where relevant, cross-references to other Scripture passages, references to Ellen G. White writings (with specific book and page citations), detailed historical and cultural context, and theological depth. Be comprehensive and scholarly while remaining accessible.";
    case "standard":
    default:
      return "Provide balanced, moderately detailed content suitable for a 15-minute study session.";
  }
}

function getDepthMaxTokens(depth: StudyDepth, standardTokens: number): number {
  switch (depth) {
    case "quick":
      return Math.min(Math.round(standardTokens * 0.4), 400);
    case "deep":
      return Math.round(standardTokens * 2);
    case "standard":
    default:
      return standardTokens;
  }
}

const NT_BOOKS = [
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
  "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
  "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
  "Jude", "Revelation",
];

export interface WordStudyEntry {
  strongId: string | null;
  originalWord: string;
  translatedWord: string;
  lemma: string;
  transliteration: string;
  pronunciation: string;
  definition: string;
  kjvUsage: string;
}

export async function generateStrongWordStudy(params: {
  verseText: string;
  bookName: string;
  chapter: number;
  verse: number;
  translation: string;
}): Promise<WordStudyEntry[]> {
  const { verseText, bookName, chapter, verse, translation } = params;

  const testament = NT_BOOKS.includes(bookName) ? "NT" : "OT";
  const lang = testament === "NT" ? "Greek" : "Hebrew";
  const langCode = testament === "NT" ? "gr" : "he";

  const openai = createOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: withSdaLens(`You are a ${lang} Bible lexicographer. Analyze key words from Bible verses and provide Strong's Concordance-style data. Return valid JSON only, no markdown.`),
      },
      {
        role: "user",
        content: `Analyze ${bookName} ${chapter}:${verse}. The English surface text below is from the ${translation} translation: "${verseText}"

Analyze EVERY significant word in this verse (skip only articles like "the", "a", "an" and basic prepositions like "of", "to", "in", "for"). For each word, return Strong's-style data. The English words you cite in "translatedWord" must reflect the ${translation} wording shown above. Return a JSON array:
[
  {
    "strongId": "${langCode === "he" ? "H" : "G"}XXXX",
    "originalWord": "the ${lang} word",
    "translatedWord": "the English word as it appears in the ${translation} text above",
    "lemma": "dictionary form in ${lang} script",
    "transliteration": "romanized form",
    "pronunciation": "how to pronounce it",
    "definition": "concise definition (1-2 sentences)",
    "kjvUsage": "the KJV translation glosses recorded for this Strong's entry, separated by commas"
  }
]

Use real Strong's numbers only when you are confident of them (H for Hebrew, G for Greek). NEVER fabricate or guess a Strong's number: if you do not know the correct Strong's ID for a word, omit the "strongId" field entirely for that word rather than inventing one.`,
      },
    ],
    temperature: 0.5,
    max_tokens: 3000,
  });

  const raw = completion.choices[0]?.message?.content ?? "[]";
  const cleaned = cleanJsonResponse(raw);
  let parsed: any[];
  try {
    parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) parsed = [parsed];
  } catch {
    console.error("Failed to parse word study AI response:", raw.substring(0, 500));
    throw new Error("Failed to parse AI response");
  }

  return parsed.map((w: any) => ({
    strongId: typeof w.strongId === "string" && /^[HG]\d+$/i.test(w.strongId.trim()) ? w.strongId.trim().toUpperCase() : null,
    originalWord: w.originalWord || w.lemma || "",
    translatedWord: w.translatedWord || "",
    lemma: w.lemma || w.originalWord || "",
    transliteration: w.transliteration || "",
    pronunciation: w.pronunciation || "",
    definition: w.definition || "",
    kjvUsage: w.kjvUsage || "",
  }));
}

export interface ContextCardData {
  title: string;
  content: string;
  historicalBackground: string | null;
  culturalNotes: string | null;
  authorInfo: string | null;
  dateWritten: string | null;
  audience: string | null;
  themes: string[];
}

export async function generateContextCards(params: {
  bookId: number;
  chapter: number;
  bookName: string;
  depth?: StudyDepth;
}): Promise<ContextCardData> {
  const { chapter, bookName, depth = "standard" } = params;
  const depthGuide = getDepthInstructions(depth);

  const openai = createOpenAIClient();

  const quickFields = depth === "quick"
    ? `Return JSON with these fields:
{
  "title": "A descriptive title for this chapter's context",
  "content": "1-2 sentence overview of what this chapter covers",
  "historicalBackground": null,
  "culturalNotes": null,
  "authorInfo": null,
  "dateWritten": null,
  "audience": null,
  "themes": ["theme1", "theme2"]
}`
    : depth === "deep"
      ? `Return JSON with these fields:
{
  "title": "A descriptive title for this chapter's context",
  "content": "3-4 paragraph detailed overview of what this chapter covers and its significance, including its place in the broader biblical narrative",
  "historicalBackground": "3-4 paragraphs with detailed historical setting, archaeological evidence, and scholarly perspectives",
  "culturalNotes": "2-3 paragraphs on cultural practices, customs, social structures, and norms with cross-cultural comparisons",
  "authorInfo": "Detailed note on authorship including scholarly consensus and evidence",
  "dateWritten": "Approximate date with scholarly reasoning",
  "audience": "Detailed description of the original audience and their circumstances",
  "themes": ["theme1", "theme2", "theme3", "theme4", "theme5"]
}`
      : `Return JSON with these fields:
{
  "title": "A descriptive title for this chapter's context",
  "content": "2-3 paragraph overview of what this chapter covers and its significance",
  "historicalBackground": "2-3 paragraphs on the historical setting, when/where events took place",
  "culturalNotes": "1-2 paragraphs on cultural practices, customs, or norms relevant to understanding this chapter",
  "authorInfo": "Brief note on the traditional author of this book",
  "dateWritten": "Approximate date or range when this book was written",
  "audience": "Who was the original audience for this text",
  "themes": ["theme1", "theme2", "theme3"]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: withSdaLens(`You are a Bible scholar providing historical and cultural context for Scripture passages. Return valid JSON only, no markdown. Be scholarly, balanced, and faithful to Seventh-day Adventist understanding. CRITICAL FORMATTING: This content is read on mobile phones. Write 1-2 sentences per paragraph. Separate every paragraph with \\n\\n. Each thought gets its own short paragraph. Never combine more than 2 sentences into one paragraph. ${depthGuide}`),
      },
      {
        role: "user",
        content: `Provide historical context for ${bookName} chapter ${chapter}. ${quickFields}`,
      },
    ],
    temperature: 0.7,
    max_tokens: getDepthMaxTokens(depth, 1200),
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const cleaned = cleanJsonResponse(raw);
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse AI response:", raw.substring(0, 500));
    throw new Error("Failed to parse AI response");
  }

  return {
    title: parsed.title || `${bookName} ${chapter}`,
    content: parsed.content || "",
    historicalBackground: parsed.historicalBackground || null,
    culturalNotes: parsed.culturalNotes || null,
    authorInfo: parsed.authorInfo || null,
    dateWritten: parsed.dateWritten || null,
    audience: parsed.audience || null,
    themes: Array.isArray(parsed.themes) ? parsed.themes : [],
  };
}

export interface ApplicationStudyData {
  thenContext: string;
  nowApplication: string;
  reflectionQuestions: string[];
  prayerPrompt: string | null;
  keyTheme: string | null;
}

export async function generateApplicationStudy(params: {
  bookId: number;
  chapter: number;
  bookName: string;
  depth?: StudyDepth;
}): Promise<ApplicationStudyData> {
  const { chapter, bookName, depth = "standard" } = params;
  const depthGuide = getDepthInstructions(depth);

  const openai = createOpenAIClient();

  const jsonShape = depth === "quick"
    ? `{
  "thenContext": "1-2 sentences on original context",
  "nowApplication": "1-2 sentences on practical application today",
  "reflectionQuestions": ["One key reflection question"],
  "prayerPrompt": "A one-sentence prayer prompt",
  "keyTheme": "One word or short phrase"
}`
    : depth === "deep"
      ? `{
  "thenContext": "4-5 paragraphs with detailed historical, cultural, and theological context. Include original language insights and cross-references to related passages.",
  "nowApplication": "3-4 paragraphs with deep, practical applications. Include connections to Ellen G. White writings where relevant (cite specific works), and tie to broader Adventist theology and end-time living.",
  "reflectionQuestions": ["Question 1", "Question 2", "Question 3", "Question 4", "Question 5", "Question 6"],
  "prayerPrompt": "A detailed, multi-sentence prayer prompt that helps the reader respond to the depth of this passage",
  "keyTheme": "A phrase capturing the main theme with theological nuance"
}`
      : `{
  "thenContext": "2-3 paragraphs explaining what this passage meant to its original audience — their situation, challenges, and how they would have understood it",
  "nowApplication": "2-3 paragraphs on how this passage applies to believers today — practical, real-world applications for daily life",
  "reflectionQuestions": ["Question 1 for personal reflection", "Question 2", "Question 3", "Question 4"],
  "prayerPrompt": "A brief prayer prompt that helps the reader respond to this passage in prayer",
  "keyTheme": "One word or short phrase capturing the main theme"
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: withSdaLens(`You are a pastoral Bible teacher skilled at bridging ancient Scripture to modern life. Return valid JSON only, no markdown. Be warm and practical, faithful to Seventh-day Adventist understanding. CRITICAL FORMATTING: This content is read on mobile phones. Write 1-2 sentences per paragraph. Separate every paragraph with \\n\\n. Each thought gets its own short paragraph. Never combine more than 2 sentences into one paragraph. ${depthGuide}`),
      },
      {
        role: "user",
        content: `Create a "Then & Now" application study for ${bookName} chapter ${chapter}. Return JSON:
${jsonShape}`,
      },
    ],
    temperature: 0.7,
    max_tokens: getDepthMaxTokens(depth, 1500),
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const cleaned = cleanJsonResponse(raw);
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse application AI response:", raw.substring(0, 500));
    throw new Error("Failed to parse AI response");
  }

  return {
    thenContext: parsed.thenContext || "",
    nowApplication: parsed.nowApplication || "",
    reflectionQuestions: Array.isArray(parsed.reflectionQuestions) ? parsed.reflectionQuestions : [],
    prayerPrompt: parsed.prayerPrompt || null,
    keyTheme: parsed.keyTheme || null,
  };
}

const PERSONA_PROMPTS: Record<string, { identity: string; style: string }> = {
  pastoral: {
    identity: "You are a Bible study tutor who helps people connect Scripture to their daily lives.",
    style: "Be warm and reflective. Help the student think about how the passage relates to their experiences and relationships. Focus on personal application. Avoid sounding preachy or sermon-like — keep it conversational.",
  },
  "ellen-white": {
    identity: "You are a Bible study tutor inspired by the writings and spiritual insights of Ellen G. White. You draw from her published works — The Great Controversy, Steps to Christ, The Desire of Ages, Patriarchs and Prophets, Prophets and Kings — to illuminate Scripture. You present her insights as biblical truths grounded in the text, not as her personal opinions.",
    style: "Be reverent, earnest, and direct. Use a formal but warm tone reminiscent of 19th-century devotional writing — measured sentences, clear moral conviction, and deep concern for the student's spiritual welfare. Reference specific EGW book titles and themes when relevant (e.g., 'As explored in Steps to Christ...'). Avoid theatrical flourishes or archaic affectations. Sound like a devoted teacher who deeply loves Scripture and sees the great controversy between Christ and Satan woven through every passage.",
  },
};

export interface SabbathSchoolTutorMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Answer a member's question while keeping the official daily Sabbath School
 * source in view. The caller must obtain every source field from the database;
 * client-supplied lesson text is never used as model context.
 */
export async function generateSabbathSchoolTutorResponse(params: {
  quarterlyTitle: string;
  lessonTitle: string;
  lessonNumber: number;
  dayTitle: string | null;
  dayNumber: number;
  sourceContent: string;
  question: string;
  conversationHistory: SabbathSchoolTutorMessage[];
}): Promise<string> {
  const {
    quarterlyTitle,
    lessonTitle,
    lessonNumber,
    dayTitle,
    dayNumber,
    sourceContent,
    question,
    conversationHistory,
  } = params;

  const client = createOpenAIClient();
  const completion = await client.chat.completions.create(
    buildSabbathSchoolTutorRequest({
      quarterlyTitle,
      lessonTitle,
      lessonNumber,
      dayTitle,
      dayNumber,
      sourceContent,
      question,
      conversationHistory,
    }),
  );

  const answer = completion.choices[0]?.message?.content?.trim();
  if (!answer) {
    throw new Error("Study Tutor returned an empty response");
  }
  return answer;
}

export async function generateStudyGuideStart(params: {
  verseReference: string;
  verseText: string;
  translation: string;
  persona?: string;
}): Promise<string> {
  const { verseReference, verseText, translation, persona = "pastoral" } = params;

  const p = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.pastoral;

  const systemPrompt = `${p.identity} You guide students through the Inductive Bible Study Method (Observe → Interpret → Apply). You never give the answer directly — you ask focused questions that help the student discover truth in the text.

${p.style}

TONE RULES (critical):
- Sound like a calm, modern teacher. Never use theatrical or roleplay language.
- NEVER say: "Ah, dear student", "Let us return to the matter at hand", "We have ventured into realms", or any dramatic/poetic phrasing.
- Keep language natural and conversational. Write like a person, not a character.

PHASES:
1. OBSERVE - What does the text actually say? Ask about: who is speaking, who is the audience, what words are used, what is repeated, what seems surprising.
2. INTERPRET - What does it mean? Ask about: why the author wrote this, what the original audience would understand, how it connects to the broader biblical story.
3. APPLY - How does it connect to life? Ask about: what this reveals about God, how it challenges current thinking, what specific action to take.

RESPONSE FORMAT (critical — follow this structure exactly):
Your response MUST be two short paragraphs, never one long block:

Paragraph 1: One-sentence affirmation or gentle correction, followed by 1-2 sentences of brief explanation.

Paragraph 2: One focused follow-up question.

Keep total response to 80-100 words maximum.

VERSE ANCHORING:
When asking follow-up questions, quote or reference a specific phrase from the verse. Example: Instead of "What significance do these blessings hold?" write "In the greeting Paul writes: 'Grace, mercy, and peace.' Why might Paul include these blessings at the start?"

RESPONSE RULES:
- Ask ONE focused question at a time
- If the student is correct, acknowledge in one short phrase and move on
- If incorrect or imprecise, gently clarify what the text says, then ask a simpler follow-up
- If random or nonsense, respond: "That doesn't relate to the verse we're studying." then ask a specific question about the text
- Never over-praise. "Good" or "Right" is sufficient
- Never invent facts not in the biblical text
- You are starting in the OBSERVE phase now`;

  const userPrompt = `The student wants to study this verse (${translation} translation):\n\n"${verseText}" — ${verseReference}\n\nUse the ${translation} wording shown above when you quote or reference the verse. Begin the OBSERVE phase. Write a brief intro sentence setting up the study (1 sentence), then on a new paragraph ask your first observation question about this specific verse. Remember: ask ONE question only, be specific to this text. Your response must be exactly two paragraphs separated by a blank line.`;

  const client = createOpenAIClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: withSdaLens(systemPrompt) },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 300,
  });

  return completion.choices[0]?.message?.content || "Let's begin by reading the verse carefully. What is the first thing you notice about this text?";
}

export async function generateStudyGuideResponse(params: {
  verseText: string;
  verseReference: string;
  translation: string;
  chatMessages: { role: string; content: string }[];
  targetPhase: string;
  currentPhase: string;
  persona?: string;
}): Promise<string> {
  const { verseText, verseReference, translation, chatMessages, targetPhase, currentPhase, persona = "pastoral" } = params;

  const p = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.pastoral;

  const phaseInstructions: Record<string, string> = {
    observe: "Continue in the OBSERVE phase. Ask about a DIFFERENT observation category than what the student already covered. Observation categories: speaker, people mentioned, titles, actions, source of authority, repeated words, contrasts, structure. Pick a category the student has NOT yet addressed.",
    interpret: targetPhase === "interpret" && currentPhase === "observe"
      ? "The student has finished observing. Transition to the INTERPRET phase. Briefly note the shift: 'Now let\\'s think about what this means.' Then ask your first interpretation question about the meaning or significance of something they observed."
      : "Continue in the INTERPRET phase. Ask about meaning, purpose, theological significance, or historical context. Build on what the student said previously.",
    apply: targetPhase === "apply" && currentPhase === "interpret"
      ? "The student has finished interpreting. Transition to the APPLY phase. Briefly note the shift: 'Now let\\'s think about how this connects to your life.' Then ask a question that invites personal reflection, using words like 'you', 'your life', 'your own'."
      : "Continue in the APPLY phase. The student must share a PERSONAL reflection — not just restate doctrine. If their answer lacks personal language (I, my, me, we, our, personally), prompt them: 'That\\'s a good insight about the passage. How might this truth affect the way you approach your own calling or responsibilities?'",
    complete: "The student has completed all three phases. Give a brief, warm summary of what they discovered (1-2 key insights). End with a short prayer prompt. Keep it to 3-4 sentences total.",
  };

  const systemPrompt = `${p.identity} You guide students using the Inductive Bible Study Method (Observe → Interpret → Apply). The student is studying (${translation} translation): "${verseText}" — ${verseReference}. When you quote or reference the verse, use the ${translation} wording shown here.

${p.style}

${phaseInstructions[targetPhase] || phaseInstructions[currentPhase]}

TONE RULES (critical):
- Sound like a calm, modern teacher. Never use theatrical or roleplay language.
- NEVER say: "Ah, dear student", "Let us return to the matter at hand", "We have ventured into realms", or any dramatic/poetic phrasing.
- Keep language natural and conversational. Write like a person, not a character.

RESPONSE FORMAT (critical — follow this structure exactly):
Your response MUST be two short paragraphs, never one long block:

Paragraph 1: One-sentence affirmation or gentle correction that references what the student said. Then 1-2 sentences of brief explanation if needed.

Paragraph 2: One focused follow-up question about a DIFFERENT aspect of the text.

Keep total response to 80-100 words maximum.

VERSE ANCHORING:
At least every other response, quote or reference a specific phrase from the verse in your follow-up question. Example: "Looking at the words 'in the beginning' — what does this phrase establish about the timing of God's creative act?"

RESPONSE RULES:
- Ask ONE question at a time
- ALWAYS reference the student's previous answer in your affirmation
- If the student copies verse words without explanation, say: "You're quoting the verse. What does that tell us about [specific element]?" Mark as [SHALLOW]
- If correct, acknowledge briefly and ask about a DIFFERENT aspect
- If incorrect or imprecise, gently clarify and ask a simpler follow-up
- If random or nonsense, redirect to the passage with a concrete question
- Never over-praise. "Good" or "Right" is enough
- Never invent facts not in the biblical text
- Never give the answer directly
- Never repeat a question you already asked

EVALUATION (required):
After your response, on a NEW line, add exactly one evaluation tag and one category tag. These will be stripped before showing your response.
Tags:
- [MEANINGFUL] — substantive, relevant answer showing real engagement with the text
- [SHALLOW] — vague, too short, mere verse copying without explanation, or lacking depth
- [OFF_TOPIC] — unrelated, nonsense, or a copy of the question
Category (for OBSERVE phase only, on same line after the quality tag):
- [CAT:speaker] [CAT:people] [CAT:titles] [CAT:actions] [CAT:authority] [CAT:repeated] [CAT:contrasts] [CAT:structure] [CAT:other]
Example: [MEANINGFUL] [CAT:speaker]
For INTERPRET/APPLY phases, just the quality tag is needed.`;

  const formattedMessages = chatMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const client = createOpenAIClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: withSdaLens(systemPrompt) },
      ...formattedMessages,
    ],
    max_tokens: 280,
  });

  return completion.choices[0]?.message?.content || "That's a thoughtful response. Let's continue exploring this passage.\n[SHALLOW]";
}

export interface EvaluationResult {
  text: string;
  quality: "meaningful" | "shallow" | "off_topic";
  category?: string;
}

function isVerseCopy(userResponse: string, verseText: string): boolean {
  const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const normalUser = normalizeStr(userResponse);
  const normalVerse = normalizeStr(verseText);

  if (normalUser.length < 10) return false;

  const userWords = normalUser.split(" ");
  const verseWords = new Set(normalVerse.split(" "));
  const commonWords = new Set(["the", "a", "an", "is", "are", "was", "were", "in", "of", "and", "to", "that", "this", "it", "for", "with", "on", "at", "by", "from", "he", "she", "they", "his", "her"]);
  const significantUserWords = userWords.filter((w) => !commonWords.has(w) && w.length > 2);
  if (significantUserWords.length === 0) return false;
  const matchCount = significantUserWords.filter((w) => verseWords.has(w)).length;
  const matchRatio = matchCount / significantUserWords.length;

  if (matchRatio > 0.8 && significantUserWords.length > 3) return true;

  if (normalVerse.includes(normalUser) || normalUser.length < normalVerse.length * 1.2) {
    const words3 = [];
    for (let i = 0; i < userWords.length - 2; i++) {
      words3.push(userWords.slice(i, i + 3).join(" "));
    }
    const longMatchCount = words3.filter((tri) => normalVerse.includes(tri)).length;
    if (words3.length > 0 && longMatchCount / words3.length > 0.6) return true;
  }

  return false;
}

function hasPersonalReflection(text: string): boolean {
  const lower = " " + text.toLowerCase() + " ";
  const strongIndicators = [" i ", " my ", " me ", "personally", "reminds me", "challenges me", "makes me think", "i feel", "i think", "i should", "i need", "i want", "i believe", "my life", "my own", "my calling", "my responsibilities", "in my"];
  const hasStrong = strongIndicators.some((ind) => lower.includes(ind));
  if (!hasStrong) return false;
  const actionIndicators = ["want to", "going to", "will try", "need to", "plan to", "hope to", "reminds me", "challenges me", "teaches me", "this week", "today", "each day", "every day", "going forward", "from now"];
  const hasAction = actionIndicators.some((ind) => lower.includes(ind));
  const hasSelfRef = [" i ", " me ", " my "].some((ind) => lower.includes(ind));
  return hasSelfRef && (hasAction || lower.length > 80);
}

export function inferObserveCategory(userResponse: string): string {
  const lower = userResponse.toLowerCase();
  const patterns: [string, string[]][] = [
    ["character", ["who is speaking", "the speaker", "god is the", "paul is", "jesus said", "author", "writer", "subject here", "active agent", "job ", "moses", "david", "abraham", "peter", "john", "mary", "satan", "devil", "he was", "she was", "they were", "this man", "this woman", "the man", "the woman"]],
    ["people", ["who else", "mentioned", "people", "names", "audience", "readers", "sosthenes", "timothy", "family", "children", "sons", "daughters", "wife", "husband", "friends", "servants", "nation"]],
    ["titles", ["title", "calls himself", "apostle", "servant", "lord", "master", "christ", "king", "priest", "prophet", "blameless", "upright", "righteous", "faithful"]],
    ["actions", ["action", "verb", "created", "made", "said", "commands", "doing", "performs", "acts", "prayed", "worshipped", "sacrificed", "offered", "gave", "went", "came", "took", "stayed", "remained", "loyal", "faithful", "tested", "suffered", "lost"]],
    ["setting", ["land", "place", "where", "location", "city", "country", "region", "uz", "east", "lived", "dwelling"]],
    ["theme", ["theme", "about", "message", "teaches", "shows", "reveals", "lesson", "point", "meaning", "purpose", "suffering", "faith", "trust", "obedience", "loyalty", "patience", "testing", "trial"]],
    ["authority", ["authority", "by the will", "source of", "calling", "commissioned", "sent by", "appointed", "god allowed", "god permitted", "god said"]],
    ["repeated", ["repeated", "repetition", "emphasis", "again and again", "keeps saying", "notice that", "interesting that"]],
    ["contrasts", ["contrast", "but", "however", "opposite", "difference", "compared", "versus", "despite", "even though", "no matter what", "yet he", "still he", "still she"]],
    ["structure", ["structure", "merism", "literary", "phrase", "beginning", "opening", "closing", "order", "pattern", "totality", "heaven and earth", "first", "then", "after"]],
  ];
  for (const [cat, keywords] of patterns) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "observation_" + Date.now().toString(36).slice(-4);
}

export function parseEvaluationTag(
  response: string,
  userResponse?: string,
  verseText?: string,
  currentPhase?: string
): EvaluationResult {
  let cleanText = response;
  let aiQuality: "meaningful" | "shallow" | "off_topic" | null = null;
  let category: string | undefined;

  const catMatch = response.match(/\[CAT:(\w+)\]/i);
  if (catMatch) {
    category = catMatch[1].toLowerCase();
    cleanText = cleanText.replace(catMatch[0], "").trim();
  }

  const tagMatch = cleanText.match(/\n?\s*\[?(MEANINGFUL|SHALLOW|OFF_TOPIC)\]?\s*$/i);
  if (tagMatch) {
    aiQuality = tagMatch[1].toUpperCase() === "MEANINGFUL" ? "meaningful" : tagMatch[1].toUpperCase() === "OFF_TOPIC" ? "off_topic" : "shallow";
    cleanText = cleanText.replace(tagMatch[0], "").trim();
  } else {
    const inlineMatch = cleanText.match(/\[?(MEANINGFUL|SHALLOW|OFF_TOPIC)\]?/i);
    if (inlineMatch) {
      aiQuality = inlineMatch[1].toUpperCase() === "MEANINGFUL" ? "meaningful" : inlineMatch[1].toUpperCase() === "OFF_TOPIC" ? "off_topic" : "shallow";
      cleanText = cleanText.replace(inlineMatch[0], "").trim();
    }
  }

  if (userResponse && verseText && isVerseCopy(userResponse, verseText)) {
    return { text: cleanText, quality: "shallow", category };
  }

  let resolvedQuality: "meaningful" | "shallow" | "off_topic" = aiQuality || "shallow";

  if (!aiQuality && userResponse) {
    const words = userResponse.trim().split(/\s+/);
    const len = userResponse.trim().length;

    if (len < 8 || words.length < 2) {
      resolvedQuality = "off_topic";
    } else {
      const lower = cleanText.toLowerCase();
      const redirectPhrases = ["doesn't relate", "does not relate", "not related", "try looking", "look again", "focus on the verse", "focus on the passage", "back to the verse", "back to the text", "you're quoting"];
      if (redirectPhrases.some((p) => lower.includes(p))) {
        resolvedQuality = "off_topic";
      } else {
        const affirmPhrases = ["good", "right", "correct", "exactly", "well noted", "nice observation", "great point", "you've identified", "you noticed", "insightful", "that's a key", "you've highlighted", "yes", "absolutely", "indeed", "that's right", "you're right", "excellent", "wonderful", "interesting", "thoughtful", "you've picked up", "you've touched"];
        if (affirmPhrases.some((p) => lower.startsWith(p) || lower.includes(p + ".") || lower.includes(p + ",") || lower.includes(p + "!"))) {
          if (len > 15 && words.length > 3) {
            resolvedQuality = "meaningful";
          }
        } else if (len > 20 && words.length > 4) {
          resolvedQuality = "meaningful";
        }
      }
    }
  }

  console.log(`[study-guide] parseEvaluation: aiTag=${aiQuality || "none"} resolved=${resolvedQuality} category=${category || "none"} userLen=${userResponse?.length || 0} userWords=${userResponse?.trim().split(/\s+/).length || 0}`);

  if (userResponse && currentPhase === "apply" && resolvedQuality === "meaningful") {
    if (!hasPersonalReflection(userResponse)) {
      resolvedQuality = "shallow";
    }
  }

  return { text: cleanText, quality: resolvedQuality, category };
}

export async function generateStudySummary(params: {
  verseReference: string;
  verseText: string;
  translation: string;
  userAnswers: { observe: string[]; interpret: string[]; apply: string[] };
}): Promise<string> {
  const { verseReference, verseText, translation, userAnswers } = params;

  const client = createOpenAIClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: withSdaLens(`You write brief study completion summaries based on what the student actually said. Follow this exact 3-part structure:
1. "You observed that [specific thing from their observe answers]."
2. "You reflected that [specific insight from their interpret answers]."
3. "Your takeaway was [their specific personal application from apply answers]."
Use their actual words and ideas, not generic doctrine. Keep it under 60 words total. No theatrical language. Use second person.`),
      },
      {
        role: "user",
        content: `Verse (${translation} translation): "${verseText}" — ${verseReference}\n\nObserve answers: ${userAnswers.observe.join(" | ")}\n\nInterpret answers: ${userAnswers.interpret.join(" | ")}\n\nApply answers: ${userAnswers.apply.join(" | ")}`,
      },
    ],
    max_tokens: 150,
  });

  return completion.choices[0]?.message?.content || "Study complete. You explored this passage through observation, interpretation, and application.";
}

/**
 * A single AI-produced cross-reference candidate. The AI returns ONLY a
 * reference string and a short connection note. It NEVER returns Scripture
 * text — the route resolves exact canonical text via the canonical resolver in
 * the requested translation. This keeps verse-map generation translation-safe.
 */
export interface VerseMapCandidate {
  reference: string;
  connection: string;
}

/**
 * Raw AI output for a verse map: candidate cross-references (reference +
 * connection only) plus a non-Scripture context snippet. Contains NO Scripture
 * text of any kind.
 */
export interface VerseMapData {
  crossReferences: VerseMapCandidate[];
  contextSnippet: string;
}

/**
 * Generate cross-reference candidates + a context snippet for a verse.
 *
 * Translation safety:
 * - The caller passes the EXACT canonical source text and the selected
 *   translation name (resolved server-side, never trusted from the client).
 * - The AI must NOT quote or paraphrase Scripture. It returns only a reference
 *   string and a short connection note per candidate. The route resolves the
 *   actual verse text via the canonical resolver in the requested translation.
 */
export async function generateVerseMap(params: {
  verseText: string;
  verseReference: string;
  translation: string;
}): Promise<VerseMapData> {
  const { verseText, verseReference, translation } = params;

  const client = createOpenAIClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: withSdaLens(
          `You are a Bible scholar identifying cross-references and context for specific verses in the ${translation} translation. Return valid JSON only, no markdown. Be scholarly and accurate. You must NEVER quote, paraphrase, embed, or reproduce Scripture text of any verse — not the source verse and not any cross-reference. Provide only reference identifiers and connection notes.`
        ),
      },
      {
        role: "user",
        content: `The source verse is ${verseReference} in the ${translation} translation. Its exact canonical text has already been resolved server-side and is provided here only for your analysis — do not echo it back:

"""${verseText}"""

Provide:
1. Cross-references: 8-10 related verses from across the Bible that illuminate this verse's meaning
2. A brief historical/cultural context snippet (2-3 sentences)

Return JSON in EXACTLY this shape:
{
  "crossReferences": [
    { "reference": "John 3:16", "connection": "Both passages speak of redemptive love." }
  ],
  "contextSnippet": "Brief historical and cultural context..."
}

STRICT rules:
- NEVER include any Scripture text, quotation, or paraphrase in ANY field. No "text" field. The "contextSnippet" must not quote or paraphrase any verse.
- Each "reference" must be a standard, resolvable single-chapter reference (e.g. "John 3:16", "1 Corinthians 15:20-22", "Acts 2:29").
- Keep each "connection" under 20 words.
- Describe only historical, linguistic, or literary connections. Do NOT make doctrinal claims or speculative theology. Stay concise and neutral. Example: "Both verses highlight Paul's calling as an apostle."`,
      },
    ],
    max_tokens: 1500,
  });

  try {
    const raw = completion.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const crossReferences: VerseMapCandidate[] = Array.isArray(parsed.crossReferences)
      ? parsed.crossReferences
          .filter((c: any) => c && typeof c.reference === "string" && c.reference.trim().length > 0)
          .map((c: any) => ({
            reference: String(c.reference).trim(),
            connection: typeof c.connection === "string" ? c.connection.trim() : "",
          }))
      : [];
    return {
      crossReferences,
      contextSnippet: typeof parsed.contextSnippet === "string" ? parsed.contextSnippet : "",
    };
  } catch {
    return { crossReferences: [], contextSnippet: "Context information unavailable." };
  }
}

export interface ChapterContextData {
  locations: any[];
  timelineEvents: any[];
  keyFigures: any[];
  culturalInsights: string;
  geographicalNotes: string;
}

export async function generateChapterContext(params: {
  bookId: number;
  chapter: number;
  bookName: string;
}): Promise<ChapterContextData> {
  const { chapter, bookName } = params;

  const client = createOpenAIClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: withSdaLens("You are a Bible scholar providing immersive contextual data for Bible chapters. Return valid JSON only, no markdown. Be historically accurate and engaging."),
      },
      {
        role: "user",
        content: `Provide immersive contextual data for ${bookName} chapter ${chapter}. Return JSON:
{
  "locations": [
    { "name": "Jerusalem", "modernName": "Jerusalem, Israel", "latitude": 31.7683, "longitude": 35.2137, "significance": "Brief note on why this location matters in this chapter", "type": "city" }
  ],
  "timelineEvents": [
    { "title": "Event name", "yearLabel": "c. 30 AD", "description": "Brief description", "period": "New Testament" }
  ],
  "keyFigures": [
    { "name": "Person name", "role": "apostle/prophet/king/etc", "significance": "Why they matter in this chapter" }
  ],
  "culturalInsights": "1-2 paragraphs on cultural practices, customs, and social norms relevant to understanding this chapter",
  "geographicalNotes": "1-2 sentences on the geography and terrain relevant to the events"
}
Include 2-5 locations, 1-3 timeline events, and 2-5 key figures. Be specific to this chapter.`,
      },
    ],
    max_tokens: 1200,
  });

  try {
    const raw = completion.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      locations: [],
      timelineEvents: [],
      keyFigures: [],
      culturalInsights: "",
      geographicalNotes: "",
    };
  }
}

export interface WonderMoment {
  afterParagraph: number;
  question: string;
  options: { emoji: string; label: string }[];
  correctIndex: number;
}

export async function generatePauseAndWonder(
  storyTitle: string,
  storyText: string,
  ageGroup: string
): Promise<WonderMoment[]> {
  const openai = createOpenAIClient();

  const paragraphs = storyText.split(/\n\n+/).filter((p) => p.trim());
  const momentCount = Math.max(1, Math.floor(paragraphs.length / 3));
  const momentPositions = Array.from({ length: momentCount }, (_, i) => (i + 1) * 3 - 1);
  const validPositions = momentPositions.filter((p) => p < paragraphs.length);

  if (validPositions.length === 0 && paragraphs.length > 0) {
    validPositions.push(Math.min(2, paragraphs.length - 1));
  }

  const excerpts = validPositions.map((pos) => {
    const start = Math.max(0, pos - 2);
    return {
      position: pos,
      text: paragraphs.slice(start, pos + 1).join("\n\n"),
    };
  });

  const ageHint =
    ageGroup === "little_lambs"
      ? "ages 4-7, use very simple words and short sentences"
      : ageGroup === "young_disciples"
        ? "ages 8-12, moderately simple language"
        : "ages 13-17, can handle deeper reflection";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: withSdaLens(`You are creating interactive "Pause & Wonder" moments for a children's Bible story called "${storyTitle}". The audience is ${ageHint}.

For each excerpt I provide, generate ONE imaginative question that invites the child to pause and think about the story. The question should spark curiosity and wonder (e.g., "How do you think Noah felt when the first raindrop hit?" or "What would YOU have done if you were David?").

Each question gets exactly 3 emoji-based multiple-choice answers. One answer should be clearly the most thoughtful/correct, but all options should be kind and positive (no wrong answers that shame). Use a single relevant emoji for each option.

Respond in JSON array format:
[
  {
    "afterParagraph": <paragraph_index>,
    "question": "The wonder question",
    "options": [
      { "emoji": "emoji1", "label": "Short answer text" },
      { "emoji": "emoji2", "label": "Short answer text" },
      { "emoji": "emoji3", "label": "Short answer text" }
    ],
    "correctIndex": <0|1|2>
  }
]

Keep answer labels under 6 words. Make questions warm and inviting, never quizzy.`),
      },
      {
        role: "user",
        content: excerpts
          .map((e) => `--- After paragraph ${e.position} ---\n${e.text}`)
          .join("\n\n"),
      },
    ],
    max_tokens: 600,
  });

  try {
    const raw = completion.choices[0]?.message?.content || "[]";
    const cleaned = cleanJsonResponse(raw);
    return JSON.parse(cleaned);
  } catch {
    return validPositions.map((pos) => ({
      afterParagraph: pos,
      question: "What do you think happens next in this story?",
      options: [
        { emoji: "🤔", label: "Something surprising!" },
        { emoji: "😊", label: "Something wonderful!" },
        { emoji: "🙏", label: "God helps them!" },
      ],
      correctIndex: 2,
    }));
  }
}

export interface DinnerTableTopicData {
  notificationText: string;
  dinnerQuestion: string;
  followUpQuestions: string[];
}

export async function generateDinnerTableTopic(params: {
  childName: string;
  storyTitle: string;
  scriptureRef: string | null;
  quizScore: number;
}): Promise<DinnerTableTopicData> {
  const { childName, storyTitle, scriptureRef, quizScore } = params;
  const openai = createOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: withSdaLens(`You are a family faith coach helping parents connect with their children about Bible stories. A child just finished a quiz on a Bible story. Generate a push notification message and dinner-table conversation prompts.

The notification should be warm, celebratory, and specific to the story. The dinner question should be open-ended, connecting the story's theme to the child's everyday life (school, friends, family). Follow-up questions should go deeper into application.

Respond in JSON:
{
  "notificationText": "A short push notification (under 120 chars) celebrating the child and teasing a question. Example: '[Name] just learned about David & Goliath! Ask them: How can God help you be brave at school tomorrow?'",
  "dinnerQuestion": "A warm, open-ended question a parent can ask at the dinner table that connects the Bible story to the child's real life. Make it specific to the story's theme.",
  "followUpQuestions": [
    "A follow-up that goes deeper into the story's lesson",
    "A follow-up that connects to family values",
    "A creative follow-up that sparks imagination"
  ]
}`),
      },
      {
        role: "user",
        content: `Child's name: ${childName}
Story completed: "${storyTitle}" ${scriptureRef ? `(${scriptureRef})` : ""}
Quiz score: ${quizScore}%

Generate the notification and dinner table conversation prompts.`,
      },
    ],
    temperature: 0.8,
    max_tokens: 400,
  });

  try {
    const raw = completion.choices[0]?.message?.content || "{}";
    const cleaned = cleanJsonResponse(raw);
    return JSON.parse(cleaned);
  } catch {
    return {
      notificationText: `${childName} just finished a Bible story quiz! Ask them what they learned tonight at dinner.`,
      dinnerQuestion: `${childName}, tell me about the story of ${storyTitle} - what was the most surprising part?`,
      followUpQuestions: [
        "What character in the story would you most want to be like?",
        "How does that story remind you of something in our family?",
        "If you could ask God one question about that story, what would it be?",
      ],
    };
  }
}

export async function generateConversationStarter(
  childName: string,
  completedStories: { title: string; scriptureRef: string | null }[]
): Promise<{ conversationStarter: string; discussion: string[] }> {
  const openai = createOpenAIClient();

  const storyList = completedStories
    .slice(-5)
    .map((s) => `"${s.title}" (${s.scriptureRef || "Bible story"})`)
    .join(", ");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: withSdaLens(`You are a warm, encouraging family faith guide. A parent wants to talk with their child about Bible stories the child has been learning. Generate a natural conversation starter and follow-up discussion questions.

The child's name is "${childName}". They recently completed these stories: ${storyList || "no stories yet"}.

Respond in JSON:
{
  "conversationStarter": "A warm, natural sentence the parent can say to start a faith conversation at dinner or bedtime. Reference a specific story the child learned. Keep it age-appropriate and inviting, not quizzy.",
  "discussion": [
    "Follow-up question 1 — open-ended, connecting the story to the child's life",
    "Follow-up question 2 — exploring the story's theme or moral",
    "Follow-up question 3 — encouraging the child to share what they found interesting"
  ]
}
If no stories are completed, create a general faith conversation starter encouraging the child to explore Bible stories together with the parent.`),
      },
    ],
    max_tokens: 400,
  });

  try {
    const raw = completion.choices[0]?.message?.content || "{}";
    const cleaned = cleanJsonResponse(raw);
    return JSON.parse(cleaned);
  } catch {
    return {
      conversationStarter: `Ask ${childName} what their favorite Bible story is and why it matters to them.`,
      discussion: [
        "What part of the story surprised you the most?",
        "How do you think that story connects to our family?",
        "Is there a character in the story you'd want to be like?",
      ],
    };
  }
}

export type SceneMood = "AWE" | "PEACE" | "TENSION" | "JOY";

export interface StoryScene {
  sceneIndex: number;
  narration: string;
  illustrationPrompt: string;
  mood: SceneMood;
  pauseAndWonder: {
    question: string;
    options: { emoji: string; label: string }[];
    correctIndex: number;
  } | null;
}

export async function generateStoryScenes(
  storyTitle: string,
  storyText: string,
  scriptureRef: string | null,
  ageGroup: string
): Promise<StoryScene[]> {
  const openai = createOpenAIClient();

  const ageLabel =
    ageGroup === "little_lambs"
      ? "ages 4-7, use very simple words and short sentences"
      : ageGroup === "young_disciples"
      ? "ages 8-12, moderate vocabulary and engaging storytelling"
      : "ages 13-17, deeper narrative with reflection";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: withSdaLens(`You are a master children's Bible storyteller creating an interactive, scene-by-scene storybook. Your task is to break a Bible story into 5-7 vivid scenes that children can flip through like pages of a picture book.

Target audience: ${ageLabel}.

For each scene, create:
1. "narration": Engaging, age-appropriate retelling of that part of the story (3-5 sentences). Use vivid sensory details, dialogue, and emotion. Make it feel alive and warm.
2. "illustrationPrompt": A detailed art description for this scene in a consistent style: "Soft watercolor, 2D animation style, warm earth tones, biblically inspired. [Scene-specific description with characters, setting, lighting, mood]." Be specific about what is depicted.
3. "mood": Assign exactly one emotional mood from these four: "AWE" (wonder, miracles, divine moments), "PEACE" (calm, gentle, reassuring scenes), "TENSION" (danger, storms, conflict, suspense), "JOY" (celebration, praise, happy resolution). Choose the mood that best matches the emotional tone of the narrative in that specific scene. Vary moods across scenes to create an emotional arc.
4. "pauseAndWonder": For 2-3 scenes (not all), include a Socratic question that makes children think about the story's meaning. Include 3 emoji-based answer options where one is the best answer. Set "correctIndex" to the best answer (0-based). For scenes without a question, set this to null.

Respond in JSON:
{
  "scenes": [
    {
      "sceneIndex": 0,
      "narration": "...",
      "illustrationPrompt": "Soft watercolor, 2D animation style, warm earth tones, biblically inspired. ...",
      "mood": "PEACE",
      "pauseAndWonder": null
    },
    {
      "sceneIndex": 1,
      "narration": "...",
      "illustrationPrompt": "...",
      "mood": "TENSION",
      "pauseAndWonder": {
        "question": "How do you think [character] felt when...?",
        "options": [
          { "emoji": "...", "label": "..." },
          { "emoji": "...", "label": "..." },
          { "emoji": "...", "label": "..." }
        ],
        "correctIndex": 0
      }
    }
  ]
}`),
      },
      {
        role: "user",
        content: `Story: "${storyTitle}"
Scripture: ${scriptureRef || "Unknown"}
Original text to break into scenes:

${storyText}`,
      },
    ],
    max_tokens: 3000,
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const cleaned = cleanJsonResponse(raw);
  const parsed = JSON.parse(cleaned);
  const validMoods: SceneMood[] = ["AWE", "PEACE", "TENSION", "JOY"];
  const scenes: StoryScene[] = (parsed.scenes || []).map(
    (s: any, i: number) => ({
      sceneIndex: s.sceneIndex ?? i,
      narration: s.narration || "",
      illustrationPrompt: s.illustrationPrompt || "",
      mood: (validMoods.includes(s.mood) ? s.mood : "PEACE") as SceneMood,
      pauseAndWonder: s.pauseAndWonder || null,
    })
  );

  if (scenes.length === 0) {
    throw new Error("AI returned no scenes");
  }

  return scenes;
}

export async function generateSceneImage(
  illustrationPrompt: string,
  sceneId: string
): Promise<string | null> {
  try {
    const { db } = await import("../db");
    const { kidsStoryScenes } = await import("../../shared/schema");
    const { eq } = await import("drizzle-orm");

    const [scene] = await db
      .select({ imageUrl: kidsStoryScenes.imageUrl })
      .from(kidsStoryScenes)
      .where(eq(kidsStoryScenes.id, sceneId))
      .limit(1);

    if (scene?.imageUrl) {
      if (scene.imageUrl.startsWith("data:image")) {
        return scene.imageUrl;
      }
    }

    const client = createOpenAIClient();
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt: illustrationPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const generatedUrl = response.data?.[0]?.url ?? null;

    if (generatedUrl) {
      try {
        const imgResponse = await fetch(generatedUrl);
        const arrayBuffer = await imgResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");
        const contentType = imgResponse.headers.get("content-type") || "image/png";
        const dataUrl = `data:${contentType};base64,${base64}`;

        await db
          .update(kidsStoryScenes)
          .set({ imageUrl: dataUrl })
          .where(eq(kidsStoryScenes.id, sceneId));

        return dataUrl;
      } catch (fetchErr) {
        console.error("Failed to fetch/convert DALL-E image to base64:", fetchErr);
        await db
          .update(kidsStoryScenes)
          .set({ imageUrl: generatedUrl })
          .where(eq(kidsStoryScenes.id, sceneId));
        return generatedUrl;
      }
    }

    return fallbackLocalImage(sceneId);
  } catch (err) {
    console.error("Scene image generation error:", err);
    return fallbackLocalImage(sceneId);
  }
}

async function fallbackLocalImage(sceneId: string): Promise<string | null> {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(process.cwd(), "assets", "kids-scenes", `${sceneId}.png`);
    if (fs.existsSync(filePath)) {
      return `/assets/kids-scenes/${sceneId}.png`;
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateScripturalEncouragement(
  prayerTitle: string,
  prayerContent: string,
  languageCode: string = "en"
): Promise<{ verse: string; note: string }> {
  const LANGUAGE_NAMES: Record<string, string> = {
    en: "English", es: "Spanish", fr: "French", pt: "Portuguese", fil: "Filipino", zh: "Chinese",
  };
  const TRANSLATION_DEFAULTS: Record<string, string> = {
    en: "KJV", es: "RV1909", fr: "LSG", pt: "ARC", fil: "TAGV",
  };
  const baseLang = languageCode.split("-")[0];
  const langName = LANGUAGE_NAMES[baseLang] || "English";
  const translationName = TRANSLATION_DEFAULTS[baseLang] || "KJV";
  const languageInstruction = baseLang !== "en"
    ? `Always respond entirely in ${langName}. Use the ${translationName} Bible translation for verse text.`
    : `Use the KJV Bible translation for verse text.`;

  const client = createOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: withSdaLens(`You are a compassionate biblical counselor. ${languageInstruction} Given a prayer request, respond with a single relevant Bible verse and a 1-sentence comfort note. Return valid JSON: {"verse": "Book Chapter:Verse - 'The verse text...'", "note": "A warm, compassionate 1-sentence encouragement connecting the verse to their situation."}`),
      },
      {
        role: "user",
        content: `Prayer request: "${prayerTitle}"\n${prayerContent ? `Details: "${prayerContent}"` : ""}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  const raw = completion.choices[0]?.message?.content || "";
  const cleaned = cleanJsonResponse(raw);
  const parsed = JSON.parse(cleaned);
  return {
    verse: parsed.verse || "Philippians 4:6 - 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.'",
    note: parsed.note || "God hears every prayer and holds you close.",
  };
}

export async function generateReflectionResponse(params: {
  question: string;
  userAnswer: string;
  passageLabel?: string;
  dayTitle?: string;
  previousExchanges?: { question: string; answer: string; response: string }[];
}): Promise<{ response: string; followUp: string | null }> {
  const { question, userAnswer, passageLabel, dayTitle, previousExchanges } = params;

  const openai = createOpenAIClient();

  let contextBlock = "";
  if (passageLabel) contextBlock += `Scripture passage: ${passageLabel}\n`;
  if (dayTitle) contextBlock += `Study topic: ${dayTitle}\n`;

  let historyBlock = "";
  if (previousExchanges && previousExchanges.length > 0) {
    historyBlock = "\nPrevious discussion:\n" + previousExchanges.map((ex) =>
      `Q: ${ex.question}\nTheir answer: ${ex.answer}\nYour response: ${ex.response}`
    ).join("\n\n") + "\n";
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.8,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: withSdaLens(`You are a warm, encouraging Bible study discussion partner. You engage thoughtfully with the student's reflection answers, affirming genuine insights while gently deepening understanding.

Your response style:
- Start by acknowledging what the student shared (1 sentence)
- Add a brief theological insight or scripture connection that builds on their answer (2-3 sentences)
- If their answer is shallow, lovingly guide them deeper without being preachy
- Keep responses conversational and warm, not academic
- Use KJV language when quoting scripture
- Maximum 4 sentences total for your response

Also provide ONE brief follow-up question that goes deeper into what they shared. The follow-up should feel natural, not like a quiz. If no natural follow-up exists, return null.`),
      },
      {
        role: "user",
        content: `${contextBlock}${historyBlock}
Reflection question: "${question}"
Student's answer: "${userAnswer}"

Respond with JSON: {"response": "your thoughtful reply", "followUp": "optional follow-up question or null"}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "";
  const cleaned = cleanJsonResponse(raw);
  try {
    const parsed = JSON.parse(cleaned);
    return {
      response: parsed.response || "That's a thoughtful reflection. Keep digging deeper into God's Word.",
      followUp: parsed.followUp || null,
    };
  } catch {
    return {
      response: raw.length > 10 ? raw.slice(0, 300) : "Thank you for sharing your reflection. God's Word speaks to each of us in unique ways.",
      followUp: null,
    };
  }
}

/**
 * A single AI-suggested semantic search candidate.
 *
 * The AI selects WHICH passage is relevant (reference + relevance rationale)
 * but NEVER supplies Scripture wording. The server re-resolves the exact
 * canonical text for the requested translation via resolveReference. There is
 * intentionally no `text` field here — any AI-produced text must never be shown.
 */
export interface SemanticSearchCandidate {
  reference: string;
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  relevance: string;
}

export async function generateSemanticSearch(
  query: string,
  translation: string,
): Promise<SemanticSearchCandidate[]> {
  const openai = createOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: withSdaLens(`You are a Seventh-day Adventist Bible search engine. Given a natural language query, identify the most relevant Bible passages. Return 8-12 results ranked by relevance.

The reader is using the ${translation} translation. Do NOT quote, paraphrase, or reproduce any Scripture wording. Only identify WHICH passage is relevant. The application resolves the exact ${translation} text itself; any verse text you produce would be discarded.

You serve Adventist believers, so when interpreting queries:
- Prioritize passages that align with SDA doctrinal understanding (e.g., for "what happens when we die," include passages supporting soul sleep like Ecclesiastes 9:5, Psalms 115:17, John 11:11-14)
- For topics related to the Sabbath, use passages supporting the seventh-day Sabbath
- For topics about the Second Coming, emphasize its literal, visible nature
- Include prophetic passages from Daniel and Revelation when relevant to the query
- Never select passages in a way that supports Sunday sacredness, eternal hellfire, or the immortal soul doctrine

Return valid JSON only, no markdown. Do NOT include verse text of any kind:
[
  {
    "reference": "John 3:16",
    "bookId": 43,
    "chapter": 3,
    "verseStart": 16,
    "verseEnd": null,
    "relevance": "Brief explanation of why this passage is relevant"
  }
]

Book IDs: Genesis=1, Exodus=2, Leviticus=3, Numbers=4, Deuteronomy=5, Joshua=6, Judges=7, Ruth=8, 1Samuel=9, 2Samuel=10, 1Kings=11, 2Kings=12, 1Chronicles=13, 2Chronicles=14, Ezra=15, Nehemiah=16, Esther=17, Job=18, Psalms=19, Proverbs=20, Ecclesiastes=21, SongOfSolomon=22, Isaiah=23, Jeremiah=24, Lamentations=25, Ezekiel=26, Daniel=27, Hosea=28, Joel=29, Amos=30, Obadiah=31, Jonah=32, Micah=33, Nahum=34, Habakkuk=35, Zephaniah=36, Haggai=37, Zechariah=38, Malachi=39, Matthew=40, Mark=41, Luke=42, John=43, Acts=44, Romans=45, 1Corinthians=46, 2Corinthians=47, Galatians=48, Ephesians=49, Philippians=50, Colossians=51, 1Thessalonians=52, 2Thessalonians=53, 1Timothy=54, 2Timothy=55, Titus=56, Philemon=57, Hebrews=58, James=59, 1Peter=60, 2Peter=61, 1John=62, 2John=63, 3John=64, Jude=65, Revelation=66

Include a mix of well-known and lesser-known passages. Return references only — never Scripture text.`),
      },
      {
        role: "user",
        content: query,
      },
    ],
    temperature: 0.5,
    max_tokens: 2000,
  });

  const raw = completion.choices[0]?.message?.content ?? "[]";
  const cleaned = cleanJsonResponse(raw);
  let parsed: any[];
  try {
    parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) parsed = [parsed];
  } catch {
    console.error("Failed to parse semantic search AI response:", raw.substring(0, 500));
    throw new Error("Failed to parse AI response");
  }

  // Never carry AI-produced verse text: only reference + relevance survive.
  return parsed.map((r: any) => ({
    reference: r.reference || "",
    bookId: r.bookId || 1,
    chapter: r.chapter || 1,
    verseStart: r.verseStart || 1,
    verseEnd: r.verseEnd || null,
    relevance: r.relevance || "",
  }));
}

export interface GeneratedPlanDay {
  dayNumber: number;
  title: string;
  passageLabel: string;
  bookName: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  contextNote: string;
  devotionalThought: string;
  reflectionQuestions: string[];
  prayerPrompt: string;
  thenContext: string;
  nowApplication: string;
}

export interface GeneratedPlan {
  title: string;
  description: string;
  theme: string;
  targetGoals: string[];
  estimatedMinutesPerDay: number;
  days: GeneratedPlanDay[];
}

const BOOK_NAME_TO_ID: Record<string, number> = {
  "Genesis": 1, "Exodus": 2, "Leviticus": 3, "Numbers": 4, "Deuteronomy": 5,
  "Joshua": 6, "Judges": 7, "Ruth": 8, "1 Samuel": 9, "2 Samuel": 10,
  "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14,
  "Ezra": 15, "Nehemiah": 16, "Esther": 17, "Job": 18, "Psalms": 19,
  "Proverbs": 20, "Ecclesiastes": 21, "Song of Solomon": 22, "Isaiah": 23,
  "Jeremiah": 24, "Lamentations": 25, "Ezekiel": 26, "Daniel": 27,
  "Hosea": 28, "Joel": 29, "Amos": 30, "Obadiah": 31, "Jonah": 32,
  "Micah": 33, "Nahum": 34, "Habakkuk": 35, "Zephaniah": 36, "Haggai": 37,
  "Zechariah": 38, "Malachi": 39, "Matthew": 40, "Mark": 41, "Luke": 42,
  "John": 43, "Acts": 44, "Romans": 45, "1 Corinthians": 46,
  "2 Corinthians": 47, "Galatians": 48, "Ephesians": 49, "Philippians": 50,
  "Colossians": 51, "1 Thessalonians": 52, "2 Thessalonians": 53,
  "1 Timothy": 54, "2 Timothy": 55, "Titus": 56, "Philemon": 57,
  "Hebrews": 58, "James": 59, "1 Peter": 60, "2 Peter": 61,
  "1 John": 62, "2 John": 63, "3 John": 64, "Jude": 65, "Revelation": 66,
};

export function resolveBookId(bookName: string): number | null {
  if (BOOK_NAME_TO_ID[bookName]) return BOOK_NAME_TO_ID[bookName];
  const lower = bookName.toLowerCase();
  for (const [key, val] of Object.entries(BOOK_NAME_TO_ID)) {
    if (key.toLowerCase() === lower) return val;
  }
  return null;
}

export async function generateReadingPlan(params: {
  topic: string;
  durationDays: number;
  difficulty: string;
}): Promise<GeneratedPlan> {
  const { topic, durationDays, difficulty } = params;
  const openai = createOpenAIClient();

  const difficultyGuide =
    difficulty === "beginner"
      ? "Choose well-known, accessible passages. Keep reflections simple and practical."
      : difficulty === "advanced"
        ? "Include deeper theological passages, Old and New Testament connections, and challenging reflections."
        : "Balance accessible and moderately challenging passages with thoughtful reflections.";

  const clampedDays = Math.max(3, Math.min(14, durationDays));

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: withSdaLens(`You are a Seventh-day Adventist Bible study curriculum designer with deep knowledge of SDA theology, the 28 Fundamental Beliefs, the three angels' messages, the sanctuary doctrine, the Sabbath, the state of the dead, the investigative judgment, healthful living, and the writings of Ellen G. White.

Create personalized reading plans that guide Adventist believers through Scripture on a specific topic. ALL content MUST align with official Seventh-day Adventist doctrinal positions:

DOCTRINAL GUARDRAILS:
- The seventh-day Sabbath (Saturday) is God's holy day of rest, established at Creation and binding today
- The dead are unconscious until the resurrection (soul sleep) — no immortal soul doctrine
- The Second Coming of Christ is literal, visible, and imminent
- The heavenly sanctuary and investigative judgment beginning in 1844 are central to the plan of salvation
- The three angels' messages of Revelation 14 are the Adventist mission mandate
- The law of God (Ten Commandments) is eternal and reflects God's character
- Salvation is by grace through faith in Jesus Christ alone, demonstrated through obedience
- The gift of prophecy was manifested in the ministry of Ellen G. White
- The body is the temple of the Holy Spirit — healthful living principles matter
- The Great Controversy between Christ and Satan is the overarching biblical narrative

IMPORTANT RESTRICTIONS:
- NEVER promote Sunday sacredness, eternal hellfire/torment, or the immortality of the soul
- NEVER suggest practices contrary to SDA health principles (alcohol, unclean foods, tobacco)
- NEVER frame the law and grace as opposed — they work together
- When relevant, include passages that support distinctive SDA doctrines
- Reflection questions should encourage deeper understanding of present truth
- Prayer prompts should reflect Adventist devotional life (preparation for Christ's return, sanctification, service)
- "nowApplication" sections should connect to Adventist mission and end-time living where appropriate

CONTENT INTEGRITY GUARDRAILS:
- Prioritize Scripture above all — every day must be anchored in a specific Bible passage
- Avoid speculative theology — do not present uncertain interpretations as settled doctrine
- Never fabricate quotes from Ellen G. White, church pioneers, or any other source
- Remain respectful of historic Christian teaching even when presenting distinctive Adventist positions
- Align with Adventist interpretation for prophecy, sanctuary, and eschatological themes
- Keep devotional thoughts grounded in what the text actually says — no eisegesis

REQUIRED FIELDS FOR EACH DAY:
Every day MUST include ALL of these five elements:
1. Day Title — a clear, engaging title capturing the day's theme
2. Primary Scripture — a specific Bible passage (book, chapter, verses)
3. Short devotional thought — a concise devotional reflection (120 words maximum) connecting the passage to the topic
4. Reflection question — at least one thoughtful question for personal meditation
5. Prayer prompt — a specific prayer prompt responding to the passage

${difficultyGuide}

Return valid JSON only, no markdown. Use KJV book names exactly as they appear in the Bible (e.g., "Genesis", "1 Corinthians", "Psalms").`),
      },
      {
        role: "user",
        content: `Create a ${clampedDays}-day Bible reading plan on the topic: "${topic}"
Difficulty level: ${difficulty}

This plan is for Seventh-day Adventist believers. Ensure all content aligns with SDA theology and the 28 Fundamental Beliefs.

Return JSON:
{
  "title": "An engaging title for this reading plan",
  "description": "2-3 sentence description of what this plan covers and who it's for (mention Adventist perspective where relevant)",
  "theme": "One-word or short-phrase theme",
  "targetGoals": ["Goal 1 the reader will achieve", "Goal 2", "Goal 3"],
  "estimatedMinutesPerDay": 10,
  "days": [
    {
      "dayNumber": 1,
      "title": "Day title capturing the theme",
      "passageLabel": "Book Chapter:VerseStart-VerseEnd",
      "bookName": "Exact KJV book name",
      "chapter": 1,
      "verseStart": 1,
      "verseEnd": 10,
      "contextNote": "1-2 sentences setting context for this passage from an Adventist perspective",
      "devotionalThought": "A short devotional reflection (120 words max) connecting the passage to the topic. Must be grounded in what the text says. No fabricated quotes.",
      "reflectionQuestions": ["Question 1", "Question 2", "Question 3"],
      "prayerPrompt": "A prayer prompt responding to this passage, reflecting Adventist devotional life",
      "thenContext": "What this passage meant to the original audience (2-3 sentences)",
      "nowApplication": "How this applies to Adventist believers today, connecting to present truth and end-time living where appropriate (2-3 sentences)"
    }
  ]
}

Generate exactly ${clampedDays} days. Each day should have a different passage. Vary between Old and New Testament where appropriate. Make passages focused (typically 5-15 verses, not full chapters). Include passages that illuminate distinctive Adventist doctrines when they connect naturally to the topic.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const cleaned = cleanJsonResponse(raw);
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse reading plan AI response:", raw.substring(0, 500));
    throw new Error("Failed to generate reading plan. Please try again.");
  }

  return {
    title: parsed.title || `${topic} Reading Plan`,
    description: parsed.description || `A ${durationDays}-day plan exploring ${topic}.`,
    theme: parsed.theme || topic,
    targetGoals: Array.isArray(parsed.targetGoals) ? parsed.targetGoals : [],
    estimatedMinutesPerDay: parsed.estimatedMinutesPerDay || 10,
    days: Array.isArray(parsed.days)
      ? parsed.days.map((d: any, i: number) => ({
          dayNumber: d.dayNumber || i + 1,
          title: d.title || `Day ${i + 1}`,
          passageLabel: d.passageLabel || "",
          bookName: d.bookName || "",
          chapter: d.chapter || 1,
          verseStart: d.verseStart || null,
          verseEnd: d.verseEnd || null,
          contextNote: d.contextNote || "",
          devotionalThought: d.devotionalThought || "",
          reflectionQuestions: Array.isArray(d.reflectionQuestions) ? d.reflectionQuestions : [],
          prayerPrompt: d.prayerPrompt || "",
          thenContext: d.thenContext || "",
          nowApplication: d.nowApplication || "",
        }))
      : [],
  };
}

export interface QuickInsightData {
  keyVerse: string;
  insight: string;
  actionStep: string;
}

export async function generateQuickInsight(params: {
  passage: string;
  theme?: string;
}): Promise<QuickInsightData> {
  const { passage, theme } = params;
  const openai = createOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: withSdaLens(`You are a concise, warm Bible teacher. Generate a quick 5-minute devotional insight from a Bible passage. Return valid JSON only, no markdown. Be practical and encouraging.`),
      },
      {
        role: "user",
        content: `Generate a quick insight for the passage: ${passage}${theme ? ` (Theme: ${theme})` : ""}.

Return JSON:
{
  "keyVerse": "The single most impactful verse reference from this passage (e.g., 'John 3:16')",
  "insight": "A clear, meaningful insight in 2-3 sentences that captures the heart of this passage and connects it to daily life",
  "actionStep": "One specific, practical action the reader can take today based on this passage (1-2 sentences)"
}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 400,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const cleaned = cleanJsonResponse(raw);
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse quick insight AI response:", raw.substring(0, 500));
    throw new Error("Failed to parse AI response");
  }

  return {
    keyVerse: parsed.keyVerse || passage,
    insight: parsed.insight || "",
    actionStep: parsed.actionStep || "",
  };
}

/**
 * Generate a short commentary explanation of a passage.
 *
 * Translation safety:
 * - The caller passes the EXACT canonical passage text plus the selected
 *   translation name (resolved server-side, never trusted from the client).
 * - The output is COMMENTARY ONLY. The AI must not quote, paraphrase, or embed
 *   Scripture text — the client already has the canonical verse text. This
 *   avoids emitting AI-produced (mislabeled) Scripture.
 */
export async function generateVerseExplanation(params: {
  reference: string;
  verseText: string;
  translation: string;
  lessonContext?: string;
}): Promise<string> {
  const { reference, verseText, translation, lessonContext } = params;
  const openai = createOpenAIClient();

  const systemPrompt = `You are a Seventh-day Adventist biblical scholar providing clear, faithful COMMENTARY on Scripture passages (from the ${translation} translation). Your explanations must:

1. Be SHORT (3-5 sentences maximum). Do not write essays.
2. Be grounded in the biblical text itself — explain what the passage says and means in context.
3. Reflect Adventist theological understanding where relevant (sanctuary, Sabbath, state of the dead, Great Controversy, second coming, health message, etc.) but only when the passage naturally touches those themes. Do not force Adventist distinctives into every answer.
4. Use clear, lay-friendly language. No academic jargon.
5. Be reverent and measured in tone — not sensational, not polemical, not devotional fluff.
6. You MAY name other Scripture references (e.g. "compare Romans 5") but keep them to 1-2 at most.
7. Never quote or embed Ellen G. White text. You may mention that Adventist thought on a topic can be explored further, but never present EGW as equal to Scripture.
8. Never speculate beyond what the text says. If a passage is debated, present the Adventist reading calmly without attacking other positions.
9. Do not use emoji, markdown formatting, bullet points, or numbered lists. Write in flowing prose.
10. CRITICAL: NEVER quote, paraphrase, or reproduce the Scripture text itself. The reader already sees the verse. Produce COMMENTARY only — describe meaning and context without echoing the wording of this or any other verse.`;

  const contextLine = lessonContext
    ? `\n\nThis explanation is being requested within a lesson about: ${lessonContext}`
    : "";

  const userPrompt = `Provide commentary on ${reference} (${translation}). The exact canonical text has already been resolved server-side and is provided here only for your analysis — do not echo or quote it back:

"""${verseText}"""${contextLine}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: withSdaLens(systemPrompt) },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 300,
    temperature: 0.4,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "";
  return raw || "Unable to generate an explanation at this time. Please try again.";
}

export interface GCExplorationData {
  narrativeExplanation: string;
  connections: { before: string; after: string };
  reflectionQuestion: string;
}

export async function generateGCExploration(params: {
  nodeId: string;
  title: string;
  aiPromptContext: string;
  prevNodeTitle: string | null;
  nextNodeTitle: string | null;
}): Promise<GCExplorationData> {
  const { title, aiPromptContext, prevNodeTitle, nextNodeTitle } = params;
  const openai = createOpenAIClient();

  const connectionHint = [
    prevNodeTitle ? `The previous event in the timeline is: "${prevNodeTitle}".` : "This is the first event in the timeline.",
    nextNodeTitle ? `The next event in the timeline is: "${nextNodeTitle}".` : "This is the final event in the timeline.",
  ].join(" ");

  const systemPrompt = `You are a Seventh-day Adventist biblical scholar and storyteller guiding readers through the Great Controversy narrative — the cosmic conflict between Christ and Satan that spans all of history. Your content must:

1. Be grounded in Scripture and consistent with Adventist theology (sanctuary doctrine, Sabbath, state of the dead, investigative judgment, three angels' messages, second coming, conditional immortality).
2. Present the narrative in an engaging, accessible style — not academic or dry, but reverent and compelling.
3. Show how each event fits into the larger cosmic conflict and God's plan to vindicate His character.
4. Never quote or embed Ellen G. White text directly. You may allude to Great Controversy themes she articulated, but present them as biblical truths, not as her personal views.
5. Never use emoji, markdown formatting, bullet points, or numbered lists. Write in flowing prose.
6. Be warm and faith-building, helping the reader see God's love and justice throughout the narrative.

Return valid JSON only, no markdown code fences.`;

  const userPrompt = `Generate a Great Controversy narrative exploration for the event: "${title}"

Doctrinal context: ${aiPromptContext}

${connectionHint}

Return JSON:
{
  "narrativeExplanation": "A 3-4 paragraph narrative explanation of how this event fits in the cosmic conflict between Christ and Satan. Show why it matters in the Great Controversy framework and what it reveals about God's character.",
  "connections": {
    "before": "1-2 sentences explaining how this event connects to what came before it in the Great Controversy timeline.",
    "after": "1-2 sentences explaining how this event sets the stage for what comes next in the timeline."
  },
  "reflectionQuestion": "A thoughtful personal reflection question that helps the reader apply this part of the Great Controversy narrative to their own spiritual journey today."
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: withSdaLens(systemPrompt) },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 1200,
    temperature: 0.7,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const cleaned = cleanJsonResponse(raw);
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse GC exploration AI response:", raw.substring(0, 500));
    throw new Error("Failed to parse AI response");
  }

  return {
    narrativeExplanation: parsed.narrativeExplanation || "",
    connections: {
      before: parsed.connections?.before || "",
      after: parsed.connections?.after || "",
    },
    reflectionQuestion: parsed.reflectionQuestion || "",
  };
}

export async function generateDiscussionPrep(params: {
  lessonTitle: string;
  daysContent: string;
  depth?: StudyDepth;
}): Promise<{
  keyQuestions: string[];
  aiSummary: string;
  reflectionPrompts: string[];
}> {
  const { lessonTitle, daysContent, depth = "standard" } = params;
  const openai = createOpenAIClient();

  const questionCount = depth === "quick" ? 3 : depth === "deep" ? 8 : 5;
  const promptCount = depth === "quick" ? 1 : depth === "deep" ? 3 : 2;

  const depthExtra =
    depth === "deep"
      ? " Include connections to Ellen G. White writings (cite specific book and page references). Add Greek/Hebrew word insights where relevant. Reference connections to the 28 Fundamental Beliefs where applicable."
      : "";

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: getDepthMaxTokens(depth, 1200),
    messages: [
      {
        role: "system",
        content: withSdaLens(`You are a Seventh-day Adventist Sabbath School discussion facilitator preparing a Lesson Discussion Guide. Generate content that is biblically grounded, theologically sound, and aligned with the 28 Fundamental Beliefs of the SDA Church. NEVER promote Sunday sacredness, eternal hellfire/torment, or the immortality of the soul. The Sabbath is the seventh day (Saturday). The dead are unconscious until the resurrection. Destruction of the wicked is final annihilation, not eternal torture.${depthExtra}

Return ONLY valid JSON in this format:
{
  "aiSummary": "The Big Idea — a ${depth === "quick" ? "concise 1-paragraph" : depth === "deep" ? "rich 3-4 paragraph" : "focused 2-paragraph"} summary capturing the core theme and why it matters for daily Adventist life.",
  "keyQuestions": ["question1", "question2", ...],
  "reflectionPrompts": ["prompt1", "prompt2", ...]
}

For keyQuestions: Write ${questionCount} open-ended discussion questions suitable for Sabbath School class, small group, or family worship. Each should invite personal reflection and practical application, not just factual recall.

For reflectionPrompts: Write ${promptCount} Life Application prompts for this specific lesson.

Rules:
- Each prompt must be directly tied to THIS lesson's theme - not generic faith advice
- Each prompt must be ONE specific, concrete action - not vague encouragement
- The action must be completable this week and reportable back to a Sabbath School class
- Use second person, present tense, conversational tone - not preachy
- Frame as an honest invitation from one believer to another
- At least one prompt must connect the lesson theme to a real modern life situation (work, relationships, social media, family, doubt, loneliness)
- End the final prompt with a question the person can bring to class on Sabbath`),
      },
      {
        role: "user",
        content: `Generate a Lesson Discussion Guide for this week's Sabbath School lesson.

Lesson Title: "${lessonTitle}"

Lesson Content (all daily readings):
${daysContent.substring(0, 6000)}

Produce:
1. Big Idea — the central theme and its significance
2. ${questionCount} discussion questions for class or small group use
3. ${promptCount} life application prompts for personal growth`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content || "";
  const cleaned = cleanJsonResponse(raw);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse discussion prep AI response:", raw.substring(0, 500));
    return {
      keyQuestions: ["What is the central theme of this week's lesson?"],
      aiSummary: "Discussion guide could not be generated at this time.",
      reflectionPrompts: ["How does this lesson apply to your daily life?"],
    };
  }

  return {
    keyQuestions: Array.isArray(parsed.keyQuestions) ? parsed.keyQuestions : [],
    aiSummary: parsed.aiSummary || "",
    reflectionPrompts: Array.isArray(parsed.reflectionPrompts) ? parsed.reflectionPrompts : [],
  };
}
