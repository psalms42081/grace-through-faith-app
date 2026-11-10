import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { parseBlockedUserId, parseUgcReport } from "../../lib/ugc-moderation";
import { ugcReports, userBlocks, users } from "../../shared/schema";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { aiReportLimiter } from "../middleware/rate-limit";
import { escapeFeedbackHtml, sendFeedbackEmail } from "../services/feedback-mail";
import { blockedUserIdSet } from "../services/user-blocks";

const router = Router();

router.get("/api/ugc/blocks", requireAuth, async (req, res) => {
  const blocked = await blockedUserIdSet(req.authUserId);
  res.json({ blockedUserIds: [...blocked] });
});

router.post("/api/ugc/blocks", requireAuth, aiReportLimiter, async (req, res) => {
  try {
    const parsed = parseBlockedUserId(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const blockerUserId = req.authUserId!;
    if (parsed.blockedUserId === blockerUserId) {
      res.status(400).json({ error: "You can't block yourself" });
      return;
    }
    const [person] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, parsed.blockedUserId))
      .limit(1);
    if (!person) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    await db
      .insert(userBlocks)
      .values({ blockerUserId, blockedUserId: parsed.blockedUserId })
      .onConflictDoNothing();
    res.json({ success: true });
  } catch (err) {
    console.error("[ugc] block failed:", err);
    res.status(500).json({ error: "Could not block this member" });
  }
});

router.delete("/api/ugc/blocks/:userId", requireAuth, async (req, res) => {
  try {
    const blockedUserId = String(req.params.userId || "");
    await db
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerUserId, req.authUserId!),
          eq(userBlocks.blockedUserId, blockedUserId),
        ),
      );
    res.json({ success: true });
  } catch (err) {
    console.error("[ugc] unblock failed:", err);
    res.status(500).json({ error: "Could not unblock this member" });
  }
});

router.post("/api/ugc/reports", requireAuth, aiReportLimiter, async (req, res) => {
  try {
    const parsed = parseUgcReport(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const report = parsed.value;
    const reporterUserId = req.authUserId!;
    const [reporter] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, reporterUserId))
      .limit(1);

    let targetUserId = report.targetUserId;
    if (targetUserId) {
      const [target] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);
      if (!target) targetUserId = null;
    }

    const [row] = await db
      .insert(ugcReports)
      .values({
        reporterUserId,
        targetUserId,
        surface: report.surface,
        contentId: report.contentId,
        snapshot: report.snapshot,
        reason: report.reason,
        comment: report.comment,
      })
      .returning({ id: ugcReports.id });

    const cell = (value: string | null) => escapeFeedbackHtml(value || "Not provided");
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#C9933A;margin-bottom:16px;">Member content reported</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr><td style="padding:8px;font-weight:bold;color:#666;width:140px;">Reason:</td><td style="padding:8px;">${cell(report.reason)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#666;">Surface:</td><td style="padding:8px;">${cell(report.surface)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#666;">Content id:</td><td style="padding:8px;">${cell(report.contentId)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#666;">Reporter:</td><td style="padding:8px;">${escapeFeedbackHtml(reporterUserId)} (${cell(reporter?.email ?? null)})</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#666;">Reported member:</td><td style="padding:8px;">${cell(targetUserId)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#666;">Report id:</td><td style="padding:8px;">${escapeFeedbackHtml(row?.id ?? "")}</td></tr>
        </table>
        <h3 style="color:#666;font-size:14px;margin:0 0 6px;">Comment</h3>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;border-left:4px solid #C9933A;margin-bottom:16px;">
          <p style="margin:0;white-space:pre-wrap;">${cell(report.comment)}</p>
        </div>
        <h3 style="color:#666;font-size:14px;margin:0 0 6px;">Content</h3>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;border-left:4px solid #999;">
          <p style="margin:0;white-space:pre-wrap;">${escapeFeedbackHtml(report.snapshot)}</p>
        </div>
      </div>
    `;
    void sendFeedbackEmail(`[UGC report] ${report.reason} — ${report.surface}`, html, {
      replyTo: reporter?.email ?? null,
    });
    res.json({ success: true, id: row?.id });
  } catch (err) {
    console.error("[ugc] report failed:", err);
    res.status(500).json({ error: "Could not save the report" });
  }
});

export default router;
