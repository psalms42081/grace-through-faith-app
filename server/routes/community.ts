import { Router } from "express";
  import { db } from "../db";
  import { cachedResponse } from "../middleware/response-cache";
  import {
    users,
    families,
    prayerGroups,
    prayerGroupMembers,
    prayerRequests,
    groupDiscussions,
    groupDiscussionReplies,
    groupAnnouncements,
    formationTracks,
    progressTracks,
    sdaChurches,
    liveSessions,
    sabbathReflections,
    devotionalPlans,
    devotionalDays,
    userPlanEnrollments,
    userPlanProgress,
  } from "../../shared/schema";
  import { eq, and, ilike, sql, desc } from "drizzle-orm";
  import { generateCode, requireAuth, optionalAuth, extractUserId, getEffectiveUserId } from "../middleware/auth";
  import { generateScripturalEncouragement } from "../services/ai-engine";

  const router = Router();

  router.post("/api/family/create", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Family name is required" });

    const [existingUser] = await db.select({ familyId: users.familyId }).from(users).where(eq(users.id, userId));
    if (existingUser?.familyId) {
      return res.status(400).json({ error: "You are already in a family group" });
    }

    let inviteCode = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db.select().from(families).where(eq(families.inviteCode, inviteCode));
      if (existing.length === 0) break;
      inviteCode = generateCode();
      attempts++;
    }

    const [family] = await db.insert(families).values({
      name,
      inviteCode,
      createdBy: userId,
    }).returning();

    await db.update(users).set({ familyId: family.id }).where(eq(users.id, userId));

    return res.json({ family });
  } catch (err) {
    console.error("Family create error:", err);
    return res.status(500).json({ error: "Failed to create family" });
  }
});

router.post("/api/family/join", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: "Invite code is required" });

    const [existingUser] = await db.select({ familyId: users.familyId }).from(users).where(eq(users.id, userId));
    if (existingUser?.familyId) {
      return res.status(400).json({ error: "You are already in a family group" });
    }

    const [family] = await db.select().from(families).where(eq(families.inviteCode, inviteCode.toUpperCase()));
    if (!family) {
      return res.status(404).json({ error: "Invalid invite code" });
    }

    await db.update(users).set({ familyId: family.id }).where(eq(users.id, userId));

    return res.json({ family });
  } catch (err) {
    console.error("Family join error:", err);
    return res.status(500).json({ error: "Failed to join family" });
  }
});

router.get("/api/family/info", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const [user] = await db.select({ familyId: users.familyId }).from(users).where(eq(users.id, userId));
    if (!user?.familyId) {
      return res.json({ family: null });
    }

    const [family] = await db.select().from(families).where(eq(families.id, user.familyId));
    if (!family) return res.json({ family: null });

    const members = await db.select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
    }).from(users).where(eq(users.familyId, family.id));

    return res.json({ family, members });
  } catch (err) {
    console.error("Family info error:", err);
    return res.status(500).json({ error: "Failed to get family info" });
  }
});

router.get("/api/family/members", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const [user] = await db.select({ familyId: users.familyId }).from(users).where(eq(users.id, userId));
    if (!user?.familyId) return res.json({ members: [] });

    const members = await db.select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
    }).from(users).where(eq(users.familyId, user.familyId));

    return res.json({ members });
  } catch (err) {
    console.error("Family members error:", err);
    return res.status(500).json({ error: "Failed to get family members" });
  }
});


  router.post("/api/groups/create", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { name, description, groupType, isPublic } = req.body;
    if (!name) return res.status(400).json({ error: "Group name is required" });

    let joinCode = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db.select().from(prayerGroups).where(eq(prayerGroups.joinCode, joinCode));
      if (existing.length === 0) break;
      joinCode = generateCode();
      attempts++;
    }

    const [user] = await db.select({ displayName: users.displayName, username: users.username }).from(users).where(eq(users.id, userId));

    const [group] = await db.insert(prayerGroups).values({
      name,
      description: description || null,
      joinCode,
      createdBy: userId,
      groupType: groupType || "prayer",
      isPublic: isPublic === true,
      memberCount: 1,
    }).returning();

    await db.insert(prayerGroupMembers).values({
      groupId: group.id,
      userId,
      displayName: user?.displayName || user?.username || "Member",
      role: "leader",
    });

    return res.json({ group: { ...group, memberCount: 1 } });
  } catch (err) {
    console.error("Group create error:", err);
    return res.status(500).json({ error: "Failed to create group" });
  }
});

