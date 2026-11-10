/** Report and block for content one member can see from another. */

export const UGC_SURFACES = [
  "group-discussion",
  "group-reply",
  "group-prayer",
  "group-member",
  "group-live",
  "bible-group-post",
  "bible-group-member",
  "bible-group-live",
  "live-participant",
] as const;

export type UgcSurface = (typeof UGC_SURFACES)[number];

export const UGC_REPORT_REASONS = [
  "Spam",
  "Harassment or hate",
  "Sexual content",
  "Violence or threats",
  "Other",
] as const;

export type UgcReportReason = (typeof UGC_REPORT_REASONS)[number];

export const UGC_REPORT_THANKS = "Thanks, we'll review this.";

const LIMITS = {
  contentId: 120,
  snapshot: 4000,
  comment: 500,
  userId: 64,
} as const;

export type UgcReportInput = {
  surface: UgcSurface;
  contentId: string;
  targetUserId: string | null;
  snapshot: string;
  reason: UgcReportReason;
  comment: string | null;
};

function trimmed(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function parseUgcReport(
  body: unknown,
): { ok: true; value: UgcReportInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Report is required" };
  }
  const raw = body as Record<string, unknown>;
  const surface = trimmed(raw.surface, 64);
  if (!UGC_SURFACES.includes(surface as UgcSurface)) {
    return { ok: false, error: "Choose what you are reporting" };
  }
  const contentId = trimmed(raw.contentId, LIMITS.contentId);
  if (!contentId) return { ok: false, error: "That item could not be reported" };
  const snapshot = trimmed(raw.snapshot, LIMITS.snapshot);
  if (!snapshot) return { ok: false, error: "That item could not be reported" };
  const reason = trimmed(raw.reason, 32);
  if (!UGC_REPORT_REASONS.includes(reason as UgcReportReason)) {
    return { ok: false, error: "Choose a reason" };
  }
  const targetUserId = trimmed(raw.targetUserId, LIMITS.userId);
  const comment = trimmed(raw.comment, LIMITS.comment);
  return {
    ok: true,
    value: {
      surface: surface as UgcSurface,
      contentId,
      targetUserId: targetUserId || null,
      snapshot,
      reason: reason as UgcReportReason,
      comment: comment || null,
    },
  };
}

const MEMBER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** LiveKit identities are user ids for signed-in members, and a display-name token for guests. */
export function ugcMemberId(value: string | null | undefined): string | null {
  if (!value || !MEMBER_ID.test(value)) return null;
  return value;
}

export function parseBlockedUserId(
  body: unknown,
): { ok: true; blockedUserId: string } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Choose a member to block" };
  }
  const blockedUserId = trimmed((body as Record<string, unknown>).blockedUserId, LIMITS.userId);
  if (!blockedUserId) return { ok: false, error: "Choose a member to block" };
  return { ok: true, blockedUserId };
}
