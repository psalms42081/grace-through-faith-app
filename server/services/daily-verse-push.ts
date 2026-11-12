import * as webpush from "web-push";
import { and, desc, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { APP_CONTACT_EMAIL } from "../../constants/app";
import { bibleBookNamesMatch } from "../../components/home-v2/home-data";
import {
  SABBATH_SCHOOL_PUSH_TIME,
  dailyVerseNotification,
  duePushKinds,
  isExpoPushEndpoint,
  isGonePushStatus,
  normalizeHm,
  normalizePrayerTimes,
  parseDailyVerseReference,
  prayerTimeFromKind,
  prayerTimeNotification,
  readingPlanNotification,
  sabbathSchoolNotification,
  scripturePushPath,
  verseReferenceForLocalDate,
  webPushSendOptions,
  zonedClock,
  type DuePushKind,
} from "../../lib/daily-verse-push";
import { pacePlanDays } from "../../lib/plan-pacing";
import {
  bibleBooks,
  bibleTranslations,
  bibleVerses,
  devotionalDays,
  devotionalPlans,
  deviceTokens,
  pushSubscriptions,
  readingPlans,
  userPlanEnrollments,
  userPlanProgress,
  userPlans,
  type PushSubscription,
} from "../../shared/schema";
import { db } from "../db";
import { readingPlanCards } from "./plan-reading-progress";
import { env } from "../env";
import { loadCurrentSabbathSchoolLesson } from "./sabbath-school-current";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const VAPID_SUBJECT = `mailto:${APP_CONTACT_EMAIL}`;

export type PushDelivery = {
  title: string;
  body: string;
  url: string;
};

type DeliveryResult = "ok" | "gone" | "error";

let schedulerStarted = false;
let vapidReady = false;
let runInFlight = false;

export function vapidConfigured(): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY?.trim() && env.VAPID_PRIVATE_KEY?.trim());
}

function ensureVapid(): boolean {
  if (!vapidConfigured()) return false;
  if (!vapidReady) {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      env.VAPID_PUBLIC_KEY!.trim(),
      env.VAPID_PRIVATE_KEY!.trim(),
    );
    vapidReady = true;
  }
  return true;
}

function pushStatus(err: unknown): number | undefined {
  if (err instanceof webpush.WebPushError) return err.statusCode;
  if (err && typeof err === "object" && "statusCode" in err) {
    const status = (err as { statusCode?: unknown }).statusCode;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

async function sendExpoPush(endpoint: string, payload: PushDelivery): Promise<DeliveryResult> {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: endpoint,
        title: payload.title,
        body: payload.body,
        data: { url: payload.url },
        sound: "default",
      }),
    });
    const json = (await response.json().catch(() => null)) as {
      data?: { status?: string; details?: { error?: string } }[];
    } | null;
    const ticket = json?.data?.[0];
    if (ticket?.details?.error === "DeviceNotRegistered") return "gone";
    if (!response.ok || ticket?.status === "error") return "error";
    return "ok";
  } catch (err) {
    console.error("[push] Expo send failed:", err instanceof Error ? err.message : err);
    return "error";
  }
}

async function sendWebPush(row: PushSubscription, payload: PushDelivery): Promise<DeliveryResult> {
  if (!row.keys?.p256dh || !row.keys.auth) return "error";
  if (!ensureVapid()) {
    console.error("[push] Web push skipped — VAPID keys are not configured");
    return "error";
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.keys.p256dh, auth: row.keys.auth },
      },
      JSON.stringify(payload),
      webPushSendOptions(),
    );
    return "ok";
  } catch (err) {
    if (isGonePushStatus(pushStatus(err))) return "gone";
    console.error(
      "[push] Web push failed:",
      err instanceof Error ? err.message : err,
    );
    return "error";
  }
}

async function deliver(row: PushSubscription, payload: PushDelivery): Promise<DeliveryResult> {
  if (isExpoPushEndpoint(row.endpoint)) return sendExpoPush(row.endpoint, payload);
  return sendWebPush(row, payload);
}

async function retireSubscription(row: PushSubscription): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, row.id));
  if (isExpoPushEndpoint(row.endpoint)) {
    await db.delete(deviceTokens).where(eq(deviceTokens.pushToken, row.endpoint));
  }
}

