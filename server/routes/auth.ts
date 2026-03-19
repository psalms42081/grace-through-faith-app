import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import {
  users,
  readingHistory,
  readingStreaks,
  layerCompletions,
  studyJournalEntries,
  studyGuideSessions,
  userNotes,
  userHighlights,
  userBookmarks,
  userActivityCounters,
  prayerRequests,
  sabbathSchoolUserProgress,
  sabbathReflections,
  progressTracks,
  progressLessons,
  userPlanEnrollments,
  kidsPurchases,
  kidsProgress,
  kidsStreaks,
  kidsDailyQuests,
  kidsUserBadges,
} from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import { JWT_SECRET, requireAuth, getAuthUserId, getDeviceId } from "../middleware/auth";
import { validate, authRegisterSchema, authLoginSchema } from "../middleware/validate";
import { authLimiter } from "../middleware/rate-limit";

const router = Router();

router.post("/api/auth/register", authLimiter, validate(authRegisterSchema), async (req, res) => {
  try {
    const { email, password, displayName, profileType } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "Email, password, and display name are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const validProfileTypes = ["member", "student", "church_leader", "exploring"];
    const cleanProfileType = validProfileTypes.includes(profileType) ? profileType : "member";

    let assignedRole = "member";
    if (cleanProfileType === "student") assignedRole = "student";
    else if (cleanProfileType === "church_leader") assignedRole = "church_leader_pending";

    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const username = cleanEmail.split("@")[0] + "-" + Date.now().toString(36);

    const [newUser] = await db.insert(users).values({
      username,
      password: hashedPassword,
      displayName: displayName.trim(),
      email: cleanEmail,
      role: assignedRole,
      profileType: cleanProfileType,
      isPro: true,
    }).returning();

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: "90d" });

    return res.json({
      user: {
        id: newUser.id,
        displayName: newUser.displayName,
        email: newUser.email,
        familyId: newUser.familyId,
        isPro: newUser.isPro,
        isPatron: newUser.isPatron,
        role: newUser.role,
      },
      token,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Failed to create account" });
  }
});

router.post("/api/auth/login", authLimiter, validate(authLoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const [user] = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(cleanPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "90d" });

    return res.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        familyId: user.familyId,
        isPro: user.isPro,
        isPatron: user.isPatron,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Failed to sign in" });
  }
});

router.post("/api/auth/delete-account", requireAuth, async (req, res) => {
  try {
    await db.delete(users).where(eq(users.id, req.authUserId!));
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

router.post("/api/auth/migrate-guest-data", requireAuth, async (req, res) => {
  try {
    const newUserId = req.authUserId!;
    const deviceId = getDeviceId(req);
    if (!deviceId) {
      return res.json({ migrated: false, reason: "no-device-id" });
    }

    const tables = [
      { table: readingHistory, col: readingHistory.userId },
      { table: readingStreaks, col: readingStreaks.userId },
      { table: layerCompletions, col: layerCompletions.userId },
      { table: studyJournalEntries, col: studyJournalEntries.userId },
      { table: studyGuideSessions, col: studyGuideSessions.userId },
      { table: userNotes, col: userNotes.userId },
      { table: userHighlights, col: userHighlights.userId },
      { table: userBookmarks, col: userBookmarks.userId },
      { table: userActivityCounters, col: userActivityCounters.userId },
      { table: prayerRequests, col: prayerRequests.userId },
      { table: sabbathSchoolUserProgress, col: sabbathSchoolUserProgress.userId },
      { table: sabbathReflections, col: sabbathReflections.userId },
      { table: progressTracks, col: progressTracks.userId },
      { table: progressLessons, col: progressLessons.userId },
      { table: userPlanEnrollments, col: userPlanEnrollments.userId },
      { table: kidsPurchases, col: kidsPurchases.userId },
      { table: kidsProgress, col: kidsProgress.userId },
      { table: kidsStreaks, col: kidsStreaks.userId },
      { table: kidsDailyQuests, col: kidsDailyQuests.userId },
      { table: kidsUserBadges, col: kidsUserBadges.userId },
    ];

    let totalMigrated = 0;

    for (const { table, col } of tables) {
      try {
        const result = await db
          .update(table)
          .set({ userId: newUserId } as any)
          .where(eq(col, deviceId));
        totalMigrated += (result as any).rowCount || 0;
      } catch {
      }
    }

    console.log(`[guest-migration] Migrated ${totalMigrated} rows from ${deviceId} to ${newUserId}`);
    return res.json({ migrated: true, rowCount: totalMigrated });
  } catch (err) {
    console.error("Guest data migration error:", err);
    return res.json({ migrated: false, reason: "error" });
  }
});

router.post("/api/auth/reset-password", authLimiter, (_req, res) => {
  return res.status(501).json({
    error: "Password reset is not available. Please contact support or create a new account.",
  });
});

const VALID_ROLES = ["member", "student", "church_leader_pending", "church_leader", "editor", "admin"];

router.post("/api/auth/update-role", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { role } = req.body;

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (role === "admin" || role === "editor" || role === "church_leader") {
      const [currentUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ error: "Only admins can assign privileged roles" });
      }
    }
    if (role === "church_leader_pending") {
      return res.status(400).json({ error: "Cannot directly assign pending status" });
    }

    await db.update(users).set({ role }).where(eq(users.id, userId));

    const [updated] = await db.select().from(users).where(eq(users.id, userId));
    return res.json({
      user: {
        id: updated.id,
        displayName: updated.displayName,
        email: updated.email,
        familyId: updated.familyId,
        isPro: updated.isPro,
        isPatron: updated.isPatron,
        role: updated.role,
      },
    });
  } catch (err) {
    console.error("Update role error:", err);
    return res.status(500).json({ error: "Failed to update role" });
  }
});

router.get("/api/auth/me", async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.json({ user: null, isGuest: true });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.json({ user: null, isGuest: true });
    }

    return res.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        familyId: user.familyId,
        isPro: user.isPro,
        isPatron: user.isPatron,
        role: user.role,
      },
      isGuest: false,
    });
  } catch (err) {
    console.error("Auth me error:", err);
    return res.json({ user: null, isGuest: true });
  }
});

  export default router;
  