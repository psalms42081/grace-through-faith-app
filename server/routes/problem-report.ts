import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { parseProblemReport } from "../../lib/problem-report";
import { feedback, users } from "../../shared/schema";
import { db } from "../db";
import { escapeFeedbackHtml, sendFeedbackEmail } from "../services/feedback-mail";

/** Problem reports from Profile → About. Returns true when this request was handled. */
export async function handleProblemReport(req: Request, res: Response): Promise<boolean> {
  if (typeof req.body?.screen !== "string") return false;

  const parsed = parseProblemReport(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return true;
  }

  let userId = req.authUserId ?? null;
  let email = parsed.value.email;
  if (userId) {
    const [userRow] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    if (!userRow) {
      userId = null;
    } else if (userRow.email) {
      email = userRow.email;
    }
  }

  await db.insert(feedback).values({
    userId,
    message: parsed.value.message,
    screen: parsed.value.screen,
    device: parsed.value.device,
    email,
  });

  const safeMessage = escapeFeedbackHtml(parsed.value.message);
  const safeScreen = escapeFeedbackHtml(parsed.value.screen);
  const safeDevice = escapeFeedbackHtml(parsed.value.device || "Not provided");
  const safeEmail = escapeFeedbackHtml(email || "Not provided");
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#C9933A;margin-bottom:16px;">Problem report</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr><td style="padding:8px;font-weight:bold;color:#666;width:140px;">Screen:</td><td style="padding:8px;">${safeScreen}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;color:#666;">Email:</td><td style="padding:8px;">${safeEmail}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;color:#666;">Device:</td><td style="padding:8px;">${safeDevice}</td></tr>
      </table>
      <div style="background:#f5f5f5;padding:16px;border-radius:8px;border-left:4px solid #C9933A;">
        <p style="margin:0;white-space:pre-wrap;">${safeMessage}</p>
      </div>
      <p style="margin-top:20px;font-size:12px;color:#999;">Informed Ministries App — Automated Feedback Notification</p>
    </div>
  `;
  await sendFeedbackEmail(`[Feedback] Problem report — ${parsed.value.screen}`, html);
  res.json({ success: true });
  return true;
}
