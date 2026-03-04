import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";

export const JWT_SECRET = process.env.JWT_SECRET || "grace-through-faith-secret-key-2026";

export function extractUserId(req: Request): string {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      return decoded.userId;
    }
  } catch {}
  return String(req.query.userId || req.body?.userId || "guest");
}

export async function checkProStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = String(req.query.userId || req.body?.userId || "guest");
    const [user] = await db.select({ isPro: users.isPro }).from(users).where(eq(users.id, userId));
    if (!user || !user.isPro) {
      return res.status(403).json({ error: "Upgrade to Pro to unlock Deep Study layers." });
    }
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
