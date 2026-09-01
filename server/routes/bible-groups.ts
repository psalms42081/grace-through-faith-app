import { Router } from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db } from "../db";
import {
  users,
  bibleSmallGroups,
  bibleSmallGroupMembers,
  bibleSmallGroupPosts,
  bibleSmallGroupLiveSessions,
} from "../../shared/schema";
import { eq, and, desc, inArray, isNull, sql } from "drizzle-orm";
import { getAuthUserId, requireAuth } from "../middleware/auth";
import { bibleGroupWriteLimiter } from "../middleware/rate-limit";
import { normalizeSabbathSchoolTimeZone } from "../services/sabbath-school-date";
import { resolveCurrentWeekPointer } from "../services/sabbath-school-current";
import {
  createLiveKitRoom,
  deleteLiveKitRoom,
  generateToken,
  getLiveKitUrl,
  isLiveKitConfigured,
} from "../services/livekit";
import {
  ADULT_CONFIRM_REQUIRED,
  generateBibleGroupInviteCode,
  normalizeBibleGroupInviteCode,
  parseGroupCurriculum,
  type BibleGroupCurriculum,
  type SabbathSchoolWeekPointer,
} from "../../lib/bible-small-group";

const router = Router();

const POST_BODY_MAX = 4000;
const GROUP_NAME_MAX = 80;

async function allocateInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateBibleGroupInviteCode();
    const [existing] = await db
      .select({ id: bibleSmallGroups.id })
      .from(bibleSmallGroups)
      .where(eq(bibleSmallGroups.inviteCode, code))
      .limit(1);
    if (!existing) return code;
  }
  throw new Error("Could not allocate a unique invite code");
}

