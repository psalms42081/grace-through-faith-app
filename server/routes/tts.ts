import { Router } from "express";
import crypto from "crypto";
import { textToSpeech, isValidVoice } from "../elevenlabs-tts";
import { ttsLimiter } from "../middleware/rate-limit";

const router = Router();

const MAX_CACHE_ENTRIES = 100;
const MAX_CACHE_BYTES = 50 * 1024 * 1024;
let cacheTotalBytes = 0;

const ttsCache = new Map<string, { buffer: Buffer; createdAt: number }>();

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
    const { text, voice = "george" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text is required" });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: "text too long (max 5000 chars)" });
    }
    const selectedVoice = isValidVoice(voice) ? voice : "george";
    console.log(`[TTS Route] voice param="${voice}" → selected="${selectedVoice}"`);

    const cacheKey = crypto.createHash("md5").update(`${selectedVoice}:${text}`).digest("hex");

    let audioBuffer: Buffer;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      audioBuffer = cached.buffer;
      cached.createdAt = Date.now();
      console.log(`[TTS Route] Cache hit for key=${cacheKey.slice(0, 8)}`);
    } else {
      audioBuffer = await textToSpeech(text, selectedVoice, "mp3");
      if (audioBuffer.length <= MAX_CACHE_BYTES) {
        while (ttsCache.size >= MAX_CACHE_ENTRIES || cacheTotalBytes + audioBuffer.length > MAX_CACHE_BYTES) {
          if (ttsCache.size === 0) break;
          evictOldest();
        }
        ttsCache.set(cacheKey, { buffer: audioBuffer, createdAt: Date.now() });
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
    const { text, voice = "george" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text is required" });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: "text too long (max 5000 chars)" });
    }
    const selectedVoice = isValidVoice(voice) ? voice : "george";
    const cacheKey = crypto.createHash("md5").update(`${selectedVoice}:${text}`).digest("hex");

    const existingPrepare = ttsCache.get(cacheKey);
    if (!existingPrepare) {
      console.log(`[TTS Prepare] Generating voice="${selectedVoice}", text=${text.length} chars`);
      const audioBuffer = await textToSpeech(text, selectedVoice, "mp3");
      if (audioBuffer.length <= MAX_CACHE_BYTES) {
        while (ttsCache.size >= MAX_CACHE_ENTRIES || cacheTotalBytes + audioBuffer.length > MAX_CACHE_BYTES) {
          if (ttsCache.size === 0) break;
          evictOldest();
        }
        ttsCache.set(cacheKey, { buffer: audioBuffer, createdAt: Date.now() });
        cacheTotalBytes += audioBuffer.length;
      }
    } else {
      existingPrepare.createdAt = Date.now();
      console.log(`[TTS Prepare] Cache hit key=${cacheKey.slice(0, 8)}`);
    }

    return res.json({ audioId: cacheKey });
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