async function claimPrayerTime(
  row: PushSubscription,
  time: string,
  dateKey: string,
): Promise<boolean> {
  const claimed = await db
    .update(pushSubscriptions)
    .set({
      lastPrayerSent: sql`jsonb_set(COALESCE(${pushSubscriptions.lastPrayerSent}, '{}'::jsonb), ARRAY[${time}]::text[], to_jsonb(${dateKey}::text), true)`,
    })
    .where(
      and(
        eq(pushSubscriptions.id, row.id),
        sql`COALESCE(${pushSubscriptions.lastPrayerSent} ->> ${time}, '') <> ${dateKey}`,
      ),
    )
    .returning({ id: pushSubscriptions.id });
  return claimed.length > 0;
}

async function releasePrayerTime(
  row: PushSubscription,
  time: string,
  dateKey: string,
  previous: string | null,
): Promise<void> {
  await db
    .update(pushSubscriptions)
    .set({
      lastPrayerSent: previous
        ? sql`jsonb_set(COALESCE(${pushSubscriptions.lastPrayerSent}, '{}'::jsonb), ARRAY[${time}]::text[], to_jsonb(${previous}::text), true)`
        : sql`COALESCE(${pushSubscriptions.lastPrayerSent}, '{}'::jsonb) - ${time}`,
    })
    .where(
      and(
        eq(pushSubscriptions.id, row.id),
        sql`${pushSubscriptions.lastPrayerSent} ->> ${time} = ${dateKey}`,
      ),
    );
}

async function claimDate(
  row: PushSubscription,
  kind: DuePushKind,
  dateKey: string,
): Promise<boolean> {
  const prayerTime = prayerTimeFromKind(kind);
  if (prayerTime) return claimPrayerTime(row, prayerTime, dateKey);
  const column =
    kind === "verse"
      ? pushSubscriptions.lastVerseLocalDate
      : kind === "sabbath"
        ? pushSubscriptions.lastSsLocalDate
        : pushSubscriptions.lastPlanLocalDate;
  const claimed = await db
    .update(pushSubscriptions)
    .set(
      kind === "verse"
        ? { lastVerseLocalDate: dateKey }
        : kind === "sabbath"
          ? { lastSsLocalDate: dateKey }
          : { lastPlanLocalDate: dateKey },
    )
    .where(
      and(
        eq(pushSubscriptions.id, row.id),
        or(isNull(column), ne(column, dateKey)),
      ),
    )
    .returning({ id: pushSubscriptions.id });
  return claimed.length > 0;
}

async function releaseClaim(
  row: PushSubscription,
  kind: DuePushKind,
  dateKey: string,
  previous: string | null,
): Promise<void> {
  const prayerTime = prayerTimeFromKind(kind);
  if (prayerTime) {
    await releasePrayerTime(row, prayerTime, dateKey, previous);
    return;
  }
  const column =
    kind === "verse"
      ? pushSubscriptions.lastVerseLocalDate
      : kind === "sabbath"
        ? pushSubscriptions.lastSsLocalDate
        : pushSubscriptions.lastPlanLocalDate;
  await db
    .update(pushSubscriptions)
    .set(
      kind === "verse"
        ? { lastVerseLocalDate: previous }
        : kind === "sabbath"
          ? { lastSsLocalDate: previous }
          : { lastPlanLocalDate: previous },
    )
    .where(and(eq(pushSubscriptions.id, row.id), eq(column, dateKey)));
}

const versePayloads = new Map<string, PushDelivery | null>();
const sabbathPayloads = new Map<string, PushDelivery | null>();

async function versePayloadFor(dateKey: string): Promise<PushDelivery | null> {
  if (versePayloads.has(dateKey)) return versePayloads.get(dateKey) ?? null;
  const reference = verseReferenceForLocalDate(dateKey);
  const parsed = parseDailyVerseReference(reference);
  if (!parsed) {
    versePayloads.set(dateKey, null);
    return null;
  }
  const books = await db.select({ id: bibleBooks.id, name: bibleBooks.name }).from(bibleBooks);
  const book = books.find((candidate) => bibleBookNamesMatch(parsed.bookName, candidate.name));
  const [kjv] = await db
    .select({ id: bibleTranslations.id })
    .from(bibleTranslations)
    .where(eq(bibleTranslations.abbreviation, "KJV"))
    .limit(1);
  if (!book || !kjv) {
    versePayloads.set(dateKey, null);
    return null;
  }
  const [verse] = await db
    .select({ text: bibleVerses.text })
    .from(bibleVerses)
    .where(
      and(
        eq(bibleVerses.translationId, kjv.id),
        eq(bibleVerses.bookId, book.id),
        eq(bibleVerses.chapter, parsed.chapter),
        eq(bibleVerses.verse, parsed.verse),
      ),
    )
    .limit(1);
  const payload = verse?.text
    ? dailyVerseNotification(
        reference,
        verse.text,
        scripturePushPath(book.id, parsed.chapter, parsed.verse),
      )
    : null;
  versePayloads.set(dateKey, payload);
  return payload;
}