async function loadAdultConfirmedAt(userId: string): Promise<Date | null> {
  const [user] = await db
    .select({ adultConfirmedAt: users.adultConfirmedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.adultConfirmedAt ?? null;
}

function adultRequired() {
  return {
    error: "Confirm you are 18 or over to create or join a group.",
    code: ADULT_CONFIRM_REQUIRED,
  };
}

async function requireAdult(userId: string) {
  const confirmedAt = await loadAdultConfirmedAt(userId);
  return confirmedAt;
}

async function membershipOf(groupId: string, userId: string) {
  const [row] = await db
    .select()
    .from(bibleSmallGroupMembers)
    .where(
      and(
        eq(bibleSmallGroupMembers.groupId, groupId),
        eq(bibleSmallGroupMembers.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function loadActiveGroup(groupId: string) {
  const [group] = await db
    .select()
    .from(bibleSmallGroups)
    .where(
      and(eq(bibleSmallGroups.id, groupId), isNull(bibleSmallGroups.archivedAt)),
    )
    .limit(1);
  return group ?? null;
}

async function weekPointerFor(
  curriculum: BibleGroupCurriculum,
  timeZone: string,
): Promise<SabbathSchoolWeekPointer | null> {
  return resolveCurrentWeekPointer(curriculum, timeZone);
}

const LIVE_HEARTBEAT_STALE_MS = 5 * 60 * 1000;
const LIVE_ROOMS_UNCONFIGURED = { error: "Live rooms are not configured" };

function publicLiveSession(row: typeof bibleSmallGroupLiveSessions.$inferSelect) {
  return {
    id: row.id,
    groupId: row.groupId,
    startedBy: row.startedBy,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    roomName: row.roomName,
    lastHeartbeatAt: row.lastHeartbeatAt,
  };
}

async function loadActiveLiveRow(groupId: string) {
  const [row] = await db
    .select()
    .from(bibleSmallGroupLiveSessions)
    .where(
      and(
        eq(bibleSmallGroupLiveSessions.groupId, groupId),
        isNull(bibleSmallGroupLiveSessions.endedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function endLiveSessionRow(row: typeof bibleSmallGroupLiveSessions.$inferSelect) {
  const [updated] = await db
    .update(bibleSmallGroupLiveSessions)
    .set({ endedAt: sql`now()` })
    .where(
      and(
        eq(bibleSmallGroupLiveSessions.id, row.id),
        isNull(bibleSmallGroupLiveSessions.endedAt),
      ),
    )
    .returning();
  deleteLiveKitRoom(row.roomName).catch(() => {});
  return updated ?? row;
}

async function resolveActiveLiveSession(groupId: string) {
  const row = await loadActiveLiveRow(groupId);
  if (!row) return null;
  const beat = row.lastHeartbeatAt?.getTime() ?? row.startedAt.getTime();
  if (Date.now() - beat > LIVE_HEARTBEAT_STALE_MS) {
    await endLiveSessionRow(row);
    return null;
  }
  return row;
}

async function requireGroupMember(groupId: string, userId: string) {
  const group = await loadActiveGroup(groupId);
  const member = group ? await membershipOf(group.id, userId) : null;
  if (!group || !member) return null;
  return { group, member };
}

function liveKitMissing() {
  return !isLiveKitConfigured();
}

function publicGroup(
  group: typeof bibleSmallGroups.$inferSelect,
  extras: {
    role: string;
    memberCount?: number;
    currentWeek?: SabbathSchoolWeekPointer | null;
  },
) {
  return {
    id: group.id,
    name: group.name,
    hostUserId: group.hostUserId,
    inviteCode: group.inviteCode,
    churchId: group.churchId,
    curriculum: group.curriculum,
    createdAt: group.createdAt,
    role: extras.role,
    memberCount: extras.memberCount,
    currentWeek: extras.currentWeek ?? null,
  };
}

router.post("/api/me/adult-confirm", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const confirmedAt = await loadAdultConfirmedAt(userId);
    if (confirmedAt) {
      return res.json({ adultConfirmedAt: confirmedAt.toISOString() });
    }
    const [updated] = await db
      .update(users)
      .set({ adultConfirmedAt: sql`now()` })
      .where(eq(users.id, userId))
      .returning({ adultConfirmedAt: users.adultConfirmedAt });
    return res.json({
      adultConfirmedAt: updated?.adultConfirmedAt?.toISOString() ?? new Date().toISOString(),
    });
  } catch (err) {
    console.error("Adult confirm error:", err);
    return res.status(500).json({ error: "Failed to save confirmation" });
  }
});

router.post(
  "/api/bible-groups",
  requireAuth,
  bibleGroupWriteLimiter,
  async (req, res) => {
    try {
      const userId = req.authUserId!;
      if (!(await requireAdult(userId))) {
        return res.status(403).json(adultRequired());
      }

      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";
      if (!name) return res.status(400).json({ error: "Group name is required" });
      if (name.length > GROUP_NAME_MAX) {
        return res.status(400).json({ error: "Group name is too long" });
      }

      const [host] = await db
        .select({
          preferredCurriculum: users.preferredCurriculum,
          sdaChurchId: users.sdaChurchId,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const curriculum = parseGroupCurriculum(
        req.body?.curriculum ?? host?.preferredCurriculum,
      );
      const inviteCode = await allocateInviteCode();

      const [group] = await db
        .insert(bibleSmallGroups)
        .values({
          name,
          hostUserId: userId,
          inviteCode,
          churchId: host?.sdaChurchId ?? null,
          curriculum,
        })
        .returning();

      await db.insert(bibleSmallGroupMembers).values({
        groupId: group.id,
        userId,
        role: "host",
      });

      const timeZone = normalizeSabbathSchoolTimeZone(req.query.timeZone ?? req.body?.timeZone);
      const currentWeek = await weekPointerFor(curriculum, timeZone);

      return res.status(201).json({
        group: publicGroup(group, { role: "host", memberCount: 1, currentWeek }),
      });
    } catch (err) {
      console.error("Create bible group error:", err);
      return res.status(500).json({ error: "Failed to create group" });
    }
  },
);

router.post(
  "/api/bible-groups/join",
  requireAuth,
  bibleGroupWriteLimiter,
  async (req, res) => {
    try {
      const userId = req.authUserId!;
      if (!(await requireAdult(userId))) {
        return res.status(403).json(adultRequired());
      }

      const code = normalizeBibleGroupInviteCode(req.body?.code);
      if (!code) return res.status(400).json({ error: "Invite code is required" });

      const [group] = await db
        .select()
        .from(bibleSmallGroups)
        .where(
          and(
            eq(bibleSmallGroups.inviteCode, code),
            isNull(bibleSmallGroups.archivedAt),
          ),
        )
        .limit(1);

      if (!group) {
        return res.status(404).json({ error: "That invite code is not valid" });
      }

      const existing = await membershipOf(group.id, userId);
      if (existing) {
        const timeZone = normalizeSabbathSchoolTimeZone(req.query.timeZone ?? req.body?.timeZone);
        const currentWeek = await weekPointerFor(
          parseGroupCurriculum(group.curriculum),
          timeZone,
        );
        return res.json({
          group: publicGroup(group, { role: existing.role, currentWeek }),
        });
      }

      await db.insert(bibleSmallGroupMembers).values({
        groupId: group.id,
        userId,
        role: "member",
      });

      const timeZone = normalizeSabbathSchoolTimeZone(req.query.timeZone ?? req.body?.timeZone);
      const currentWeek = await weekPointerFor(
        parseGroupCurriculum(group.curriculum),
        timeZone,
      );

      return res.json({
        group: publicGroup(group, { role: "member", currentWeek }),
      });
    } catch (err) {
      console.error("Join bible group error:", err);
      return res.status(500).json({ error: "Failed to join group" });
    }
  },
);

router.get("/api/bible-groups", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const adultConfirmedAt = await loadAdultConfirmedAt(userId);
    const timeZone = normalizeSabbathSchoolTimeZone(req.query.timeZone);

    const memberships = await db
      .select()
      .from(bibleSmallGroupMembers)
      .where(eq(bibleSmallGroupMembers.userId, userId));

    if (memberships.length === 0) {
      return res.json({
        groups: [],
        adultConfirmed: !!adultConfirmedAt,
      });
    }

    const groupIds = memberships.map((m) => m.groupId);
    const groups = await db
      .select()
      .from(bibleSmallGroups)
      .where(
        and(
          inArray(bibleSmallGroups.id, groupIds),
          isNull(bibleSmallGroups.archivedAt),
        ),
      )
      .orderBy(desc(bibleSmallGroups.createdAt));

    const roleByGroup = new Map(memberships.map((m) => [m.groupId, m.role]));
    const weekByCurriculum = new Map<BibleGroupCurriculum, SabbathSchoolWeekPointer | null>();

    const payload = [];
    for (const group of groups) {
      const curriculum = parseGroupCurriculum(group.curriculum);
      if (!weekByCurriculum.has(curriculum)) {
        weekByCurriculum.set(curriculum, await weekPointerFor(curriculum, timeZone));
      }
      const [countRow] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(bibleSmallGroupMembers)
        .where(eq(bibleSmallGroupMembers.groupId, group.id));
      payload.push(
        publicGroup(group, {
          role: roleByGroup.get(group.id) ?? "member",
          memberCount: countRow?.n ?? 0,
          currentWeek: weekByCurriculum.get(curriculum) ?? null,
        }),
      );
    }

    return res.json({
      groups: payload,
      adultConfirmed: !!adultConfirmedAt,
    });
  } catch (err) {
    console.error("List bible groups error:", err);
    return res.status(500).json({ error: "Failed to load groups" });
  }
});

router.get("/api/bible-groups/live-room-client.js", async (_req, res) => {
  try {
    const filePath = path.join(
      process.cwd(),
      "server",
      "templates",
      "bible-group-live-room.js",
    );
    const content = fs.readFileSync(filePath, "utf-8");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(content);
  } catch (err) {
    console.error("Bible group live-room client serve error:", err);
    return res.status(500).send("Error serving live room client");
  }
});

router.get("/api/bible-groups/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const groupId = String(req.params.id);
    const group = await loadActiveGroup(groupId);
    const member = group ? await membershipOf(group.id, userId) : null;
    if (!group || !member) {
      return res.status(404).json({ error: "Group not found" });
    }

    const timeZone = normalizeSabbathSchoolTimeZone(req.query.timeZone);
    const currentWeek = await weekPointerFor(
      parseGroupCurriculum(group.curriculum),
      timeZone,
    );

    const members = await db
      .select({
        userId: bibleSmallGroupMembers.userId,
        role: bibleSmallGroupMembers.role,
        joinedAt: bibleSmallGroupMembers.joinedAt,
        displayName: users.displayName,
      })
      .from(bibleSmallGroupMembers)
      .innerJoin(users, eq(users.id, bibleSmallGroupMembers.userId))
      .where(eq(bibleSmallGroupMembers.groupId, group.id))
      .orderBy(bibleSmallGroupMembers.joinedAt);

    const posts = currentWeek
      ? await db
          .select({
            id: bibleSmallGroupPosts.id,
            userId: bibleSmallGroupPosts.userId,
            ssWeekKey: bibleSmallGroupPosts.ssWeekKey,
            body: bibleSmallGroupPosts.body,
            createdAt: bibleSmallGroupPosts.createdAt,
            displayName: users.displayName,
          })
          .from(bibleSmallGroupPosts)
          .innerJoin(users, eq(users.id, bibleSmallGroupPosts.userId))
          .where(
            and(
              eq(bibleSmallGroupPosts.groupId, group.id),
              eq(bibleSmallGroupPosts.ssWeekKey, currentWeek.ssWeekKey),
            ),
          )
          .orderBy(bibleSmallGroupPosts.createdAt)
      : [];

    return res.json({
      group: publicGroup(group, {
        role: member.role,
        memberCount: members.length,
        currentWeek,
      }),
      members: members.map((m) => ({
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        displayName: m.displayName || "Member",
      })),
      posts: posts.map((p) => ({
        id: p.id,
        userId: p.userId,
        ssWeekKey: p.ssWeekKey,
        body: p.body,
        createdAt: p.createdAt,
        displayName: p.displayName || "Member",
      })),
    });
  } catch (err) {
    console.error("Get bible group error:", err);
    return res.status(500).json({ error: "Failed to load group" });
  }
});

router.post(
  "/api/bible-groups/:id/posts",
  requireAuth,
  bibleGroupWriteLimiter,
  async (req, res) => {
    try {
      const userId = req.authUserId!;
      const groupId = String(req.params.id);
      const group = await loadActiveGroup(groupId);
      const member = group ? await membershipOf(group.id, userId) : null;
      if (!group || !member) {
        return res.status(404).json({ error: "Group not found" });
      }

      const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
      if (!body) return res.status(400).json({ error: "Write a short note first" });
      if (body.length > POST_BODY_MAX) {
        return res.status(400).json({ error: "That note is too long" });
      }

      const timeZone = normalizeSabbathSchoolTimeZone(req.query.timeZone ?? req.body?.timeZone);
      const currentWeek = await weekPointerFor(
        parseGroupCurriculum(group.curriculum),
        timeZone,
      );
      if (!currentWeek) {
        return res.status(409).json({ error: "This week's lesson is not available yet" });
      }

      const [post] = await db
        .insert(bibleSmallGroupPosts)
        .values({
          groupId: group.id,
          userId,
          ssWeekKey: currentWeek.ssWeekKey,
          body,
        })
        .returning();

      const [author] = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return res.status(201).json({
        post: {
          id: post.id,
          userId: post.userId,
          ssWeekKey: post.ssWeekKey,
          body: post.body,
          createdAt: post.createdAt,
          displayName: author?.displayName || "Member",
        },
      });
    } catch (err) {
      console.error("Create bible group post error:", err);
      return res.status(500).json({ error: "Failed to post" });
    }
  },
);

router.post(
  "/api/bible-groups/:id/invite-code",
  requireAuth,
  bibleGroupWriteLimiter,
  async (req, res) => {
    try {
      const userId = req.authUserId!;
      const groupId = String(req.params.id);
      const group = await loadActiveGroup(groupId);
      const member = group ? await membershipOf(group.id, userId) : null;
      if (!group || !member) {
        return res.status(404).json({ error: "Group not found" });
      }
      if (member.role !== "host") {
        return res.status(403).json({ error: "Only the host can regenerate the invite code" });
      }

      const inviteCode = await allocateInviteCode();
      const [updated] = await db
        .update(bibleSmallGroups)
        .set({ inviteCode })
        .where(eq(bibleSmallGroups.id, group.id))
        .returning();

      return res.json({ inviteCode: updated.inviteCode });
    } catch (err) {
      console.error("Regen invite code error:", err);
      return res.status(500).json({ error: "Failed to regenerate invite code" });
    }
  },
);

router.delete(
  "/api/bible-groups/:id/members/:userId",
  requireAuth,
  async (req, res) => {
    try {
      const actorId = req.authUserId!;
      const groupId = String(req.params.id);
      const targetUserId = String(req.params.userId);
      const group = await loadActiveGroup(groupId);
      const actor = group ? await membershipOf(group.id, actorId) : null;
      if (!group || !actor) {
        return res.status(404).json({ error: "Group not found" });
      }
      if (actor.role !== "host") {
        return res.status(403).json({ error: "Only the host can remove members" });
      }
      if (targetUserId === group.hostUserId || targetUserId === actorId) {
        return res.status(400).json({ error: "The host cannot be removed" });
      }

      const target = await membershipOf(group.id, targetUserId);
      if (!target) {
        return res.status(404).json({ error: "Member not found" });
      }

      await db
        .delete(bibleSmallGroupMembers)
        .where(
          and(
            eq(bibleSmallGroupMembers.groupId, group.id),
            eq(bibleSmallGroupMembers.userId, targetUserId),
          ),
        );

      return res.json({ ok: true });
    } catch (err) {
      console.error("Remove bible group member error:", err);
      return res.status(500).json({ error: "Failed to remove member" });
    }
  },
);

router.post("/api/bible-groups/:id/archive", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const groupId = String(req.params.id);
    const group = await loadActiveGroup(groupId);
    const member = group ? await membershipOf(group.id, userId) : null;
    if (!group || !member) {
      return res.status(404).json({ error: "Group not found" });
    }
    if (member.role !== "host") {
      return res.status(403).json({ error: "Only the host can archive this group" });
    }

    await db
      .update(bibleSmallGroups)
      .set({ archivedAt: sql`now()` })
      .where(eq(bibleSmallGroups.id, group.id));

    return res.json({ ok: true });
  } catch (err) {
    console.error("Archive bible group error:", err);
    return res.status(500).json({ error: "Failed to archive group" });
  }
});

router.post(
  "/api/bible-groups/:id/live/start",
  requireAuth,
  bibleGroupWriteLimiter,
  async (req, res) => {
    try {
      const userId = req.authUserId!;
      const groupId = String(req.params.id);
      const ctx = await requireGroupMember(groupId, userId);
      if (!ctx) return res.status(404).json({ error: "Group not found" });
      if (ctx.member.role !== "host") {
        return res.status(403).json({ error: "Only the host can start the room" });
      }
      if (liveKitMissing()) {
        return res.status(503).json(LIVE_ROOMS_UNCONFIGURED);
      }

      const existing = await resolveActiveLiveSession(ctx.group.id);
      if (existing) {
        return res.json({ session: publicLiveSession(existing) });
      }

      const sessionId = randomUUID();
      const roomName = `bsg-${ctx.group.id}-${sessionId}`;

      let session: typeof bibleSmallGroupLiveSessions.$inferSelect;
      try {
        const [inserted] = await db
          .insert(bibleSmallGroupLiveSessions)
          .values({
            id: sessionId,
            groupId: ctx.group.id,
            startedBy: userId,
            roomName,
          })
          .returning();
        session = inserted;
      } catch (err: any) {
        const raced = await resolveActiveLiveSession(ctx.group.id);
        if (raced) return res.json({ session: publicLiveSession(raced) });
        throw err;
      }

      try {
        await createLiveKitRoom(roomName);
      } catch (err) {
        console.error("Bible group LiveKit room create error:", err);
        await endLiveSessionRow(session);
        return res.status(500).json({ error: "Failed to start the room" });
      }

      return res.status(201).json({ session: publicLiveSession(session) });
    } catch (err) {
      console.error("Bible group live start error:", err);
      return res.status(500).json({ error: "Failed to start the room" });
    }
  },
);

router.post(
  "/api/bible-groups/:id/live/end",
  requireAuth,
  bibleGroupWriteLimiter,
  async (req, res) => {
    try {
      const userId = req.authUserId!;
      const groupId = String(req.params.id);
      const ctx = await requireGroupMember(groupId, userId);
      if (!ctx) return res.status(404).json({ error: "Group not found" });
      if (ctx.member.role !== "host") {
        return res.status(403).json({ error: "Only the host can end the room" });
      }

      const row = await loadActiveLiveRow(ctx.group.id);
      if (!row) {
        return res.json({ session: null });
      }
      const ended = await endLiveSessionRow(row);
      return res.json({ session: publicLiveSession(ended) });
    } catch (err) {
      console.error("Bible group live end error:", err);
      return res.status(500).json({ error: "Failed to end the room" });
    }
  },
);

router.get("/api/bible-groups/:id/live", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const groupId = String(req.params.id);
    const ctx = await requireGroupMember(groupId, userId);
    if (!ctx) return res.status(404).json({ error: "Group not found" });

    const session = await resolveActiveLiveSession(ctx.group.id);
    return res.json({ session: session ? publicLiveSession(session) : null });
  } catch (err) {
    console.error("Bible group live get error:", err);
    return res.status(500).json({ error: "Failed to load the room" });
  }
});

router.post(
  "/api/bible-groups/:id/live/token",
  requireAuth,
  bibleGroupWriteLimiter,
  async (req, res) => {
    try {
      const userId = req.authUserId!;
      const groupId = String(req.params.id);
      const ctx = await requireGroupMember(groupId, userId);
      if (!ctx) return res.status(404).json({ error: "Group not found" });
      if (liveKitMissing()) {
        return res.status(503).json(LIVE_ROOMS_UNCONFIGURED);
      }

      const session = await resolveActiveLiveSession(ctx.group.id);
      if (!session) {
        return res.status(404).json({ error: "No live room" });
      }

      const [person] = await db
        .select({ displayName: users.displayName, username: users.username })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const displayName = person?.displayName || person?.username || "Member";
      const isHost = ctx.member.role === "host";
      const token = await generateToken(session.roomName, displayName, isHost, {
        identity: userId,
      });

      return res.json({
        token,
        wsUrl: getLiveKitUrl(),
        roomName: session.roomName,
        displayName,
        isHost,
      });
    } catch (err) {
      console.error("Bible group live token error:", err);
      return res.status(500).json({ error: "Failed to join the room" });
    }
  },
);

router.post(
  "/api/bible-groups/:id/live/heartbeat",
  requireAuth,
  bibleGroupWriteLimiter,
  async (req, res) => {
    try {
      const userId = req.authUserId!;
      const groupId = String(req.params.id);
      const ctx = await requireGroupMember(groupId, userId);
      if (!ctx) return res.status(404).json({ error: "Group not found" });
      if (ctx.member.role !== "host") {
        return res.status(403).json({ error: "Only the host can keep the room open" });
      }

      const row = await loadActiveLiveRow(ctx.group.id);
      if (!row) {
        return res.status(404).json({ error: "No live room" });
      }

      const [updated] = await db
        .update(bibleSmallGroupLiveSessions)
        .set({ lastHeartbeatAt: sql`now()` })
        .where(eq(bibleSmallGroupLiveSessions.id, row.id))
        .returning();

      return res.json({
        lastHeartbeatAt: updated?.lastHeartbeatAt ?? new Date(),
      });
    } catch (err) {
      console.error("Bible group live heartbeat error:", err);
      return res.status(500).json({ error: "Failed to update the room" });
    }
  },
);

function requireAuthHeaderOrQuery(req: any, res: any, next: any) {
  if (!getAuthUserId(req) && typeof req.query.accessToken === "string") {
    req.headers.authorization = `Bearer ${req.query.accessToken}`;
  }
  return requireAuth(req, res, next);
}

router.get(
  "/api/bible-groups/:id/room",
  requireAuthHeaderOrQuery,
  async (req, res) => {
    try {
      const userId = req.authUserId!;
      const groupId = String(req.params.id);
      const ctx = await requireGroupMember(groupId, userId);
      if (!ctx) return res.status(404).send("Group not found");
      if (liveKitMissing()) {
        return res.status(503).send("Live rooms are not configured");
      }

      const session = await resolveActiveLiveSession(ctx.group.id);
      if (!session) return res.status(404).send("No live room");

      const [person] = await db
        .select({ displayName: users.displayName, username: users.username })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const displayName = person?.displayName || person?.username || "Member";
      const isHost = ctx.member.role === "host";
      const token = await generateToken(session.roomName, displayName, isHost, {
        identity: userId,
      });
      const timeZone = normalizeSabbathSchoolTimeZone(req.query.timeZone);
      const currentWeek = await weekPointerFor(
        parseGroupCurriculum(ctx.group.curriculum),
        timeZone,
      );
      const lessonTitle = currentWeek
        ? `Lesson ${currentWeek.lessonNumber} · ${currentWeek.lessonTitle}`
        : "This week's lesson";

      const htmlPath = path.join(
        process.cwd(),
        "server",
        "templates",
        "bible-group-live-room.html",
      );
      let html = fs.readFileSync(htmlPath, "utf-8");
      const config = {
        wsUrl: getLiveKitUrl(),
        token,
        displayName,
        isHost,
        groupName: ctx.group.name,
        lessonTitle,
      };
      html = html.replace(
        "<!--SERVER_INJECTED_CONFIG-->",
        `<script type="application/json" id="live-config">${JSON.stringify(config)}</script>`,
      );

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    } catch (err) {
      console.error("Bible group live room page error:", err);
      return res.status(500).send("Error loading room");
    }
  },
);

export default router;
