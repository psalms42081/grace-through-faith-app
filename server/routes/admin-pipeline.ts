import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  users,
  resources,
  lessonSourcePackets,
  sabbathSchoolLessons,
  sabbathSchoolQuarterlies,
} from "../../shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

function requireAdmin(req: Request, res: Response, next: Function) {
  requireAuth(req, res, async () => {
    const [authUser] = await db
      .select({ isPro: users.isPro })
      .from(users)
      .where(eq(users.id, req.authUserId!))
      .limit(1);

    if (!authUser?.isPro) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });
}

router.get("/api/admin/pipeline/overview", requireAdmin, async (_req, res) => {
  try {
    const packetStatusCounts = await db
      .select({
        status: lessonSourcePackets.status,
        count: sql<number>`count(*)::int`,
      })
      .from(lessonSourcePackets)
      .groupBy(lessonSourcePackets.status);

    const genStatusCounts = await db
      .select({
        generationStatus: resources.generationStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(resources)
      .where(eq(resources.resourceType, "sabbath-school-companion"))
      .groupBy(resources.generationStatus);

    const reviewStatusCounts = await db
      .select({
        reviewStatus: resources.reviewStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(resources)
      .where(eq(resources.resourceType, "sabbath-school-companion"))
      .groupBy(resources.reviewStatus);

    const promptVersionDist = await db
      .select({
        promptVersion: resources.promptVersion,
        count: sql<number>`count(*)::int`,
      })
      .from(resources)
      .where(eq(resources.resourceType, "sabbath-school-companion"))
      .groupBy(resources.promptVersion);

    const totalLessons = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sabbathSchoolLessons);

    const lessonsWithCompanions = await db
      .select({ count: sql<number>`count(distinct ${resources.sourceRef}->>'lessonId')::int` })
      .from(resources)
      .where(
        sql`${resources.resourceType} = 'sabbath-school-companion' AND ${resources.sourceRef}->>'type' = 'sabbath-school'`
      );

    const failedGenerations = await db
      .select({
        id: resources.id,
        title: resources.title,
        sourcePacketId: resources.sourcePacketId,
        updatedAt: resources.updatedAt,
      })
      .from(resources)
      .where(
        and(
          eq(resources.resourceType, "sabbath-school-companion"),
          eq(resources.generationStatus, "failed")
        )
      )
      .orderBy(desc(resources.updatedAt))
      .limit(20);

    const pendingReview = await db
      .select({
        id: resources.id,
        title: resources.title,
        slug: resources.slug,
        generationStatus: resources.generationStatus,
        reviewStatus: resources.reviewStatus,
        promptVersion: resources.promptVersion,
        createdAt: resources.createdAt,
      })
      .from(resources)
      .where(
        and(
          eq(resources.resourceType, "sabbath-school-companion"),
          eq(resources.reviewStatus, "pending")
        )
      )
      .orderBy(desc(resources.createdAt))
      .limit(50);

    return res.json({
      sourcePackets: {
        byStatus: Object.fromEntries(packetStatusCounts.map(r => [r.status, r.count])),
        total: packetStatusCounts.reduce((s, r) => s + r.count, 0),
      },
      companions: {
        byGenerationStatus: Object.fromEntries(genStatusCounts.map(r => [r.generationStatus || "unknown", r.count])),
        byReviewStatus: Object.fromEntries(reviewStatusCounts.map(r => [r.reviewStatus || "unknown", r.count])),
        total: genStatusCounts.reduce((s, r) => s + r.count, 0),
      },
      coverage: {
        totalLessons: totalLessons[0]?.count ?? 0,
        lessonsWithCompanions: lessonsWithCompanions[0]?.count ?? 0,
        coveragePercent: totalLessons[0]?.count
          ? Math.round((lessonsWithCompanions[0]?.count ?? 0) / totalLessons[0].count * 100)
          : 0,
      },
      promptVersionDistribution: Object.fromEntries(promptVersionDist.map(r => [r.promptVersion || "unknown", r.count])),
      failedGenerations,
      pendingReview,
    });
  } catch (err) {
    console.error("Pipeline overview error:", err);
    return res.status(500).json({ error: "Failed to fetch pipeline overview" });
  }
});

router.get("/api/admin/pipeline/quarter/:quarterCode", requireAdmin, async (req, res) => {
  try {
    const { quarterCode } = req.params;

    const quarterly = await db
      .select()
      .from(sabbathSchoolQuarterlies)
      .where(eq(sabbathSchoolQuarterlies.quarterCode, quarterCode))
      .limit(1);

    if (quarterly.length === 0) {
      return res.status(404).json({ error: `Quarter ${quarterCode} not found` });
    }

    const quarterlyId = quarterly[0].id;

    const lessons = await db
      .select({
        id: sabbathSchoolLessons.id,
        title: sabbathSchoolLessons.title,
        lessonNumber: sabbathSchoolLessons.lessonNumber,
      })
      .from(sabbathSchoolLessons)
      .where(eq(sabbathSchoolLessons.quarterlyId, quarterlyId))
      .orderBy(sabbathSchoolLessons.lessonNumber);

    const packets = await db
      .select({
        id: lessonSourcePackets.id,
        lessonId: lessonSourcePackets.lessonId,
        status: lessonSourcePackets.status,
        sourceHash: lessonSourcePackets.sourceHash,
        updatedAt: lessonSourcePackets.updatedAt,
      })
      .from(lessonSourcePackets)
      .where(eq(lessonSourcePackets.quarterlyId, quarterlyId));

    const companions = await db
      .select({
        id: resources.id,
        title: resources.title,
        slug: resources.slug,
        status: resources.status,
        generationStatus: resources.generationStatus,
        reviewStatus: resources.reviewStatus,
        promptVersion: resources.promptVersion,
        sourcePacketId: resources.sourcePacketId,
        sourceRef: resources.sourceRef,
        createdAt: resources.createdAt,
        publishedAt: resources.publishedAt,
      })
      .from(resources)
      .where(
        sql`${resources.resourceType} = 'sabbath-school-companion' AND ${resources.sourceRef}->>'quarterlyId' = ${quarterlyId}`
      );

    const packetMap = new Map(packets.map(p => [p.lessonId, p]));
    const companionMap = new Map<string, typeof companions[number]>();
    for (const c of companions) {
      const ref = c.sourceRef as any;
      if (ref?.lessonId) companionMap.set(ref.lessonId, c);
    }

    const lessonDetails = lessons.map(lesson => {
      const packet = packetMap.get(lesson.id);
      const companion = companionMap.get(lesson.id);
      return {
        lessonId: lesson.id,
        lessonNumber: lesson.lessonNumber,
        title: lesson.title,
        packet: packet ? {
          id: packet.id,
          status: packet.status,
          hash: packet.sourceHash?.substring(0, 12),
          updatedAt: packet.updatedAt,
        } : null,
        companion: companion ? {
          id: companion.id,
          slug: companion.slug,
          status: companion.status,
          generationStatus: companion.generationStatus,
          reviewStatus: companion.reviewStatus,
          promptVersion: companion.promptVersion,
          sourcePacketId: companion.sourcePacketId,
          createdAt: companion.createdAt,
          publishedAt: companion.publishedAt,
        } : null,
      };
    });

    return res.json({
      quarter: {
        id: quarterlyId,
        code: quarterCode,
        title: quarterly[0].title,
        humanDate: quarterly[0].humanDate,
      },
      summary: {
        totalLessons: lessons.length,
        packetsBuilt: packets.length,
        companionsGenerated: companions.length,
        published: companions.filter(c => c.status === "published").length,
        pendingReview: companions.filter(c => c.reviewStatus === "pending").length,
        failed: companions.filter(c => c.generationStatus === "failed").length,
      },
      lessons: lessonDetails,
    });
  } catch (err) {
    console.error("Quarter pipeline error:", err);
    return res.status(500).json({ error: "Failed to fetch quarter pipeline data" });
  }
});

router.post("/api/admin/pipeline/generate-quarter", requireAdmin, async (req, res) => {
  try {
    const { quarterCode, force, dryRun } = req.body;

    if (!quarterCode || typeof quarterCode !== "string") {
      return res.status(400).json({ error: "quarterCode is required" });
    }

    const quarterly = await db
      .select({ id: sabbathSchoolQuarterlies.id })
      .from(sabbathSchoolQuarterlies)
      .where(eq(sabbathSchoolQuarterlies.quarterCode, quarterCode))
      .limit(1);

    if (quarterly.length === 0) {
      return res.status(404).json({ error: `Quarter ${quarterCode} not found in database` });
    }

    const { generateQuarterCompanions } = await import("../services/batch-generator");

    res.json({ status: "started", message: `Batch generation for ${quarterCode} started` });

    generateQuarterCompanions(quarterCode, {
      force: !!force,
      dryRun: !!dryRun,
    }).then(result => {
      console.log(`[batch:complete] Quarter ${quarterCode}: ${result.generated} generated, ${result.skipped} skipped, ${result.failed} failed (${result.durationMs}ms)`);
    }).catch(err => {
      console.error(`[batch:error] Quarter ${quarterCode}:`, err);
    });
  } catch (err) {
    console.error("Generate quarter error:", err);
    return res.status(500).json({ error: "Failed to start batch generation" });
  }
});

router.get("/api/admin/pipeline/quarters", requireAdmin, async (_req, res) => {
  try {
    const { getAvailableQuarters } = await import("../services/batch-generator");
    const quarters = await getAvailableQuarters();
    return res.json(quarters);
  } catch (err) {
    console.error("List quarters error:", err);
    return res.status(500).json({ error: "Failed to list quarters" });
  }
});

export default router;