async function sabbathPayloadFor(timeZone: string, now: Date): Promise<PushDelivery | null> {
  const cacheKey = `${timeZone}:${now.toISOString().slice(0, 13)}`;
  if (sabbathPayloads.has(cacheKey)) return sabbathPayloads.get(cacheKey) ?? null;
  const lesson = await loadCurrentSabbathSchoolLesson("adult", timeZone, now);
  const payload = lesson?.currentLessonNumber
    ? sabbathSchoolNotification(lesson.currentLessonNumber)
    : null;
  sabbathPayloads.set(cacheKey, payload);
  return payload;
}

async function planPayloadFor(
  userId: string,
  today: string,
  sentFor: string | null,
): Promise<{ delivery: PushDelivery; planCompleteFor: string | null } | null> {
  const enrolled = await db
    .select({
      id: userPlans.id,
      planId: userPlans.planId,
      currentDay: userPlans.currentDay,
      completedAt: userPlans.completedAt,
      title: readingPlans.title,
    })
    .from(userPlans)
    .innerJoin(readingPlans, eq(readingPlans.id, userPlans.planId))
    .where(eq(userPlans.userId, userId));
  let finished: { id: string; title: string } | null = null;
  try {
    const cards = await readingPlanCards(enrolled, today);
    for (const row of enrolled) {
      const card = cards.get(row.id);
      if (!card) continue;
      if (card.status === "finished") {
        if (sentFor !== row.id) finished = { id: row.id, title: row.title };
        continue;
      }
      if (card.status !== "reading" || !card.passage || !card.continueReading) continue;
      return {
        delivery: readingPlanNotification({
          dayNumber: card.focusDay,
          planTitle: row.title,
          passage: card.passage,
          url: scripturePushPath(
            card.continueReading.bookId,
            card.continueReading.chapter,
            card.continueReading.verseStart ?? 1,
          ),
        }),
        planCompleteFor: null,
      };
    }
  } catch (err) {
    if (!(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "42P01")) throw err;
  }

  const series = await db
    .select({
      id: userPlanEnrollments.id,
      planId: userPlanEnrollments.planId,
      title: devotionalPlans.title,
      active: userPlanEnrollments.isActive,
    })
    .from(userPlanEnrollments)
    .innerJoin(devotionalPlans, eq(devotionalPlans.id, userPlanEnrollments.planId))
    .where(eq(userPlanEnrollments.userId, userId))
    .orderBy(desc(userPlanEnrollments.enrolledAt));

  for (const enrollment of series) {
    const [days, completed] = await Promise.all([
      db
        .select({
          dayNumber: devotionalDays.dayNumber,
          bookId: devotionalDays.bookId,
          chapter: devotionalDays.chapter,
          verseStart: devotionalDays.verseStart,
          passageLabel: devotionalDays.passageLabel,
        })
        .from(devotionalDays)
        .where(eq(devotionalDays.planId, enrollment.planId)),
      db
        .select({
          dayNumber: devotionalDays.dayNumber,
          localDate: userPlanProgress.completedLocalDate,
        })
        .from(userPlanProgress)
        .innerJoin(devotionalDays, eq(devotionalDays.id, userPlanProgress.dayId))
        .where(eq(userPlanProgress.enrollmentId, enrollment.id)),
    ]);
    const pace = pacePlanDays({
      dayNumbers: days.map((day) => day.dayNumber),
      completed,
      today,
    });
    if (pace.length > 0 && pace.every((day) => day.status === "complete")) {
      if (sentFor !== enrollment.id) finished = finished ?? { id: enrollment.id, title: enrollment.title };
      continue;
    }
    if (!enrollment.active) continue;
    const ready = pace.find((day) => day.canComplete);
    if (!ready) continue;
    const reading = days.find((day) => day.dayNumber === ready.dayNumber);
    return {
      delivery: readingPlanNotification({
        dayNumber: ready.dayNumber,
        planTitle: enrollment.title,
        passage: reading?.passageLabel || "Today's reading",
        url: reading?.bookId && reading.chapter
          ? scripturePushPath(reading.bookId, reading.chapter, reading.verseStart ?? 1)
          : `/devotional-day-preview?planId=${enrollment.planId}`,
      }),
      planCompleteFor: null,
    };
  }

  if (!finished) return null;
  return {
    delivery: readingPlanNotification({
      dayNumber: 0,
      planTitle: finished.title,
      passage: finished.title,
      url: "/devotions",
      planComplete: true,
    }),
    planCompleteFor: finished.id,
  };
}

