import { db } from "../db";
import { videoTopics, videoAvatars, topicVideos } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import {
  generateSceneDirections,
  analyzeScriptAge,
  type CinematicScene,
  type ScriptAgeGroup,
} from "./sceneDirectorService";
import { generateBrollImage, generateBrollVideo } from "./runwayService";
import { generateCinematicVoiceover } from "./cinematicVoiceoverService";
import {
  computeSceneTimings,
  getAudioDurationFromFile,
} from "./timingEngineService";
import { assembleCinematicVideo } from "./cinematicAssemblyService";
import fs from "fs";
import path from "path";

const CLOUDINARY_CLOUD_NAME = "dy77gwpzu";
const MUSIC_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/grace-through-faith/music`;

const AGE_CHARACTER_DEFAULTS: Record<string, { male: string; female: string }> = {
  "young disciples": {
    female: "A 14-year-old girl with a round face, braces, ponytail, wearing an oversized hoodie and backpack. She has soft, youthful features — clearly a middle schooler.",
    male: "A 14-year-old boy with a round face, slightly messy hair, wearing an oversized graphic tee and backpack. He has soft, youthful features — clearly a middle schooler.",
  },
  teens: {
    female: "A 17-year-old teenage girl (looks 17, NOT younger) with shoulder-length light brown hair, defined facial features, small gold hoop earrings, wearing a casual outfit appropriate for the scene. She has the build and proportions of a high school junior — tall enough to drive a car, mature facial structure, NOT a child.",
    male: "A 17-year-old teenage boy (looks 17, NOT younger) with short dark hair, defined jawline, casual clothing appropriate for the scene. He has the build and proportions of a high school junior — tall enough to drive a car, mature facial structure, NOT a child.",
  },
  "teens and young adults": {
    female: "A 19-year-old young woman with shoulder-length brown hair, defined cheekbones, small stud earrings, wearing a casual but intentional outfit. She has the look of a college freshman — independent, slightly tired, figuring things out.",
    male: "A 19-year-old young man with textured dark hair, defined jawline, wearing a casual layered outfit. He has the look of a college freshman — independent, slightly tired, figuring things out.",
  },
  "young adult": {
    female: "A 25-year-old woman with styled hair pulled back, subtle makeup, wearing smart-casual clothing — a fitted jacket over a simple top. She has the composed but quietly stressed look of someone building a career. Defined cheekbones, confident posture, tired but determined eyes. NOT a teenager.",
    male: "A 25-year-old man with a clean fade haircut, light stubble, wearing a button-down shirt with sleeves rolled up. He has the composed but quietly stressed look of someone building a career. Defined jawline, broad shoulders, tired but determined eyes. NOT a teenager.",
  },
  adult: {
    female: "A 35-year-old woman with shoulder-length hair showing early grays, laugh lines around her eyes, wearing comfortable but put-together clothing. She carries the weight of real responsibility — family, career, faith tested by life. Her hands show years of use. NOT young, NOT elderly — solidly mid-life.",
    male: "A 35-year-old man with short hair graying at the temples, visible crow's feet, wearing a worn but quality button-down shirt. He carries the weight of real responsibility — family, career, faith tested by life. His hands show years of work. NOT young, NOT elderly — solidly mid-life.",
  },
};

const DEFAULT_CHARACTER_FEMALE = AGE_CHARACTER_DEFAULTS.teens.female;
const DEFAULT_CHARACTER_MALE = AGE_CHARACTER_DEFAULTS.teens.male;

const VOICE_LIBRARY = [
  "kPzsL2i3teMYv0FxEYQ6",
  "DODLEQrClDo8wCz460ld",
  "MClEFoImJXBTgLwdLI5n",
  "6fZce9LFNG3iEITDfqZZ",
  "5DB4wgykoKoCu98YaGe6",
  "xZhTmJnxrn4YyTmPDrfZ",
  "UgBBYS2sOqTuMpoF3BR0",
  "6OzrBCQf8cjERkYgzSg8",
  "VCgLBmBjldJmfphyB8sZ",
];

function pickVoice(): string {
  return VOICE_LIBRARY[Math.floor(Math.random() * VOICE_LIBRARY.length)];
}

const CHARACTER_VARIATIONS = [
  { gender: "female", desc: "A 17-year-old Black teenage girl with natural curly hair pulled into a loose puff, warm brown skin, small stud earrings, wearing an oversized vintage sweater. She has the quiet confidence of someone who journals every night." },
  { gender: "male", desc: "A 16-year-old Latino teenage boy with wavy dark hair, a worn denim jacket over a plain tee, a thin silver chain necklace. He has the restless energy of someone who runs track but can't outrun his thoughts." },
  { gender: "female", desc: "A 18-year-old Asian teenage girl with straight black hair past her shoulders, wire-frame glasses, a flannel shirt tied at the waist. She looks like someone who reads too much and sleeps too little." },
  { gender: "male", desc: "A 17-year-old teenage boy with sandy blond hair and freckles, a faded baseball cap turned backward, a hoodie with the sleeves pushed up. He looks like he'd rather be outside than anywhere near a conversation about feelings." },
  { gender: "female", desc: "A 16-year-old mixed-race teenage girl with long braids, a denim jacket covered in enamel pins, high-top sneakers. She has the fierce-but-fragile look of someone who protects everyone but herself." },
  { gender: "male", desc: "A 18-year-old Black teenage boy with a fresh fade, a simple crewneck sweatshirt, and tired but kind eyes. He looks like the friend everyone goes to for advice but nobody asks how he's doing." },
  { gender: "female", desc: "A 17-year-old teenage girl with short auburn hair tucked behind her ears, no makeup, a soft gray cardigan over a plain shirt. She has the look of someone who just stopped pretending to be okay." },
  { gender: "male", desc: "A 17-year-old Middle Eastern teenage boy with dark curly hair, olive skin, wearing a plain black hoodie. He has the guarded expression of someone carrying something heavy that he hasn't told anyone about." },
  { gender: "female", desc: "A 15-year-old teenage girl with thick dark hair in a low ponytail, round face, wearing a school uniform with the tie loosened. She looks younger than her friends and hates it — but her eyes are older than anyone notices." },
  { gender: "male", desc: "A 16-year-old Pacific Islander teenage boy with broad shoulders, a gentle face, curly black hair, wearing a plain white tee. He's the biggest kid in youth group but the quietest one in the room." },
];

function pickCharacterVariation(topicVideoId?: string): typeof CHARACTER_VARIATIONS[0] | null {
  if (!topicVideoId) return null;
  const idx = Math.floor(Math.random() * CHARACTER_VARIATIONS.length);
  return CHARACTER_VARIATIONS[idx];
}

const DEFAULT_VOICE_FEMALE = VOICE_LIBRARY[0];
const DEFAULT_VOICE_MALE = VOICE_LIBRARY[0];

async function dbRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i < retries - 1 && (err?.message?.includes("terminated") || err?.message?.includes("ECONNRESET"))) {
        console.warn(`[narrative-pipeline] DB retry ${i + 1}/${retries}: ${err.message}`);
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      } else {
        throw err;
      }
    }
  }
  throw new Error("DB retries exhausted");
}

async function updateStatus(topicId: string, status: string, crossRefVideoId?: string) {
  if (crossRefVideoId) {
    await dbRetry(() =>
      db
        .update(topicVideos)
        .set({ assemblyStatus: status, updatedAt: new Date() })
        .where(eq(topicVideos.id, crossRefVideoId))
    );
  } else {
    await dbRetry(() =>
      db
        .update(videoTopics)
        .set({ assemblyStatus: status, updatedAt: new Date() })
        .where(eq(videoTopics.id, topicId))
    );
  }
  console.log(`[narrative-pipeline] Status → ${status} (${crossRefVideoId ? `crossRef=${crossRefVideoId}` : `topic=${topicId}`})`);
}

async function markFailed(topicId: string, stage: string, error: unknown, crossRefVideoId?: string) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const failureStatus = `failed:${stage}:${errorMsg.substring(0, 200)}`;
  try {
    if (crossRefVideoId) {
      await dbRetry(() =>
        db
          .update(topicVideos)
          .set({
            assemblyStatus: failureStatus,
            reviewStatus: "failed",
            updatedAt: new Date(),
          })
          .where(eq(topicVideos.id, crossRefVideoId))
      );
    } else {
      await dbRetry(() =>
        db
          .update(videoTopics)
          .set({
            assemblyStatus: failureStatus,
            reviewStatus: "failed",
            updatedAt: new Date(),
          })
          .where(eq(videoTopics.id, topicId))
      );
    }
  } catch (dbErr) {
    console.error(`[narrative-pipeline] Could not update failure status in DB:`, dbErr);
  }
  console.error(
    `[narrative-pipeline] FAILED at ${stage} (${crossRefVideoId ? `crossRef=${crossRefVideoId}` : `topic=${topicId}`}):`,
    errorMsg
  );
}

export async function runCinematicNarrativePipeline(
  topicId: string,
  topicVideoId?: string
): Promise<string> {
  const isCrossRef = !!topicVideoId;
  console.log(
    `[narrative-pipeline] ========== Starting cinematic narrative pipeline for topic=${topicId}${isCrossRef ? ` (cross-ref video=${topicVideoId})` : ""} ==========`
  );

  const [topic] = await db
    .select()
    .from(videoTopics)
    .where(eq(videoTopics.id, topicId));

  if (!topic) {
    throw new Error(`Topic not found: ${topicId}`);
  }

  let scriptText: string;
  let scriptureAnchor: string | null;

  if (isCrossRef) {
    const [crossRefVideo] = await db
      .select()
      .from(topicVideos)
      .where(eq(topicVideos.id, topicVideoId!));
    if (!crossRefVideo) {
      throw new Error(`Cross-ref topicVideo not found: ${topicVideoId}`);
    }
    if (!crossRefVideo.generatedScript?.trim()) {
      throw new Error(`Cross-ref video "${crossRefVideo.scriptureAnchor}" has no generated script`);
    }
    scriptText = crossRefVideo.generatedScript;
    scriptureAnchor = crossRefVideo.scriptureAnchor;
    console.log(`[narrative-pipeline] Cross-ref: reading script from topicVideos row (NOT parent topic)`);
  } else {
    if (!topic.generatedScript?.trim()) {
      throw new Error(`Topic "${topic.title}" has no generated script`);
    }
    scriptText = topic.generatedScript;
    scriptureAnchor = topic.scriptureAnchor || null;
  }

  if (!topic.musicTrack) {
    throw new Error(`Topic "${topic.title}" has no music track assigned`);
  }

  const musicTrackUrl = `${MUSIC_BASE_URL}/${topic.musicTrack}`;

  const { detectedGroup, scores, signals } = analyzeScriptAge(scriptText);
  const effectiveAgeGroup = detectedGroup;

  console.log(
    `[narrative-pipeline] Script Age Analysis: topic="${topic.title}"`
  );
  console.log(
    `[narrative-pipeline]   Topic default: "${topic.targetAgeGroup}" → Script detected: "${detectedGroup}"`
  );
  console.log(
    `[narrative-pipeline]   Scores: ${JSON.stringify(scores)}`
  );
  if (signals.length > 0) {
    console.log(
      `[narrative-pipeline]   Signals: ${signals.slice(0, 10).join(", ")}`
    );
  }

  let elevenlabsVoiceId = pickVoice();
  let avatarGender = "female";

  if (!isCrossRef && topic.avatarId) {
    const [avatar] = await db
      .select()
      .from(videoAvatars)
      .where(eq(videoAvatars.id, topic.avatarId));
    if (avatar) {
      avatarGender = avatar.gender || "female";
      if (avatar.elevenlabsVoiceId) {
        elevenlabsVoiceId = avatar.elevenlabsVoiceId;
      }
    }
  }

  const ageDefaults = AGE_CHARACTER_DEFAULTS[effectiveAgeGroup] || AGE_CHARACTER_DEFAULTS.teens;
  let characterDescription: string;

  if (isCrossRef) {
    const characterVariation = pickCharacterVariation(topicVideoId);
    if (characterVariation) {
      characterDescription = characterVariation.desc;
      avatarGender = characterVariation.gender;
    } else {
      const randomGender = Math.random() > 0.5 ? "male" : "female";
      avatarGender = randomGender;
      characterDescription = randomGender === "male" ? ageDefaults.male : ageDefaults.female;
    }
    console.log(
      `[narrative-pipeline] Cross-ref video — unique character (${avatarGender}), unique voice`
    );
  } else {
    let hasCustomCharacter = false;
    let customCharacterDescription = "";
    if (topic.avatarId) {
      const [avatar] = await db
        .select()
        .from(videoAvatars)
        .where(eq(videoAvatars.id, topic.avatarId));
      if (avatar?.characterDescription) {
        hasCustomCharacter = true;
        customCharacterDescription = avatar.characterDescription;
      }
    }
    if (hasCustomCharacter) {
      characterDescription = customCharacterDescription;
    } else {
      characterDescription = avatarGender === "male" ? ageDefaults.male : ageDefaults.female;
    }
  }

  let avoidLocations: string[] = [];
  if (isCrossRef) {
    const siblingVideos = await db
      .select({ cinematicScenes: topicVideos.cinematicScenes })
      .from(topicVideos)
      .where(eq(topicVideos.topicId, topicId));
    for (const sib of siblingVideos) {
      if (sib.cinematicScenes && Array.isArray(sib.cinematicScenes)) {
        for (const scene of sib.cinematicScenes as any[]) {
          if (scene.location && !avoidLocations.includes(scene.location)) {
            avoidLocations.push(scene.location);
          }
        }
      }
    }
    if (avoidLocations.length > 0) {
      console.log(
        `[narrative-pipeline] Avoiding ${avoidLocations.length} locations from sibling videos: ${avoidLocations.slice(0, 8).join(", ")}`
      );
    }
  }

  console.log(
    `[narrative-pipeline] Topic: "${topic.title}" | Effective Age: ${effectiveAgeGroup} | Category: ${topic.category} | Gender: ${avatarGender}`
  );
  console.log(
    `[narrative-pipeline] Character: ${characterDescription.substring(0, 80)}...`
  );
  console.log(`[narrative-pipeline] Voice: ${elevenlabsVoiceId}`);

  try {
    const statusTarget = isCrossRef ? topicVideoId : undefined;
    await updateStatus(topicId, "scene-directing", statusTarget);
    console.log(
      `[narrative-pipeline] Stage 1/7: Scene Director — breaking script into cinematic scenes...`
    );
    const scenes = await generateSceneDirections(
      scriptText,
      topic.title,
      scriptureAnchor,
      {
        targetAgeGroup: effectiveAgeGroup,
        category: topic.category || "Faith",
        characterDescription,
        gender: avatarGender,
        avoidLocations: avoidLocations.length > 0 ? avoidLocations : undefined,
      }
    );

    if (isCrossRef) {
      await db
        .update(topicVideos)
        .set({
          cinematicScenes: scenes as any,
          updatedAt: new Date(),
        })
        .where(eq(topicVideos.id, topicVideoId!));
    } else {
      await db
        .update(videoTopics)
        .set({
          cinematicScenes: scenes as any,
          updatedAt: new Date(),
        })
        .where(eq(videoTopics.id, topicId));
    }

    await updateStatus(topicId, "generating-anchor", statusTarget);
    console.log(
      `[narrative-pipeline] Stage 2/7: Generating location anchor images...`
    );

    const locationMap = new Map<string, number>();
    for (const scene of scenes) {
      const loc = scene.location || `scene-${scene.sceneNumber}`;
      if (!locationMap.has(loc)) {
        locationMap.set(loc, scene.sceneNumber - 1);
      }
    }

    const uniqueLocations = Array.from(locationMap.entries());
    console.log(
      `[narrative-pipeline] ${uniqueLocations.length} unique location(s): ${uniqueLocations.map(([loc]) => loc).join(", ")}`
    );

    const anchorImages = new Map<string, string>();
    let primaryAnchorUrl = "";
    for (const [loc, firstSceneIdx] of uniqueLocations) {
      const anchorScene = scenes[firstSceneIdx];
      console.log(
        `[narrative-pipeline]   Generating anchor for "${loc}" from scene ${firstSceneIdx + 1}...`
      );
      const anchorUrl = await generateBrollImage(anchorScene.imagePrompt);
      anchorImages.set(loc, anchorUrl);
      if (!primaryAnchorUrl) primaryAnchorUrl = anchorUrl;
      console.log(
        `[narrative-pipeline]   Anchor for "${loc}": ${anchorUrl.substring(0, 80)}...`
      );
    }

    if (!isCrossRef) {
      await db
        .update(videoTopics)
        .set({
          characterAnchorUrl: primaryAnchorUrl,
          updatedAt: new Date(),
        })
        .where(eq(videoTopics.id, topicId));
    }

    await updateStatus(topicId, "generating-scene-videos", statusTarget);
    console.log(
      `[narrative-pipeline] Stage 3/7: Animating ${scenes.length} scenes across ${uniqueLocations.length} locations...`
    );
    const sceneVideoUrls: string[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const loc = scene.location || `scene-${scene.sceneNumber}`;
      const anchorImageUrl = anchorImages.get(loc) || primaryAnchorUrl;
      console.log(
        `[narrative-pipeline]   Scene ${i + 1}/${scenes.length} [${scene.emotion}] @${loc}: "${scene.motionPrompt.substring(0, 60)}..."`
      );

      let videoUrl: string;
      try {
        videoUrl = await generateBrollVideo(anchorImageUrl, scene.motionPrompt);
      } catch (err) {
        console.warn(
          `[narrative-pipeline]   Scene ${i + 1} failed, retrying with simplified motion...`
        );
        videoUrl = await generateBrollVideo(
          anchorImageUrl,
          "The camera slowly pushes in. Subtle atmospheric motion."
        );
      }

      sceneVideoUrls.push(videoUrl);
      console.log(
        `[narrative-pipeline]   Scene ${i + 1} video complete: ${videoUrl.substring(0, 80)}...`
      );
    }

    await updateStatus(topicId, "generating-voiceover", statusTarget);
    console.log(
      `[narrative-pipeline] Stage 4/7: Generating ElevenLabs voiceover...`
    );
    const voiceoverUrl = await generateCinematicVoiceover(
      scriptText,
      elevenlabsVoiceId,
      topicId
    );
    console.log(
      `[narrative-pipeline] Voiceover generated: ${voiceoverUrl.substring(0, 80)}...`
    );

    if (isCrossRef) {
      await db
        .update(topicVideos)
        .set({ voiceoverUrl, updatedAt: new Date() })
        .where(eq(topicVideos.id, topicVideoId!));
    } else {
      await db
        .update(videoTopics)
        .set({ voiceoverUrl, updatedAt: new Date() })
        .where(eq(videoTopics.id, topicId));
    }

    await updateStatus(topicId, "computing-timing", statusTarget);
    console.log(
      `[narrative-pipeline] Stage 5/7: Computing scene timings from voiceover duration...`
    );

    const voiceoverTmpPath = path.join(
      "/tmp",
      `vo-timing-${topicId}-${Date.now()}.mp3`
    );
    const voResponse = await fetch(voiceoverUrl);
    const voBuf = Buffer.from(await voResponse.arrayBuffer());
    fs.writeFileSync(voiceoverTmpPath, voBuf);

    const audioDuration = getAudioDurationFromFile(voiceoverTmpPath);
    console.log(
      `[narrative-pipeline] Voiceover duration: ${audioDuration.toFixed(1)}s`
    );

    const sceneTimings = computeSceneTimings(scenes, audioDuration);

    try {
      fs.unlinkSync(voiceoverTmpPath);
    } catch {}

    await updateStatus(topicId, "assembling-video", statusTarget);
    console.log(
      `[narrative-pipeline] Stage 6/7: FFmpeg cinematic assembly...`
    );
    const assembledVideoUrl = await assembleCinematicVideo(
      sceneVideoUrls,
      sceneTimings,
      voiceoverUrl,
      musicTrackUrl,
      topic.title,
      topicId,
      scriptureAnchor
    );
    console.log(
      `[narrative-pipeline] Assembly complete: ${assembledVideoUrl}`
    );

    await updateStatus(topicId, "generating-thumbnail", statusTarget);
    console.log(
      `[narrative-pipeline] Stage 7/7: Generating thumbnail...`
    );
    const thumbnailUrl = assembledVideoUrl
      .replace(
        "/video/upload/",
        "/video/upload/w_1080,h_1920,c_fill,so_3,f_jpg/"
      )
      .replace(/\.mp4$/, ".jpg");

    await updateStatus(topicId, "complete", statusTarget);

    if (isCrossRef) {
      await dbRetry(() =>
        db
          .update(topicVideos)
          .set({
            finalVideoUrl: assembledVideoUrl,
            assembledVideoUrl,
            thumbnailUrl,
            voiceoverUrl,
            cinematicScenes: scenes as any,
            assemblyStatus: "complete",
            reviewStatus: "pending",
            updatedAt: new Date(),
          })
          .where(eq(topicVideos.id, topicVideoId!))
      );
      console.log(`[narrative-pipeline] Cross-ref video saved to topicVideos (parent topic NOT mutated)`);
    } else {
      await dbRetry(() =>
        db
          .update(videoTopics)
          .set({
            assembledVideoUrl,
            finalVideoUrl: assembledVideoUrl,
            thumbnailUrl,
            reviewStatus: "pending",
            assemblyStatus: "complete",
            status: "assembled",
            updatedAt: new Date(),
          })
          .where(eq(videoTopics.id, topicId))
      );
    }

    if (!isCrossRef && topic.scriptureAnchor) {
      const existing = await db
        .select({ id: topicVideos.id })
        .from(topicVideos)
        .where(
          and(
            eq(topicVideos.topicId, topicId),
            eq(topicVideos.scriptureAnchor, topic.scriptureAnchor)
          )
        );
      if (existing.length > 0) {
        await dbRetry(() =>
          db
            .update(topicVideos)
            .set({
              finalVideoUrl: assembledVideoUrl,
              assembledVideoUrl,
              thumbnailUrl,
              generatedScript: topic.generatedScript,
              voiceoverUrl,
              cinematicScenes: scenes as any,
              assemblyStatus: "complete",
              reviewStatus: "pending",
              updatedAt: new Date(),
            })
            .where(eq(topicVideos.id, existing[0].id))
        );
      } else {
        await dbRetry(() =>
          db.insert(topicVideos).values({
            topicId,
            scriptureAnchor: topic.scriptureAnchor,
            finalVideoUrl: assembledVideoUrl,
            assembledVideoUrl,
            thumbnailUrl,
            generatedScript: topic.generatedScript,
            voiceoverUrl,
            cinematicScenes: scenes as any,
            assemblyStatus: "complete",
            reviewStatus: "pending",
          })
        );
      }
    }

    console.log(
      `[narrative-pipeline] ========== PIPELINE COMPLETE for "${topic.title}" ==========`
    );
    console.log(
      `[narrative-pipeline]   Video: ${assembledVideoUrl}`
    );
    console.log(
      `[narrative-pipeline]   Thumbnail: ${thumbnailUrl}`
    );

    return assembledVideoUrl;
  } catch (error) {
    let currentStatus: string | null = null;
    if (isCrossRef) {
      currentStatus = (
        await db
          .select({ assemblyStatus: topicVideos.assemblyStatus })
          .from(topicVideos)
          .where(eq(topicVideos.id, topicVideoId!))
      )[0]?.assemblyStatus;
    } else {
      currentStatus = (
        await db
          .select({ assemblyStatus: videoTopics.assemblyStatus })
          .from(videoTopics)
          .where(eq(videoTopics.id, topicId))
      )[0]?.assemblyStatus;
    }

    const stage =
      currentStatus && !currentStatus.startsWith("failed")
        ? currentStatus
        : "unknown";
    await markFailed(topicId, stage, error, isCrossRef ? topicVideoId : undefined);
    throw error;
  }
}
