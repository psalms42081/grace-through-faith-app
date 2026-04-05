import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { v2 as cloudinary } from "cloudinary";
import { fetchWithTimeout } from "./api-client";
import { getFFmpegPath, getFFprobePath } from "./ffmpegPath";

function ensureCloudinaryConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary credentials");
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export interface VoiceSettingsOverride {
  stability?: number;
  similarity_boost?: number;
}

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function numberToWords(n: number): string {
  if (n === 0) return "zero";
  if (n < 0) return "negative " + numberToWords(-n);
  let result = "";
  if (n >= 1000000) {
    result += numberToWords(Math.floor(n / 1000000)) + " million ";
    n %= 1000000;
  }
  if (n >= 1000) {
    result += numberToWords(Math.floor(n / 1000)) + " thousand ";
    n %= 1000;
  }
  if (n >= 100) {
    result += ONES[Math.floor(n / 100)] + " hundred ";
    n %= 100;
    if (n > 0) result += "and ";
  }
  if (n >= 20) {
    result += TENS[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) {
    result += ONES[n] + " ";
  }
  return result.trim();
}

function normalizeNumbersForTTS(text: string): string {
  return text.replace(/(\d{1,3}(?:,\d{3})*|\d+)/g, (match) => {
    const num = parseInt(match.replace(/,/g, ""), 10);
    if (isNaN(num) || num > 999999999) return match;
    if (num <= 9 && !/\d/.test(text[text.indexOf(match) + match.length] || "")) return match;
    return numberToWords(num);
  });
}

function ensureSentenceBoundary(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const lastChar = trimmed[trimmed.length - 1];
  if (/[.!?;:—]/.test(lastChar)) return trimmed;
  if (/\d$/.test(trimmed) || /days?|years?|months?|cubits?|times?$/i.test(trimmed)) {
    return trimmed + ".";
  }
  if (/[a-zA-Z\d'"]$/.test(lastChar)) {
    return trimmed + ".";
  }
  return trimmed;
}

async function generateSingleVoiceClip(
  text: string,
  voiceId: string,
  outputPath: string,
  label: string,
  voiceSettingsOverride?: VoiceSettingsOverride
): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set");
  }

  const processedText = ensureSentenceBoundary(normalizeNumbersForTTS(text));

  console.log(
    `[cinematic-voiceover] Generating clip for ${label}, voice=${voiceId}, text=${processedText.length} chars`
  );

  const voiceSettings = {
    stability: voiceSettingsOverride?.stability ?? 0.55,
    similarity_boost: voiceSettingsOverride?.similarity_boost ?? 0.75,
  };

  const response = await fetchWithTimeout(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      service: "elevenlabs",
      serviceLabel: "cinematic-voiceover",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: processedText,
        model_id: "eleven_turbo_v2_5",
        voice_settings: voiceSettings,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  fs.writeFileSync(outputPath, buf);
  console.log(
    `[cinematic-voiceover] Clip ${label}: ${(buf.length / 1024).toFixed(0)} KB`
  );
}

function generateSilenceClip(
  durationSec: number,
  outputPath: string
): void {
  const ffmpeg = getFFmpegPath();
  const cmd = `${ffmpeg} -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${durationSec} -q:a 9 -acodec libmp3lame "${outputPath}" 2>/dev/null`;
  execSync(cmd, { timeout: 10000 });
}

function getAudioDuration(filePath: string): number {
  const ffprobe = getFFprobePath();
  try {
    const result = execSync(
      `${ffprobe} -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: "utf-8", timeout: 10000 }
    ).trim();
    return parseFloat(result) || 0;
  } catch {
    return 0;
  }
}

export interface VoiceSegment {
  text: string;
  voiceId: string;
  label: string;
  pauseAfterSec?: number;
  voiceSettings?: VoiceSettingsOverride;
}

export async function generateMultiVoiceNarration(
  segments: VoiceSegment[],
  episodeId: string,
  voiceSettingsOverride?: VoiceSettingsOverride
): Promise<string> {
  const tmpDir = path.join("/tmp", `multivoice-${episodeId}-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log(
    `[multi-voice] Generating ${segments.length} voice segments for episode ${episodeId}`
  );

  const clipPaths: string[] = [];
  let clipIndex = 0;

  for (const segment of segments) {
    if (!segment.text || segment.text.trim().length === 0) {
      if (segment.pauseAfterSec && segment.pauseAfterSec > 0) {
        const silencePath = path.join(tmpDir, `clip_${clipIndex}_silence.mp3`);
        generateSilenceClip(segment.pauseAfterSec, silencePath);
        clipPaths.push(silencePath);
        console.log(
          `[multi-voice]   Segment ${clipIndex + 1} [silence]: ${segment.pauseAfterSec}s pause`
        );
        clipIndex++;
      }
      continue;
    }

    const clipPath = path.join(tmpDir, `clip_${clipIndex}_voice.mp3`);
    const segmentSettings = segment.voiceSettings || voiceSettingsOverride;
    await generateSingleVoiceClip(
      segment.text,
      segment.voiceId,
      clipPath,
      segment.label,
      segmentSettings
    );

    const duration = getAudioDuration(clipPath);
    console.log(
      `[multi-voice]   Segment ${clipIndex + 1} [${segment.label}]: ${duration.toFixed(1)}s`
    );

    clipPaths.push(clipPath);
    clipIndex++;

    if (segment.pauseAfterSec && segment.pauseAfterSec > 0) {
      const pausePath = path.join(tmpDir, `clip_${clipIndex}_pause.mp3`);
      generateSilenceClip(segment.pauseAfterSec, pausePath);
      clipPaths.push(pausePath);
      clipIndex++;
    }
  }

  if (clipPaths.length === 0) {
    throw new Error("No audio segments generated");
  }

  console.log(
    `[multi-voice] Concatenating ${clipPaths.length} clips...`
  );

  const concatListPath = path.join(tmpDir, "concat.txt");
  const concatContent = clipPaths.map((p) => `file '${p}'`).join("\n");
  fs.writeFileSync(concatListPath, concatContent);

  const outputPath = path.join(tmpDir, "combined_voiceover.mp3");
  const ffmpeg = getFFmpegPath();
  execSync(
    `${ffmpeg} -y -f concat -safe 0 -i "${concatListPath}" -acodec libmp3lame -q:a 2 "${outputPath}" 2>/dev/null`,
    { timeout: 30000 }
  );

  const totalDuration = getAudioDuration(outputPath);
  const totalSize = fs.statSync(outputPath).size;
  console.log(
    `[multi-voice] Combined voiceover: ${totalDuration.toFixed(1)}s, ${(totalSize / 1024).toFixed(0)} KB`
  );

  ensureCloudinaryConfigured();

  const slug = episodeId.substring(0, 8);
  const publicId = `voiceover-${slug}-${Date.now()}`;

  const uploadResult = await cloudinary.uploader.upload(outputPath, {
    resource_type: "video",
    folder: "grace-through-faith/cinematic-voiceovers",
    public_id: publicId,
    overwrite: true,
  });

  try {
    for (const p of clipPaths) {
      try { fs.unlinkSync(p); } catch {}
    }
    try { fs.unlinkSync(concatListPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
    try { fs.rmdirSync(tmpDir); } catch {}
  } catch {}

  console.log(
    `[multi-voice] Uploaded to Cloudinary: ${uploadResult.secure_url}`
  );
  return uploadResult.secure_url;
}

export async function generateCinematicVoiceover(
  script: string,
  voiceId: string,
  topicId: string
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set");
  }

  console.log(
    `[cinematic-voiceover] Generating voiceover for topic=${topicId}, voice=${voiceId}, script=${script.length} chars`
  );

  const response = await fetchWithTimeout(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      service: "elevenlabs",
      serviceLabel: "cinematic-voiceover",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  console.log(
    `[cinematic-voiceover] Audio generated: ${(buf.length / 1024).toFixed(0)} KB`
  );

  const tmpDir = path.join("/tmp", `voiceover-${topicId}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, "voiceover.mp3");
  fs.writeFileSync(tmpPath, buf);

  ensureCloudinaryConfigured();

  const slug = topicId.substring(0, 8);
  const publicId = `voiceover-${slug}-${Date.now()}`;

  const uploadResult = await cloudinary.uploader.upload(tmpPath, {
    resource_type: "video",
    folder: "grace-through-faith/cinematic-voiceovers",
    public_id: publicId,
    overwrite: true,
  });

  try {
    fs.unlinkSync(tmpPath);
    fs.rmdirSync(tmpDir);
  } catch {}

  console.log(
    `[cinematic-voiceover] Uploaded to Cloudinary: ${uploadResult.secure_url}`
  );
  return uploadResult.secure_url;
}
