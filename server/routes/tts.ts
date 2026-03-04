import { Router } from "express";
import { textToSpeech, isValidVoice } from "../openai-tts";
import { ttsLimiter } from "../middleware/rate-limit";

const router = Router();

router.post("/api/tts", ttsLimiter, async (req, res) => {
  try {
    const { text, voice = "nova" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text is required" });
    }
    const selectedVoice = isValidVoice(voice) ? voice : "nova";
    console.log(`[TTS Route] voice param="${voice}" → selected="${selectedVoice}"`);
    const audioBuffer = await textToSpeech(text, selectedVoice, "mp3");
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

// ─── KIDS CLUB ───────────────────────────────────────────────────────────────

  export default router;
  