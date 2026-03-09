import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { env } from "../env";

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
    }
  }
}

export const JWT_SECRET = env.JWT_SECRET;

export function getAuthUserId(req: Request): string | null {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      return decoded.userId;
    }
  } catch {}
  return null;
}

export function extractUserId(req: Request): string {
  const authId = getAuthUserId(req);
  if (authId) return authId;
  return "guest";
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  req.authUserId = userId;
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const userId = getAuthUserId(req);
  if (userId) {
    req.authUserId = userId;
  }
  next();
}

export function getEffectiveUserId(req: Request): string {
  if (req.authUserId) return req.authUserId;
  const authId = getAuthUserId(req);
  if (authId) return authId;
  return "guest";
}

export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    req.authUserId = userId;
    try {
      const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      next();
    } catch (err) {
      console.error("Role check error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

export const requireEditor = requireRole("editor", "admin");
export const requireAdmin = requireRole("admin");

export async function checkProStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getEffectiveUserId(req);
    if (userId === "guest") {
      return res.status(401).json({ error: "Authentication required" });
    }
    const [user] = await db.select({ isPro: users.isPro }).from(users).where(eq(users.id, userId));
    if (!user || !user.isPro) {
      return res.status(403).json({ error: "This feature is available to supporters. Support the mission to access Deep Study layers." });
    }
    req.authUserId = userId;
    next();
  } catch (err) {
    console.error("Pro check error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export function generateCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const alphanum = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)];
  code += "-";
  for (let i = 0; i < 4; i++) code += alphanum[Math.floor(Math.random() * alphanum.length)];
  return code;
}