router.post("/api/groups/join", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { joinCode } = req.body;
    if (!joinCode) return res.status(400).json({ error: "Join code is required" });

    const [group] = await db.select().from(prayerGroups).where(eq(prayerGroups.joinCode, joinCode.toUpperCase()));
    if (!group) return res.status(404).json({ error: "Invalid join code" });

    const existingMember = await db.select().from(prayerGroupMembers)
      .where(and(eq(prayerGroupMembers.groupId, group.id), eq(prayerGroupMembers.userId, userId)));
    if (existingMember.length > 0) {
      return res.status(400).json({ error: "You are already a member of this group" });
    }

    const [user] = await db.select({ displayName: users.displayName, username: users.username }).from(users).where(eq(users.id, userId));

    await db.insert(prayerGroupMembers).values({
      groupId: group.id,
      userId,
      displayName: user?.displayName || user?.username || "Member",
    });

    await db.update(prayerGroups).set({
      memberCount: sql`${prayerGroups.memberCount} + 1`,
    }).where(eq(prayerGroups.id, group.id));

    return res.json({ group: { ...group, memberCount: group.memberCount + 1 } });
  } catch (err) {
    console.error("Group join error:", err);
    return res.status(500).json({ error: "Failed to join group" });
  }
});

router.get("/api/groups", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const memberships = await db.select({ groupId: prayerGroupMembers.groupId })
      .from(prayerGroupMembers).where(eq(prayerGroupMembers.userId, userId));

    if (memberships.length === 0) return res.json({ groups: [] });

    const groupIds = memberships.map((m) => m.groupId);
    const groups = [];
    for (const gid of groupIds) {
      const [g] = await db.select().from(prayerGroups).where(eq(prayerGroups.id, gid));
      if (g) groups.push(g);
    }

    return res.json({ groups });
  } catch (err) {
    console.error("Groups list error:", err);
    return res.status(500).json({ error: "Failed to list groups" });
  }
});

router.get("/api/groups/public", async (req, res) => {
  try {
    const { type, search } = req.query as { type?: string; search?: string };
    let groups = await db.select().from(prayerGroups).where(eq(prayerGroups.isPublic, true));
    if (type && type !== "all") {
      groups = groups.filter(g => g.groupType === type);
    }
    if (search) {
      const q = (search as string).toLowerCase();
      groups = groups.filter(g => g.name.toLowerCase().includes(q) || (g.description || "").toLowerCase().includes(q));
    }
    return res.json(groups);
  } catch (err) {
    console.error("Public groups error:", err);
    return res.status(500).json({ error: "Failed to list public groups" });
  }
});

router.get("/api/groups/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [group] = await db.select().from(prayerGroups).where(eq(prayerGroups.id, id));
    if (!group) return res.status(404).json({ error: "Group not found" });

    let members = await db.select().from(prayerGroupMembers).where(eq(prayerGroupMembers.groupId, id));

    if (group.createdBy && !members.some(m => m.userId === group.createdBy)) {
      try {
        const [creator] = await db.select({ displayName: users.displayName, username: users.username })
          .from(users).where(eq(users.id, group.createdBy));
        await db.insert(prayerGroupMembers).values({
          groupId: group.id,
          userId: group.createdBy,
          displayName: creator?.displayName || creator?.username || "Leader",
          role: "leader",
        });
        members = await db.select().from(prayerGroupMembers).where(eq(prayerGroupMembers.groupId, id));
        await db.update(prayerGroups).set({ memberCount: members.length }).where(eq(prayerGroups.id, id));
      } catch (repairErr: any) {
        if (!repairErr?.message?.includes("duplicate")) {
          console.error("Group membership repair error:", repairErr);
        }
      }
    }

    let trackProgress: any = null;
    if (group.assignedTrackId) {
      const [track] = await db.select().from(formationTracks).where(eq(formationTracks.id, group.assignedTrackId));
      if (track) {
        const memberIds = members.map(m => m.userId);
        const progress = [];
        for (const mid of memberIds) {
          const [pt] = await db.select().from(progressTracks)
            .where(and(eq(progressTracks.userId, mid), eq(progressTracks.trackId, group.assignedTrackId)));
          if (pt) progress.push(pt);
        }
        const avgPercent = progress.length > 0
          ? Math.round(progress.reduce((s, p) => s + (p.percentComplete || 0), 0) / members.length)
          : 0;
        trackProgress = {
          track,
          enrolledCount: progress.length,
          totalMembers: members.length,
          averagePercent: avgPercent,
        };
      }
    }

    return res.json({ group: { ...group, memberCount: members.length }, members, trackProgress });
  } catch (err) {
    console.error("Group detail error:", err);
    return res.status(500).json({ error: "Failed to get group details" });
  }
});

