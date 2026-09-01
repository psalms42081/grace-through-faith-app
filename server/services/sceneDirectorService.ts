import OpenAI from "openai";
import { openaiClientOptions } from "../openai-env";

function createOpenAIClient(): OpenAI {
  return new OpenAI({
    ...openaiClientOptions(),
  });
}

export interface CinematicScene {
  sceneNumber: number;
  scriptSlice: string;
  emotion: string;
  imagePrompt: string;
  motionPrompt: string;
  durationHint: number;
  location: string;
}

export interface SceneDirectorContext {
  targetAgeGroup: string;
  category: string;
  characterDescription: string;
  gender: string;
  avoidLocations?: string[];
}

const AGE_ENVIRONMENTS: Record<string, string> = {
  "young disciples": `Ages 13–15. These are middle-schoolers navigating their first real emotional storms. They still have soft, unfinished features — round cheeks, braces, oversized hoodies. ENVIRONMENTS: messy bedrooms with fairy lights and stuffed animals on shelves, school hallways with scuffed linoleum and dented lockers, bus seats with fogged windows, playground swings at dusk with long shadows, skateparks at golden hour, cafeteria tables with untouched lunch trays, bathroom mirrors with sticky notes, suburban sidewalks with bikes dropped on lawns. PROPS THEY TOUCH: phone with cracked screen protector, earbuds tangled in pocket, worn Bible with sticky tabs, backpack straps gripped tight, fidget spinner, friendship bracelet, journal with doodles in margins.`,
  "teens and young adults": `Ages 16–22. These are young people wrestling with identity, independence, and faith in real-world pressure. They look more angular, defined — some with acne scars, tired eyes, coffee-stained fingers. ENVIRONMENTS: car parked alone in an empty lot at night with dashboard glow, college dorm room with unmade bed and string lights, late-night study desk with energy drinks and highlighters, apartment window with city lights, coffee shop corner booth, park bench under a single streetlamp, gym bleachers after everyone left, rooftop at blue hour, bus stop bench in light rain, library carrel with headphones on. PROPS THEY TOUCH: worn leather Bible, laptop with stickers, coffee mug half-empty, phone face-down on table, keys on a lanyard, handwritten letter, crumpled tissue.`,
  teens: `Ages 16–18 ONLY. CRITICAL: The character MUST look like a high school junior or senior — NOT a child, NOT a middle schooler. They should have mature teen features: defined jawline, proportionate adult-height body, real emotional weight in their eyes. Think 16-18 year old, NOT 12-13. They look like someone who drives, has a job, thinks about college. Tired eyes from late nights, coffee-stained fingers, bitten nails, hoodie pulled up. ENVIRONMENTS: bedroom floor leaning against the bed with knees pulled up, school hallway after the bell (empty, echo), cafeteria table sitting alone while others laugh nearby, locker mirror catching their reflection, park bench at dusk with golden light fading, bus stop in gray drizzle, library corner hidden behind shelves, sidewalk walking home alone with long shadow, front porch steps with chin on hands, bed at night lit only by phone glow. PROPS THEY TOUCH: phone screen reflecting on their face, earbuds (one in, one dangling), crumpled notebook paper, hoodie sleeves pulled over hands, well-worn Bible with dog-eared pages, pencil tapped on desk, water bottle half-empty.`,
  "young adult": `Ages 22–28. These are young professionals and college graduates navigating the real world for the first time. They have fully adult features — defined bone structure, confident posture that sometimes cracks under pressure, professional clothing mixed with casual comfort pieces. ENVIRONMENTS: small apartment kitchen at 6 AM with coffee brewing and morning light through blinds, open-plan office desk after everyone else has left, car parked in a parking garage with engine off staring at the steering wheel, coffee shop with laptop and scattered notes, gym locker room bench alone after a workout, laundromat at night with fluorescent lights and spinning machines, apartment balcony overlooking city lights, co-working space with headphones on blocking out the world, restaurant booth waiting for someone who hasn't arrived. PROPS THEY TOUCH: laptop with work tabs open, coffee travel mug, car keys, phone with calendar notifications, leather journal, work badge on a lanyard, grocery bag set on the counter, Bible on a nightstand next to an alarm clock.`,
  adult: `Ages 30–40. These are people carrying real adult weight — careers, families, mortgages, the quiet crisis of "is this all there is?" They have mature features — some gray hairs starting, laugh lines around the eyes, hands that show years of work. ENVIRONMENTS: kitchen table at dawn before the family wakes up with a single light on, home office at midnight with desk lamp and family photos in the background, parked car in the driveway sitting in silence before going inside, church pew in an empty sanctuary during the week, park bench watching kids play from a distance, hospital waiting room under harsh fluorescent light, backyard patio at dusk with a Bible and glass of water, bedroom sitting on the edge of the bed in the dark. PROPS THEY TOUCH: wedding ring turned absent-mindedly, reading glasses set on an open Bible, phone with family photo wallpaper, coffee mug that says something faded, car steering wheel gripped tight, pen clicking while staring at nothing, well-worn Bible with decades of margin notes.`,
};

