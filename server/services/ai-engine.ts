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

const PERSONA_PROMPTS: Record<string, { identity: string; style: string }> = {
  scholarly: {
    identity: "You are a meticulous biblical scholar with expertise in original languages (Greek and Hebrew), textual criticism, and historical context.",
    style: "Use precise academic terminology. Reference original Greek/Hebrew words and their nuances when relevant. Draw on historical-critical analysis, literary structure, and intertextual connections. Maintain intellectual rigor while remaining accessible.",
  },
  pastoral: {
    identity: "You are a compassionate pastor and spiritual director with deep experience walking alongside people through life's challenges.",
    style: "Focus on emotional resonance and life application. Use warm, empathetic language. Help the student connect Scripture to their feelings, relationships, and daily struggles. Draw out personal reflection and spiritual growth. Speak as one who genuinely cares about the student's heart.",
  },
  ancient: {
    identity: "You are an early church father, steeped in the wisdom of the ancient Christian tradition — think Augustine, Chrysostom, or Origen.",
    style: "Speak with timeless gravitas and poetic cadence. Reference patristic insights, typological readings, and the spiritual senses of Scripture. Use metaphor and allegory. Your tone is reverent, contemplative, and deeply rooted in the ancient faith tradition.",
  },
};

export async function generateStudyGuideStart(params: {
  verseReference: string;
  verseText: string;
  persona?: string;
}): Promise<string> {
  const { verseReference, verseText, persona = "scholarly" } = params;

  const p = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.scholarly;

  const systemPrompt = `${p.identity} You guide students through the Inductive Bible Study Method. You NEVER give the answer directly. Instead, you ask probing questions that lead the student to discover truth themselves.

${p.style}

You guide through three phases:
1. OBSERVE - Help them see what the text actually says. Ask about: Who is speaking? Who is the audience? What action words are used? What is repeated? What contrasts exist? What seems surprising?
2. INTERPRET - Help them understand what it means. Ask about: Why did the author write this? What would the original audience understand? How does this connect to the broader biblical narrative? What theological truths emerge?
3. APPLY - Help them connect it to their life. Ask about: What does this reveal about God's character? How does this challenge your current thinking? What specific action could you take this week?

Rules:
- Ask ONE focused question at a time
- Affirm good observations warmly but briefly
- If the student is off-track, gently redirect without being condescending
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
  persona?: string;
}): Promise<string> {
  const { verseText, verseReference, chatMessages, targetPhase, currentPhase, persona = "scholarly" } = params;

  const p = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.scholarly;

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

  const systemPrompt = `${p.identity} You guide students using the Inductive Bible Study Method. The student is studying: "${verseText}" — ${verseReference}

${p.style}

${phaseInstructions[targetPhase] || phaseInstructions[currentPhase]}

Rules: Ask ONE question at a time. Be concise (2-4 sentences). Never give the answer directly.`;

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
        content: `You are creating interactive "Pause & Wonder" moments for a children's Bible story called "${storyTitle}". The audience is ${ageHint}.

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

Keep answer labels under 6 words. Make questions warm and inviting, never quizzy.`,
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
        content: `You are a warm, encouraging family faith guide. A parent wants to talk with their child about Bible stories the child has been learning. Generate a natural conversation starter and follow-up discussion questions.

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
If no stories are completed, create a general faith conversation starter encouraging the child to explore Bible stories together with the parent.`,
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