router.post("/api/groups/:id/leave", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;

    await db.delete(prayerGroupMembers)
      .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, userId)));

    await db.update(prayerGroups).set({
      memberCount: sql`GREATEST(${prayerGroups.memberCount} - 1, 0)`,
    }).where(eq(prayerGroups.id, id));

    return res.json({ success: true });
  } catch (err) {
    console.error("Group leave error:", err);
    return res.status(500).json({ error: "Failed to leave group" });
  }
});

router.post("/api/groups/:id/remove-member", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: "Target user ID is required" });
    if (targetUserId === userId) return res.status(400).json({ error: "Cannot remove yourself. Use leave instead." });

    const [requester] = await db.select().from(prayerGroupMembers)
      .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, userId)));
    if (!requester || requester.role !== "leader") {
      return res.status(403).json({ error: "Only leaders can remove members" });
    }

    const deleted = await db.delete(prayerGroupMembers)
      .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, targetUserId)))
      .returning({ id: prayerGroupMembers.id });

    if (deleted.length > 0) {
      await db.update(prayerGroups).set({
        memberCount: sql`GREATEST(${prayerGroups.memberCount} - 1, 0)`,
      }).where(eq(prayerGroups.id, id));
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Remove member error:", err);
    return res.status(500).json({ error: "Failed to remove member" });
  }
});

router.delete("/api/groups/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;
    const [member] = await db.select().from(prayerGroupMembers)
      .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, userId)));
    const [userRow] = await db.select().from(users).where(eq(users.id, userId));
    const isAdmin = userRow?.role === "admin";
    const isLeader = member?.role === "leader";
    if (!isAdmin && !isLeader) {
      return res.status(403).json({ error: "Only group leaders or admins can delete groups" });
    }
    await db.delete(groupDiscussionReplies).where(
      sql`${groupDiscussionReplies.discussionId} IN (SELECT id FROM group_discussion WHERE group_id = ${id})`
    );
    await db.delete(groupDiscussions).where(eq(groupDiscussions.groupId, id));
    await db.delete(groupAnnouncements).where(eq(groupAnnouncements.groupId, id));
    await db.delete(prayerRequests).where(eq(prayerRequests.groupId, id));
    await db.delete(liveSessions).where(eq(liveSessions.groupId, id));
    await db.delete(prayerGroupMembers).where(eq(prayerGroupMembers.groupId, id));
    await db.delete(prayerGroups).where(eq(prayerGroups.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete group error:", err);
    return res.status(500).json({ error: "Failed to delete group" });
  }
});

router.get("/api/groups/:id/prayers", async (req, res) => {
  try {
    const { id } = req.params;
    const prayers = await db.select().from(prayerRequests)
      .where(eq(prayerRequests.groupId, id))
      .orderBy(desc(prayerRequests.createdAt));

    return res.json(prayers);
  } catch (err) {
    console.error("Group prayers error:", err);
    return res.status(500).json({ error: "Failed to get group prayers" });
  }
});

router.post("/api/groups/:id/prayers", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;
    const { title, content, authorName } = req.body;
    if (!title) return res.status(400).json({ error: "Prayer title is required" });

    let scripturalVerse = null;
    let scripturalNote = null;
    try {
      const { normalizeLanguageCode } = await import("../services/languageAwareContent");
      const contentLang = normalizeLanguageCode(req.headers["x-content-language"] as string);
      const encouragement = await generateScripturalEncouragement(title, content || "", contentLang);
      scripturalVerse = encouragement.verse;
      scripturalNote = encouragement.note;
    } catch {}

    const [prayer] = await db.insert(prayerRequests).values({
      userId,
      groupId: id,
      title,
      content: content || null,
      authorName: authorName || "Group Member",
      category: "group",
      scripturalVerse,
      scripturalNote,
    }).returning();

    return res.json(prayer);
  } catch (err) {
    console.error("Group prayer create error:", err);
    return res.status(500).json({ error: "Failed to create prayer" });
  }
});