export type ScriptAgeGroup = "young disciples" | "teens" | "teens and young adults" | "young adult" | "adult";

const AGE_SIGNAL_PATTERNS: { group: ScriptAgeGroup; weight: number; patterns: RegExp[] }[] = [
  {
    group: "young disciples",
    weight: 2,
    patterns: [
      /\bmiddle school\b/i, /\b6th grade\b/i, /\b7th grade\b/i, /\b8th grade\b/i,
      /\bplayground\b/i, /\bslumber party\b/i, /\bsleep ?over\b/i, /\bstuffed animal/i,
      /\bmom picks me up\b/i, /\bdad picks me up\b/i, /\brecess\b/i,
    ],
  },
  {
    group: "teens",
    weight: 2,
    patterns: [
      /\bhigh school\b/i, /\bhomework\b/i, /\bcafeteria\b/i, /\blocker\b/i,
      /\bpeer pressure\b/i, /\bteacher\b/i, /\bclass\b/i, /\bschool\b/i,
      /\bprom\b/i, /\bsenior year\b/i, /\bjunior year\b/i, /\bfreshman\b/i,
      /\bsophomore\b/i, /\bGPA\b/i, /\bdetention\b/i, /\bparents won't\b/i,
      /\bparents don't\b/i, /\bcurfew\b/i, /\bgrounded\b/i, /\bgrow(ing)? up\b/i,
      /\bwhat do you wanna be\b/i, /\bwhen (I|you) grow up\b/i,
    ],
  },
  {
    group: "young adult",
    weight: 3,
    patterns: [
      /\bstarting a business\b/i, /\bstart(ed|ing) (a |my )?company\b/i,
      /\brent\b/i, /\bjob interview\b/i, /\bresume\b/i, /\bcollege degree\b/i,
      /\bapartment\b/i, /\bcareer\b/i, /\bbills?\b/i, /\broommate\b/i,
      /\bcommute\b/i, /\binternship\b/i, /\bgraduat(ed?|ion|ing)\b/i,
      /\bentry[- ]level\b/i, /\bstudent loan\b/i, /\bdating app\b/i,
      /\bfirst job\b/i, /\bsalary\b/i, /\b(my|the) boss\b/i,
      /\bnetwork(ing)?\b/i, /\bside hustle\b/i, /\bfreelance/i,
      /\bLinkedIn\b/i, /\bco-?worker/i, /\b9[- ]to[- ]5\b/i,
      /\bmaking it\b/i, /\bhave it (all )?figured out\b/i,
      /\bpeople (my|your) age\b/i, /\beveryone else is\b/i,
    ],
  },
  {
    group: "adult",
    weight: 3,
    patterns: [
      /\bmortgage\b/i, /\bmarriage\b/i, /\bdivorce\b/i, /\bmy (kids?|children|son|daughter)\b/i,
      /\bprovid(e|ing) for (my |the )?family\b/i, /\bmidlife\b/i,
      /\bpromotion\b/i, /\bmy wife\b/i, /\bmy husband\b/i, /\bmy spouse\b/i,
      /\bretirement\b/i, /\bcollege fund\b/i, /\bparent-?teacher\b/i,
      /\bsurgery\b/i, /\bdiagnos(is|ed)\b/i, /\bhospital\b/i,
      /\bgraying\b/i, /\b(raising|raise) (my |the )?(kids|children)\b/i,
      /\byears of marriage\b/i, /\bwork-?life balance\b/i,
      /\bburn(ed)? ?out\b/i, /\bmid(dle)?[- ]age/i,
    ],
  },
];

