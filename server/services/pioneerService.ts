import { fetchWithTimeout } from "./api-client";
import { v2 as cloudinary } from "cloudinary";
import { db } from "../db";
import { pioneerVideos } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";

interface PioneerConfig {
  id: string;
  name: string;
  voiceId: string;
  photoPath: string;
}

const PIONEER_CONFIGS: PioneerConfig[] = [
  { id: "ellen-white", name: "Ellen G. White", voiceId: "XrExE9yKIg1WjnnlVkGX", photoPath: "assets/images/ellen-white-portrait.jpg" },
  { id: "james-white", name: "James White", voiceId: "6sFKzaJr574YWVu4UuJF", photoPath: "assets/images/james-white.jpg" },
  { id: "joseph-bates", name: "Joseph Bates", voiceId: "HAvvFKatz0uu0Fv55Riy", photoPath: "assets/images/joseph-bates.webp" },
  { id: "uriah-smith", name: "Uriah Smith", voiceId: "jXkeB46JcPXXUSxzn3MD", photoPath: "assets/images/uriah-smith.webp" },
  { id: "jn-andrews", name: "J.N. Andrews", voiceId: "zlTgutz4OiRUmJHbkQju", photoPath: "assets/images/john-andrews.jpg" },
];

export function getPioneerConfig(pioneerId: string): PioneerConfig | undefined {
  return PIONEER_CONFIGS.find((p) => p.id === pioneerId);
}

export function getAllPioneerConfigs(): PioneerConfig[] {
  return PIONEER_CONFIGS;
}

function ensureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary credentials");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

