import OpenAI from "openai";

function createOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

export interface EDLSegment {
  type: "avatar" | "broll";
  text: string;
  brollPrompt: string | null;
  brollMotion: string | null;
  estimatedDuration: number;
}

export interface EDLContext {
  targetAgeGroup: string;
  category: string;
  avatarGender: string;
}

const AGE_ENVIRONMENTS: Record<string, string> = {
  "young disciples": `Ages 13–15. Environments: school hallways, bedrooms at night with phone glow, bus rides, skateparks, school cafeteria tables, backpacks on floors, sneakers on pavement, school lockers, playground swings at dusk, bike rides through suburban streets.`,
  "teens and young adults": `Ages 16–22. Environments: driving alone at night, college campus paths, late-night study desks, apartment windows, coffee shops, park benches, city sidewalks at golden hour, gym bleachers, rooftop views, bus stops in rain.`,
};

const CATEGORY_VISUAL_LANGUAGE: Record<string, string> = {
  "Mental Health": `Mood: intimate, vulnerable, contemplative. Darker tones shifting to warm light. Empty spaces that feel heavy. Personal objects (journals, headphones, crumpled paper). Weather as emotion (rain, overcast, breaking clouds).`,
  "Identity": `Mood: searching, questioning, discovering. Mirrors, reflections in water, paths that diverge, shadows and light, someone standing at a crossroads (from behind). Objects that represent choice and self-discovery.`,
  "Relationships": `Mood: connection and disconnection. Two chairs (one empty), phone screens with messages, hands reaching, footprints side by side, shared spaces (from a distance). The tension between isolation and belonging.`,
  "Faith": `Mood: wonder, reverence, quiet certainty. Open Bibles, candlelight, church windows with light streaming through, nature at its most majestic (mountains, oceans, starry skies), open doorways with light beyond.`,
  "Spiritual Growth": `Mood: journey, persistence, transformation. Winding paths, sunrise over horizon, seeds and growing plants, climbing terrain, open roads ahead, light gradually increasing.`,
};

