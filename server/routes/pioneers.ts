import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getAuthUserId } from "../middleware/auth";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import {
  getAllPioneerConfigs,
  getPioneerConfig,
  generatePioneerClip,
  getPioneerClipStatus,
  getAllPioneerClips,
} from "../services/pioneerService";
import { translateText } from "../services/translationService";
import { normalizeLanguageCode } from "../services/languageAwareContent";

const router = Router();

router.get("/api/pioneers", (_req, res) => {
  const configs = getAllPioneerConfigs();
  return res.json(configs.map((p) => ({
    id: p.id,
    name: p.name,
    voiceId: p.voiceId,
  })));
});

router.get("/api/pioneers/:pioneerId/clips", requireAuth, async (req, res) => {
  try {
    const clips = await getAllPioneerClips(req.params.pioneerId);
    return res.json(clips);
  } catch (err) {
    console.error("[pioneers] Error fetching clips:", err);
    return res.status(500).json({ error: "Failed to fetch clips" });
  }
});

router.get("/api/pioneers/:pioneerId/clips/:clipId", requireAuth, async (req, res) => {
  try {
    const clip = await getPioneerClipStatus(req.params.pioneerId, req.params.clipId);
    if (!clip) {
      return res.status(404).json({ error: "Clip not found" });
    }
    return res.json(clip);
  } catch (err) {
    console.error("[pioneers] Error fetching clip:", err);
    return res.status(500).json({ error: "Failed to fetch clip" });
  }
});

router.post("/api/pioneers/:pioneerId/generate", requireAuth, async (req, res) => {
  try {
    const { pioneerId } = req.params;
    const { text, clipId, lang } = req.body;

    if (!text?.trim() || !clipId?.trim()) {
      return res.status(400).json({ error: "text and clipId are required" });
    }

    const config = getPioneerConfig(pioneerId);
    if (!config) {
      return res.status(404).json({ error: `Unknown pioneer: ${pioneerId}` });
    }

    const langCode = normalizeLanguageCode(lang);
    const translatedText = langCode !== "en"
      ? await translateText(text.trim(), langCode)
      : text.trim();

    const result = await generatePioneerClip(pioneerId, translatedText, clipId.trim(), langCode);
    return res.json({ ...result, lang: langCode });
  } catch (err) {
    console.error("[pioneers] Generate error:", err);
    return res.status(500).json({ error: "An error occurred. Please try again." });
  }
});

router.post("/api/pioneer/onboarding-complete", requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    await db.update(users).set({ hologramOnboardingSeen: true }).where(eq(users.id, userId));
    return res.json({ success: true });
  } catch (err) {
    console.error("[pioneer] onboarding-complete error:", err);
    return res.status(500).json({ error: "Failed to update" });
  }
});

router.post("/api/pioneer/onboarding-reset", requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    await db.update(users).set({ hologramOnboardingSeen: false }).where(eq(users.id, userId));
    return res.json({ success: true });
  } catch (err) {
    console.error("[pioneer] onboarding-reset error:", err);
    return res.status(500).json({ error: "Failed to update" });
  }
});

export default router;
