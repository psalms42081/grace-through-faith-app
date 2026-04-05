import {
  generateBibleStoryScript,
  type BibleStoryScript,
  type BibleStoryScene,
} from "./services/scriptGeneratorService";
import {
  runBiblicalEpisodePipeline,
  type EpisodeGenerationConfig,
  type EpisodeSceneConfig,
} from "./services/biblicalEpisodePipeline";
import { BIBLICAL_VOICE_ROLES, resolveVoiceId, VOICE_METADATA, ELEVENLABS_VOICES } from "./elevenlabs-tts";
import {
  generateMultiVoiceNarration,
  type VoiceSegment,
} from "./services/cinematicVoiceoverService";
import {
  getActiveCharacters,
  matchCharactersToScene,
} from "./services/characterService";
import type { Character } from "../shared/schema";

const MUSIC_TRACK = "cinematic-ambient-emotional.mp3";

async function loadActiveCharacters(): Promise<Character[]> {
  const chars = await getActiveCharacters();
  console.log(`[bible-story-pipeline] Loaded ${chars.length} active characters from database`);
  return chars;
}

const PROPHETIC_BOOKS = [
  "revelation", "daniel", "ezekiel", "isaiah", "jeremiah",
  "joel", "amos", "obadiah", "micah", "nahum", "habakkuk",
  "zephaniah", "haggai", "zechariah", "malachi",
];

function isPropheticScripture(scriptureReference: string): boolean {
  const lower = scriptureReference.toLowerCase().trim();
  return PROPHETIC_BOOKS.some((book) => lower.startsWith(book));
}

const OT_BOOKS = [
  "genesis", "exodus", "leviticus", "numbers", "deuteronomy",
  "joshua", "judges", "ruth", "1 samuel", "2 samuel", "1 kings", "2 kings",
  "1 chronicles", "2 chronicles", "ezra", "nehemiah", "esther",
  "job", "psalm", "psalms", "proverbs", "ecclesiastes", "song of solomon",
  "isaiah", "jeremiah", "lamentations", "ezekiel", "daniel",
  "hosea", "joel", "amos", "obadiah", "jonah", "micah", "nahum",
  "habakkuk", "zephaniah", "haggai", "zechariah", "malachi",
];

function getPeriodConstraints(scriptureReference: string): string {
  const lower = scriptureReference.toLowerCase().trim();
  const isOT = OT_BOOKS.some((book) => lower.startsWith(book));
  if (isOT) {
    return "ancient Near Eastern setting, Old Testament era clothing and architecture, dark hair, olive skin, no modern elements";
  }
  return "ancient Near Eastern setting, first-century clothing, dark hair, olive skin, no modern elements";
}

let _currentPeriodConstraints = "ancient Near Eastern setting, first-century clothing, dark hair, olive skin, no modern elements";

function bibleStorySceneToEpisodeScene(
  scene: BibleStoryScene,
  activeChars: Character[]
): EpisodeSceneConfig {
  const locationSlug = scene.visual
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .substring(0, 30);

  const charRefs = matchCharactersToScene(activeChars, scene.visual, scene.character);

  const motionPrompt = buildMotionPrompt(scene);

  return {
    sceneNumber: scene.sceneNumber,
    scriptSlice: scene.audioText || "",
    emotion: scene.mood,
    imagePrompt: `${scene.visual}, ${_currentPeriodConstraints}, anatomically correct humans with exactly two hands and two arms, cinematic naturalistic photography, shallow depth of field, 9:16 vertical`,
    motionPrompt,
    durationHint: scene.durationTarget,
    location: locationSlug,
    characterReferenceUrls: charRefs.length > 0 ? charRefs : undefined,
  };
}

