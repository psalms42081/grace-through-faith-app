import { Router } from "express";
import { db } from "../db";
import { organizations, organizationMembers, users } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function uniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateJoinCode();
    const existing = await db.select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.joinCode, code))
      .limit(1);
    if (existing.length === 0) return code;
  }
  throw new Error("Failed to generate unique join code");
}

router.post("/api/organizations", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { name, type } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0 || name.trim().length > 100) {
      return res.status(400).json({ error: "Organization name must be between 1 and 100 characters" });
    }
    if (type !== "church" && type !== "conference") {
      return res.status(400).json({ error: "Type must be 'church' or 'conference'" });
    }

    const [existingMember] = await db.select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))
      .limit(1);

    if (existingMember) {
      return res.status(400).json({ error: "You already belong to an organization. Leave your current one first." });
    }

    const joinCode = await uniqueJoinCode();

    const [org] = await db.insert(organizations).values({
      name: name.trim(),
      type,
      joinCode,
      ownerId: userId,
      memberCount: 1,
    }).returning();

    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId,
      role: "pastor",
    });

    await db.update(users)
      .set({ organizationId: org.id, organizationType: type })
      .where(eq(users.id, userId));

    return res.json(org);
  } catch (err) {
    console.error("Create org error:", err);
    return res.status(500).json({ error: "Failed to create organization" });
  }
});

router.post("/api/organizations/join", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { joinCode } = req.body;

    if (!joinCode || typeof joinCode !== "string") {
      return res.status(400).json({ error: "Join code is required" });
    }

    const code = joinCode.trim().toUpperCase().replace(/-/g, "");

    const [org] = await db.select()
      .from(organizations)
      .where(eq(organizations.joinCode, code))
      .limit(1);

    if (!org) {
      return res.status(404).json({ error: "Invalid join code. Please check and try again." });
    }

    const [existingMember] = await db.select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))
      .limit(1);

    if (existingMember) {
      return res.status(400).json({ error: "You already belong to an organization. Leave your current one first." });
    }

    if (org.tier === "free" && org.memberCount >= org.maxMembers) {
      return res.status(400).json({ error: `This organization has reached its free tier limit of ${org.maxMembers} members` });
    }

    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId,
      role: "member",
    });

    await db.update(organizations)
      .set({
        memberCount: sql`${organizations.memberCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, org.id));

    await db.update(users)
      .set({ organizationId: org.id, organizationType: org.type })
      .where(eq(users.id, userId));

    return res.json({ message: "Successfully joined", organization: { id: org.id, name: org.name, type: org.type } });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(400).json({ error: "You are already a member of this organization" });
    }
    console.error("Join org error:", err);
    return res.status(500).json({ error: "Failed to join organization" });
  }
});

router.get("/api/organizations/my-org", requireAuth, async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  try {
    const userId = req.authUserId!;

    const [membership] = await db.select({
      role: organizationMembers.role,
      orgId: organizationMembers.organizationId,
    })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))
      .limit(1);

    if (!membership) {
      return res.json({ organization: null, role: null });
    }

    const [org] = await db.select()
      .from(organizations)
      .where(eq(organizations.id, membership.orgId))
      .limit(1);

    if (!org) {
      return res.json({ organization: null, role: null });
    }

    const safeOrg = {
      ...org,
      joinCode: (membership.role === "pastor" || membership.role === "elder") ? org.joinCode : undefined,
    };

    return res.json({ organization: safeOrg, role: membership.role });
  } catch (err) {
    console.error("Get my org error:", err);
    return res.status(500).json({ error: "Failed to get organization" });
  }
});

router.get("/api/organizations/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const orgId = req.params.id;

    const [membership] = await db.select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userId)))
      .limit(1);

    if (!membership) {
      return res.status(403).json({ error: "You are not a member of this organization" });
    }

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const members = await db.select({
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
      displayName: users.displayName,
    })
      .from(organizationMembers)
      .leftJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, orgId));

    const showJoinCode = membership.role === "pastor" || membership.role === "elder";

    return res.json({
      ...org,
      joinCode: showJoinCode ? org.joinCode : undefined,
      members,
      myRole: membership.role,
    });
  } catch (err) {
    console.error("Get org error:", err);
    return res.status(500).json({ error: "Failed to get organization" });
  }
});

router.get("/api/organizations/:id/members", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const orgId = req.params.id;

    const [membership] = await db.select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userId)))
      .limit(1);

    if (!membership) {
      return res.status(403).json({ error: "You are not a member of this organization" });
    }

    const members = await db.select({
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
      displayName: users.displayName,
    })
      .from(organizationMembers)
      .leftJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, orgId));

    return res.json(members);
  } catch (err) {
    console.error("List members error:", err);
    return res.status(500).json({ error: "Failed to list members" });
  }
});

router.put("/api/organizations/:id/members/:userId/role", requireAuth, async (req, res) => {
  try {
    const requesterId = req.authUserId!;
    const orgId = req.params.id;
    const targetUserId = req.params.userId;
    const { role } = req.body;

    if (role !== "elder" && role !== "member") {
      return res.status(400).json({ error: "Role must be 'elder' or 'member'" });
    }

    const [requesterMembership] = await db.select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, requesterId)))
      .limit(1);

    if (!requesterMembership || requesterMembership.role !== "pastor") {
      return res.status(403).json({ error: "Only pastors can change member roles" });
    }

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (org && org.ownerId === targetUserId) {
      return res.status(400).json({ error: "Cannot change the pastor's role" });
    }

    const [targetMembership] = await db.select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, targetUserId)))
      .limit(1);

    if (!targetMembership) {
      return res.status(404).json({ error: "Member not found in this organization" });
    }

    await db.update(organizationMembers)
      .set({ role })
      .where(eq(organizationMembers.id, targetMembership.id));

    return res.json({ message: "Role updated", userId: targetUserId, newRole: role });
  } catch (err) {
    console.error("Update role error:", err);
    return res.status(500).json({ error: "Failed to update role" });
  }
});

router.delete("/api/organizations/:id/members/:userId", requireAuth, async (req, res) => {
  try {
    const requesterId = req.authUserId!;
    const orgId = req.params.id;
    const targetUserId = req.params.userId;

    const [requesterMembership] = await db.select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, requesterId)))
      .limit(1);

    if (!requesterMembership || (requesterMembership.role !== "pastor" && requesterMembership.role !== "elder")) {
      return res.status(403).json({ error: "Only pastors and elders can remove members" });
    }

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (org && org.ownerId === targetUserId) {
      return res.status(400).json({ error: "Cannot remove the pastor (owner) from the organization" });
    }

    const [targetMembership] = await db.select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, targetUserId)))
      .limit(1);

    if (!targetMembership) {
      return res.status(404).json({ error: "Member not found in this organization" });
    }

    await db.delete(organizationMembers).where(eq(organizationMembers.id, targetMembership.id));

    await db.update(organizations)
      .set({
        memberCount: sql`GREATEST(${organizations.memberCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));

    await db.update(users)
      .set({ organizationId: null, organizationType: null })
      .where(eq(users.id, targetUserId));

    return res.json({ message: "Member removed", userId: targetUserId });
  } catch (err) {
    console.error("Remove member error:", err);
    return res.status(500).json({ error: "Failed to remove member" });
  }
});