router.post("/api/groups/:id/prayers/:prayerId/support", async (req, res) => {
  try {
    const { prayerId } = req.params;
    const { memberName } = req.body;

    const [prayer] = await db.select().from(prayerRequests).where(eq(prayerRequests.id, prayerId));
    if (!prayer) return res.status(404).json({ error: "Prayer not found" });

    const currentSupported = Array.isArray(prayer.supportedBy) ? prayer.supportedBy : [];
    const name = memberName || "Someone";
    if (!currentSupported.includes(name)) {
      currentSupported.push(name);
    }

    await db.update(prayerRequests).set({
      supportCount: sql`${prayerRequests.supportCount} + 1`,
      supportedBy: currentSupported,
    }).where(eq(prayerRequests.id, prayerId));

    return res.json({ success: true, supportCount: (prayer.supportCount || 0) + 1 });
  } catch (err) {
    console.error("Group prayer support error:", err);
    return res.status(500).json({ error: "Failed to support prayer" });
  }
});

router.post("/api/groups/:id/prayers/:prayerId/answered", requireAuth, async (req, res) => {
  try {
    const { prayerId } = req.params;
    await db.update(prayerRequests).set({
      answered: true,
      answeredAt: new Date(),
    }).where(eq(prayerRequests.id, prayerId));

    return res.json({ success: true });
  } catch (err) {
    console.error("Group prayer answered error:", err);
    return res.status(500).json({ error: "Failed to mark prayer answered" });
  }
});

// ─── SMALL GROUPS 2.0 — DISCUSSIONS, STUDY PLANS, ROLES ─────────────────

router.post("/api/groups/:id/assign-track", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: "Track ID is required" });

    const [member] = await db.select().from(prayerGroupMembers)
      .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, userId)));
    if (!member || (member.role !== "leader" && member.role !== "moderator")) {
      return res.status(403).json({ error: "Only leaders and moderators can assign study plans" });
    }

    const [track] = await db.select().from(formationTracks).where(eq(formationTracks.id, trackId));
    if (!track) return res.status(404).json({ error: "Track not found" });

    await db.update(prayerGroups).set({ assignedTrackId: trackId }).where(eq(prayerGroups.id, id));

    return res.json({ success: true, track });
  } catch (err) {
    console.error("Assign track error:", err);
    return res.status(500).json({ error: "Failed to assign track" });
  }
});

router.post("/api/groups/:id/promote", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;
    const { targetUserId, newRole } = req.body;
    if (!targetUserId || !newRole) return res.status(400).json({ error: "Target user and role required" });
    if (!["leader", "moderator", "member"].includes(newRole)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const [requester] = await db.select().from(prayerGroupMembers)
      .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, userId)));
    if (!requester || requester.role !== "leader") {
      return res.status(403).json({ error: "Only leaders can change member roles" });
    }

    await db.update(prayerGroupMembers).set({ role: newRole })
      .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, targetUserId)));

    return res.json({ success: true });
  } catch (err) {
    console.error("Promote member error:", err);
    return res.status(500).json({ error: "Failed to update member role" });
  }
});

router.get("/api/groups/:id/discussions", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;
    const [membership] = await db.select().from(prayerGroupMembers)
      .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, userId)));
    if (!membership) return res.status(403).json({ error: "You must be a member to view discussions" });

    const discussions = await db.select().from(groupDiscussions)
      .where(eq(groupDiscussions.groupId, id))
      .orderBy(desc(groupDiscussions.createdAt));
    return res.json(discussions);
  } catch (err) {
    console.error("Group discussions error:", err);
    return res.status(500).json({ error: "Failed to get discussions" });
  }
});

