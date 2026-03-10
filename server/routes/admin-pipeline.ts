import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  users,
  resources,
  lessonSourcePackets,
  sabbathSchoolLessons,
  sabbathSchoolQuarterlies,
} from "../../shared/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { requireAdmin, requireEditor } from "../middleware/auth";

const router = Router();

router.get("/api/admin/pipeline/overview", requireEditor, async (req, res) => {
  try {
    const filterReviewStatus = req.query.reviewStatus as string | undefined;
    const filterGenStatus = req.query.generationStatus as string | undefined;
    const filterPromptVersion = req.query.promptVersion as string | undefined;
    const filterQuarterCode = req.query.quarterCode as string | undefined;
    const filterHasNotes = req.query.hasNotes === "true";
    const filterIsRegenerated = req.query.isRegenerated === "true";
    const sortByParam = (req.query.sortBy as string) || "createdAt";
    const sortOrderParam = (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

    const packetStatusCounts = await db
      .select({
        status: lessonSourcePackets.status,
        count: sql<number>`count(*)::int`,
      })
      .from(lessonSourcePackets)
      .groupBy(lessonSourcePackets.status);

    const activeCompanionCondition = and(
      eq(resources.resourceType, "sabbath-school-companion"),
      sql`${resources.status} != 'archived'`
    );

    const genStatusCounts = await db
      .select({
        generationStatus: resources.generationStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(resources)
      .where(activeCompanionCondition)
      .groupBy(resources.generationStatus);

    const reviewStatusCounts = await db
      .select({
        reviewStatus: resources.reviewStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(resources)
      .where(activeCompanionCondition)
      .groupBy(resources.reviewStatus);

    const promptVersionDist = await db
      .select({
        promptVersion: resources.promptVersion,
        count: sql<number>`count(*)::int`,
      })
      .from(resources)
      .where(activeCompanionCondition)
      .groupBy(resources.promptVersion);

    const totalLessons = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sabbathSchoolLessons);

    const lessonsWithCompanions = await db
      .select({ count: sql<number>`count(distinct ${resources.sourceRef}->>'lessonId')::int` })
      .from(resources)
      .where(
        sql`${resources.resourceType} = 'sabbath-school-companion' AND ${resources.sourceRef}->>'type' = 'sabbath-school' AND ${resources.status} != 'archived'`
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
          eq(resources.generationStatus, "failed"),
          sql`${resources.status} != 'archived'`
        )
      )
      .orderBy(desc(resources.updatedAt))
      .limit(20);

    const listConditions: any[] = [
      eq(resources.resourceType, "sabbath-school-companion"),
      sql`${resources.status} != 'archived'`,
    ];

    const targetReviewStatus = filterReviewStatus || "pending";
    listConditions.push(eq(resources.reviewStatus, targetReviewStatus));

    if (filterGenStatus) {
      listConditions.push(eq(resources.generationStatus, filterGenStatus));
    }
    if (filterPromptVersion) {
      listConditions.push(eq(resources.promptVersion, filterPromptVersion));
    }
    if (filterQuarterCode) {
      const qtr = await db.select({ id: sabbathSchoolQuarterlies.id })
        .from(sabbathSchoolQuarterlies)
        .where(eq(sabbathSchoolQuarterlies.quarterCode, filterQuarterCode))
        .limit(1);
      if (qtr.length > 0) {
        listConditions.push(sql`${resources.sourceRef}->>'quarterlyId' = ${qtr[0].id}`);
      }
    }
    if (filterHasNotes) {
      listConditions.push(sql`${resources.reviewNotes} IS NOT NULL AND ${resources.reviewNotes} != ''`);
    }
    if (filterIsRegenerated) {
      listConditions.push(sql`(${resources.supersedesResourceId} IS NOT NULL)`);
    }

    const sortColumn = sortByParam === "title" ? resources.title
      : sortByParam === "updatedAt" ? resources.updatedAt
      : resources.createdAt;
    const sortFn = sortOrderParam === "asc" ? asc : desc;

    const filteredList = await db
      .select({
        id: resources.id,
        title: resources.title,
        slug: resources.slug,
        status: resources.status,
        generationStatus: resources.generationStatus,
        reviewStatus: resources.reviewStatus,
        promptVersion: resources.promptVersion,
        sourceRef: resources.sourceRef,
        sourcePacketId: resources.sourcePacketId,
        reviewNotes: resources.reviewNotes,
        reviewedAt: resources.reviewedAt,
        createdAt: resources.createdAt,
        updatedAt: resources.updatedAt,
        supersedesResourceId: resources.supersedesResourceId,
        hasPreviousVersion: sql<boolean>`(${resources.previousContentJson} IS NOT NULL OR ${resources.supersedesResourceId} IS NOT NULL)`.as("has_previous_version"),
      })
      .from(resources)
      .where(and(...listConditions))
      .orderBy(sortFn(sortColumn))
      .limit(50);

    const lessonIds = filteredList
      .map(r => (r.sourceRef as any)?.lessonId)
      .filter(Boolean) as string[];
    const latestPacketByLesson = new Map<string, string>();
    const resourcePacketHashes = new Map<string, string>();
    if (lessonIds.length > 0) {
      const latestPackets = await db
        .select({
          lessonId: lessonSourcePackets.lessonId,
          sourceHash: lessonSourcePackets.sourceHash,
        })
        .from(lessonSourcePackets)
        .where(sql`${lessonSourcePackets.lessonId} IN (${sql.join(lessonIds.map(id => sql`${id}`), sql`, `)})`);
      for (const p of latestPackets) {
        latestPacketByLesson.set(p.lessonId, p.sourceHash);
      }
    }
    const packetIds = filteredList.map(r => r.sourcePacketId).filter(Boolean) as string[];
    if (packetIds.length > 0) {
      const usedPackets = await db
        .select({ id: lessonSourcePackets.id, sourceHash: lessonSourcePackets.sourceHash })
        .from(lessonSourcePackets)
        .where(sql`${lessonSourcePackets.id} IN (${sql.join(packetIds.map(id => sql`${id}`), sql`, `)})`);
      for (const p of usedPackets) {
        resourcePacketHashes.set(p.id, p.sourceHash);
      }
    }

    const enrichedList = filteredList.map(item => {
      const sourceRef = item.sourceRef as any;
      let sourceChanged = false;
      if (sourceRef?.lessonId && item.sourcePacketId) {
        const latestHash = latestPacketByLesson.get(sourceRef.lessonId);
        const usedHash = resourcePacketHashes.get(item.sourcePacketId);
        if (latestHash && usedHash && latestHash !== usedHash) {
          sourceChanged = true;
        }
      }
      return {
        ...item,
        sourceChanged,
        isRegenerated: !!item.supersedesResourceId,
        hasNotes: !!(item.reviewNotes && item.reviewNotes.trim()),
      };
    });

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
      filteredList: enrichedList,
      filters: {
        reviewStatus: targetReviewStatus,
        generationStatus: filterGenStatus || null,
        promptVersion: filterPromptVersion || null,
        quarterCode: filterQuarterCode || null,
        hasNotes: filterHasNotes,
        isRegenerated: filterIsRegenerated,
      },
      sort: {
        sortBy: sortByParam,
        sortOrder: sortOrderParam,
      },
    });
  } catch (err) {
    console.error("Pipeline overview error:", err);
    return res.status(500).json({ error: "Failed to fetch pipeline overview" });
  }
});

router.get("/api/admin/pipeline/resource/:id/preview", requireEditor, async (req, res) => {
  try {
    const { id } = req.params;

    const [resource] = await db
      .select({
        id: resources.id,
        title: resources.title,
        slug: resources.slug,
        description: resources.description,
        resourceType: resources.resourceType,
        category: resources.category,
        tier: resources.tier,
        contentJson: resources.contentJson,
        sourceRef: resources.sourceRef,
        sourcePacketId: resources.sourcePacketId,
        promptVersion: resources.promptVersion,
        generationStatus: resources.generationStatus,
        reviewStatus: resources.reviewStatus,
        reviewNotes: resources.reviewNotes,
        reviewedAt: resources.reviewedAt,
        reviewedBy: resources.reviewedBy,
        status: resources.status,
        generatedBy: resources.generatedBy,
        createdAt: resources.createdAt,
        updatedAt: resources.updatedAt,
        publishedAt: resources.publishedAt,
        previousContentJson: resources.previousContentJson,
        supersedesResourceId: resources.supersedesResourceId,
      })
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    let sourcePacket = null;
    if (resource.sourcePacketId) {
      const [packet] = await db
        .select({
          id: lessonSourcePackets.id,
          title: lessonSourcePackets.title,
          weekNumber: lessonSourcePackets.weekNumber,
          status: lessonSourcePackets.status,
          sourceHash: lessonSourcePackets.sourceHash,
          sourceVersion: lessonSourcePackets.sourceVersion,
          updatedAt: lessonSourcePackets.updatedAt,
        })
        .from(lessonSourcePackets)
        .where(eq(lessonSourcePackets.id, resource.sourcePacketId))
        .limit(1);
      sourcePacket = packet || null;
    }

    let reviewer = null;
    if (resource.reviewedBy) {
      const [user] = await db
        .select({ id: users.id, displayName: users.displayName, email: users.email })
        .from(users)
        .where(eq(users.id, resource.reviewedBy))
        .limit(1);
      reviewer = user || null;
    }

    const contentJson = resource.contentJson as any;
    const generationMeta = contentJson?._generation || null;

    const contentSections: Array<{ key: string; label: string; preview: string }> = [];
    if (contentJson?.overview) {
      contentSections.push({ key: "overview", label: "Overview", preview: String(contentJson.overview).substring(0, 300) });
    }
    if (contentJson?.dailyStudyPrompts) {
      contentSections.push({ key: "dailyStudyPrompts", label: "Daily Study Prompts", preview: `${contentJson.dailyStudyPrompts.length} days` });
    }
    if (contentJson?.discussionQuestions) {
      contentSections.push({ key: "discussionQuestions", label: "Discussion Questions", preview: `${contentJson.discussionQuestions.length} questions` });
    }
    if (contentJson?.memoryVerseGuide) {
      contentSections.push({ key: "memoryVerseGuide", label: "Memory Verse Guide", preview: contentJson.memoryVerseGuide.reference || "" });
    }
    if (contentJson?.familyWorshipAdaptation) {
      contentSections.push({ key: "familyWorshipAdaptation", label: "Family Worship", preview: String(contentJson.familyWorshipAdaptation.kidsVersion || "").substring(0, 150) });
    }
    if (contentJson?.egwConnections) {
      contentSections.push({ key: "egwConnections", label: "EGW Connections", preview: `${contentJson.egwConnections.length} connections` });
    }

    let predecessorData = null;
    if (resource.supersedesResourceId) {
      const [pred] = await db
        .select({
          id: resources.id,
          title: resources.title,
          promptVersion: resources.promptVersion,
          status: resources.status,
          createdAt: resources.createdAt,
        })
        .from(resources)
        .where(eq(resources.id, resource.supersedesResourceId))
        .limit(1);
      if (pred) {
        predecessorData = pred;
      }
    }

    return res.json({
      resource: {
        id: resource.id,
        title: resource.title,
        slug: resource.slug,
        description: resource.description,
        resourceType: resource.resourceType,
        category: resource.category,
        tier: resource.tier,
        status: resource.status,
        generationStatus: resource.generationStatus,
        reviewStatus: resource.reviewStatus,
        reviewNotes: resource.reviewNotes,
        promptVersion: resource.promptVersion,
        generatedBy: resource.generatedBy,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt,
        publishedAt: resource.publishedAt,
        supersedesResourceId: resource.supersedesResourceId,
      },
      generationMeta,
      contentSections,
      fullContent: contentJson,
      sourcePacket,
      reviewer: reviewer ? {
        id: reviewer.id,
        displayName: reviewer.displayName,
        email: reviewer.email,
        reviewedAt: resource.reviewedAt,
      } : null,
      supersedesResourceId: resource.supersedesResourceId || null,
      hasPreviousVersion: !!(resource.previousContentJson || resource.supersedesResourceId),
      predecessor: predecessorData,
    });
  } catch (err) {
    console.error("Resource preview error:", err);
    return res.status(500).json({ error: "Failed to fetch resource preview" });
  }
});

router.get("/api/admin/pipeline/resource/:id/diff", requireEditor, async (req, res) => {
  try {
    const { id } = req.params;

    const [resource] = await db
      .select({
        id: resources.id,
        title: resources.title,
        contentJson: resources.contentJson,
        previousContentJson: resources.previousContentJson,
        supersedesResourceId: resources.supersedesResourceId,
        promptVersion: resources.promptVersion,
        generationStatus: resources.generationStatus,
        reviewStatus: resources.reviewStatus,
        createdAt: resources.createdAt,
      })
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    let previousContent = resource.previousContentJson as any;
    if (!previousContent && resource.supersedesResourceId) {
      const [superseded] = await db
        .select({ contentJson: resources.contentJson })
        .from(resources)
        .where(eq(resources.id, resource.supersedesResourceId))
        .limit(1);
      if (superseded) {
        previousContent = superseded.contentJson;
      }
    }

    if (!previousContent) {
      return res.json({
        hasPrevious: false,
        resource: { id: resource.id, title: resource.title },
        sections: [],
      });
    }

    const current = resource.contentJson as any;
    const previous = previousContent;

    const diffableSections = [
      { key: "overview", label: "Overview", type: "text" as const },
      { key: "dailyStudyPrompts", label: "Daily Study Prompts", type: "array" as const },
      { key: "discussionQuestions", label: "Discussion Questions", type: "array" as const },
      { key: "memoryVerseGuide", label: "Memory Verse Guide", type: "object" as const },
      { key: "familyWorshipAdaptation", label: "Family Worship", type: "object" as const },
      { key: "egwConnections", label: "EGW Connections", type: "array" as const },
    ];

    const sections = diffableSections.map((section) => {
      const curVal = current?.[section.key];
      const prevVal = previous?.[section.key];

      const curStr = section.type === "text" ? (curVal || "") : JSON.stringify(curVal || null, null, 2);
      const prevStr = section.type === "text" ? (prevVal || "") : JSON.stringify(prevVal || null, null, 2);

      let status: "unchanged" | "changed" | "added" | "removed";
      if (prevVal == null && curVal != null) status = "added";
      else if (prevVal != null && curVal == null) status = "removed";
      else if (curStr === prevStr) status = "unchanged";
      else status = "changed";

      return {
        key: section.key,
        label: section.label,
        type: section.type,
        status,
        current: curVal ?? null,
        previous: prevVal ?? null,
      };
    });

    const currentGen = current?._generation || null;
    const previousGen = previous?._generation || null;

    const metaDiff = {
      promptVersion: {
        previous: previousGen?.promptVersion || null,
        current: currentGen?.promptVersion || null,
        changed: (previousGen?.promptVersion || null) !== (currentGen?.promptVersion || null),
      },
      model: {
        previous: previousGen?.model || null,
        current: currentGen?.model || null,
        changed: (previousGen?.model || null) !== (currentGen?.model || null),
      },
      generatedAt: {
        previous: previousGen?.generatedAt || null,
        current: currentGen?.generatedAt || null,
        changed: (previousGen?.generatedAt || null) !== (currentGen?.generatedAt || null),
      },
      tokensUsed: {
        previous: previousGen?.tokensUsed || null,
        current: currentGen?.tokensUsed || null,
        changed: (previousGen?.tokensUsed || null) !== (currentGen?.tokensUsed || null),
      },
    };

    const changedCount = sections.filter((s) => s.status !== "unchanged").length;

    return res.json({
      hasPrevious: true,
      resource: { id: resource.id, title: resource.title },
      metaDiff,
      sections,
      summary: {
        total: sections.length,
        changed: changedCount,
        unchanged: sections.length - changedCount,
      },
    });
  } catch (err) {
    console.error("Resource diff error:", err);
    return res.status(500).json({ error: "Failed to generate diff" });
  }
});

router.get("/api/admin/pipeline/quarter/:quarterCode", requireEditor, async (req, res) => {
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

router.get("/api/admin/pipeline/quarters", requireEditor, async (_req, res) => {
  try {
    const { getAvailableQuarters } = await import("../services/batch-generator");
    const quarters = await getAvailableQuarters();
    return res.json(quarters);
  } catch (err) {
    console.error("List quarters error:", err);
    return res.status(500).json({ error: "Failed to list quarters" });
  }
});

router.post("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !["user", "editor", "admin"].includes(role)) {
      return res.status(400).json({ error: "role must be user, editor, or admin" });
    }

    const [target] = await db
      .select({ id: users.id, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    if (id === req.authUserId && role !== "admin") {
      return res.status(400).json({ error: "Cannot demote yourself" });
    }

    const [updated] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        role: users.role,
      });

    return res.json(updated);
  } catch (err) {
    console.error("Set user role error:", err);
    return res.status(500).json({ error: "Failed to update user role" });
  }
});

export default router;