router.post("/api/organizations/:id/churches", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const conferenceId = req.params.id;
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0 || name.trim().length > 100) {
      return res.status(400).json({ error: "Organization name must be between 1 and 100 characters" });
    }

    const [conference] = await db.select()
      .from(organizations)
      .where(eq(organizations.id, conferenceId))
      .limit(1);

    if (!conference) {
      return res.status(404).json({ error: "Conference not found" });
    }
    if (conference.type !== "conference") {
      return res.status(400).json({ error: "Can only add churches under a conference" });
    }

    const [membership] = await db.select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, conferenceId), eq(organizationMembers.userId, userId)))
      .limit(1);

    if (!membership || membership.role !== "pastor") {
      return res.status(403).json({ error: "Only the conference pastor can add churches" });
    }

    const joinCode = await uniqueJoinCode();

    const [church] = await db.insert(organizations).values({
      name: name.trim(),
      type: "church",
      parentId: conferenceId,
      joinCode,
      ownerId: userId,
      memberCount: 0,
    }).returning();

    return res.json(church);
  } catch (err) {
    console.error("Add church error:", err);
    return res.status(500).json({ error: "Failed to add church" });
  }
});

router.get("/api/organizations/:id/churches", requireAuth, async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  try {
    const userId = req.authUserId!;
    const conferenceId = req.params.id;

    const [conference] = await db.select()
      .from(organizations)
      .where(eq(organizations.id, conferenceId))
      .limit(1);

    if (!conference || conference.type !== "conference") {
      return res.status(400).json({ error: "Not a conference organization" });
    }

    const [membership] = await db.select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, conferenceId), eq(organizationMembers.userId, userId)))
      .limit(1);

    if (!membership) {
      return res.status(403).json({ error: "You are not a member of this conference" });
    }

    const churches = await db.select()
      .from(organizations)
      .where(eq(organizations.parentId, conferenceId));

    return res.json(churches);
  } catch (err) {
    console.error("List churches error:", err);
    return res.status(500).json({ error: "Failed to list churches" });
  }
});

export default router;
