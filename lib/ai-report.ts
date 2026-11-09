/**
 * "Report this answer" for AI-generated content (Google Play AI-generated content policy).
 * Shared by the app's sheet and the server's POST /api/ai-reports validator.
 */

export const AI_REPORT_REASONS = [
  "Inaccurate",
  "Offensive or harmful",
  "Theologically concerning",
  "Other",
] as const;

export type AiReportReason = (typeof AI_REPORT_REASONS)[number];

export const AI_REPORT_LIMITS = {
  feature: 64,
  reference: 120,
  version: 32,
  responseText: 20000,
  comment: 2000,
} as const;

export const AI_REPORT_LINK_LABEL = "Report this answer";
export const AI_REPORT_THANKS = "Thanks, we'll review this";

export type AiReportInput = {
  feature: string;
  reference: string | null;
  version: string | null;
  responseText: string;
  reason: AiReportReason;
  comment: string | null;
};

/**
 * Flattens whatever an AI feature rendered (a string, a list of strings, or a structured
 * answer) into the text stored with the report, trimmed to the column limit.
 */
export function aiReportText(value: unknown): string {
  const text = flatten(value).join("\n").trim();
  return text.length > AI_REPORT_LIMITS.responseText
    ? `${text.slice(0, AI_REPORT_LIMITS.responseText - 1)}…`
    : text;
}

function flatten(value: unknown): string[] {
  if (value == null || value === false) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
      const lines = flatten(entry);
      if (lines.length === 0) return [];
      return lines.length === 1 && !lines[0].includes("\n") ? [`${key}: ${lines[0]}`] : [`${key}:`, ...lines];
    });
  }
  return [];
}

function optionalText(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value ? value.slice(0, max) : null;
}

export function parseAiReport(
  body: unknown,
): { ok: true; value: AiReportInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Report is empty" };
  const raw = body as Record<string, unknown>;

  const feature = typeof raw.feature === "string" ? raw.feature.trim() : "";
  if (!feature) return { ok: false, error: "Feature is required" };

  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (!AI_REPORT_REASONS.includes(reason as AiReportReason)) {
    return { ok: false, error: "Choose a reason" };
  }

  const responseText = typeof raw.responseText === "string" ? raw.responseText.trim() : "";
  if (!responseText) return { ok: false, error: "Response text is required" };

  const comment = optionalText(raw.comment, AI_REPORT_LIMITS.comment * 2);
  if (comment && comment.length > AI_REPORT_LIMITS.comment) {
    return { ok: false, error: `Please keep the comment under ${AI_REPORT_LIMITS.comment} characters` };
  }

  return {
    ok: true,
    value: {
      feature: feature.slice(0, AI_REPORT_LIMITS.feature),
      reference: optionalText(raw.reference, AI_REPORT_LIMITS.reference),
      version: optionalText(raw.version, AI_REPORT_LIMITS.version),
      responseText: aiReportText(responseText),
      reason: reason as AiReportReason,
      comment,
    },
  };
}
