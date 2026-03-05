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

Analyze EVERY significant word in this verse (skip only articles like "the", "a", "an" and basic prepositions like "of", "to", "in", "for"). For each word, return Strong's-style data. Return a JSON array:
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
        content: `You are a family faith coach helping parents connect with their children about Bible stories. A child just finished a quiz on a Bible story. Generate a push notification message and dinner-table conversation prompts.

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
}`,
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
        content: `You are a master children's Bible storyteller creating an interactive, scene-by-scene storybook. Your task is to break a Bible story into 5-7 vivid scenes that children can flip through like pages of a picture book.

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
}`,
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
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(process.cwd(), "assets", "kids-scenes", `${sceneId}.png`);
    if (fs.existsSync(filePath)) {
      return `/assets/kids-scenes/${sceneId}.png`;
    }
    return null;
  } catch (err) {
    console.error("Scene image lookup error:", err);
    return null;
  }
}

export async function generateScripturalEncouragement(
  prayerTitle: string,
  prayerContent: string
): Promise<{ verse: string; note: string }> {
  const client = createOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a compassionate biblical counselor. Given a prayer request, respond with a single relevant Bible verse (KJV preferred) and a 1-sentence comfort note. Return valid JSON: {"verse": "Book Chapter:Verse - 'The verse text...'", "note": "A warm, compassionate 1-sentence encouragement connecting the verse to their situation."}`,
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
        content: `You are a warm, encouraging Bible study discussion partner. You engage thoughtfully with the student's reflection answers, affirming genuine insights while gently deepening understanding.

Your response style:
- Start by acknowledging what the student shared (1 sentence)
- Add a brief theological insight or scripture connection that builds on their answer (2-3 sentences)
- If their answer is shallow, lovingly guide them deeper without being preachy
- Keep responses conversational and warm, not academic
- Use KJV language when quoting scripture
- Maximum 4 sentences total for your response

Also provide ONE brief follow-up question that goes deeper into what they shared. The follow-up should feel natural, not like a quiz. If no natural follow-up exists, return null.`,
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

export interface SemanticSearchResult {
  reference: string;
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  text: string;
  relevance: string;
}

export async function generateSemanticSearch(query: string): Promise<SemanticSearchResult[]> {
  const openai = createOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a Seventh-day Adventist Bible search engine. Given a natural language query, find the most relevant Bible passages. Return 8-12 results ranked by relevance.

You serve Adventist believers, so when interpreting queries:
- Prioritize passages that align with SDA doctrinal understanding (e.g., for "what happens when we die," include passages supporting soul sleep like Ecclesiastes 9:5, Psalms 115:17, John 11:11-14)
- For topics related to the Sabbath, use passages supporting the seventh-day Sabbath
- For topics about the Second Coming, emphasize its literal, visible nature
- Include prophetic passages from Daniel and Revelation when relevant to the query
- Never select passages in a way that supports Sunday sacredness, eternal hellfire, or the immortal soul doctrine

Return valid JSON only, no markdown:
[
  {
    "reference": "John 3:16",
    "bookId": 43,
    "chapter": 3,
    "verseStart": 16,
    "verseEnd": null,
    "text": "For God so loved the world...",
    "relevance": "Brief explanation of why this passage is relevant"
  }
]

Book IDs: Genesis=1, Exodus=2, Leviticus=3, Numbers=4, Deuteronomy=5, Joshua=6, Judges=7, Ruth=8, 1Samuel=9, 2Samuel=10, 1Kings=11, 2Kings=12, 1Chronicles=13, 2Chronicles=14, Ezra=15, Nehemiah=16, Esther=17, Job=18, Psalms=19, Proverbs=20, Ecclesiastes=21, SongOfSolomon=22, Isaiah=23, Jeremiah=24, Lamentations=25, Ezekiel=26, Daniel=27, Hosea=28, Joel=29, Amos=30, Obadiah=31, Jonah=32, Micah=33, Nahum=34, Habakkuk=35, Zephaniah=36, Haggai=37, Zechariah=38, Malachi=39, Matthew=40, Mark=41, Luke=42, John=43, Acts=44, Romans=45, 1Corinthians=46, 2Corinthians=47, Galatians=48, Ephesians=49, Philippians=50, Colossians=51, 1Thessalonians=52, 2Thessalonians=53, 1Timothy=54, 2Timothy=55, Titus=56, Philemon=57, Hebrews=58, James=59, 1Peter=60, 2Peter=61, 1John=62, 2John=63, 3John=64, Jude=65, Revelation=66

Use KJV text for verse quotations. Include a mix of well-known and lesser-known passages. Provide the full verse text when possible.`,
      },
      {
        role: "user",
        content: query,
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
    console.error("Failed to parse semantic search AI response:", raw.substring(0, 500));
    throw new Error("Failed to parse AI response");
  }

  return parsed.map((r: any) => ({
    reference: r.reference || "",
    bookId: r.bookId || 1,
    chapter: r.chapter || 1,
    verseStart: r.verseStart || 1,
    verseEnd: r.verseEnd || null,
    text: r.text || "",
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

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a Seventh-day Adventist Bible study curriculum designer with deep knowledge of SDA theology, the 28 Fundamental Beliefs, the three angels' messages, the sanctuary doctrine, the Sabbath, the state of the dead, the investigative judgment, healthful living, and the writings of Ellen G. White.

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

${difficultyGuide}

Return valid JSON only, no markdown. Use KJV book names exactly as they appear in the Bible (e.g., "Genesis", "1 Corinthians", "Psalms").`,
      },
      {
        role: "user",
        content: `Create a ${durationDays}-day Bible reading plan on the topic: "${topic}"
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
      "reflectionQuestions": ["Question 1", "Question 2", "Question 3"],
      "prayerPrompt": "A prayer prompt responding to this passage, reflecting Adventist devotional life",
      "thenContext": "What this passage meant to the original audience (2-3 sentences)",
      "nowApplication": "How this applies to Adventist believers today, connecting to present truth and end-time living where appropriate (2-3 sentences)"
    }
  ]
}

