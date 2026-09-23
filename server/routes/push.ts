import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { isExpoPushEndpoint } from "../../lib/daily-verse-push";
import { pushSubscriptions } from "../../shared/schema";
import { db } from "../db";
import { env } from "../env";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { readPushPreference, sendDailyVerseNow, vapidConfigured } from "../services/daily-verse-push";

const router = Router();

router.get("/api/push/vapid-public-key", (_req, res) => {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  if (!publicKey || !vapidConfigured()) {
    return res.status(503).json({ error: "Web push is not configured" });
  }
  res.json({ publicKey });
});

router.get("/api/push/subscription", requireAuth, async (req, res) => {
  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, req.authUserId!));
  res.json({
    vapidConfigured: vapidConfigured(),
    subscriptions: rows.map((row) => ({
      endpoint: row.endpoint,
      verseTimeLocal: row.verseTimeLocal,
      ssReminder: row.ssReminder,
      ssTimeLocal: row.ssTimeLocal,
      timezone: row.timezone,
      web: !isExpoPushEndpoint(row.endpoint),
    })),
  });
});

router.put("/api/push/subscription", requireAuth, async (req, res) => {
  const preference = readPushPreference(req.body);
  if (!preference) {
    return res.status(400).json({ error: "A push endpoint, time zone, and reminder settings are required" });
  }
  if (!preference.verseTimeLocal && !preference.ssReminder) {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, req.authUserId!),
          eq(pushSubscriptions.endpoint, preference.endpoint),
        ),
      );
    return res.json({ subscribed: false });
  }
  if (!preference.keys && !isExpoPushEndpoint(preference.endpoint)) {
    return res.status(400).json({ error: "Web push keys are required" });
  }

  await db
    .insert(pushSubscriptions)
    .values({
      userId: req.authUserId!,
      endpoint: preference.endpoint,
      keys: preference.keys,
      timezone: preference.timezone,
      verseTimeLocal: preference.verseTimeLocal,
      ssReminder: preference.ssReminder,
      ssTimeLocal: preference.ssTimeLocal,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: req.authUserId!,
        keys: preference.keys,
        timezone: preference.timezone,
        verseTimeLocal: preference.verseTimeLocal,
        ssReminder: preference.ssReminder,
        ssTimeLocal: preference.ssTimeLocal,
      },
    });

  res.json({
    subscribed: true,
    verseTimeLocal: preference.verseTimeLocal,
    ssReminder: preference.ssReminder,
    ssTimeLocal: preference.ssTimeLocal,
    timezone: preference.timezone,
  });
});

router.delete("/api/push/subscription", requireAuth, async (req, res) => {
  const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : null;
  if (endpoint) {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, req.authUserId!),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      );
  } else {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, req.authUserId!));
  }
  res.json({ subscribed: false });
});

router.post("/api/push/send-now", requireAdmin, async (req, res) => {
  const userId =
    typeof req.body?.userId === "string" && req.body.userId.trim()
      ? req.body.userId.trim()
      : req.authUserId!;
  const result = await sendDailyVerseNow(userId);
  if (!result.title) {
    return res.status(404).json({ error: "No push subscription for that account" });
  }
  res.json(result);
});

export default router;