router.post("/api/groups/:id/discussion", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content is required" });

    const [membership] = await db.select().from(prayerGroupMembers)
      .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, userId)));
    if (!membership) return res.status(403).json({ error: "You must be a member to post discussions" });

    const [user] = await db.select({ displayName: users.displayName, username: users.username }).from(users).where(eq(users.id, userId));

    const [discussion] = await db.insert(groupDiscussions).values({
      groupId: id,
      userId,
      authorName: user?.displayName || user?.username || "Member",
      content: content.trim(),
    }).returning();

    return res.json(discussion);
  } catch (err) {
    console.error("Create discussion error:", err);
    return res.status(500).json({ error: "Failed to create discussion" });
  }
});

router.get("/api/groups/:id/discussions/:discussionId/replies", async (req, res) => {
  try {
    const { discussionId } = req.params;
    const replies = await db.select().from(groupDiscussionReplies)
      .where(eq(groupDiscussionReplies.discussionId, discussionId))
      .orderBy(groupDiscussionReplies.createdAt);
    return res.json(replies);
  } catch (err) {
    console.error("Discussion replies error:", err);
    return res.status(500).json({ error: "Failed to get replies" });
  }
});

router.post("/api/groups/:id/discussions/:discussionId/reply", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id, discussionId } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Reply content is required" });

    const [membership] = await db.select().from(prayerGroupMembers)
      .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, userId)));
    if (!membership) return res.status(403).json({ error: "You must be a member to reply" });

    const [user] = await db.select({ displayName: users.displayName, username: users.username }).from(users).where(eq(users.id, userId));

    const [reply] = await db.insert(groupDiscussionReplies).values({
      discussionId,
      userId,
      authorName: user?.displayName || user?.username || "Member",
      content: content.trim(),
    }).returning();

    await db.update(groupDiscussions).set({
      replyCount: sql`${groupDiscussions.replyCount} + 1`,
    }).where(eq(groupDiscussions.id, discussionId));

    return res.json(reply);
  } catch (err) {
    console.error("Discussion reply error:", err);
    return res.status(500).json({ error: "Failed to post reply" });
  }
});

router.get("/api/groups/:id/announcements", async (req, res) => {
  try {
    const { id } = req.params;
    const announcements = await db.select().from(groupAnnouncements)
      .where(eq(groupAnnouncements.groupId, id))
      .orderBy(desc(groupAnnouncements.createdAt));
    return res.json(announcements);
  } catch (err) {
    console.error("Group announcements error:", err);
    return res.status(500).json({ error: "Failed to get announcements" });
  }
});

router.post("/api/groups/:id/announcement", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;
    const { title, content } = req.body;
    if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: "Title and content required" });

    const [member] = await db.select().from(prayerGroupMembers)
      .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, userId)));
    if (!member || (member.role !== "leader" && member.role !== "moderator")) {
      return res.status(403).json({ error: "Only leaders and moderators can post announcements" });
    }

    const [user] = await db.select({ displayName: users.displayName, username: users.username }).from(users).where(eq(users.id, userId));

    const [announcement] = await db.insert(groupAnnouncements).values({
      groupId: id,
      userId,
      authorName: user?.displayName || user?.username || "Leader",
      title: title.trim(),
      content: content.trim(),
    }).returning();

    return res.json(announcement);
  } catch (err) {
    console.error("Create announcement error:", err);
    return res.status(500).json({ error: "Failed to create announcement" });
  }
});

  router.get("/api/churches", cachedResponse(300), async (req, res) => {
  try {
    const { lat, lng, radius, city } = req.query as { lat?: string; lng?: string; radius?: string; city?: string };

    let allChurches = await db.select().from(sdaChurches);

    const hasTextSearch = !!city;

    if (hasTextSearch) {
      const words = city!.toLowerCase().split(/\s+/).filter(Boolean);
      allChurches = allChurches.filter(c => {
        const fields = [
          c.city.toLowerCase(),
          (c.state || "").toLowerCase(),
          c.country.toLowerCase(),
          c.name.toLowerCase(),
          c.address.toLowerCase(),
        ].join(" ");
        return words.every(w => fields.includes(w));
      });
    }

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = parseFloat(radius || "50");

      if (isNaN(userLat) || isNaN(userLng) || isNaN(radiusKm)) {
        return res.status(400).json({ error: "Invalid lat, lng, or radius values" });
      }

      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      const withDist = allChurches
        .map(c => ({ ...c, distance: haversine(userLat, userLng, parseFloat(c.lat), parseFloat(c.lng)) }));

      if (hasTextSearch) {
        return res.json(withDist.sort((a, b) => a.distance - b.distance));
      }

      return res.json(
        withDist
          .filter(c => c.distance <= radiusKm)
          .sort((a, b) => a.distance - b.distance)
      );
    }

    return res.json(allChurches);
  } catch (err) {
    console.error("Churches list error:", err);
    return res.status(500).json({ error: "Failed to list churches" });
  }
});