Generate exactly ${durationDays} days. Each day should have a different passage. Vary between Old and New Testament where appropriate. Make passages focused (typically 5-15 verses, not full chapters). Include passages that illuminate distinctive Adventist doctrines when they connect naturally to the topic.`,
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
          reflectionQuestions: Array.isArray(d.reflectionQuestions) ? d.reflectionQuestions : [],
          prayerPrompt: d.prayerPrompt || "",
          thenContext: d.thenContext || "",
          nowApplication: d.nowApplication || "",
        }))
      : [],
  };
}

export async function generateVerseExplanation(params: {
  reference: string;
  lessonContext?: string;
}): Promise<string> {
  const { reference, lessonContext } = params;
  const openai = createOpenAIClient();

  const systemPrompt = `You are a Seventh-day Adventist biblical scholar providing clear, faithful explanations of Scripture passages. Your explanations must:

1. Be SHORT (3-5 sentences maximum). Do not write essays.
2. Be grounded in the biblical text itself — explain what the passage says and means in context.
3. Reflect Adventist theological understanding where relevant (sanctuary, Sabbath, state of the dead, Great Controversy, second coming, health message, etc.) but only when the passage naturally touches those themes. Do not force Adventist distinctives into every answer.
4. Use clear, lay-friendly language. No academic jargon.
5. Be reverent and measured in tone — not sensational, not polemical, not devotional fluff.
6. Reference other Scripture passages briefly when they illuminate the text, but keep cross-references to 1-2 at most.
7. Never quote or embed Ellen G. White text. You may mention that Adventist thought on a topic can be explored further, but never present EGW as equal to Scripture.
8. Never speculate beyond what the text says. If a passage is debated, present the Adventist reading calmly without attacking other positions.
9. Do not use emoji, markdown formatting, bullet points, or numbered lists. Write in flowing prose.`;

  const userPrompt = lessonContext
    ? `Explain this passage: ${reference}\n\nThis explanation is being requested within a lesson about: ${lessonContext}`
    : `Explain this passage: ${reference}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 300,
    temperature: 0.4,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "";
  return raw || "Unable to generate an explanation at this time. Please try again.";
}
