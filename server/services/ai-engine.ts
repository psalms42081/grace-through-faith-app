import OpenAI from "openai";

function createOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

function cleanJsonResponse(raw: string): string {
  return raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
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
  strongId: string;
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
}): Promise<WordStudyEntry[]> {
  const { verseText, bookName, chapter, verse } = params;

  const testament = NT_BOOKS.includes(bookName) ? "NT" : "OT";
  const lang = testament === "NT" ? "Greek" : "Hebrew";
  const langCode = testament === "NT" ? "gr" : "he";

  const openai = createOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a ${lang} Bible lexicographer. Analyze key words from Bible verses and provide Strong's Concordance-style data. Return valid JSON only, no markdown.`,
      },
      {
        role: "user",
        content: `Analyze ${bookName} ${chapter}:${verse} (KJV): "${verseText}"

Pick the 4-6 most theologically significant words. For each, return Strong's-style data. Return a JSON array:
[
  {
    "strongId": "${langCode === "he" ? "H" : "G"}XXXX",
    "originalWord": "the ${lang} word",
    "translatedWord": "the English word in KJV",
    "lemma": "dictionary form in ${lang} script",
    "transliteration": "romanized form",
    "pronunciation": "how to pronounce it",
    "definition": "concise definition (1-2 sentences)",
    "kjvUsage": "common KJV translations separated by commas"
  }
]

Use real Strong's numbers when you know them. If unsure, use a plausible number with the correct prefix (H for Hebrew, G for Greek).`,
      },
    ],
    temperature: 0.5,
    max_tokens: 1200,
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

  return parsed.map((w: any, i: number) => ({
    strongId: w.strongId || `${langCode === "he" ? "H" : "G"}${9000 + i}`,
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
}): Promise<ContextCardData> {
  const { chapter, bookName } = params;

  const openai = createOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a Bible scholar providing historical and cultural context for Scripture passages. Return valid JSON only, no markdown. Be scholarly, balanced, and respectful of all Christian traditions.`,
      },
      {
        role: "user",
        content: `Provide historical context for ${bookName} chapter ${chapter}. Return JSON with these fields:
{
  "title": "A descriptive title for this chapter's context",
  "content": "2-3 paragraph overview of what this chapter covers and its significance",
  "historicalBackground": "2-3 paragraphs on the historical setting, when/where events took place",
  "culturalNotes": "1-2 paragraphs on cultural practices, customs, or norms relevant to understanding this chapter",
  "authorInfo": "Brief note on the traditional author of this book",
  "dateWritten": "Approximate date or range when this book was written",
  "audience": "Who was the original audience for this text",
  "themes": ["theme1", "theme2", "theme3"]
}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1200,
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
}): Promise<ApplicationStudyData> {
  const { chapter, bookName } = params;

  const openai = createOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a pastoral Bible teacher skilled at bridging ancient Scripture to modern life. Return valid JSON only, no markdown. Be warm, practical, and applicable across all Christian traditions.`,
      },
      {
        role: "user",
        content: `Create a "Then & Now" application study for ${bookName} chapter ${chapter}. Return JSON:
{
  "thenContext": "2-3 paragraphs explaining what this passage meant to its original audience — their situation, challenges, and how they would have understood it",
  "nowApplication": "2-3 paragraphs on how this passage applies to believers today — practical, real-world applications for daily life",
  "reflectionQuestions": ["Question 1 for personal reflection", "Question 2", "Question 3", "Question 4"],
  "prayerPrompt": "A brief prayer prompt that helps the reader respond to this passage in prayer",
  "keyTheme": "One word or short phrase capturing the main theme"
}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
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

export async function generateStudyGuideStart(params: {
  verseReference: string;
  verseText: string;
}): Promise<string> {
  const { verseReference, verseText } = params;

  const systemPrompt = `You are a wise, patient seminary tutor guiding a student through the Inductive Bible Study Method. You NEVER give the answer directly. Instead, you ask probing questions that lead the student to discover truth themselves.

You guide through three phases:
1. OBSERVE - Help them see what the text actually says. Ask about: Who is speaking? Who is the audience? What action words are used? What is repeated? What contrasts exist? What seems surprising?
2. INTERPRET - Help them understand what it means. Ask about: Why did the author write this? What would the original audience understand? How does this connect to the broader biblical narrative? What theological truths emerge?
3. APPLY - Help them connect it to their life. Ask about: What does this reveal about God's character? How does this challenge your current thinking? What specific action could you take this week?

Rules:
- Ask ONE focused question at a time
- Affirm good observations warmly but briefly
- If the student is off-track, gently redirect without being condescending
- Use a warm, encouraging tone — like a mentor who believes in their student
- Keep responses concise (2-4 sentences max)
- You are starting in the OBSERVE phase now`;

  const userPrompt = `The student wants to study this verse:\n\n"${verseText}" — ${verseReference}\n\nBegin the OBSERVE phase. Ask your first observation question about this specific verse. Remember: ask ONE question only, be specific to this text.`;

  const client = createOpenAIClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 300,
  });

  return completion.choices[0]?.message?.content || "Let's begin by reading the verse carefully. What is the first thing you notice about this text?";
}

