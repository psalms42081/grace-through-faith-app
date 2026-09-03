import { Router } from "express";
import {
  getPioneerChapterById,
  getPioneerReadingById,
  getPioneerShelf,
  getPioneerWeekReading,
  getPublishedPioneerReadings,
} from "../services/pioneerService";

const router = Router();

router.get("/week", async (_req, res) => {
  try {
    const payload = await getPioneerWeekReading();
    return res.json(payload);
  } catch (error) {
    console.error("[pioneers] week error:", error);
    return res.status(500).json({ error: "Pioneer reading unavailable" });
  }
});

router.get("/shelf", async (_req, res) => {
  try {
    const authors = await getPioneerShelf();
    return res.json({ authors });
  } catch (error) {
    console.error("[pioneers] shelf error:", error);
    return res.status(500).json({ error: "Pioneer shelf unavailable" });
  }
});

router.get("/readings", async (_req, res) => {
  try {
    const readings = await getPublishedPioneerReadings();
    return res.json({ readings });
  } catch (error) {
    console.error("[pioneers] readings error:", error);
    return res.status(500).json({ error: "Pioneer readings unavailable" });
  }
});

router.get("/readings/:id", async (req, res) => {
  try {
    const reading = await getPioneerReadingById(String(req.params.id));
    if (!reading) {
      return res.status(404).json({ error: "Pioneer reading not found" });
    }
    return res.json(reading);
  } catch (error) {
    console.error("[pioneers] reading error:", error);
    return res.status(500).json({ error: "Pioneer reading unavailable" });
  }
});

router.get("/chapter/:id", async (req, res) => {
  try {
    const chapter = await getPioneerChapterById(String(req.params.id));
    if (!chapter) {
      return res.status(404).json({ error: "Pioneer chapter not found" });
    }
    return res.json(chapter);
  } catch (error) {
    console.error("[pioneers] chapter error:", error);
    return res.status(500).json({ error: "Pioneer chapter unavailable" });
  }
});

export default router;
