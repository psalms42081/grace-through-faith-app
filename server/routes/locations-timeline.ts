import { Router } from "express";
import { db } from "../db";
import { getErrorStatusCode } from "../services/ai-semaphore";
import {
  bibleBooks,
  bibleVerses,
  locations,
  locationVerseMaps,
  timelineEvents,
  eventVerseMaps,
} from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/api/location", async (req, res) => {
  try {
    const allLocations = await db.select().from(locations);
    return res.json(allLocations);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/location/:id", async (req, res) => {
  try {
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, String(req.params.id)))
      .limit(1);

    if (!location.length) {
      return res.status(404).json({ error: "Location not found" });
    }

    return res.json(location[0]);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/timeline", async (req, res) => {
  try {
    const events = await db
      .select()
      .from(timelineEvents)
      .orderBy(timelineEvents.yearApprox);

    const seen = new Set<string>();
    const deduped = events.filter((e) => {
      if (seen.has(e.title)) return false;
      seen.add(e.title);
      return true;
    });

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.json(deduped);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/location/:id/verses", async (req, res) => {
  try {
    const rows = await db
      .select({
        verseId: locationVerseMaps.verseId,
        note: locationVerseMaps.note,
        bookId: bibleVerses.bookId,
        chapter: bibleVerses.chapter,
        verse: bibleVerses.verse,
        text: bibleVerses.text,
        bookName: bibleBooks.name,
      })
      .from(locationVerseMaps)
      .innerJoin(bibleVerses, eq(locationVerseMaps.verseId, bibleVerses.id))
      .innerJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
      .where(eq(locationVerseMaps.locationId, String(req.params.id)));
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/timeline/:id/verses", async (req, res) => {
  try {
    const rows = await db
      .select({
        verseId: eventVerseMaps.verseId,
        bookId: bibleVerses.bookId,
        chapter: bibleVerses.chapter,
        verse: bibleVerses.verse,
        text: bibleVerses.text,
        bookName: bibleBooks.name,
      })
      .from(eventVerseMaps)
      .innerJoin(bibleVerses, eq(eventVerseMaps.verseId, bibleVerses.id))
      .innerJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
      .where(eq(eventVerseMaps.eventId, String(req.params.id)));
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

export default router;
