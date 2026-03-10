import { Router } from "express";
import { db } from "../db";
import {
  resources,
  resourceProgress,
  resourceBookmarks,
  users,
} from "../../shared/schema";
import { eq, and, ilike, sql, desc, asc, or } from "drizzle-orm";
import { requireAuth, optionalAuth, getEffectiveUserId, getAuthUserId, requireEditor, requireAdmin } from "../middleware/auth";
import { cachedResponse } from "../middleware/response-cache";
import { aiGenerationLimiter } from "../middleware/rate-limit";

const router = Router();

router.get("/api/resources", cachedResponse(120), async (req, res) => {
  try {
    const {
      category,
      type,
      tier,
      ageGroup,
      search,
      page = "1",
      limit: limitStr = "20",
    } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(Math.max(1, Number(limitStr) || 20), 50);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [eq(resources.status, "published")];

    if (category && category !== "all") {
      conditions.push(eq(resources.category, String(category)));
    }
    if (type) {
      conditions.push(eq(resources.resourceType, String(type)));
    }
    if (tier) {
      conditions.push(eq(resources.tier, String(tier)));
    }
    if (ageGroup) {
      conditions.push(eq(resources.ageGroup, String(ageGroup)));
    }
    if (search) {
      const searchTerm = `%${String(search).trim()}%`;
      conditions.push(
        or(
          ilike(resources.title, searchTerm),
          ilike(resources.description, searchTerm)
        )
      );
    }

    const whereClause = and(...conditions);

    const items = await db
      .select({
        id: resources.id,
        slug: resources.slug,
        title: resources.title,
        description: resources.description,
        resourceType: resources.resourceType,
        category: resources.category,
        tier: resources.tier,
        coverImageUrl: resources.coverImageUrl,
        ageGroup: resources.ageGroup,
        estimatedMinutes: resources.estimatedMinutes,
        tags: resources.tags,
        publishedAt: resources.publishedAt,
        createdAt: resources.createdAt,
      })
      .from(resources)
      .where(whereClause)
      .orderBy(desc(resources.publishedAt))
      .limit(limitNum)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(resources)
      .where(whereClause);

    const total = Number(countResult[0]?.count ?? 0);

    return res.json({
      items,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error("List resources error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/resources/bookmarks", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;

    const bookmarks = await db
      .select({
        id: resources.id,
        slug: resources.slug,
        title: resources.title,
        description: resources.description,
        resourceType: resources.resourceType,
        category: resources.category,
        tier: resources.tier,
        coverImageUrl: resources.coverImageUrl,
        ageGroup: resources.ageGroup,
        estimatedMinutes: resources.estimatedMinutes,
        tags: resources.tags,
        bookmarkedAt: resourceBookmarks.createdAt,
      })
      .from(resourceBookmarks)
      .innerJoin(resources, eq(resourceBookmarks.resourceId, resources.id))
      .where(eq(resourceBookmarks.userId, userId))
      .orderBy(desc(resourceBookmarks.createdAt));

    return res.json(bookmarks);
  } catch (err) {
    console.error("List bookmarks error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/resources/in-progress", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;

    const inProgress = await db
      .select({
        id: resources.id,
        slug: resources.slug,
        title: resources.title,
        description: resources.description,
        resourceType: resources.resourceType,
        category: resources.category,
        tier: resources.tier,
        coverImageUrl: resources.coverImageUrl,
        ageGroup: resources.ageGroup,
        estimatedMinutes: resources.estimatedMinutes,
        tags: resources.tags,
        progressPercent: resourceProgress.progressPercent,
        completed: resourceProgress.completed,
        lastAccessedAt: resourceProgress.lastAccessedAt,
      })
      .from(resourceProgress)
      .innerJoin(resources, eq(resourceProgress.resourceId, resources.id))
      .where(
        and(
          eq(resourceProgress.userId, userId),
          eq(resourceProgress.started, true),
          eq(resourceProgress.completed, false)
        )
      )
      .orderBy(desc(resourceProgress.lastAccessedAt));

    return res.json(inProgress);
  } catch (err) {
    console.error("List in-progress error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/resources/:slug", optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = getEffectiveUserId(req);

    const [resource] = await db
      .select()
      .from(resources)
      .where(and(eq(resources.slug, slug), eq(resources.status, "published")))
      .limit(1);

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    let isPro = false;
    if (userId !== "guest") {
      const [user] = await db
        .select({ isPro: users.isPro })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      isPro = user?.isPro ?? false;

      await db
        .insert(resourceProgress)
        .values({
          userId,
          resourceId: resource.id,
          started: true,
          completed: false,
          progressPercent: 0,
        })
        .onConflictDoUpdate({
          target: [resourceProgress.userId, resourceProgress.resourceId],
          set: { lastAccessedAt: new Date() },
        });
    }

    if (resource.tier === "pro" && !isPro) {
      const contentJson = resource.contentJson as any;
      let teaser: any = null;
      if (contentJson && typeof contentJson === "object") {
        if (Array.isArray(contentJson.sections) && contentJson.sections.length > 0) {
          teaser = { ...contentJson, sections: [contentJson.sections[0]] };
        } else if (contentJson.overview) {
          teaser = { overview: contentJson.overview };
        } else {
          const keys = Object.keys(contentJson);
          if (keys.length > 0) {
            teaser = { [keys[0]]: contentJson[keys[0]] };
          }
        }
      }

      return res.json({
        ...resource,
        contentJson: teaser,
        isTeaser: true,
        requiresPro: true,
      });
    }

    return res.json({
      ...resource,
      isTeaser: false,
      requiresPro: false,
    });
  } catch (err) {
    console.error("Get resource error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/resources/:id/progress", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;
    const { progressPercent, completed } = req.body;

    if (progressPercent === undefined && completed === undefined) {
      return res.status(400).json({ error: "progressPercent or completed is required" });
    }

    const percent = Math.min(Math.max(Number(progressPercent) || 0, 0), 100);
    const isCompleted = completed === true || percent >= 100;

    const result = await db
      .insert(resourceProgress)
      .values({
        userId,
        resourceId: id,
        started: true,
        completed: isCompleted,
        progressPercent: percent,
      })
      .onConflictDoUpdate({
        target: [resourceProgress.userId, resourceProgress.resourceId],
        set: {
          progressPercent: percent,
          completed: isCompleted,
          lastAccessedAt: new Date(),
        },
      })
      .returning();

    return res.json(result[0]);
  } catch (err) {
    console.error("Update progress error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/resources/:id/bookmark", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;

    const existing = await db
      .select()
      .from(resourceBookmarks)
      .where(
        and(
          eq(resourceBookmarks.userId, userId),
          eq(resourceBookmarks.resourceId, id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(resourceBookmarks)
        .where(eq(resourceBookmarks.id, existing[0].id));
      return res.json({ bookmarked: false });
    }

    await db.insert(resourceBookmarks).values({
      userId,
      resourceId: id,
    });

    return res.json({ bookmarked: true });
  } catch (err) {
    console.error("Toggle bookmark error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/resources/generate/sabbath-companion", requireAuth, aiGenerationLimiter, async (req, res) => {
  try {
    const { lessonId } = req.body;
    if (!lessonId) {
      return res.status(400).json({ error: "lessonId is required" });
    }

    const { generateSabbathSchoolCompanion } = await import("../services/content-engine");
    const resource = await generateSabbathSchoolCompanion(lessonId);

    return res.json(resource);
  } catch (err) {
    console.error("Generate sabbath companion error:", err);
    return res.status(500).json({ error: "Failed to generate companion resource" });
  }
});

router.post("/api/resources/generate/topical", requireAuth, aiGenerationLimiter, async (req, res) => {
  try {
    const { topic, depth } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "topic is required" });
    }

    const { generateTopicalStudy } = await import("../services/content-engine");
    const resource = await generateTopicalStudy(String(topic).slice(0, 200), depth || "standard");

    return res.json(resource);
  } catch (err) {
    console.error("Generate topical study error:", err);
    return res.status(500).json({ error: "Failed to generate topical study" });
  }
});

router.post("/api/resources/generate/family-worship", requireAuth, aiGenerationLimiter, async (req, res) => {
  try {
    const { theme, daysCount } = req.body;
    if (!theme) {
      return res.status(400).json({ error: "theme is required" });
    }

    const days = Math.min(Math.max(Number(daysCount) || 7, 3), 14);

    const { generateFamilyWorshipPlan } = await import("../services/content-engine");
    const resource = await generateFamilyWorshipPlan(String(theme).slice(0, 200), days);

    return res.json(resource);
  } catch (err) {
    console.error("Generate family worship error:", err);
    return res.status(500).json({ error: "Failed to generate family worship plan" });
  }
});

router.post("/api/resources/:id/publish", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [resource] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    const [updated] = await db
      .update(resources)
      .set({
        status: "published",
        publishedAt: new Date(),
        reviewStatus: "approved",
        reviewedAt: new Date(),
        reviewedBy: req.authUserId,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, id))
      .returning();

    if (resource.supersedesResourceId) {
      await db.update(resources)
        .set({ status: "archived", reviewStatus: "archived", updatedAt: new Date() })
        .where(eq(resources.id, resource.supersedesResourceId));
      console.log(`[publish] Archived superseded resource ${resource.supersedesResourceId}`);
    }

    return res.json(updated);
  } catch (err) {
    console.error("Publish resource error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/resources/:id/review", requireEditor, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    if (!action || !["approved", "rejected", "needs_revision"].includes(action)) {
      return res.status(400).json({ error: "action must be approved, rejected, or needs_revision" });
    }

    const [resource] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    const updateData: Record<string, any> = {
      reviewStatus: action,
      reviewedAt: new Date(),
      reviewedBy: req.authUserId,
      reviewNotes: notes ? String(notes).slice(0, 2000) : null,
      updatedAt: new Date(),
    };

    if (action === "approved") {
      updateData.status = "published";
      updateData.publishedAt = resource.publishedAt || new Date();
    } else if (action === "rejected" || action === "needs_revision") {
      updateData.status = "draft";
      updateData.publishedAt = null;
    }

    const [updated] = await db
      .update(resources)
      .set(updateData)
      .where(eq(resources.id, id))
      .returning();

    if (action === "approved" && resource.supersedesResourceId) {
      await db.update(resources)
        .set({ status: "archived", reviewStatus: "archived", updatedAt: new Date() })
        .where(eq(resources.id, resource.supersedesResourceId));
      console.log(`[review] Archived superseded resource ${resource.supersedesResourceId}`);
    }

    return res.json(updated);
  } catch (err) {
    console.error("Review resource error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/resources/:id/rollback", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [current] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);

    if (!current) {
      return res.status(404).json({ error: "Resource not found" });
    }
    if (current.status !== "published") {
      return res.status(400).json({ error: "Only published resources can be rolled back" });
    }
    if (!current.supersedesResourceId) {
      return res.status(400).json({ error: "No predecessor version to roll back to" });
    }

    const [predecessor] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, current.supersedesResourceId))
      .limit(1);

    if (!predecessor) {
      return res.status(404).json({ error: "Predecessor resource not found" });
    }
    if (predecessor.status !== "archived") {
      return res.status(400).json({ error: "Predecessor is not archived — cannot restore" });
    }

    const now = new Date();
    const rollbackNote = `Rolled back: "${current.title}" (${current.promptVersion}) archived, restored predecessor (${predecessor.promptVersion})`;

    const result = await db.transaction(async (tx) => {
      await tx.update(resources)
        .set({
          status: "archived",
          reviewStatus: "archived",
          reviewNotes: rollbackNote,
          reviewedAt: now,
          reviewedBy: req.authUserId,
          updatedAt: now,
        })
        .where(eq(resources.id, current.id));

      const [restored] = await tx.update(resources)
        .set({
          status: "published",
          reviewStatus: "approved",
          publishedAt: now,
          reviewNotes: rollbackNote,
          reviewedAt: now,
          reviewedBy: req.authUserId,
          updatedAt: now,
        })
        .where(eq(resources.id, predecessor.id))
        .returning();

      return restored;
    });

    console.log(`[rollback] Admin ${req.authUserId} rolled back ${current.id} → ${predecessor.id}`);
    return res.json({
      restored: result,
      archivedId: current.id,
      restoredId: predecessor.id,
      predecessor: {
        id: predecessor.id,
        title: predecessor.title,
        promptVersion: predecessor.promptVersion,
        createdAt: predecessor.createdAt,
      },
      note: rollbackNote,
    });
  } catch (err) {
    console.error("Rollback error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
