import { db } from "../db";
import { sabbathSchoolDiscussionPrep, characters } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const RACHEL_SLUG = "rachel-presenter";
const HEYGEN_API = "https://api.heygen.com";
const HEYGEN_UPLOAD = "https://upload.heygen.com";

function ensureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
  });
}

async function pollHeyGenVideo(
  videoId: string,
  apiKey: string,
  maxAttempts = 60
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    const res = await fetch(
      `${HEYGEN_API}/v1/video_status.get?video_id=${videoId}`,
      { headers: { "X-Api-Key": apiKey } }
    );
    const data = await res.json() as any;
    if (data.data?.status === "completed") {
      return data.data.video_url;
    }
    if (data.data?.status === "failed") {
      throw new Error(`HeyGen video failed: ${JSON.stringify(data)}`);
    }
  }
  throw new Error("HeyGen video polling timed out");
}

export async function generateLifeApplicationVideo(
  discussionPrepId: string,
  reflectionPrompts: string[],
  lessonTitle: string
): Promise<void> {
  const heygenKey = process.env.HEYGEN_API_KEY;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!heygenKey || !elevenLabsKey) {
    console.warn("[life-app-video] Missing API keys, skipping video generation");
    return;
  }

  try {
    // Get Rachel character from DB
    const [rachel] = await db
      .select()
      .from(characters)
      .where(eq(characters.slug, RACHEL_SLUG));

    if (!rachel?.cloudinaryUrl || !rachel?.voiceId) {
      console.warn("[life-app-video] Rachel character not found or incomplete");
      return;
    }

    const intro = `Hey! Let's talk about this week's lesson — "${lessonTitle}." Here are some things to really think about.`;
    const prompts = reflectionPrompts
      .slice(0, 3)
      .map((p, i) => `Number ${i + 1}. ${p.trim()}`)
      .join("\n\n");
    const outro = `Those are some powerful questions, right? Take a moment this week to really sit with them. I'll see you next time!`;
    const script = `${intro}\n\n${prompts}\n\n${outro}`.substring(0, 800);

    if (!script.trim()) {
      console.warn("[life-app-video] Empty script, skipping");
      return;
    }

    console.log(`[life-app-video] Generating for lesson: ${lessonTitle}`);
    console.log(`[life-app-video] Script (${script.length} chars): ${script.substring(0, 120)}...`);

    const audioRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${rachel.voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.70,
            similarity_boost: 0.85,
            style: 0.15,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!audioRes.ok) {
      throw new Error(`ElevenLabs failed: ${audioRes.status}`);
    }

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    const audioPath = `/tmp/life-app-audio-${discussionPrepId}.mp3`;
    fs.writeFileSync(audioPath, audioBuffer);

    ensureCloudinary();
    const audioUpload = await cloudinary.uploader.upload(audioPath, {
      resource_type: "video",
      folder: "grace-through-faith/life-application",
      public_id: `audio-${discussionPrepId}`,
      overwrite: true,
    });
    const audioUrl = audioUpload.secure_url;
    fs.unlinkSync(audioPath);

    // Step 2: Upload Rachel image to HeyGen as talking photo
    const imgRes = await fetch(rachel.cloudinaryUrl);
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    const uploadRes = await fetch(`${HEYGEN_UPLOAD}/v1/talking_photo`, {
      method: "POST",
      headers: {
        "X-Api-Key": heygenKey,
        "Content-Type": "image/png",
      },
      body: imgBuffer,
    });

    if (!uploadRes.ok) {
      throw new Error(`HeyGen photo upload failed: ${uploadRes.status}`);
    }

    const uploadData = await uploadRes.json() as any;
    const talkingPhotoId = uploadData.data?.talking_photo_id;
    if (!talkingPhotoId) {
      throw new Error(`No talking_photo_id returned`);
    }

    // Step 3: Generate HeyGen video
    const genRes = await fetch(`${HEYGEN_API}/v2/video/generate`, {
      method: "POST",
      headers: {
        "X-Api-Key": heygenKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: "talking_photo",
            talking_photo_id: talkingPhotoId,
          },
          voice: {
            type: "audio",
            audio_url: audioUrl,
          },
        }],
        dimension: { width: 720, height: 1280 },
        title: `Life Application - ${lessonTitle}`,
      }),
    });

    if (!genRes.ok) {
      throw new Error(`HeyGen generate failed: ${genRes.status}`);
    }

    const genData = await genRes.json() as any;
    const videoId = genData.data?.video_id;
    if (!videoId) throw new Error(`No video_id returned`);

    // Step 4: Poll for completion
    const videoUrl = await pollHeyGenVideo(videoId, heygenKey);

    // Step 5: Download and upload to Cloudinary
    const videoRes = await fetch(videoUrl);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const videoPath = `/tmp/life-app-video-${discussionPrepId}.mp4`;
    fs.writeFileSync(videoPath, videoBuffer);

    const videoUpload = await cloudinary.uploader.upload(videoPath, {
      resource_type: "video",
      folder: "grace-through-faith/life-application",
      public_id: `video-${discussionPrepId}`,
      overwrite: true,
    });
    fs.unlinkSync(videoPath);

    // Step 6: Store URL in DB
    await db
      .update(sabbathSchoolDiscussionPrep)
      .set({ lifeApplicationVideoUrl: videoUpload.secure_url })
      .where(eq(sabbathSchoolDiscussionPrep.id, discussionPrepId));

    console.log(`[life-app-video] Done: ${videoUpload.secure_url}`);

  } catch (err) {
    console.error("[life-app-video] Generation failed:", err);
    // Non-fatal — lesson still works without video
  }
}