async function sendClaimed(
  row: PushSubscription,
  kind: DuePushKind,
  now: Date,
): Promise<"sent" | "retired" | "skipped"> {
  const clock = zonedClock(now, row.timezone);
  if (!clock) return "skipped";
  const prayerTime = prayerTimeFromKind(kind);
  const previous = prayerTime
    ? (row.lastPrayerSent?.[prayerTime] ?? null)
    : kind === "verse"
      ? row.lastVerseLocalDate
      : kind === "sabbath"
        ? row.lastSsLocalDate
        : row.lastPlanLocalDate;
  const claimed = await claimDate(row, kind, clock.dateKey);
  if (!claimed) return "skipped";
  const planResult = kind === "plan"
    ? await planPayloadFor(row.userId, clock.dateKey, row.planCompleteSentFor)
    : null;
  const payload = prayerTime
    ? prayerTimeNotification(verseReferenceForLocalDate(clock.dateKey))
    : kind === "verse"
      ? await versePayloadFor(clock.dateKey)
      : kind === "sabbath"
        ? await sabbathPayloadFor(row.timezone, now)
        : planResult?.delivery ?? null;
  const planCompleteFor = planResult?.planCompleteFor ?? null;
  if (!payload) {
    await releaseClaim(row, kind, clock.dateKey, previous);
    return "skipped";
  }
  const result = await deliver(row, payload);
  if (result === "ok" && planCompleteFor) {
    await db
      .update(pushSubscriptions)
      .set({ planCompleteSentFor: planCompleteFor })
      .where(eq(pushSubscriptions.id, row.id));
  }
  if (result === "gone") {
    await retireSubscription(row);
    return "retired";
  }
  if (result === "error") {
    await releaseClaim(row, kind, clock.dateKey, previous);
    return "skipped";
  }
  return "sent";
}

export async function runDueDailyVersePushes(now = new Date()): Promise<{
  sent: number;
  retired: number;
}> {
  if (runInFlight) return { sent: 0, retired: 0 };
  runInFlight = true;
  versePayloads.clear();
  sabbathPayloads.clear();
  let sent = 0;
  let retired = 0;
  try {
    const rows = await db
      .select()
      .from(pushSubscriptions)
      .where(
        or(
          isNotNull(pushSubscriptions.verseTimeLocal),
          eq(pushSubscriptions.ssReminder, true),
          eq(pushSubscriptions.planReminder, true),
          sql`jsonb_array_length(${pushSubscriptions.prayerTimes}) > 0`,
        ),
      );
    for (const row of rows) {
      try {
        const due = duePushKinds(
          {
            timezone: row.timezone,
            verseTimeLocal: row.verseTimeLocal,
            ssReminder: row.ssReminder,
            ssTimeLocal: row.ssTimeLocal,
            planReminder: row.planReminder,
            prayerTimes: row.prayerTimes ?? [],
            lastPrayerSent: row.lastPrayerSent ?? {},
            lastVerseLocalDate: row.lastVerseLocalDate,
            lastSsLocalDate: row.lastSsLocalDate,
            lastPlanLocalDate: row.lastPlanLocalDate,
          },
          now,
        );
        for (const kind of due) {
          const outcome = await sendClaimed(row, kind, now);
          if (outcome === "sent") sent += 1;
          if (outcome === "retired") retired += 1;
          if (outcome === "retired") break;
        }
      } catch (err) {
        console.error("[push] Subscription delivery failed:", err instanceof Error ? err.message : err);
      }
    }
  } catch (err) {
    console.error("[push] Daily verse run failed:", err instanceof Error ? err.message : err);
  } finally {
    runInFlight = false;
  }
  if (sent || retired) {
    console.log(`[push] Daily verse run sent ${sent}, retired ${retired}`);
  }
  return { sent, retired };
}

/** Admin test send. Does not consume the day's scheduled delivery. */
export async function sendDailyVerseNow(userId: string): Promise<{
  sent: number;
  retired: number;
  title: string | null;
  url: string | null;
}> {
  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  let sent = 0;
  let retired = 0;
  let title: string | null = null;
  let url: string | null = null;
  for (const row of rows) {
    const clock = zonedClock(new Date(), row.timezone) ?? zonedClock(new Date(), "UTC");
    if (!clock) continue;
    const payload = await versePayloadFor(clock.dateKey);
    if (!payload) continue;
    title = payload.title;
    url = payload.url;
    const result = await deliver(row, payload);
    if (result === "ok") sent += 1;
    if (result === "gone") {
      await retireSubscription(row);
      retired += 1;
    }
  }
  return { sent, retired, title, url };
}