function buildMotionPrompt(scene: BibleStoryScene): string {
  const isDialogue = scene.audioType === "dialogue";
  const isSilence = scene.audioType === "silence";

  if (isSilence) {
    return "Extremely slow, almost imperceptible camera pull-back. Gentle atmospheric motion only. Peaceful stillness. No fast movement.";
  }

  if (isDialogue) {
    return `Steady camera, very subtle breathing motion only. The subject is still, speaking. Minimal movement. No camera pan or zoom. ${scene.mood}. Cinematic stillness.`;
  }

  const hasAction = /break|pour|lift|roll|run|walk|take|hand|pick/i.test(scene.visual);
  if (hasAction) {
    return `${scene.camera}. Very slow, deliberate motion. Each movement is unhurried and graceful. No time-lapse effect. Cinematic slow pace. ${scene.mood}.`;
  }

  return `${scene.camera}. Slow cinematic pace. Subtle atmospheric motion — gentle dust, flickering lamplight, soft fabric sway. ${scene.mood}.`;
}

function buildVoiceSegments(script: BibleStoryScript): VoiceSegment[] {
  const segments: VoiceSegment[] = [];

  for (const scene of script.scenes) {
    if (!scene.audioText || scene.audioText.trim().length === 0) {
      if (scene.audioType === "silence") {
        segments.push({
          text: "",
          voiceId: BIBLICAL_VOICE_ROLES.narrator,
          label: `scene-${scene.sceneNumber}-silence`,
          pauseAfterSec: Math.max(2, scene.durationTarget * 0.5),
        });
      }
      continue;
    }

    const voiceRole = scene.voice?.toLowerCase() || "narrator";
    const voiceId = resolveVoiceId(voiceRole);
    const voiceName = Object.entries(ELEVENLABS_VOICES).find(([, id]) => id === voiceId)?.[0] || voiceRole;

    segments.push({
      text: scene.audioText.trim(),
      voiceId,
      label: `scene-${scene.sceneNumber}-${voiceRole} (${voiceName})`,
      pauseAfterSec: scene.audioType === "dialogue" ? 1.0 : 0.6,
    });
  }

  return segments;
}

