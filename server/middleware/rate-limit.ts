import rateLimit from "express-rate-limit";

export const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many AI requests. Please wait a moment and try again." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = String(req.query.userId || req.body?.userId || "");
    if (userId) return userId;
    return "anon";
  },
});

export const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: "Too many text-to-speech requests. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = String(req.query.userId || req.body?.userId || "");
    if (userId) return userId;
    return "anon";
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many authentication attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
