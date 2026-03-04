import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { JWT_SECRET, extractUserId } from "../middleware/auth";
import { validate, authRegisterSchema, authLoginSchema } from "../middleware/validate";
import { authLimiter } from "../middleware/rate-limit";

const router = Router();

router.post("/api/auth/register", authLimiter, validate(authRegisterSchema), async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "Email, password, and display name are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (cleanPassword.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
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
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Failed to sign in" });
  }
});

router.post("/api/auth/delete-account", async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (userId === "guest") {
      return res.status(401).json({ error: "Not authenticated" });
    }
    await db.delete(users).where(eq(users.id, userId));
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

router.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and new password are required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = newPassword.trim();
    if (cleanPassword.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }
    const [user] = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (!user) {
      return res.status(404).json({ error: "No account found with this email" });
    }
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "90d" });
    return res.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        familyId: user.familyId,
        isPro: user.isPro,
        isPatron: user.isPatron,
      },
      token,
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }
});

router.get("/api/auth/me", async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (userId === "guest") {
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
      },
      isGuest: false,
    });
  } catch (err) {
    console.error("Auth me error:", err);
    return res.json({ user: null, isGuest: true });
  }
});

  export default router;
  