export async function runBibleStoryPipeline(
  scriptureReference: string,
  title: string,
  episodeId: string,
  passageText?: string
): Promise<string> {
  console.log(
    `\n[bible-story-pipeline] ===== STARTING BIBLE STORY PIPELINE =====`
  );
  console.log(`[bible-story-pipeline] Title: "${title}"`);
  console.log(`[bible-story-pipeline] Scripture: ${scriptureReference}`);
  console.log(`[bible-story-pipeline] Episode ID: ${episodeId}`);

  console.log(
    `\n[bible-story-pipeline] Step 1: Generating structured script from scripture...`
  );
  const storyScript = await generateBibleStoryScript(
    scriptureReference,
    title,
    passageText ? { passageText } : undefined
  );

  console.log(`[bible-story-pipeline] Script generated:`);
  console.log(
    `[bible-story-pipeline]   Scenes: ${storyScript.scenes.length}`
  );
  console.log(
    `[bible-story-pipeline]   Runtime: ${storyScript.estimatedRuntime}`
  );
  console.log(
    `[bible-story-pipeline]   Voices: ${Object.keys(storyScript.voiceAssignments).join(", ")}`
  );

  console.log(
    `\n[bible-story-pipeline] Step 2: Voice assignments (multi-voice):`
  );
  for (const [role, desc] of Object.entries(storyScript.voiceAssignments)) {
    const voiceId = resolveVoiceId(role);
    const voiceName = Object.entries(ELEVENLABS_VOICES).find(([, id]) => id === voiceId)?.[0] || "unknown";
    const meta = VOICE_METADATA[voiceName];
    console.log(
      `[bible-story-pipeline]   ${role} → ${voiceName} (${meta?.style || desc})`
    );
  }

  console.log(
    `\n[bible-story-pipeline] Step 3: Generating multi-voice narration...`
  );
  const voiceSegments = buildVoiceSegments(storyScript);
  console.log(
    `[bible-story-pipeline]   ${voiceSegments.length} voice segments to generate`
  );

  const prophetic = isPropheticScripture(scriptureReference);
  if (prophetic) {
    console.log(
      `[bible-story-pipeline]   Prophetic content detected — using Bill voice for narrator with cinematic TTS settings`
    );
    const propheticSettings = { stability: 0.8, similarity_boost: 0.6 };
    for (const seg of voiceSegments) {
      if (seg.voiceId === BIBLICAL_VOICE_ROLES.narrator) {
        seg.voiceId = ELEVENLABS_VOICES.bill;
        seg.voiceSettings = propheticSettings;
      }
    }
  }

  const voiceoverUrl = await generateMultiVoiceNarration(
    voiceSegments,
    episodeId
  );
  console.log(
    `[bible-story-pipeline]   Multi-voice voiceover: ${voiceoverUrl}`
  );

  console.log(
    `\n[bible-story-pipeline] Step 4: Loading characters & converting scenes to pipeline format...`
  );
  const activeChars = await loadActiveCharacters();
  _currentPeriodConstraints = getPeriodConstraints(scriptureReference);
  console.log(
    `[bible-story-pipeline]   Period constraints: ${_currentPeriodConstraints}`
  );
  const episodeScenes: EpisodeSceneConfig[] = storyScript.scenes.map(
    (scene) => bibleStorySceneToEpisodeScene(scene, activeChars)
  );

  const fullScript = storyScript.scenes
    .filter((s) => s.audioText && s.audioText.trim().length > 0)
    .map((s) => s.audioText.trim())
    .join("\n\n");

  const episodeConfig: EpisodeGenerationConfig = {
    episodeId,
    script: fullScript,
    voiceId: BIBLICAL_VOICE_ROLES.narrator,
    musicTrack: MUSIC_TRACK,
    scenes: episodeScenes,
    scriptureAnchor: scriptureReference,
    episodeTitle: title,
    cachedVoiceoverUrl: voiceoverUrl,
  };

  console.log(`\n[bible-story-pipeline] Step 5: Pipeline config ready:`);
  console.log(`[bible-story-pipeline]   Narrator: george (${BIBLICAL_VOICE_ROLES.narrator})`);
  console.log(`[bible-story-pipeline]   Multi-voice voiceover: CACHED`);
  console.log(`[bible-story-pipeline]   Music: ${MUSIC_TRACK}`);
  console.log(`[bible-story-pipeline]   Scenes: ${episodeScenes.length}`);
  for (const scene of episodeScenes) {
    console.log(
      `[bible-story-pipeline]     Scene ${scene.sceneNumber} [${scene.emotion}] @${scene.location}: "${scene.scriptSlice.substring(0, 50)}..."`
    );
  }

  console.log(
    `\n[bible-story-pipeline] Step 6: Launching Runway visual pipeline...`
  );
  console.log(
    `[bible-story-pipeline] This will generate ${episodeScenes.length} Runway images + videos, then FFmpeg assembly.`
  );
  console.log(
    `[bible-story-pipeline] Estimated time: 10-15 minutes.\n`
  );

  const videoUrl = await runBiblicalEpisodePipeline(episodeConfig);

  console.log(
    `\n[bible-story-pipeline] ===== PIPELINE COMPLETE =====`
  );
  console.log(`[bible-story-pipeline] Video URL: ${videoUrl}`);
  return videoUrl;
}

const _isDirectCLI = process.argv[1]?.replace(/\\/g, "/").endsWith("/run-bible-story-pipeline.ts") ||
  process.argv[1]?.replace(/\\/g, "/").endsWith("/run-bible-story-pipeline.js");
if (_isDirectCLI) {
  const episodeId =
    process.argv[2] || `bible-story-${Date.now().toString(36)}`;
  const ref = process.argv[3] || "Matthew 28:1-10";
  const title = process.argv[4] || "He Is Risen";
  const passageText = process.argv[5] || undefined;

  runBibleStoryPipeline(ref, title, episodeId, passageText)
    .then((url) => {
      console.log(`\nFINAL VIDEO: ${url}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`\nPIPELINE FAILED:`, err);
      process.exit(1);
    });
}