router.get("/api/churches/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [church] = await db.select().from(sdaChurches).where(eq(sdaChurches.id, id));
    if (!church) return res.status(404).json({ error: "Church not found" });
    return res.json(church);
  } catch (err) {
    console.error("Church detail error:", err);
    return res.status(500).json({ error: "Failed to get church details" });
  }
});

// ─── GROUP DEVOTIONAL PLANS ──────────────────────────────────────────────

router.post("/api/groups/:id/assign-plan", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: "Plan ID is required" });

    const [member] = await db.select().from(prayerGroupMembers)
      .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, userId)));
    if (!member || (member.role !== "leader" && member.role !== "moderator")) {
      return res.status(403).json({ error: "Only leaders and moderators can assign devotional plans" });
    }

    const [plan] = await db.select().from(devotionalPlans).where(eq(devotionalPlans.id, planId));
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    await db.update(prayerGroups).set({ groupPlanId: planId }).where(eq(prayerGroups.id, id));

    return res.json({ success: true, plan });
  } catch (err) {
    console.error("Assign plan error:", err);
    return res.status(500).json({ error: "Failed to assign plan" });
  }
});

router.get("/api/groups/:id/plan-progress", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;
    const [group] = await db.select().from(prayerGroups).where(eq(prayerGroups.id, id));
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (!group.isPublic) {
      const [membership] = await db.select().from(prayerGroupMembers)
        .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, userId)));
      if (!membership) return res.status(403).json({ error: "You must be a member to view group progress" });
    }

    if (!group.groupPlanId) return res.json({ plan: null, members: [] });

    const [plan] = await db.select().from(devotionalPlans).where(eq(devotionalPlans.id, group.groupPlanId));
    if (!plan) return res.json({ plan: null, members: [] });

    const days = await db.select().from(devotionalDays).where(eq(devotionalDays.planId, plan.id));
    const totalDays = days.length || plan.totalDays;

    const members = await db.select().from(prayerGroupMembers).where(eq(prayerGroupMembers.groupId, id));

    const memberProgress = [];
    for (const member of members) {
      const [enrollment] = await db.select().from(userPlanEnrollments)
        .where(and(eq(userPlanEnrollments.userId, member.userId), eq(userPlanEnrollments.planId, plan.id)));

      let completedDays = 0;
      if (enrollment) {
        const progress = await db.select().from(userPlanProgress)
          .where(eq(userPlanProgress.enrollmentId, enrollment.id));
        completedDays = progress.length;
      }

      memberProgress.push({
        userId: member.userId,
        displayName: member.displayName || "Member",
        role: member.role,
        enrolled: !!enrollment,
        completedDays,
        totalDays,
        percent: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
      });
    }

    const enrolledCount = memberProgress.filter(m => m.enrolled).length;
    const avgPercent = enrolledCount > 0
      ? Math.round(memberProgress.filter(m => m.enrolled).reduce((s, m) => s + m.percent, 0) / enrolledCount)
      : 0;

    return res.json({
      plan: {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        totalDays,
        theme: plan.theme,
      },
      members: memberProgress,
      enrolledCount,
      totalMembers: members.length,
      averagePercent: avgPercent,
    });
  } catch (err) {
    console.error("Plan progress error:", err);
    return res.status(500).json({ error: "Failed to get plan progress" });
  }
});

