import { fetchWithTimeout } from "./api-client";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

const ELLEN_WHITE_VOICE = "XrExE9yKIg1WjnnlVkGX";

export interface HologramStep {
  id: string;
  order: number;
  title: string;
  text: string;
  spotlightTarget: string;
  videoUrl?: string;
  audioUrl?: string;
}

export interface FeatureGuide {
  featureId: string;
  title: string;
  text: string;
  spotlightTarget: string;
  videoUrl?: string;
  audioUrl?: string;
}

const ONBOARDING_STEPS: HologramStep[] = [
  {
    id: "welcome-verse",
    order: 1,
    title: "Welcome",
    text: "This is your daily verse — a fresh word from the Lord each morning to anchor your day in His promises.",
    spotlightTarget: "verse-of-day",
  },
  {
    id: "continue-study",
    order: 2,
    title: "Your Study Path",
    text: "Your current study awaits here. Tap to continue where you left off and let the Spirit guide your understanding.",
    spotlightTarget: "continue-study",
  },
  {
    id: "study-tab",
    order: 3,
    title: "Study",
    text: "The Study tab holds all your lessons, prophecy timelines, and topical deep dives. This is where understanding grows.",
    spotlightTarget: "tab-study",
  },
  {
    id: "connect-tab",
    order: 4,
    title: "Community",
    text: "Here in Connect, you will find your church family — local congregations, study groups, and fellow seekers of truth.",
    spotlightTarget: "tab-connect",
  },
  {
    id: "read-tab",
    order: 5,
    title: "Read",
    text: "Open the Scriptures here. Compare translations side by side, listen to narrated chapters, and let the Word speak to your heart.",
    spotlightTarget: "tab-read",
  },
  {
    id: "profile-growth",
    order: 6,
    title: "Your Growth",
    text: "Visit your profile to see how your spiritual journey unfolds. Track your reading, your studies, and your faithfulness over time.",
    spotlightTarget: "tab-profile",
  },
];

const FEATURE_GUIDES: Record<string, FeatureGuide> = {
  heatmap: {
    featureId: "heatmap",
    title: "Engagement Heatmap",
    text: "Welcome to your heatmap. Here you can see when your members are most active in their studies. The brighter the cell, the deeper the engagement. Use this to plan your outreach at the moments your flock is most receptive.",
    spotlightTarget: "heatmap-grid",
  },
  "leader-analytics": {
    featureId: "leader-analytics",
    title: "Member Analytics",
    text: "This is your shepherd's view. See how many souls are growing in the Word, which studies draw the most hearts, and where your pastoral attention may be most needed.",
    spotlightTarget: "analytics-overview",
  },
  "prophecy-timeline": {
    featureId: "prophecy-timeline",
    title: "Prophecy Timeline",
    text: "The great controversy between Christ and Satan is laid out before you here. Each point on this timeline connects Scripture to history, revealing God's hand through the ages.",
    spotlightTarget: "timeline-view",
  },
  "bible-reader": {
    featureId: "bible-reader",
    title: "Bible Reader",
    text: "Here you may read the sacred Word. Compare translations, highlight verses that speak to your soul, and listen as the Scriptures are read aloud to you.",
    spotlightTarget: "reader-view",
  },
};

export function getOnboardingSteps(): HologramStep[] {
  return ONBOARDING_STEPS;
}

export function getFeatureGuide(featureId: string): FeatureGuide | null {
  return FEATURE_GUIDES[featureId] || null;
}

export function getAllFeatureGuides(): FeatureGuide[] {
  return Object.values(FEATURE_GUIDES);
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

export async function generateHologramClip(text: string, clipId: string): Promise<{
  audioUrl: string;
  videoUrl: string;
}> {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const heygenKey = process.env.HEYGEN_API_KEY;
  if (!elevenLabsKey) throw new Error("ELEVENLABS_API_KEY not set");
  if (!heygenKey) throw new Error("HEYGEN_API_KEY not set");

  console.log(`[ellen-white] Generating hologram clip: ${clipId}`);

  const audioResponse = await fetchWithTimeout(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELLEN_WHITE_VOICE}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
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
  const localPath = path.join("/tmp", `ellen-white-clip-${clipId}-${Date.now()}.mp3`);
  fs.writeFileSync(localPath, audioBuffer);
  console.log(`[ellen-white] Audio: ${audioBuffer.length} bytes`);

  ensureCloudinary();
  const audioUpload = await cloudinary.uploader.upload(localPath, {
    resource_type: "video",
    folder: "grace-through-faith/ellen-white-hologram",
    public_id: `${clipId}-audio`,
    overwrite: true,
  });
  const audioUrl = audioUpload.secure_url;
  console.log(`[ellen-white] Audio uploaded: ${audioUrl}`);

  const photoPath = path.join(process.cwd(), "attached_assets", "3._Ellen_G._White_circa_1859_1774997674516.jpg");
  if (!fs.existsSync(photoPath)) {
    throw new Error(`Ellen White photo not found at ${photoPath}`);
  }
  const imgBuffer = fs.readFileSync(photoPath);

  const uploadRes = await fetch("https://upload.heygen.com/v1/talking_photo", {
    method: "POST",
    headers: {
      "X-Api-Key": heygenKey,
      "Content-Type": "image/jpeg",
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
  console.log(`[ellen-white] Talking photo ID: ${talkingPhotoId}`);

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
      title: `Ellen White Hologram - ${clipId}`,
    }),
  });

  if (!genRes.ok) {
    const errText = await genRes.text();
    throw new Error(`HeyGen generate failed: ${genRes.status} ${errText}`);
  }

  const genData = await genRes.json();
  const videoId = genData.data?.video_id;
  if (!videoId) throw new Error(`No video_id: ${JSON.stringify(genData)}`);
  console.log(`[ellen-white] Video ID: ${videoId}, polling...`);

  const videoUrl = await pollHeyGenVideo(videoId, heygenKey);

  const videoResponse = await fetch(videoUrl);
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  const videoLocalPath = path.join("/tmp", `ellen-white-clip-${clipId}-${Date.now()}.mp4`);
  fs.writeFileSync(videoLocalPath, videoBuffer);

  const videoUpload = await cloudinary.uploader.upload(videoLocalPath, {
    resource_type: "video",
    folder: "grace-through-faith/ellen-white-hologram",
    public_id: `${clipId}-video`,
    overwrite: true,
  });
  console.log(`[ellen-white] Video uploaded to Cloudinary: ${videoUpload.secure_url}`);

  fs.unlinkSync(localPath);
  fs.unlinkSync(videoLocalPath);

  return { audioUrl, videoUrl: videoUpload.secure_url };
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
    console.log(`[ellen-white] HeyGen status: ${status} (${attempt}/${maxAttempts})`);

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
