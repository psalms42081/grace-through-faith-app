import { fetchWithTimeout } from "./services/api-client";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

const GREAT_CONTROVERSY_EXCERPT = `The great controversy between Christ and Satan, that has been carried forward for nearly six thousand years, is soon to close; and the wicked one redoubles his efforts to defeat the work of Christ in man's behalf and to fasten souls in his snares.`;

const ELLEN_WHITE_VOICE = "XrExE9yKIg1WjnnlVkGX"; // Matilda — knowledgeable, measured, period-appropriate for 1915 era

function ensureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary credentials");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

async function generateVoiceover(): Promise<{ audioUrl: string; localPath: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  console.log(`[ellen-white-poc] Generating voiceover with Matilda voice...`);
  console.log(`[ellen-white-poc] Voice settings: stability=0.90, style=0.05 (formal 1915 era cadence)`);

  const response = await fetchWithTimeout(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELLEN_WHITE_VOICE}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: GREAT_CONTROVERSY_EXCERPT,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.90,
          similarity_boost: 0.70,
          style: 0.05,
          use_speaker_boost: false,
        },
      }),
      service: "elevenlabs",
      serviceLabel: "ellen-white-poc-voiceover",
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs TTS failed: ${response.status} ${errText}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const localPath = path.join("/tmp", `ellen-white-poc-audio-${Date.now()}.mp3`);
  fs.writeFileSync(localPath, audioBuffer);
  console.log(`[ellen-white-poc] Audio saved locally: ${localPath} (${audioBuffer.length} bytes)`);

  ensureCloudinary();
  const uploadResult = await cloudinary.uploader.upload(localPath, {
    resource_type: "video",
    folder: "grace-through-faith/ellen-white-poc",
    public_id: `ellen-white-great-controversy-audio-${Date.now()}`,
    overwrite: true,
  });

  console.log(`[ellen-white-poc] Audio uploaded to Cloudinary: ${uploadResult.secure_url}`);
  return { audioUrl: uploadResult.secure_url, localPath };
}

async function uploadPhoto(): Promise<string> {
  const imagePath = path.join(process.cwd(), "attached_assets", "WhiteEllenGCA_1774995696794.jpg");
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Ellen White photo not found at ${imagePath}`);
  }

  ensureCloudinary();
  const uploadResult = await cloudinary.uploader.upload(imagePath, {
    resource_type: "image",
    folder: "grace-through-faith/ellen-white-poc",
    public_id: "ellen-white-portrait",
    overwrite: true,
  });

  console.log(`[ellen-white-poc] Photo uploaded to Cloudinary: ${uploadResult.secure_url}`);
  return uploadResult.secure_url;
}

async function uploadTalkingPhoto(photoUrl: string, apiKey: string): Promise<string> {
  console.log(`[ellen-white-poc] Uploading photo to HeyGen as talking photo...`);

  const imgRes = await fetch(photoUrl);
  if (!imgRes.ok) throw new Error(`Failed to download photo from Cloudinary: ${imgRes.status}`);
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
  console.log(`[ellen-white-poc] Downloaded photo: ${imgBuffer.length} bytes`);

  const uploadRes = await fetch("https://upload.heygen.com/v1/talking_photo", {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "image/jpeg",
    },
    body: imgBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`HeyGen talking photo upload failed: ${uploadRes.status} ${errText}`);
  }

  const data = await uploadRes.json();
  const talkingPhotoId = data.data?.talking_photo_id;
  if (!talkingPhotoId) {
    console.log(`[ellen-white-poc] Full HeyGen response: ${JSON.stringify(data)}`);
    throw new Error(`HeyGen did not return a talking_photo_id: ${JSON.stringify(data)}`);
  }

  console.log(`[ellen-white-poc] Talking photo ID: ${talkingPhotoId}`);
  return talkingPhotoId;
}

async function generateTalkingPhoto(photoUrl: string, audioUrl: string): Promise<string> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) throw new Error("HEYGEN_API_KEY not set");

  const talkingPhotoId = await uploadTalkingPhoto(photoUrl, apiKey);

  console.log(`[ellen-white-poc] Creating HeyGen lip-synced video...`);
  console.log(`[ellen-white-poc] Talking photo ID: ${talkingPhotoId}`);
  console.log(`[ellen-white-poc] Audio: ${audioUrl.substring(0, 80)}...`);

  const response = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: "talking_photo",
            talking_photo_id: talkingPhotoId,
          },
          voice: {
            type: "audio",
            audio_url: audioUrl,
          },
        },
      ],
      dimension: {
        width: 720,
        height: 1280,
      },
      title: "Ellen White - Great Controversy Reading (POC)",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[ellen-white-poc] HeyGen API error: ${response.status} ${errText}`);
    throw new Error(`HeyGen generate failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const videoId = data.data?.video_id;
  console.log(`[ellen-white-poc] HeyGen video ID: ${videoId}`);

  if (!videoId) {
    throw new Error(`HeyGen did not return a video_id: ${JSON.stringify(data)}`);
  }

  const videoUrl = await pollHeyGenVideo(videoId, apiKey);
  return videoUrl;
}

async function pollHeyGenVideo(videoId: string, apiKey: string): Promise<string> {
  const maxAttempts = 120;
  const pollIntervalMs = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      {
        headers: {
          "X-Api-Key": apiKey,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.warn(`[ellen-white-poc] Status check failed: ${response.status}`);
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      continue;
    }

    const data = await response.json();
    const status = data.data?.status;
    console.log(`[ellen-white-poc] HeyGen status: ${status} (attempt ${attempt}/${maxAttempts})`);

    if (status === "completed") {
      const videoUrl = data.data?.video_url;
      if (!videoUrl) throw new Error("HeyGen completed but no video_url returned");
      return videoUrl;
    }

    if (status === "failed") {
      throw new Error(`HeyGen video failed: ${JSON.stringify(data.data?.error || "Unknown")}`);
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(`HeyGen video ${videoId} timed out`);
}

export async function generateEllenWhitePOC(): Promise<{
  audioUrl: string;
  videoUrl: string;
  text: string;
}> {
  console.log(`\n[ellen-white-poc] ===== ELLEN WHITE HOLOGRAM POC =====`);
  console.log(`[ellen-white-poc] Text: The Great Controversy excerpt`);
  console.log(`[ellen-white-poc] Voice: Matilda — measured, formal, 1915-era cadence`);
  console.log(`[ellen-white-poc] Pipeline: ElevenLabs audio → Cloudinary upload → HeyGen talking photo lip-sync`);

  console.log(`\n[ellen-white-poc] Step 1/3: Generating period-appropriate voiceover...`);
  const { audioUrl } = await generateVoiceover();

  console.log(`\n[ellen-white-poc] Step 2/3: Uploading Ellen White portrait...`);
  const photoUrl = await uploadPhoto();

  console.log(`\n[ellen-white-poc] Step 3/3: Generating lip-synced talking photo via HeyGen...`);
  console.log(`[ellen-white-poc] This will take 2-5 minutes — HeyGen renders the lip sync animation...`);
  const videoUrl = await generateTalkingPhoto(photoUrl, audioUrl);

  console.log(`\n[ellen-white-poc] ===== POC COMPLETE =====`);
  console.log(`[ellen-white-poc] Audio: ${audioUrl}`);
  console.log(`[ellen-white-poc] Video: ${videoUrl}`);
  console.log(`[ellen-white-poc] Text: "${GREAT_CONTROVERSY_EXCERPT.substring(0, 60)}..."`);

  return {
    audioUrl,
    videoUrl,
    text: GREAT_CONTROVERSY_EXCERPT,
  };
}
