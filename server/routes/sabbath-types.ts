import { Router } from "express";
import { db } from "../db";
import { sabbathTypes, sabbathScriptures } from "../../shared/schema";
import { asc } from "drizzle-orm";

const router = Router();

router.get("/api/sabbath-types", async (_req, res) => {
  try {
    const types = await db
      .select()
      .from(sabbathTypes)
      .orderBy(asc(sabbathTypes.orderIndex));

    const scriptures = await db
      .select()
      .from(sabbathScriptures)
      .orderBy(asc(sabbathScriptures.orderIndex));

    const scripturesByType = new Map<string, typeof scriptures>();
    for (const s of scriptures) {
      const list = scripturesByType.get(s.sabbathTypeId) || [];
      list.push(s);
      scripturesByType.set(s.sabbathTypeId, list);
    }

    const result = types.map((t) => ({
      ...t,
      scriptures: scripturesByType.get(t.id) || [],
    }));

    res.json(result);
  } catch (err) {
    console.error("[sabbath-types] Error:", err);
    res.status(500).json({ error: "Failed to fetch sabbath types" });
  }
});

export default router;
