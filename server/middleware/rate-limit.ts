import rateLimit from "express-rate-limit";
import { getAuthUserId } from "./auth";

function safeKeyGenerator(req: any): string {
  const userId = getAuthUserId(req);
  if (userId) return `user:${userId}`;
  return req.ip || "unknown";
}

export const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many AI requests. Please wait a moment and try again." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: safeKeyGenerator,
});

export const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: "Too many text-to-speech requests. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: safeKeyGenerator,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many authentication attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.ip || "unknown",
});
