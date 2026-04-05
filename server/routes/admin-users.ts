import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  users,
  prayerGroupMembers,
  prayerGroups,
  organizationMembers,
  organizations,
  readingHistory,
  groupDiscussions,
  userActivityCounters,
  readingStreaks,
  layerCompletions,
  studyJournalEntries,
  studyGuideSessions,
  userNotes,
  userHighlights,
  userBookmarks,
  prayerRequests,
  sabbathSchoolUserProgress,
  sabbathReflections,
  progressTracks,
  progressLessons,
  userPlanEnrollments,
  deviceTokens,
  childProfiles,
  kidsPurchases,
  kidsProgress,
  kidsStreaks,
  kidsDailyQuests,
  kidsUserBadges,
} from "../../shared/schema";
import { eq, and, sql, desc, asc, ilike, or } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string) || "";
    const roleFilter = (req.query.role as string) || "";
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (search) {
      conditions.push(
        or(
          ilike(users.displayName, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.username, `%${search}%`)
        )
      );
    }
    if (roleFilter) {
      conditions.push(eq(users.role, roleFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);

    const totalCount = countResult?.count || 0;

    const userList = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        isPro: users.isPro,
        isPatron: users.isPatron,
        organizationId: users.organizationId,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const usersWithActivity = await Promise.all(
      userList.map(async (u) => {
        const [lastActivity] = await db
          .select({ lastUsedAt: userActivityCounters.lastUsedAt })
          .from(userActivityCounters)
          .where(eq(userActivityCounters.userId, u.id))
          .orderBy(desc(userActivityCounters.lastUsedAt))
          .limit(1);

        return {
          ...u,
          lastActive: lastActivity?.lastUsedAt || null,
        };
      })
    );

    return res.json({
      users: usersWithActivity,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    console.error("Admin users list error:", err);
    return res.status(500).json({ error: "Failed to list users" });
  }
});

router.get("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        isPro: users.isPro,
        isPatron: users.isPatron,
        organizationId: users.organizationId,
        profileType: users.profileType,
      })
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const groupMemberships = await db
      .select({
        groupId: prayerGroupMembers.groupId,
        role: prayerGroupMembers.role,
        joinedAt: prayerGroupMembers.joinedAt,
        groupName: prayerGroups.name,
        groupType: prayerGroups.groupType,
      })
      .from(prayerGroupMembers)
      .leftJoin(prayerGroups, eq(prayerGroupMembers.groupId, prayerGroups.id))
      .where(eq(prayerGroupMembers.userId, id));

    let organization = null;
    if (user.organizationId) {
      const [org] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          type: organizations.type,
        })
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));
      organization = org || null;
    }

    const recentActivity = await db
      .select({
        id: readingHistory.id,
        bookName: readingHistory.bookName,
        chapter: readingHistory.chapter,
        readAt: readingHistory.readAt,
      })
      .from(readingHistory)
      .where(eq(readingHistory.userId, id))
      .orderBy(desc(readingHistory.readAt))
      .limit(10);

    const recentPosts = await db
      .select({
        id: groupDiscussions.id,
        groupId: groupDiscussions.groupId,
        content: groupDiscussions.content,
        createdAt: groupDiscussions.createdAt,
      })
      .from(groupDiscussions)
      .where(eq(groupDiscussions.userId, id))
      .orderBy(desc(groupDiscussions.createdAt))
      .limit(10);

    const [activityStats] = await db
      .select({ lastUsedAt: userActivityCounters.lastUsedAt })
      .from(userActivityCounters)
      .where(eq(userActivityCounters.userId, id))
      .orderBy(desc(userActivityCounters.lastUsedAt))
      .limit(1);

    return res.json({
      user: {
        ...user,
        lastActive: activityStats?.lastUsedAt || null,
      },
      groups: groupMemberships,
      organization,
      recentActivity,
      recentPosts,
    });
  } catch (err) {
    console.error("Admin user detail error:", err);
    return res.status(500).json({ error: "Failed to get user details" });
  }
});

router.patch("/api/admin/users/:id/role", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ["member", "student", "church_leader_pending", "church_leader", "editor", "admin"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, id));
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    await db.update(users).set({ role }).where(eq(users.id, id));

    return res.json({ success: true, role });
  } catch (err) {
    console.error("Admin update role error:", err);
    return res.status(500).json({ error: "Failed to update user role" });
  }
});

router.delete("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.authUserId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const [existing] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id));
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    const relatedTables = [
      { table: kidsPurchases, col: kidsPurchases.userId },
      { table: kidsProgress, col: kidsProgress.userId },
      { table: kidsStreaks, col: kidsStreaks.userId },
      { table: kidsDailyQuests, col: kidsDailyQuests.userId },
      { table: kidsUserBadges, col: kidsUserBadges.userId },
      { table: userActivityCounters, col: userActivityCounters.userId },
      { table: readingHistory, col: readingHistory.userId },
      { table: readingStreaks, col: readingStreaks.userId },
      { table: layerCompletions, col: layerCompletions.userId },
      { table: studyJournalEntries, col: studyJournalEntries.userId },
      { table: studyGuideSessions, col: studyGuideSessions.userId },
      { table: userNotes, col: userNotes.userId },
      { table: userHighlights, col: userHighlights.userId },
      { table: userBookmarks, col: userBookmarks.userId },
      { table: prayerRequests, col: prayerRequests.userId },
      { table: prayerGroupMembers, col: prayerGroupMembers.userId },
      { table: sabbathSchoolUserProgress, col: sabbathSchoolUserProgress.userId },
      { table: sabbathReflections, col: sabbathReflections.userId },
      { table: progressTracks, col: progressTracks.userId },
      { table: progressLessons, col: progressLessons.userId },
      { table: userPlanEnrollments, col: userPlanEnrollments.userId },
      { table: deviceTokens, col: deviceTokens.userId },
      { table: organizationMembers, col: organizationMembers.userId },
    ];

    try {
      await db.delete(childProfiles).where(eq(childProfiles.parentId, id));
    } catch {}

    for (const { table, col } of relatedTables) {
      try {
        await db.delete(table).where(eq(col, id));
      } catch {}
    }

    await db.delete(users).where(eq(users.id, id));

    return res.json({ success: true });
  } catch (err) {
    console.error("Admin delete user error:", err);
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
