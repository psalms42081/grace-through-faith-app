import { Router } from "express";
import { eq } from "drizzle-orm";
import { parseAiReport } from "../../lib/ai-report";
import { aiReports, users } from "../../shared/schema";
import { db } from "../db";
import { optionalAuth } from "../middleware/auth";
import { aiReportLimiter } from "../middleware/rate-limit";
import { escapeFeedbackHtml, sendFeedbackEmail } from "../services/feedback-mail";

const router = Router();

/** "Report this answer" under AI-generated content. Guests and signed-in users alike. */
router.post("/api/ai-reports", optionalAuth, aiReportLimiter, async (req, res) => {
  try {
    const parsed = parseAiReport(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const report = parsed.value;

    let userId = req.authUserId ?? null;
    let email: string | null = null;
    if (userId) {
      const [userRow] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
      if (!userRow) userId = null;
      else email = userRow.email ?? null;
    }

    const [row] = await db
      .insert(aiReports)
      .values({
        userId,
        feature: report.feature,
        reference: report.reference,
        version: report.version,
        responseText: report.responseText,
        reason: report.reason,
        comment: report.comment,
      })
      .returning({ id: aiReports.id });

    const cell = (value: string | null) => escapeFeedbackHtml(value || "Not provided");
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#C9933A;margin-bottom:16px;">AI answer reported</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr><td style="padding:8px;font-weight:bold;color:#666;width:140px;">Reason:</td><td style="padding:8px;">${cell(report.reason)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#666;">Feature:</td><td style="padding:8px;">${cell(report.feature)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#666;">Reference:</td><td style="padding:8px;">${cell(report.reference)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#666;">Version:</td><td style="padding:8px;">${cell(report.version)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#666;">User:</td><td style="padding:8px;">${userId ? `${escapeFeedbackHtml(userId)} (${cell(email)})` : "Guest"}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#666;">Report id:</td><td style="padding:8px;">${escapeFeedbackHtml(row?.id ?? "")}</td></tr>
        </table>
        <h3 style="color:#666;font-size:14px;margin:0 0 6px;">Comment</h3>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;border-left:4px solid #C9933A;margin-bottom:16px;">
          <p style="margin:0;white-space:pre-wrap;">${cell(report.comment)}</p>
        </div>
        <h3 style="color:#666;font-size:14px;margin:0 0 6px;">Reported answer</h3>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;border-left:4px solid #999;">
          <p style="margin:0;white-space:pre-wrap;">${escapeFeedbackHtml(report.responseText)}</p>
        </div>
        <p style="margin-top:20px;font-size:12px;color:#999;">Informed Ministries App — AI content report</p>
      </div>
    `;
    const subject = `[AI report] ${report.reason} — ${report.feature}${report.reference ? ` — ${report.reference}` : ""}`;
    // The report is saved either way; email is best-effort.
    void sendFeedbackEmail(subject, html).catch((err: unknown) => {
      console.error("[ai-report] email failed:", err instanceof Error ? err.message : err);
    });

    res.json({ success: true, id: row?.id });
  } catch (err) {
    console.error("[ai-report] failed:", err);
    res.status(500).json({ error: "Could not save the report" });
  }
});

export default router;