/** Admin plan-reminder test. Does not claim the day or the one-time plan-complete flag. */
export async function sendPlanReminderNow(userId: string): Promise<{
  sent: number;
  title: string | null;
  url: string | null;
}> {
  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  if (!rows.length) return { sent: 0, title: null, url: null };
  const clock = zonedClock(new Date(), rows[0].timezone) ?? zonedClock(new Date(), "UTC");
  const today = clock?.dateKey ?? "";
  const scheduled = await planPayloadFor(userId, today, null);
  let delivery = scheduled?.delivery ?? null;
  if (!delivery) {
    const enrolled = await db
      .select({
        id: userPlans.id,
        planId: userPlans.planId,
        currentDay: userPlans.currentDay,
        completedAt: userPlans.completedAt,
        title: readingPlans.title,
      })
      .from(userPlans)
      .innerJoin(readingPlans, eq(readingPlans.id, userPlans.planId))
      .where(eq(userPlans.userId, userId));
    try {
      const cards = await readingPlanCards(enrolled, today);
      for (const row of enrolled) {
        const card = cards.get(row.id);
        if (!card?.passage || card.status === "finished" || !card.continueReading) continue;
        delivery = readingPlanNotification({
          dayNumber: card.focusDay,
          planTitle: row.title,
          passage: card.passage,
          url: scripturePushPath(
            card.continueReading.bookId,
            card.continueReading.chapter,
            card.continueReading.verseStart ?? 1,
          ),
        });
        break;
      }
    } catch (err) {
      if (!(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "42P01")) throw err;
    }
  }
  if (!delivery) return { sent: 0, title: null, url: null };
  let sent = 0;
  for (const row of rows) {
    if ((await deliver(row, delivery)) === "ok") sent += 1;
  }
  return { sent, title: delivery.title, url: delivery.url };
}

export function startDailyVersePushScheduler(intervalMs = FIFTEEN_MINUTES_MS): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const tick = () => {
    void runDueDailyVersePushes().catch((err) => {
      console.error("[push] Scheduler tick failed:", err);
    });
  };
  tick();
  setInterval(tick, intervalMs);
  console.log("[push] Daily verse scheduler started (every 15 minutes)");
}

export function readPushPreference(body: unknown): {
  endpoint: string;
  keys: { p256dh: string; auth: string } | null;
  timezone: string;
  verseTimeLocal: string | null;
  ssReminder: boolean;
  ssTimeLocal: string | null;
  planReminder: boolean;
  prayerTimes: string[];
} | null {
  if (!body || typeof body !== "object") return null;
  const record = body as {
    endpoint?: unknown;
    keys?: unknown;
    timezone?: unknown;
    verseTimeLocal?: unknown;
    ssReminder?: unknown;
    ssTimeLocal?: unknown;
    planReminder?: unknown;
    prayerTimes?: unknown;
  };
  if (typeof record.endpoint !== "string" || !record.endpoint.trim()) return null;
  const timezone = typeof record.timezone === "string" && record.timezone.trim()
    ? record.timezone.trim()
    : "UTC";
  if (!zonedClock(new Date(), timezone)) return null;
  let verseTimeLocal: string | null = null;
  if (record.verseTimeLocal != null) {
    if (typeof record.verseTimeLocal !== "string") return null;
    verseTimeLocal = normalizeHm(record.verseTimeLocal);
    if (!verseTimeLocal) return null;
  }
  let keys: { p256dh: string; auth: string } | null = null;
  if (record.keys != null) {
    if (typeof record.keys !== "object") return null;
    const keyRecord = record.keys as { p256dh?: unknown; auth?: unknown };
    if (typeof keyRecord.p256dh !== "string" || typeof keyRecord.auth !== "string") return null;
    keys = { p256dh: keyRecord.p256dh, auth: keyRecord.auth };
  }
  const ssReminder = record.ssReminder === true;
  let ssTimeLocal: string | null = null;
  if (record.ssTimeLocal != null) {
    if (typeof record.ssTimeLocal !== "string") return null;
    ssTimeLocal = normalizeHm(record.ssTimeLocal);
    if (!ssTimeLocal) return null;
  } else if (ssReminder) {
    ssTimeLocal = SABBATH_SCHOOL_PUSH_TIME;
  }
  const prayerTimes = normalizePrayerTimes(record.prayerTimes);
  if (!prayerTimes) return null;
  return {
    endpoint: record.endpoint.trim(),
    keys,
    timezone,
    verseTimeLocal,
    ssReminder,
    ssTimeLocal,
    planReminder: record.planReminder === true,
    prayerTimes,
  };
}