router.post("/api/groups/:id/share-reflection", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;
    const { content, dayTitle, passageLabel } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content is required" });

    const [membership] = await db.select().from(prayerGroupMembers)
      .where(and(eq(prayerGroupMembers.groupId, id), eq(prayerGroupMembers.userId, userId)));
    if (!membership) return res.status(403).json({ error: "You must be a member to share reflections" });

    const [user] = await db.select({ displayName: users.displayName, username: users.username }).from(users).where(eq(users.id, userId));

    const prefix = dayTitle ? `[${dayTitle}${passageLabel ? ` - ${passageLabel}` : ""}] ` : "";
    const fullContent = prefix + content.trim();

    const [discussion] = await db.insert(groupDiscussions).values({
      groupId: id,
      userId,
      authorName: user?.displayName || user?.username || "Member",
      content: fullContent,
    }).returning();

    return res.json(discussion);
  } catch (err) {
    console.error("Share reflection error:", err);
    return res.status(500).json({ error: "Failed to share reflection" });
  }
});

// ─── LIVE STREAMING ──────────────────────────────────────────────────────

import { createLiveKitRoom, generateToken, deleteLiveKitRoom, getLiveKitUrl } from "../services/livekit";
import path from "path";

function generateRoomName(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let room = "gtf-";
  for (let i = 0; i < 12; i++) room += chars[Math.floor(Math.random() * chars.length)];
  return room;
}

router.post("/api/streams/create", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { title, groupId, churchId } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    if (groupId) {
      const membership = await db.select().from(prayerGroupMembers)
        .where(and(eq(prayerGroupMembers.groupId, groupId), eq(prayerGroupMembers.userId, userId)));
      if (membership.length === 0) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      const member = membership[0];
      if (member.role !== "leader" && member.role !== "moderator") {
        return res.status(403).json({ error: "Only leaders and moderators can start live sessions" });
      }
    }

    const [user] = await db.select({ displayName: users.displayName, username: users.username })
      .from(users).where(eq(users.id, userId));

    const roomName = generateRoomName();
    await createLiveKitRoom(roomName);

    const [session] = await db.insert(liveSessions).values({
      title,
      groupId: groupId || null,
      churchId: churchId || null,
      hostUserId: userId,
      hostDisplayName: user?.displayName || user?.username || "Host",
      roomUrl: roomName,
      status: "live",
    }).returning();

    return res.json(session);
  } catch (err) {
    console.error("Stream create error:", err);
    return res.status(500).json({ error: "Failed to create stream" });
  }
});

router.get("/api/streams/:id/token", async (req, res) => {
  try {
    const { id } = req.params;
    const displayName = (req.query.displayName as string) || "Guest";
    const userId = extractUserId(req);

    const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, id));
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.status === "ended") return res.status(410).json({ error: "Session has ended" });

    const isHost = !!userId && userId === session.hostUserId;
    const token = await generateToken(session.roomUrl, displayName, isHost);

    return res.json({
      token,
      wsUrl: getLiveKitUrl(),
      roomName: session.roomUrl,
    });
  } catch (err) {
    console.error("Stream token error:", err);
    return res.status(500).json({ error: "Failed to generate token" });
  }
});

router.get("/api/streams/livekit-client.umd.js", async (_req, res) => {
  try {
    const fs = await import("fs");
    const filePath = path.join(process.cwd(), "server", "templates", "livekit-client.umd.js");
    const content = fs.readFileSync(filePath, "utf-8");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    return res.send(content);
  } catch (err) {
    console.error("LiveKit client serve error:", err);
    return res.status(500).send("Error serving LiveKit client");
  }
});

router.get("/api/streams/:id/room", async (req, res) => {
  try {
    const { id } = req.params;
    const displayName = (req.query.displayName as string) || "Guest";

    const userId = extractUserId(req);

    const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, id));
    if (!session) return res.status(404).send("Session not found");
    if (session.status === "ended") return res.status(410).send("Session has ended");

    const isHost = !!userId && userId === session.hostUserId;
    let canShare = isHost;
    if (!canShare && userId && session.groupId) {
      const [mem] = await db.select({ role: prayerGroupMembers.role }).from(prayerGroupMembers)
        .where(and(eq(prayerGroupMembers.groupId, session.groupId), eq(prayerGroupMembers.userId, userId)));
      if (mem && (mem.role === "leader" || mem.role === "moderator")) canShare = true;
    }
    const token = await generateToken(session.roomUrl, displayName, isHost);
    const wsUrl = getLiveKitUrl();

    const fs = await import("fs");
    const htmlPath = path.join(process.cwd(), "server", "templates", "livekit-room.html");
    let html = fs.readFileSync(htmlPath, "utf-8");

    html = html.replace(
      "<!--SERVER_INJECTED_CONFIG-->",
      `<script>window.__LIVEKIT_CONFIG__=${JSON.stringify({ wsUrl, token, displayName, isHost, canShare })};</script>`
    );

    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  } catch (err) {
    console.error("Stream room error:", err);
    return res.status(500).send("Error loading room");
  }
});

