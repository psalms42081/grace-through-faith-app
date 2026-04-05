import type { Request, Response, NextFunction } from "express";
import { z, ZodError, type ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
        return res.status(400).json({ error: "Validation failed", details: messages });
      }
      return res.status(400).json({ error: "Invalid request body" });
    }
  };
}

export const authRegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1, "Display name is required").max(100),
  profileType: z.enum(["member", "student", "church_leader", "exploring"]).optional().default("member"),
});

export const authLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const noteSchema = z.object({
  verseId: z.string().min(1, "verseId is required"),
  content: z.string().min(1, "Note content is required").max(5000),
});

export const highlightSchema = z.object({
  verseId: z.string().min(1, "verseId is required"),
  color: z.string().optional(),
});

export const bookmarkSchema = z.object({
  verseId: z.string().min(1, "verseId is required"),
  label: z.string().max(200).optional(),
});

export const prayerSchema = z.object({
  title: z.string().min(1, "Prayer title is required").max(200),
  content: z.string().max(2000).optional(),
  category: z.string().optional(),
});

export const readingHistorySchema = z.object({
  bookId: z.union([z.number().int().positive(), z.string().min(1)]),
  bookName: z.string().min(1, "bookName is required"),
  chapter: z.union([z.number().int().positive(), z.string().min(1)]),
  translation: z.string().optional(),
});

export const trackActivitySchema = z.object({
  type: z.string().min(1, "Activity type is required"),
  metadata: z.record(z.unknown()).optional(),
});