export function analyzeScriptAge(script: string): { detectedGroup: ScriptAgeGroup; scores: Record<string, number>; signals: string[] } {
  const scores: Record<string, number> = {
    "young disciples": 0,
    teens: 0,
    "young adult": 0,
    adult: 0,
  };
  const signals: string[] = [];

  for (const { group, weight, patterns } of AGE_SIGNAL_PATTERNS) {
    for (const pattern of patterns) {
      const matches = script.match(new RegExp(pattern.source, "gi"));
      if (matches) {
        scores[group] += weight * matches.length;
        signals.push(`${group}: "${matches[0]}" (x${matches.length})`);
      }
    }
  }

  let detectedGroup: ScriptAgeGroup = "teens";
  let highestScore = 0;

  const adultScore = scores["adult"];
  const youngAdultScore = scores["young adult"];
  const teenScore = scores["teens"];
  const youngDiscipleScore = scores["young disciples"];

  if (adultScore > 0 && adultScore >= youngAdultScore && adultScore >= teenScore) {
    detectedGroup = "adult";
    highestScore = adultScore;
  } else if (youngAdultScore > 0 && youngAdultScore >= teenScore) {
    detectedGroup = "young adult";
    highestScore = youngAdultScore;
  } else if (youngDiscipleScore > teenScore && youngDiscipleScore > 0) {
    detectedGroup = "young disciples";
    highestScore = youngDiscipleScore;
  } else if (teenScore > 0) {
    detectedGroup = "teens";
    highestScore = teenScore;
  }

  return { detectedGroup, scores, signals };
}

const CATEGORY_VISUAL_LANGUAGE: Record<string, string> = {
  "Mental Health": `VISUAL TONE: Start in cool blue-gray desaturated tones, slowly warming to amber/gold by the final scene. LIGHTING ARC: Begin with flat, overcast window light or cold fluorescent; transition to warm side-lighting and golden hour. FRAMING: Tight close-ups on hands, eyes, textures. Use negative space — the character small in frame surrounded by emptiness. KEY DETAILS: Tear tracks catching light, fingers pressing into forearm, chest rising with a deep breath, jaw unclenching. ATMOSPHERE: Still air, dust particles in light beams, condensation on glass, a single lamp becoming the brightest thing in a dark room.`,
  Identity: `VISUAL TONE: High contrast — sharp shadows and bright highlights. Mirror reflections that are slightly different from reality. LIGHTING ARC: Harsh overhead fluorescent giving way to soft natural light. FRAMING: Split compositions — half face in shadow, half in light. Reflections in mirrors, windows, puddles, phone screens. KEY DETAILS: Eyes searching their own reflection, hands turning over an object, standing at literal forks in paths, peeling off one layer to reveal another. ATMOSPHERE: The tension of becoming — half-formed, mid-transformation, chrysalis energy.`,
  Relationships: `VISUAL TONE: Warm amber for connection, cool blue for disconnection. LIGHTING ARC: Shift between isolation (cold, singular light source) and togetherness (warm, ambient). FRAMING: Two-shots that become one-shots. Empty space where someone should be. Hands almost touching. Over-the-shoulder shots looking at empty chairs. KEY DETAILS: Read receipts on a phone, an empty seat at a table, two shadows merging into one, a door left slightly open. ATMOSPHERE: The physical weight of someone's absence or presence.`,
  Faith: `VISUAL TONE: Ethereal but grounded — not churchy, not preachy. Natural light doing supernatural things. LIGHTING ARC: Begin in ordinary light, build toward transcendent golden/warm light that feels like it comes from beyond the frame. FRAMING: Low angles looking up (wonder), close-ups on hands touching Bible pages, wide shots with the character small against vast nature. KEY DETAILS: Light catching dust motes like something alive, fingers tracing scripture text, eyes closing in genuine prayer (not performative), a single candle flame steady in still air. ATMOSPHERE: The sacred hiding in the ordinary — a kitchen table becomes an altar, a park bench becomes a sanctuary.`,
  "Spiritual Growth": `VISUAL TONE: Progressive — each scene slightly warmer and brighter than the last. Like time-lapse of dawn. LIGHTING ARC: Pre-dawn gray → first light → full morning gold. FRAMING: Start with the character confined (small rooms, corners, tight shots) and gradually expand to wider shots with open horizons. KEY DETAILS: Feet on a path, hands dirty from planting, sweat on a brow from climbing, eyes adjusting to brighter light, a straightening spine. ATMOSPHERE: The texture of becoming — rough to smooth, tangled to ordered, dark to light.`,
  Purpose: `VISUAL TONE: Fog-to-clarity metaphor throughout. Start diffused and soft, end sharp and vivid. LIGHTING ARC: Hazy, directionless light sharpening into bold, directional rays. FRAMING: Begin with shallow depth of field (blurry background, searching focus) and transition to deep focus where everything is clear. KEY DETAILS: Hands opening a book decisively, pen meeting paper with purpose, eyes locking onto something with recognition, shoulders squaring, chin lifting. ATMOSPHERE: The exact moment confusion becomes conviction — a lens pulling into focus.`,
  Anxiety: `VISUAL TONE: Chaotic sensory overload dissolving into visual calm. LIGHTING ARC: Flickering, multiple light sources competing → single, steady, warm light. FRAMING: Begin with tilted angles, tight claustrophobic compositions. Gradually level the horizon and open the frame. KEY DETAILS: Rapid shallow breathing visible in chest/shoulders, white-knuckled grip softening, clenched jaw releasing, eyes darting then settling, hands going from fists to open palms. ATMOSPHERE: Sound made visual — the buzzing energy of anxiety as visual noise, then the physical exhale of release.`,
  Loneliness: `VISUAL TONE: Muted, almost monochromatic early scenes bursting into color. LIGHTING ARC: Single cold light source (phone glow, streetlamp) expanding to warm ambient light. FRAMING: Character consistently framed alone — centered in empty compositions, crowds blurred around them. Then: another person enters the frame. KEY DETAILS: Eating alone while others laugh nearby, walking through a crowded hallway invisible, a single toothbrush by the sink, then: a knock on a door, a text notification, a hand on a shoulder. ATMOSPHERE: The sound of silence becoming the sound of someone calling your name.`,
};

