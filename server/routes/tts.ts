import { Router } from "express";
import crypto from "crypto";
import { textToSpeech, isValidVoice } from "../elevenlabs-tts";
import { ttsLimiter } from "../middleware/rate-limit";

const router = Router();

const MAX_CACHE_ENTRIES = 100;
const MAX_CACHE_BYTES = 50 * 1024 * 1024;
let cacheTotalBytes = 0;

const ttsCache = new Map<string, { buffer: Buffer; createdAt: number; durationMs: number }>();

const MP3_BITRATES: Record<number, number[]> = {
  1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
};

const MP3_SAMPLE_RATES = [44100, 48000, 32000];

function getMp3DurationMs(buf: Buffer): number {
  let offset = 0;
  if (buf.length > 10 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    offset = 10 + size;
  }
  let totalSamples = 0;
  let sampleRate = 0;
  let frames = 0;
  while (offset + 4 < buf.length && frames < 50000) {
    if (buf[offset] === 0xff && (buf[offset + 1] & 0xe0) === 0xe0) {
      const b = buf[offset + 1];
      const c = buf[offset + 2];
      const version = (b >> 3) & 3;
      const layer = (b >> 1) & 3;
      if (version === 1 || layer === 0) { offset++; continue; }
      const bitrateIdx = (c >> 4) & 0x0f;
      const srIdx = (c >> 2) & 3;
      const padding = (c >> 1) & 1;
      if (bitrateIdx === 0 || bitrateIdx === 15 || srIdx === 3) { offset++; continue; }
      const isV1 = version === 3;
      const layerRow = layer === 3 ? 1 : layer === 2 ? 2 : 3;
      const brKey = isV1 ? layerRow : (layerRow === 1 ? 1 : 3);
      const bitrate = (MP3_BITRATES[brKey]?.[bitrateIdx] || 128) * 1000;
      const sr = isV1 ? MP3_SAMPLE_RATES[srIdx] : (version === 2 ? MP3_SAMPLE_RATES[srIdx] / 2 : MP3_SAMPLE_RATES[srIdx] / 4);
      if (!sampleRate) sampleRate = sr;
      const samplesPerFrame = isV1 ? 1152 : 576;
      const frameLen = Math.floor((samplesPerFrame * (bitrate / 8)) / sr) + padding;
      if (frameLen < 1) { offset++; continue; }
      totalSamples += samplesPerFrame;
      frames++;
      offset += frameLen;
    } else {
      offset++;
    }
  }
  if (!sampleRate || !frames) return 0;
  return Math.round((totalSamples / sampleRate) * 1000);
}

function evictOldest() {
  let oldest: string | null = null;
  let oldestTime = Infinity;
  for (const [key, val] of ttsCache) {
    if (val.createdAt < oldestTime) {
      oldestTime = val.createdAt;
      oldest = key;
    }
  }
  if (oldest) {
    const entry = ttsCache.get(oldest);
    if (entry) cacheTotalBytes -= entry.buffer.length;
    ttsCache.delete(oldest);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of ttsCache) {
    if (now - val.createdAt > 10 * 60 * 1000) {
      cacheTotalBytes -= val.buffer.length;
      ttsCache.delete(key);
    }
  }
}, 60 * 1000);

router.post("/api/tts", ttsLimiter, async (req, res) => {
  try {
    const { text, voice = "george", lang } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text is required" });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: "text too long (max 5000 chars)" });
    }
    const selectedVoice = isValidVoice(voice) ? voice : "george";
    const langCode: string | undefined = typeof lang === "string" ? lang : undefined;
    console.log(`[TTS Route] voice="${selectedVoice}", lang="${langCode ?? "en"}"`);

    const cacheKey = crypto.createHash("md5").update(`${selectedVoice}:${langCode ?? "en"}:${text}`).digest("hex");

    let audioBuffer: Buffer;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      audioBuffer = cached.buffer;
      cached.createdAt = Date.now();
      console.log(`[TTS Route] Cache hit for key=${cacheKey.slice(0, 8)}`);
    } else {
      audioBuffer = await textToSpeech(text, selectedVoice, "mp3", langCode);
      const durationMs = getMp3DurationMs(audioBuffer);
      if (audioBuffer.length <= MAX_CACHE_BYTES) {
        while (ttsCache.size >= MAX_CACHE_ENTRIES || cacheTotalBytes + audioBuffer.length > MAX_CACHE_BYTES) {
          if (ttsCache.size === 0) break;
          evictOldest();
        }
        ttsCache.set(cacheKey, { buffer: audioBuffer, createdAt: Date.now(), durationMs });
        cacheTotalBytes += audioBuffer.length;
      }
    }

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.length),
      "Cache-Control": "public, max-age=86400",
    });
    return res.send(audioBuffer);
  } catch (err) {
    console.error("TTS error:", err);
    return res.status(500).json({ error: "Text-to-speech failed" });
  }
});

router.post("/api/tts/prepare", ttsLimiter, async (req, res) => {
  try {
    const { text, voice = "george", lang } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text is required" });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: "text too long (max 5000 chars)" });
    }
    const selectedVoice = isValidVoice(voice) ? voice : "george";
    const langCode: string | undefined = typeof lang === "string" ? lang : undefined;
    const cacheKey = crypto.createHash("md5").update(`${selectedVoice}:${langCode ?? "en"}:${text}`).digest("hex");

    const existingPrepare = ttsCache.get(cacheKey);
    if (!existingPrepare) {
      console.log(`[TTS Prepare] Generating voice="${selectedVoice}", lang="${langCode ?? "en"}", text=${text.length} chars`);
      const audioBuffer = await textToSpeech(text, selectedVoice, "mp3", langCode);
      const durationMs = getMp3DurationMs(audioBuffer);
      if (audioBuffer.length <= MAX_CACHE_BYTES) {
        while (ttsCache.size >= MAX_CACHE_ENTRIES || cacheTotalBytes + audioBuffer.length > MAX_CACHE_BYTES) {
          if (ttsCache.size === 0) break;
          evictOldest();
        }
        ttsCache.set(cacheKey, { buffer: audioBuffer, createdAt: Date.now(), durationMs });
        cacheTotalBytes += audioBuffer.length;
      }
      return res.json({ audioId: cacheKey, durationMs });
    } else {
      existingPrepare.createdAt = Date.now();
      console.log(`[TTS Prepare] Cache hit key=${cacheKey.slice(0, 8)}`);
      return res.json({ audioId: cacheKey, durationMs: existingPrepare.durationMs });
    }
  } catch (err) {
    console.error("TTS prepare error:", err);
    return res.status(500).json({ error: "Text-to-speech preparation failed" });
  }
});

router.get("/api/tts/audio/:id", (req, res) => {
  const cached = ttsCache.get(req.params.id);
  if (!cached) {
    return res.status(404).json({ error: "Audio not found or expired" });
  }
  cached.createdAt = Date.now();
  res.set({
    "Content-Type": "audio/mpeg",
    "Content-Length": String(cached.buffer.length),
    "Cache-Control": "public, max-age=86400",
  });
  return res.send(cached.buffer);
});

export default router;
