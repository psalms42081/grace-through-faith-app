import type { Request } from "express";
import { CONTENT_LANGUAGES } from "../../shared/schema";

export function resolveContentLang(req: Request): string | null {
  const raw = String(req.query.lang || "").trim().toLowerCase();
  if (!raw || raw === "en") return null;
  const base = raw.split("-")[0];
  if ((CONTENT_LANGUAGES as readonly string[]).includes(base)) return base;
  return null;
}
