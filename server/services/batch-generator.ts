import { db } from "../db";
import {
  sabbathSchoolQuarterlies,
  sabbathSchoolLessons,
  lessonSourcePackets,
  resources,
} from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { buildAllSourcePackets, buildSourcePacket } from "./source-packet-builder";
import { generateSabbathSchoolCompanion } from "./content-engine";

export interface BatchResult {
  quarterCode: string;
  quarterTitle: string;
  total: number;
  generated: number;
  skipped: number;
  failed: number;
  details: Array<{
    lessonId: string;
    lessonTitle: string;
    weekNumber: number;
    action: "generated" | "skipped" | "failed";
    reason?: string;
    resourceId?: string;
  }>;
  packetStats: {
    total: number;
    created: number;
    updated: number;
    unchanged: number;
  };
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export async function generateQuarterCompanions(
  quarterCode: string,
  options: { force?: boolean; dryRun?: boolean } = {}
): Promise<BatchResult> {
  const { force = false, dryRun = false } = options;
  const startedAt = new Date();

  console.log(`[batch] Starting batch generation for quarter ${quarterCode} (force=${force}, dryRun=${dryRun})`);

  const quarterly = await db
    .select()
    .from(sabbathSchoolQuarterlies)
    .where(eq(sabbathSchoolQuarterlies.quarterCode, quarterCode))
    .limit(1);

  if (quarterly.length === 0) {
    throw new Error(`Quarter ${quarterCode} not found in database`);
  }

  const quarterlyId = quarterly[0].id;
  const quarterTitle = quarterly[0].title;

  console.log(`[batch] Quarter: "${quarterTitle}" (${quarterlyId})`);

  console.log(`[batch] Building source packets...`);
  const perLessonPackets: Map<string, { id: string; changed: boolean }> = new Map();

  const lessons = await db
    .select({
      id: sabbathSchoolLessons.id,
      title: sabbathSchoolLessons.title,
      lessonNumber: sabbathSchoolLessons.lessonNumber,
    })
    .from(sabbathSchoolLessons)
    .where(eq(sabbathSchoolLessons.quarterlyId, quarterlyId))
    .orderBy(sabbathSchoolLessons.lessonNumber);

  let packetsCreated = 0, packetsUpdated = 0, packetsUnchanged = 0;
  for (const lesson of lessons) {
    try {
      const result = await buildSourcePacket(lesson.id);
      perLessonPackets.set(lesson.id, { id: result.id, changed: result.changed });
      if (result.isNew) packetsCreated++;
      else if (result.changed) packetsUpdated++;
      else packetsUnchanged++;
    } catch (err: any) {
      console.error(`[batch] Packet failed for lesson ${lesson.lessonNumber}:`, err.message);
    }
  }

  const packetStats = { total: lessons.length, created: packetsCreated, updated: packetsUpdated, unchanged: packetsUnchanged };
  console.log(`[batch] Packets: ${packetStats.created} created, ${packetStats.updated} updated, ${packetStats.unchanged} unchanged`);

  const details: BatchResult["details"] = [];
  let generated = 0, skipped = 0, failed = 0;

  for (const lesson of lessons) {
    const packetInfo = perLessonPackets.get(lesson.id);
    const packetId = packetInfo?.id;
    const contentChanged = packetInfo?.changed ?? false;

    const existing = await db
      .select({ id: resources.id, sourcePacketId: resources.sourcePacketId })
      .from(resources)
      .where(
        sql`${resources.sourceRef}->>'type' = 'sabbath-school' AND ${resources.sourceRef}->>'lessonId' = ${lesson.id}`
      )
      .limit(1);

    const shouldRegenerate = force || contentChanged;

    if (existing.length > 0 && !shouldRegenerate) {
      console.log(`[batch] Skipping lesson ${lesson.lessonNumber}: "${lesson.title}" (companion exists, no changes)`);
      details.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        weekNumber: lesson.lessonNumber,
        action: "skipped",
        reason: "companion exists, content unchanged",
        resourceId: existing[0].id,
      });
      skipped++;
      continue;
    }

    const actionReason = existing.length > 0
      ? (contentChanged ? "content changed, regenerating" : "forced regeneration")
      : "new companion";

    if (dryRun) {
      console.log(`[batch:dry-run] Would generate companion for lesson ${lesson.lessonNumber}: "${lesson.title}" (${actionReason})`);
      details.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        weekNumber: lesson.lessonNumber,
        action: "generated",
        reason: `dry run - ${actionReason}`,
      });
      generated++;
      continue;
    }

    if (existing.length > 0) {
      await db.delete(resources).where(eq(resources.id, existing[0].id));
      console.log(`[batch] Removed old companion ${existing[0].id} for lesson ${lesson.lessonNumber} (${actionReason})`);
    }

    try {
      console.log(`[batch] Generating companion for lesson ${lesson.lessonNumber}: "${lesson.title}" (${actionReason})...`);
      const resourceId = await generateSabbathSchoolCompanion(lesson.id, {
        sourcePacketId: packetId,
      });
      console.log(`[batch] Companion created: ${resourceId}`);
      details.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        weekNumber: lesson.lessonNumber,
        action: "generated",
        reason: actionReason,
        resourceId,
      });
      generated++;
    } catch (err: any) {
      console.error(`[batch] Failed for lesson ${lesson.lessonNumber}: ${err.message}`);
      details.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        weekNumber: lesson.lessonNumber,
        action: "failed",
        reason: err.message?.substring(0, 200),
      });
      failed++;
    }
  }

  const completedAt = new Date();
  const result: BatchResult = {
    quarterCode,
    quarterTitle,
    total: lessons.length,
    generated,
    skipped,
    failed,
    details,
    packetStats,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };

  console.log(`[batch] Complete: ${generated} generated, ${skipped} skipped, ${failed} failed (${result.durationMs}ms)`);
  return result;
}

export async function getAvailableQuarters(): Promise<Array<{
  id: string;
  quarterCode: string;
  title: string;
  lessonCount: number;
  companionCount: number;
}>> {
  const quarters = await db
    .select({
      id: sabbathSchoolQuarterlies.id,
      quarterCode: sabbathSchoolQuarterlies.quarterCode,
      title: sabbathSchoolQuarterlies.title,
    })
    .from(sabbathSchoolQuarterlies)
    .orderBy(sabbathSchoolQuarterlies.quarterCode);

  const result = [];
  for (const q of quarters) {
    const lessons = await db
      .select({ id: sabbathSchoolLessons.id })
      .from(sabbathSchoolLessons)
      .where(eq(sabbathSchoolLessons.quarterlyId, q.id));

    const companions = await db
      .select({ id: resources.id })
      .from(resources)
      .where(
        sql`${resources.resourceType} = 'sabbath-school-companion' AND ${resources.sourceRef}->>'quarterlyId' = ${q.id}`
      );

    result.push({
      id: q.id,
      quarterCode: q.quarterCode,
      title: q.title,
      lessonCount: lessons.length,
      companionCount: companions.length,
    });
  }

  return result;
}