export async function generateSceneDirections(
  script: string,
  topicTitle: string,
  scriptureAnchor: string | null,
  context: SceneDirectorContext
): Promise<CinematicScene[]> {
  const client = createOpenAIClient();

  const ageEnv =
    AGE_ENVIRONMENTS[context.targetAgeGroup] ||
    AGE_ENVIRONMENTS["teens"] ||
    AGE_ENVIRONMENTS["teens and young adults"];
  const catVisual =
    CATEGORY_VISUAL_LANGUAGE[context.category] ||
    CATEGORY_VISUAL_LANGUAGE["Faith"];

  const genderPronoun = context.gender === "male" ? "he/him/his" : "she/her/her";
  const genderSubject = context.gender === "male" ? "he" : "she";
  const genderPossessive = context.gender === "male" ? "his" : "her";

  const systemPrompt = `You are an award-winning cinematic director creating a short-film-quality faith-based narrative for ${context.targetAgeGroup}. You think like Emmanuel Lubezki meets A24 — every frame tells a story, every movement carries weight. You are directing for Runway Gen-4.5 AI video generation, which creates 5-second clips from a reference image + motion prompt.

═══════════════════════════════════════
OUR VISUAL STYLE BIBLE — "THE GRACE LOOK"
═══════════════════════════════════════
Every image we generate must match this signature cinematic identity. Study these exemplar descriptions — this is what our best work looks like:

EXEMPLAR 1 — "The Psalms Reader" (Gold Standard):
A teen boy in a dark gray hoodie sits on the edge of an unmade bed in a small bedroom at blue hour. A warm amber desk lamp glows behind him — the only interior light source. Through the window, the sky is deep twilight blue-purple with the last traces of sunset on the horizon. He holds an open leather-bound Bible, looking down with quiet contemplation. The room is lived-in: an acoustic guitar leans against the radiator, posters and photos are pinned to the wall, books are stacked on a wooden desk. The color palette is dominated by deep teal-blue shadows with a single warm amber accent from the lamp. Shot at approximately 35mm, medium shot, shallow depth of field blurring the background details. Film grain visible. The overall feeling is intimate, quiet, and honest — like catching a private moment no one was supposed to see.

WHAT MAKES THIS IMAGE WORK:
- ONE dominant color temperature (cool blue) with ONE warm accent (amber lamp) — not multiple competing light sources
- The character is DOING something specific (reading), not just posing
- The room tells a story about who they are (guitar = creative, books = studious, unmade bed = real teen)
- Objects are specific and recognizable (leather Bible, acoustic guitar, radiator, wooden desk)
- The window provides environmental context (time of day, weather, season)
- The character's body language is natural and unposed — slightly hunched, focused
- Lighting creates depth: foreground in shadow, character side-lit, background has its own light source
- The mood is EARNED by the composition, not forced by filters or effects

EXEMPLAR 2 — "The Weight of Silence":
A teen girl sits on a bedroom floor, back against the bed frame, knees pulled up, arms wrapped around them. A phone lies face-down beside her on the carpet. The room is dark except for string lights above the headboard casting tiny warm dots and the cold blue glow of a laptop screen on the nightstand. Her face is half in shadow, half in the cool laptop light. Her expression is blank — not crying, not angry, just empty. A crumpled tissue sits near her hand. The window shows rain tracking down the glass. Shot tight — medium close-up, 50mm lens, isolating her in a small frame within the larger dark room.

EXEMPLAR 3 — "First Light":
Dawn light streams through sheer curtains, casting long golden rectangles across a messy desk covered in schoolbooks and a closed journal. A teen sits in a chair turned toward the window, face catching the warm light, eyes closed, hands resting open on their lap. A Bible sits open on the desk beside a cold cup of tea. The rest of the room is still in pre-dawn blue shadow. The contrast between warm golden window light and cool blue room shadow creates a visual metaphor for hope entering darkness.

EXEMPLAR 4 — "Something Is Landing" (Scene Transition Gold Standard):
Scene 1: The teen sits on the edge of his bed, hands clasped in his lap, staring downward. No book yet. The room is dim — blue-hour light through the window, warm lamp behind him. His body language reads as closed, heavy, stuck.
Scene 2 (same anchor image, different motion prompt): Now a Bible is open in his lap. His finger traces across the page. His expression has shifted — still contemplative, but something is landing. The same room, same light, same character — but the emotional temperature has changed.
WHAT MAKES THIS TRANSITION WORK: The anchor image stays identical (character consistency), but the motion prompt's emotional direction ("something is landing", "traces slowly across the page") guided Runway to evolve the scene naturally. The viewer feels time passing and an internal shift happening — all from poetic direction, not technical commands.

EXEMPLAR 5 — "The Park Bench" (Outdoor / Connection):
Two teens sit on a weathered wooden park bench in autumn. One gestures while speaking, the other listens intently. A closed Bible with colored tabs sits across one teen's lap. Behind them, a park with tall oaks in golden-green fall foliage, other people walking along a path in soft focus. A canvas backpack and water bottle sit beside them on the bench. Natural daylight, overcast but warm. The composition feels candid — like a photographer captured this from across the path. Shot wide enough to show the environment but close enough to read their expressions.
WHAT MAKES THIS IMAGE WORK: Outdoor scenes need environmental storytelling too — the autumn leaves, the worn bench, the backpack casually dropped, people in the background living their lives. It feels REAL because it looks unposed. The Bible is present but not the center — it's part of the moment, not a prop.

STYLE RULES DERIVED FROM OUR BEST WORK:
1. LIGHTING DISCIPLINE: Maximum 2 light sources per scene. One dominant (sets the mood), one accent (adds dimension). Never more.
2. COLOR PALETTE: Each scene should have ONE dominant color temperature. Cool blue-teal for struggle. Warm amber-gold for hope. The transition between these across the video IS the emotional arc.
3. ENVIRONMENT AS CHARACTER: The room/space should tell a story about WHO lives there. Every object should feel like it belongs to THIS specific person, not a generic set.
4. NATURAL BODY LANGUAGE: Characters should be caught mid-moment — reading, staring, breathing, gripping something — never posing for camera.
5. NEGATIVE SPACE WITH PURPOSE: Empty space in the frame should feel heavy when the emotion is heavy, and spacious when the emotion is free.
6. NO VISUAL CLICHÉS: No rays of light from heaven, no glowing Bibles, no hands clasped in performative prayer, no crosses on walls unless they're small and personal. Faith is felt, not displayed.
7. TEXTURE AND GRAIN: Every image should feel like it was shot on 35mm film in available light. Grain, imperfection, and natural color shifts are features, not bugs.
8. THE PRIVATE MOMENT: Every scene should feel like the viewer is witnessing something intimate — a moment the character thought no one would see. This is what creates emotional connection.

CHARACTER LOCK (CRITICAL — identical in EVERY scene):
${context.characterDescription}
Pronouns: ${genderPronoun}
AGE ENFORCEMENT: The character description above specifies an exact age. The generated character in EVERY imagePrompt MUST visually match that stated age — not younger, not older. If the description says "25-year-old," generate a 25-year-old. If it says "35-year-old," generate a 35-year-old. If it says "17-year-old," they must look 17 — NOT 12. Match the age precisely.
This EXACT person appears in every single imagePrompt. Same face, same hair, same build, same skin tone, same clothing. The AI uses one anchor photo for consistency — any deviation breaks continuity. Repeat the full character description in every imagePrompt.

WHO IS WATCHING THIS:
${ageEnv}

VISUAL LANGUAGE FOR THIS TOPIC:
${catVisual}

═══════════════════════════════════════
SCENE DIRECTION MASTERCLASS
═══════════════════════════════════════

SCENE COUNT: Exactly 5–6 scenes. Each scene = one emotional beat = one 5-second video clip.

LOCATION VARIETY (CRITICAL — SCENES MUST CHANGE SETTING):
The script usually describes MULTIPLE physical locations. Each scene's location field should describe WHERE the scene takes place. When the script moves from a cafeteria to a bedroom, the imagePrompt must describe a COMPLETELY DIFFERENT ENVIRONMENT — not the same room.
${context.avoidLocations && context.avoidLocations.length > 0 ? `
╔══════════════════════════════════════════════════════════════╗
║ LOCATION BLACKLIST — These locations were already used in   ║
║ other videos for this same topic. You MUST choose           ║
║ COMPLETELY DIFFERENT settings to ensure visual variety:      ║
║ BANNED: ${context.avoidLocations.join(", ")}
║ Pick fresh, distinct environments that have NOT been used.  ║
╚══════════════════════════════════════════════════════════════╝
` : ""}
RULES:
- Use 2-4 DISTINCT locations across 5-6 scenes. The video should NOT feel like it takes place in one room.
- If the script mentions specific places (cafeteria, bedroom, dinner table, park, school hallway), USE them.
- Even if the script doesn't explicitly change location, create visual variety by moving the character through different settings that match the emotional arc. Struggle scenes might be in cold/institutional spaces. Hope scenes might be in warmer/personal spaces.
- The "location" field should be a short label like "school-cafeteria", "bedroom-night", "dinner-table", "park-bench-dusk". Scenes with the SAME location label will share the same anchor image for character consistency. Scenes with DIFFERENT labels will get their own anchor image.
- The character description must remain IDENTICAL across all imagePrompts regardless of location change. Same person, different room.

EXAMPLE LOCATION FLOW:
Scene 1: location="school-cafeteria" — cafeteria setting, isolated, cold overhead light
Scene 2: location="school-cafeteria" — same cafeteria, different angle/action
Scene 3: location="bedroom-night" — NEW location, bedroom at night, warm lamp
Scene 4: location="bedroom-night" — same bedroom, different moment
Scene 5: location="bedroom-dawn" — same room, but morning light entering
Scene 6: location="park-bench-morning" — NEW location, outdoor, golden light

SCRIPT SLICING: Divide the narration script into sequential slices. Every word of the original script must appear EXACTLY once, in order. No words added, removed, or reordered.

EMOTION: Name the specific micro-emotion, not generic labels.
  BAD: "sad", "happy", "hopeful"
  GOOD: "the weight of pretending to be okay", "the first real exhale in weeks", "recognizing your own worth in God's eyes"

IMAGE PROMPT (imagePrompt) — THE PHOTOGRAPH:
This generates the anchor still frame that Runway will animate. Think of it as a single frame from a film that won the Sundance cinematography award.

  SHOT TYPE (pick one per scene, vary across scenes):
  - "Extreme close-up of ${genderPossessive} fingers..." (texture, detail, intimacy)
  - "Close-up of ${genderPossessive} face..." (emotion, micro-expression)
  - "Medium shot of ${genderSubject} sitting..." (body language, environment)
  - "Wide shot of ${genderSubject} standing..." (isolation, scale, context)
  - "Over-the-shoulder shot looking at..." (POV, what ${genderSubject} sees)
  - "Low-angle shot looking up at ${genderSubject}..." (power, vulnerability)
  - "High-angle shot looking down on ${genderSubject}..." (smallness, overwhelm)

  BODY LANGUAGE (be specific — this is what makes it feel real):
  - BAD: "she looks sad"
  - GOOD: "${genderSubject} sits with ${genderPossessive} shoulders curved inward, ${genderPossessive} thumb rubbing the edge of ${genderPossessive} phone case, ${genderPossessive} eyes unfocused and glassy, lower lip barely trembling"

  MICRO-EXPRESSIONS (the details that make viewers feel):
  - Jaw muscles tensing, nostrils flaring with a held breath
  - Eyes glistening but not crying — the moment BEFORE tears
  - A tiny smile that doesn't reach the eyes
  - Brow softening as tension releases
  - Chin lifting slightly as courage builds
  - Eyes closing slowly — not sleeping, surrendering

  LIGHTING (be a cinematographer):
  - BAD: "dim lighting"
  - GOOD: "Single warm practical lamp casting amber light from the left, deep shadows on the right side of ${genderPossessive} face, the rest of the room falling into soft darkness. Rim light from a window behind catches the edges of ${genderPossessive} hair."

  ENVIRONMENT (make it hyper-specific and lived-in):
  - BAD: "a bedroom"
  - GOOD: "A small bedroom with unmade sheets bunched to one side, a half-closed laptop on the nightstand casting blue light, a stack of schoolbooks with a pen cap sitting on top, fairy lights above the headboard dimmed to their lowest setting, a glass of water with condensation on the nightstand"

  ╔══════════════════════════════════════════════════════════════╗
  ║ BANNED SURFACES — AI generates gibberish text on these:     ║
  ║ NEVER include whiteboards, chalkboards, blackboards,        ║
  ║ bulletin boards with text, posters with visible words,      ║
  ║ signs, banners, notebook pages with visible handwriting,    ║
  ║ journal entries with readable text, or any surface where    ║
  ║ text/writing/letters would be visible in the frame.         ║
  ║ Bibles should be shown CLOSED or at a distance/angle where  ║
  ║ page text is not legible. Phones should show lock screens   ║
  ║ or be face-down, never screens with readable text.          ║
  ╚══════════════════════════════════════════════════════════════╝

  OBJECTS IN FRAME (every object should feel intentional):
  - A Bible with specific colored sticky tabs poking out (shown closed or pages blurred by shallow depth of field)
  - A phone lying face-down or showing only the time on a lock screen
  - A crumpled tissue near ${genderPossessive} hand
  - Earbuds with one bud in, one dangling against ${genderPossessive} chest

  REQUIRED SUFFIXES for every imagePrompt:
  "Vertical 9:16 portrait framing. Shot on 35mm film. Cinematic color grading. Photorealistic. Shallow depth of field. Film grain texture."

MOTION PROMPT (motionPrompt) — THE 5-SECOND FILM:

  ╔══════════════════════════════════════════════════════════════╗
  ║ CORE PRINCIPLE: Runway animates FROM the image you already  ║
  ║ generated. The image prompt creates the world. The motion   ║
  ║ prompt ONLY describes what MOVES and how it FEELS.          ║
  ║ NEVER re-describe what's already in the image.              ║
  ╚══════════════════════════════════════════════════════════════╝

  The image is already generated when the motion prompt runs. Runway can SEE the room, the character, the objects, the lighting. Your job is ONLY to tell it:
  1. What moves (camera, character's body, environment)
  2. How it feels (the emotional atmosphere of the motion)

  BAD (re-describes the image — wastes tokens, confuses Runway):
  "A teen in a gray hoodie sits on an unmade bed in a small bedroom with a warm lamp and guitar. The camera slowly pushes in as he looks at a Bible."

  GOOD (only motion + feeling — trusts the image):
  "Slow push in. ${genderSubject} stares downward, lost in thought. ${genderPossessive} hands rest still. The weight of the moment settles. Quiet, still, cinematic."

  EXEMPLAR MOTION PROMPTS THAT PRODUCED OUR BEST WORK:
  - "Slow push in toward ${genderPossessive} face. ${genderSubject} stares downward, lost in thought. ${genderPossessive} hands rest still in ${genderPossessive} lap. The light in the room dims slightly as if the weight of the moment settles. Quiet, still, cinematic."
  - "Slow imperceptible push in toward the open book in ${genderPossessive} lap. ${genderPossessive} finger traces slowly across the page as ${genderSubject} reads. ${genderPossessive} expression shifts — something is landing. Cinematic, intimate, sacred."
  - "The camera holds steady. ${genderSubject} breathes. ${genderPossessive} shoulders drop almost imperceptibly, like something heavy has been set down. The only motion is the faintest shift of light."
  - "Gentle pull back. ${genderSubject} sits small in the frame. ${genderPossessive} fingers curl slightly. A breath. Cinematic stillness."
  - "Slow drift toward the window. ${genderSubject} turns ${genderPossessive} face into the light. ${genderPossessive} expression softens. Something shifts. Hope, quiet and unforced."

  MOTION PROMPT FORMULA:
  [Camera motion — 3-5 words] + [Character micro-action — what physically moves] + [Emotional atmosphere — how it feels] + [Mood stamp — 2-3 final words]

  WHAT MOVES (pick 1-2 per prompt):
  - Camera: slow push in, gentle pull back, imperceptible drift, holds steady
  - Character: breathes, blinks slowly, fingers trace, gaze lifts, shoulders drop, jaw softens, eyes close
  - Environment: light shifts, leaves drift past, curtain sways, dust catches light

  HOW IT FEELS (the secret ingredient — emotional language):
  - "The weight of the moment settles"
  - "Something is landing"
  - "The warmth reaches ${genderPossessive}"
  - "Something shifts inside"
  - "The silence holds"
  - "For the first time, there is space to breathe"

  MOOD STAMPS (end every motion prompt with 2-3 of these):
  "Quiet, still, cinematic." | "Cinematic, intimate, sacred." | "Tender. Honest. Real." | "Heavy. Present. True." | "Gentle. Searching. Alive."

  WHAT TO AVOID:
  - NEVER re-describe the setting, character appearance, or objects from the imagePrompt
  - No objects appearing or disappearing mid-scene
  - No complex hand interactions (don't pick up new objects)
  - No other people entering the frame
  - No dramatic weather changes within 5 seconds
  - No fast movements — Runway's magic is cinematic stillness with breath-like subtlety

DURATION HINT: Estimate seconds for each scene based on the script slice length (~2.5 words/second). Total should be 45–65 seconds.

EMOTIONAL ARC: Build a clear cinematic arc across all scenes:
  Scene 1: Establish the weight (tension, isolation, struggle)
  Scene 2: Deepen the feeling (the specific shape of this pain)
  Scene 3: The turning point (a crack of light, a moment of recognition)
  Scene 4: The shift (something changes inside the character)
  Scene 5: Opening up (the character reaching toward something greater)
  Scene 6: Resolution (not a Hollywood ending — a real, quiet, honest moment of hope)

LIGHTING ARC ACROSS SCENES: The lighting should progressively warm across the video. Scene 1 should feel cooler/darker. The final scene should feel like golden hour found its way indoors.

Return ONLY a JSON array. No markdown, no explanation, no commentary.

Each object:
- "sceneNumber": 1-based integer
- "location": short location label (e.g. "bedroom-night", "school-cafeteria", "park-bench-dusk"). Scenes with the same label share an anchor image. Different labels get separate anchor images.
- "scriptSlice": exact text from the script for this scene (every word, in order)
- "emotion": specific micro-emotion (2-6 words, not generic)
- "imagePrompt": complete cinematic photograph description (minimum 80 words) including full character description, shot type, body language, lighting, environment, objects, and the required suffix. MUST describe the SPECIFIC ENVIRONMENT matching the location label.
- "motionPrompt": precise animation direction (40-60 words) with one camera motion, one character action, one environmental detail
- "durationHint": estimated seconds (decimal)`;

  const userPrompt = `Topic: ${topicTitle}
Category: ${context.category}
${scriptureAnchor ? `Scripture: ${scriptureAnchor}` : ""}

Narration Script:
${script}

Generate the scene directions for this cinematic narrative video.`;

  console.log(
    `[scene-director] Generating scenes for "${topicTitle}" [${context.targetAgeGroup}, ${context.category}]`
  );

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.75,
    max_tokens: 6000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI for scene direction");
  }

  const cleaned = content
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  let scenes: CinematicScene[];
  try {
    scenes = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Failed to parse scene director response as JSON: ${cleaned.substring(0, 200)}`
    );
  }

  if (!Array.isArray(scenes) || scenes.length < 4 || scenes.length > 7) {
    throw new Error(
      `Expected 5–6 scenes, got ${Array.isArray(scenes) ? scenes.length : "non-array"}`
    );
  }

  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    s.sceneNumber = i + 1;
    if (!s.scriptSlice?.trim()) {
      throw new Error(`Scene ${i + 1} has empty scriptSlice`);
    }
    if (!s.imagePrompt?.trim()) {
      throw new Error(`Scene ${i + 1} has empty imagePrompt`);
    }
    if (!s.motionPrompt?.trim()) {
      s.motionPrompt =
        "The camera slowly pushes in. Subtle atmospheric motion.";
    }
    if (!s.emotion?.trim()) {
      s.emotion = "contemplative";
    }
    if (!s.location?.trim()) {
      s.location = `location-${i + 1}`;
    }
    if (typeof s.durationHint !== "number" || s.durationHint <= 0) {
      s.durationHint =
        s.scriptSlice.split(/\s+/).filter((w: string) => w.length > 0).length /
        2.5;
    }
  }

  const totalDuration = scenes.reduce((sum, s) => sum + s.durationHint, 0);
  const totalWords = scenes.reduce(
    (sum, s) =>
      sum +
      s.scriptSlice.split(/\s+/).filter((w: string) => w.length > 0).length,
    0
  );

  console.log(
    `[scene-director] Generated ${scenes.length} scenes for "${topicTitle}": ${totalWords} words, ~${totalDuration.toFixed(1)}s`
  );
  for (const s of scenes) {
    console.log(
      `[scene-director]   Scene ${s.sceneNumber} [${s.emotion}]: "${s.scriptSlice.substring(0, 50)}..." (~${s.durationHint.toFixed(1)}s)`
    );
  }

  return scenes;
}