export async function generatePioneerClip(
  pioneerId: string,
  text: string,
  clipId: string,
  langCode: string = "en"
): Promise<{ audioUrl: string; videoUrl: string }> {
  const pioneer = getPioneerConfig(pioneerId);
  if (!pioneer) throw new Error(`Unknown pioneer: ${pioneerId}`);

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const heygenKey = process.env.HEYGEN_API_KEY;
  if (!elevenLabsKey) throw new Error("ELEVENLABS_API_KEY not set");
  if (!heygenKey) throw new Error("HEYGEN_API_KEY not set");

  const existing = await db.query.pioneerVideos.findFirst({
    where: and(
      eq(pioneerVideos.pioneerId, pioneerId),
      eq(pioneerVideos.clipId, clipId),
      eq(pioneerVideos.status, "completed")
    ),
  });
  if (existing?.videoUrl && existing?.audioUrl) {
    console.log(`[pioneer] Clip already exists: ${pioneerId}/${clipId}`);
    return { audioUrl: existing.audioUrl, videoUrl: existing.videoUrl };
  }

  console.log(`[pioneer] Generating clip: ${pioneerId}/${clipId}`);

  const audioResponse = await fetchWithTimeout(
    `https://api.elevenlabs.io/v1/text-to-speech/${pioneer.voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        ...(langCode && langCode !== "en" ? { language_code: langCode } : {}),
        voice_settings: {
          stability: 0.90,
          similarity_boost: 0.70,
          style: 0.05,
          use_speaker_boost: false,
        },
      }),
    },
    60000
  );

  if (!audioResponse.ok) {
    const errText = await audioResponse.text();
    throw new Error(`ElevenLabs TTS failed: ${audioResponse.status} ${errText}`);
  }

  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
  const localAudioPath = path.join("/tmp", `pioneer-clip-${pioneerId}-${clipId}-${Date.now()}.mp3`);
  fs.writeFileSync(localAudioPath, audioBuffer);
  console.log(`[pioneer] Audio: ${audioBuffer.length} bytes for ${pioneer.name}`);

  ensureCloudinary();
  const audioUpload = await cloudinary.uploader.upload(localAudioPath, {
    resource_type: "video",
    folder: `grace-through-faith/pioneer-hologram/${pioneerId}`,
    public_id: `${clipId}-audio`,
    overwrite: true,
  });
  const audioUrl = audioUpload.secure_url;
  console.log(`[pioneer] Audio uploaded: ${audioUrl}`);

  const photoPath = path.join(process.cwd(), pioneer.photoPath);
  if (!fs.existsSync(photoPath)) {
    throw new Error(`Pioneer photo not found at ${photoPath}`);
  }
  const imgBuffer = fs.readFileSync(photoPath);

  const contentType = pioneer.photoPath.endsWith(".webp") ? "image/webp" :
                       pioneer.photoPath.endsWith(".png") ? "image/png" : "image/jpeg";

  const uploadRes = await fetch("https://upload.heygen.com/v1/talking_photo", {
    method: "POST",
    headers: {
      "X-Api-Key": heygenKey,
      "Content-Type": contentType,
    },
    body: imgBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`HeyGen talking photo upload failed: ${uploadRes.status} ${errText}`);
  }

  const uploadData = await uploadRes.json();
  const talkingPhotoId = uploadData.data?.talking_photo_id;
  if (!talkingPhotoId) throw new Error(`No talking_photo_id: ${JSON.stringify(uploadData)}`);
  console.log(`[pioneer] Talking photo ID for ${pioneer.name}: ${talkingPhotoId}`);

  const genRes = await fetch("https://api.heygen.com/v2/video/generate", {
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
      title: `${pioneer.name} Hologram - ${clipId}`,
    }),
  });

  if (!genRes.ok) {
    const errText = await genRes.text();
    throw new Error(`HeyGen generate failed: ${genRes.status} ${errText}`);
  }

  const genData = await genRes.json();
  const heygenVideoId = genData.data?.video_id;
  if (!heygenVideoId) throw new Error(`No video_id: ${JSON.stringify(genData)}`);
  console.log(`[pioneer] HeyGen video ID: ${heygenVideoId}, polling...`);

  await db.insert(pioneerVideos).values({
    pioneerId,
    clipId,
    script: text,
    voiceId: pioneer.voiceId,
    audioUrl,
    status: "processing",
    heygenVideoId,
  }).onConflictDoUpdate({
    target: [pioneerVideos.pioneerId, pioneerVideos.clipId],
    set: { status: "processing", heygenVideoId, audioUrl, updatedAt: new Date() },
  });

  const videoUrl = await pollHeyGenVideo(heygenVideoId, heygenKey);

  const videoResponse = await fetch(videoUrl);
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  const videoLocalPath = path.join("/tmp", `pioneer-clip-${pioneerId}-${clipId}-${Date.now()}.mp4`);
  fs.writeFileSync(videoLocalPath, videoBuffer);

  const videoUpload = await cloudinary.uploader.upload(videoLocalPath, {
    resource_type: "video",
    folder: `grace-through-faith/pioneer-hologram/${pioneerId}`,
    public_id: `${clipId}-video`,
    overwrite: true,
  });
  const finalVideoUrl = videoUpload.secure_url;
  console.log(`[pioneer] Video uploaded: ${finalVideoUrl}`);

  await db.update(pioneerVideos)
    .set({ status: "completed", videoUrl: finalVideoUrl, updatedAt: new Date() })
    .where(and(eq(pioneerVideos.pioneerId, pioneerId), eq(pioneerVideos.clipId, clipId)));

  fs.unlinkSync(localAudioPath);
  fs.unlinkSync(videoLocalPath);

  return { audioUrl, videoUrl: finalVideoUrl };
}

async function pollHeyGenVideo(videoId: string, apiKey: string): Promise<string> {
  const maxAttempts = 120;
  const pollIntervalMs = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      { headers: { "X-Api-Key": apiKey, "Accept": "application/json" } }
    );

    if (!response.ok) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      continue;
    }

    const data = await response.json();
    const status = data.data?.status;
    console.log(`[pioneer] HeyGen status: ${status} (${attempt}/${maxAttempts})`);

    if (status === "completed") {
      const url = data.data?.video_url;
      if (!url) throw new Error("HeyGen completed but no video_url");
      return url;
    }

    if (status === "failed") {
      throw new Error(`HeyGen video failed: ${JSON.stringify(data.data?.error || "Unknown")}`);
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(`HeyGen video ${videoId} timed out`);
}

export async function getPioneerClipStatus(pioneerId: string, clipId: string) {
  return db.query.pioneerVideos.findFirst({
    where: and(
      eq(pioneerVideos.pioneerId, pioneerId),
      eq(pioneerVideos.clipId, clipId)
    ),
  });
}

export async function getAllPioneerClips(pioneerId: string) {
  return db.select().from(pioneerVideos).where(eq(pioneerVideos.pioneerId, pioneerId));
}
