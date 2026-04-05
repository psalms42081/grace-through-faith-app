import { Router, Request, Response } from "express";
import {
  getOnboardingSteps,
  getFeatureGuide,
  getAllFeatureGuides,
  generateHologramClip,
} from "../services/ellenWhiteService";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/onboarding", (_req: Request, res: Response) => {
  const steps = getOnboardingSteps();
  res.json({ steps });
});

router.get("/guides", (_req: Request, res: Response) => {
  const guides = getAllFeatureGuides();
  res.json({ guides });
});

router.get("/guide/:featureId", (req: Request, res: Response) => {
  const guide = getFeatureGuide(req.params.featureId);
  if (!guide) {
    res.status(404).json({ error: "Feature guide not found" });
    return;
  }
  res.json({ guide });
});

const CLIP_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_TEXT_LENGTH = 1000;

router.post("/generate", requireAuth, async (req: Request, res: Response) => {
  try {
    const { text, clipId } = req.body;
    if (!text || !clipId) {
      res.status(400).json({ error: "text and clipId are required" });
      return;
    }
    if (typeof text !== "string" || text.length > MAX_TEXT_LENGTH) {
      res.status(400).json({ error: `text must be a string under ${MAX_TEXT_LENGTH} characters` });
      return;
    }
    if (typeof clipId !== "string" || !CLIP_ID_REGEX.test(clipId)) {
      res.status(400).json({ error: "clipId must be alphanumeric, dashes, or underscores (1-64 chars)" });
      return;
    }

    const result = await generateHologramClip(text, clipId);
    res.json(result);
  } catch (error: any) {
    console.error("[ellen-white] Generation error:", error.message);
    res.status(500).json({ error: "Video generation failed" });
  }
});

export default router;