export async function generateEditDecisionList(
  script: string,
  topicTitle: string,
  context?: EDLContext
): Promise<EDLSegment[]> {
  const client = createOpenAIClient();

  const ageGroup = context?.targetAgeGroup || "teens and young adults";
  const category = context?.category || "Faith";
  const gender = context?.avatarGender || "female";

  const ageEnv = AGE_ENVIRONMENTS[ageGroup] || AGE_ENVIRONMENTS["teens and young adults"];
  const catVisual = CATEGORY_VISUAL_LANGUAGE[category] || CATEGORY_VISUAL_LANGUAGE["Faith"];

  const viewerGenderNote = gender === "male"
    ? "The viewer identifies as male. When showing a person, default to a young man/teenage boy unless the scene calls for something else."
    : "The viewer identifies as female. When showing a person, default to a young woman/teenage girl unless the scene calls for something else.";

  const systemPrompt = `You are a cinematic video editor creating an Edit Decision List (EDL) for a 55–60 second faith-based video aimed at ${ageGroup}. You will receive a script and topic title. Your job is to split the script into an ordered array of segments, alternating between "avatar" (talking head) and "broll" (cinematic visual) segments.

AUDIENCE & VISUAL CONTEXT:
${ageEnv}
${catVisual}
${viewerGenderNote}

RULES:
1. TIME SPLIT: Approximately 65-70% avatar and 30-35% B-roll by total estimated duration.
2. CUTS: Never cut mid-sentence. Cuts happen at emotionally significant moments — pauses, shifts in tone, after a key phrase lands, or at natural breath points.
3. AVATAR SEGMENTS: These are the parts where the avatar speaks directly to camera. The "text" field contains the exact script text the avatar will speak during that segment. Set "brollPrompt" to null for avatar segments.
4. B-ROLL SEGMENTS: These are cinematic visual cutaways that play while the avatar's voice continues as a voiceover. The "text" field contains the exact script text being spoken during the B-roll. The "brollPrompt" field contains a detailed cinematic visual description for AI video generation.
5. B-ROLL IMAGE PROMPT RULES (brollPrompt — describes WHAT we see):
   IMPORTANT: Use ONLY positive descriptions. Describe what IS in the scene. Gen-4 images ignores negative instructions and may produce the opposite of what you exclude.
   - SHOT TYPES: Start each prompt with the shot type. Use: "Wide shot of...", "Establishing shot of...", "Full shot of...", "Medium shot from behind of...", "High angle looking down at...", "Macro close-up of..." Choose the shot that best serves the emotion.
   - PEOPLE: Include people using these safe compositions: a silhouetted figure standing in a doorway; a teenager seen from behind walking down a hallway; hands resting on an open Bible; a young person sitting on bleachers, head down, hood up; feet in sneakers dangling from a dock; shoulders and back of someone looking out a window. Describe them as "a teenager" or "a young person."
   - COMPOSITION TECHNIQUES: Use "frame within frame" (doorways, windows framing a distant figure), "leading lines" (hallway, road, fence leading the eye), "negative space" (vast environment with small figure), "symmetrical" (balanced scene). These produce consistently beautiful AI-generated results.
   - ENVIRONMENTS: Ground every scene in a specific, relatable place from the audience's real life. Use the age-appropriate environments listed above. Be concrete and specific — "a dimly lit bedroom, phone glow casting blue light on the ceiling, crumpled homework on the desk."
   - EMOTION THROUGH SETTING: Convey emotion through lighting, weather, time of day, color palette, and composition. Describe the specific quality of light, the color temperature, the textures visible.
   - OBJECTS: Include specific, tangible objects teenagers interact with (phones, headphones, journals, Bibles, sneakers, backpacks, mugs, candles, crumpled paper, guitar, skateboard).
   - FORMAT: Vertical 9:16 portrait orientation. Cinematic lighting. Photorealistic. Rich color grading.
6. B-ROLL MOTION PROMPT RULES (brollMotion — describes HOW the scene moves):
   This prompt animates the still image into a 5-second video clip. Focus EXCLUSIVELY on motion — the image already defines the visuals.
   - STRUCTURE: Follow this pattern: "The camera [motion] as [subject action]. [Environmental detail]."
   - CAMERA MOTIONS: "The camera slowly pushes in", "The camera gently pulls back", "Slow pan left to right", "The camera holds static", "Tilt up from the ground", "The camera trucks right alongside the subject."
   - SUBJECT MOTIONS: "as the figure walks slowly away", "as hands turn a page", "as the silhouette shifts weight", "as fingers grip the desk edge", "as the subject sits motionless."
   - ENVIRONMENTAL DETAILS: "Light shifts across the scene.", "Rain streaks slide down the glass.", "Dust particles float in the light beam.", "Curtains sway gently.", "Leaves drift across the pavement."
   - Keep it simple: one camera motion and one subject/environmental motion. Simpler prompts produce better results with Gen-4.
   - EXAMPLES:
     "The camera slowly pushes in as the figure sits motionless on the bleachers, head down."
     "The camera holds static as the subject walks away down the hallway, growing smaller."
     "The camera drifts upward as light breaks through the clouds."
     "Slow pan right across the desk. The phone screen glows and dims."
7. COMPLETENESS: Every word of the original script must appear exactly once across all segments in order. No words added, removed, or reordered.
8. DURATION: Estimate each segment's duration based on natural teen speaking pace (~2.5 words per second). The total should be 55–60 seconds.
9. SEGMENT COUNT: Typically 6–10 segments total, with exactly 2 or 3 B-roll segments. The FIRST segment MUST be type "avatar". The LAST segment MUST be type "avatar". Never end with a B-roll segment — the closing words must always be the avatar speaking directly to camera.
10. PACING: The first avatar segment (the hook) should be 4–6 seconds. B-roll segments are typically 4–6 seconds. Avatar segments vary from 3–10 seconds. The final avatar segment (the close) should be at least 4 seconds.

Return ONLY a JSON array of segment objects. No markdown formatting, no explanation, no wrapping.

Each segment object has exactly these fields:
- "type": "avatar" or "broll"
- "text": the exact script text for that segment
- "brollPrompt": detailed visual scene description for image generation (for broll) or null (for avatar). Describe WHAT we see — composition, environment, lighting, subjects, objects.
- "brollMotion": motion description for video animation (for broll) or null (for avatar). Describe HOW the scene moves — camera motion (slow push in, gentle pan, dolly), environmental motion (light shifts, leaves drift, rain falls), and subject motion (figure walks away, hands turn a page). Keep it simple and physical — one or two motions maximum.
- "estimatedDuration": number of seconds (can be decimal)`;

  const userPrompt = `Topic: ${topicTitle}
Category: ${category}

Script:
${script}

Generate the Edit Decision List for this script.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response received from OpenAI for EDL generation");
  }

  const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  let segments: EDLSegment[];
  try {
    segments = JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse EDL response as JSON");
  }

  if (!Array.isArray(segments) || segments.length < 4) {
    throw new Error(`Expected at least 4 EDL segments, got ${Array.isArray(segments) ? segments.length : "non-array"}`);
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type !== "avatar" && seg.type !== "broll") {
      throw new Error(`Segment ${i} has invalid type "${seg.type}", expected "avatar" or "broll"`);
    }
    if (!seg.text || typeof seg.text !== "string") {
      throw new Error(`Segment ${i} is missing text`);
    }
    if (seg.type === "broll" && (!seg.brollPrompt || typeof seg.brollPrompt !== "string")) {
      throw new Error(`B-roll segment ${i} is missing brollPrompt`);
    }
    if (seg.type === "broll" && !seg.brollMotion) {
      seg.brollMotion = "The camera slowly pushes in. Subtle atmospheric motion.";
    }
    if (seg.type === "avatar") {
      seg.brollPrompt = null;
      seg.brollMotion = null;
    }
    if (typeof seg.estimatedDuration !== "number" || seg.estimatedDuration <= 0) {
      throw new Error(`Segment ${i} has invalid estimatedDuration`);
    }
  }

  if (segments[0].type !== "avatar") {
    console.warn(`[EDL] Auto-fix: first segment was "${segments[0].type}", converting to avatar`);
    segments[0].type = "avatar";
    segments[0].brollPrompt = null;
  }

  if (segments[segments.length - 1].type !== "avatar") {
    const lastSeg = segments[segments.length - 1];
    console.warn(`[EDL] Auto-fix: last segment was "${lastSeg.type}", converting to avatar`);
    lastSeg.type = "avatar";
    lastSeg.brollPrompt = null;
  }

  let trailingBroll = true;
  while (trailingBroll && segments.length > 2) {
    const last = segments[segments.length - 1];
    const secondLast = segments[segments.length - 2];
    if (last.type === "avatar" && secondLast.type === "broll") {
      break;
    }
    trailingBroll = false;
  }

  const totalDuration = segments.reduce((sum, s) => sum + s.estimatedDuration, 0);
  const avatarDuration = segments.filter(s => s.type === "avatar").reduce((sum, s) => sum + s.estimatedDuration, 0);
  const avatarPercent = (avatarDuration / totalDuration) * 100;

  if (avatarPercent < 45 || avatarPercent > 75) {
    console.warn(`EDL avatar/broll split is ${avatarPercent.toFixed(0)}% avatar — target is ~60%`);
  }

  console.log(`EDL generated for "${topicTitle}" [${ageGroup}, ${category}, ${gender}]: ${segments.length} segments, ${totalDuration.toFixed(1)}s total, ${avatarPercent.toFixed(0)}% avatar`);

  return segments;
}