router.get("/api/streams/active", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  try {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    await db.update(liveSessions).set({
      status: "ended",
      endedAt: new Date(),
    }).where(and(eq(liveSessions.status, "live"), sql`${liveSessions.startedAt} < ${sixHoursAgo}`));

    const sessions = await db.select().from(liveSessions)
      .where(eq(liveSessions.status, "live"))
      .orderBy(desc(liveSessions.startedAt));

    const enriched = [];
    for (const session of sessions) {
      let groupName: string | null = null;
      if (session.groupId) {
        const [g] = await db.select({ name: prayerGroups.name }).from(prayerGroups)
          .where(eq(prayerGroups.id, session.groupId));
        groupName = g?.name || null;
      }
      enriched.push({ ...session, groupName });
    }

    return res.json(enriched);
  } catch (err) {
    console.error("Active streams error:", err);
    return res.status(500).json({ error: "Failed to get active streams" });
  }
});

router.get("/api/streams/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, id));
    if (!session) return res.status(404).json({ error: "Stream not found" });

    let groupName: string | null = null;
    if (session.groupId) {
      const [g] = await db.select({ name: prayerGroups.name }).from(prayerGroups)
        .where(eq(prayerGroups.id, session.groupId));
      groupName = g?.name || null;
    }

    return res.json({ ...session, groupName });
  } catch (err) {
    console.error("Stream detail error:", err);
    return res.status(500).json({ error: "Failed to get stream" });
  }
});

router.post("/api/streams/:id/end", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { id } = req.params;
    const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, id));
    if (!session) return res.status(404).json({ error: "Stream not found" });
    const [caller] = await db.select().from(users).where(eq(users.id, userId));
    const isAdmin = caller?.role === "admin";
    if (session.hostUserId !== userId && !isAdmin) {
      return res.status(403).json({ error: "Only the host can end this session" });
    }
    if (session.status === "ended") {
      return res.json(session);
    }
    const [updated] = await db.update(liveSessions).set({
      status: "ended",
      endedAt: new Date(),
    }).where(eq(liveSessions.id, id)).returning();

    deleteLiveKitRoom(session.roomUrl).catch(() => {});

    return res.json(updated);
  } catch (err) {
    console.error("Stream end error:", err);
    return res.status(500).json({ error: "Failed to end stream" });
  }
});

// ─── SABBATH REFLECTIONS ──────────────────────────────────────────────────

router.get("/api/sabbath/reflections", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const date = String(req.query.date || "");
    if (!date) return res.status(400).json({ error: "date is required" });

    const rows = await db
      .select()
      .from(sabbathReflections)
      .where(
        and(
          eq(sabbathReflections.userId, userId),
          eq(sabbathReflections.date, date)
        )
      );

    return res.json(rows);
  } catch (err) {
    console.error("Sabbath reflections GET error:", err);
    return res.status(500).json({ error: "Failed to get reflections" });
  }
});

router.post("/api/sabbath/reflections", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { date, prompt, response } = req.body;
    if (!date || !prompt || !response) {
      return res.status(400).json({ error: "date, prompt, and response are required" });
    }

    const existing = await db
      .select()
      .from(sabbathReflections)
      .where(
        and(
          eq(sabbathReflections.userId, userId),
          eq(sabbathReflections.date, date),
          eq(sabbathReflections.prompt, prompt)
        )
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(sabbathReflections)
        .set({ response })
        .where(eq(sabbathReflections.id, existing[0].id))
        .returning();
      return res.json(updated);
    }

    const [inserted] = await db
      .insert(sabbathReflections)
      .values({ userId, date, prompt, response })
      .returning();

    return res.json(inserted);
  } catch (err) {
    console.error("Sabbath reflections POST error:", err);
    return res.status(500).json({ error: "Failed to save reflection" });
  }
});

  export default router;
  