export async function generateStudyGuideResponse(params: {
  verseText: string;
  verseReference: string;
  chatMessages: { role: string; content: string }[];
  targetPhase: string;
  currentPhase: string;
}): Promise<string> {
  const { verseText, verseReference, chatMessages, targetPhase, currentPhase } = params;

  const phaseInstructions: Record<string, string> = {
    observe: "Continue in the OBSERVE phase. Ask another observation question about what they can see in the text. Affirm their previous answer briefly first.",
    interpret: targetPhase === "interpret" && currentPhase === "observe"
      ? "The student has made good observations. Now TRANSITION to the INTERPRET phase. Briefly affirm their work, then say something like 'Now let\\'s dig deeper into what this means...' and ask your first interpretation question."
      : "Continue in the INTERPRET phase. Ask about meaning, context, or theology. Affirm their answer briefly first.",
    apply: targetPhase === "apply" && currentPhase === "interpret"
      ? "The student has interpreted well. Now TRANSITION to the APPLY phase. Briefly affirm their insight, then say something like 'Now let\\'s bring this into your daily life...' and ask your first application question."
      : "Continue in the APPLY phase. Ask about personal application, specific actions, or life changes. Affirm their answer briefly first.",
    complete: "The student has completed all three phases. Give a warm, encouraging summary of what they discovered. Mention 1-2 key insights from their observations, interpretation, and application. End with a brief prayer prompt or blessing. Keep it to 3-4 sentences.",
  };

  const systemPrompt = `You are a wise seminary tutor using the Inductive Bible Study Method. The student is studying: "${verseText}" — ${verseReference}

${phaseInstructions[targetPhase] || phaseInstructions[currentPhase]}

Rules: Ask ONE question at a time. Be concise (2-4 sentences). Be warm and encouraging. Never give the answer directly.`;

  const formattedMessages = chatMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const client = createOpenAIClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...formattedMessages,
    ],
    max_tokens: 400,
  });

  return completion.choices[0]?.message?.content || "That's a thoughtful response. Let's continue exploring this passage.";
}

export interface VerseMapData {
  crossReferences: any[];
  contextSnippet: string;
}

export async function generateVerseMap(params: {
  verseText: string;
  verseReference: string;
}): Promise<VerseMapData> {
  const { verseText, verseReference } = params;

  const client = createOpenAIClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a Bible scholar providing cross-references and context for specific verses. Return valid JSON only, no markdown. Be scholarly and accurate.",
      },
      {
        role: "user",
        content: `For the verse "${verseText}" (${verseReference}), provide:
1. Cross-references: 8-10 related verses from across the Bible that illuminate this verse's meaning
2. A brief historical/cultural context snippet (2-3 sentences)

Return JSON:
{
  "crossReferences": [
    { "reference": "John 3:16", "text": "For God so loved...", "connection": "Both passages speak of God's redemptive love", "bookId": 43, "chapter": 3, "verse": 16 }
  ],
  "contextSnippet": "Brief historical and cultural context..."
}

Use KJV text for verse quotations. Book IDs: Genesis=1, Exodus=2, Leviticus=3, Numbers=4, Deuteronomy=5, Joshua=6, Judges=7, Ruth=8, 1Samuel=9, 2Samuel=10, 1Kings=11, 2Kings=12, 1Chronicles=13, 2Chronicles=14, Ezra=15, Nehemiah=16, Esther=17, Job=18, Psalms=19, Proverbs=20, Ecclesiastes=21, SongOfSolomon=22, Isaiah=23, Jeremiah=24, Lamentations=25, Ezekiel=26, Daniel=27, Hosea=28, Joel=29, Amos=30, Obadiah=31, Jonah=32, Micah=33, Nahum=34, Habakkuk=35, Zephaniah=36, Haggai=37, Zechariah=38, Malachi=39, Matthew=40, Mark=41, Luke=42, John=43, Acts=44, Romans=45, 1Corinthians=46, 2Corinthians=47, Galatians=48, Ephesians=49, Philippians=50, Colossians=51, 1Thessalonians=52, 2Thessalonians=53, 1Timothy=54, 2Timothy=55, Titus=56, Philemon=57, Hebrews=58, James=59, 1Peter=60, 2Peter=61, 1John=62, 2John=63, 3John=64, Jude=65, Revelation=66`,
      },
    ],
    max_tokens: 1500,
  });

  try {
    const raw = completion.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
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
        content: "You are a Bible scholar providing immersive contextual data for Bible chapters. Return valid JSON only, no markdown. Be historically accurate and engaging.",
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
