import nodemailer from "nodemailer";
import { APP_CONTACT_EMAIL } from "../../constants/app";

export function escapeFeedbackHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SMTP_CONFIGS = [
  { host: "smtpout.secureserver.net", port: 465, secure: true, name: "GoDaddy" },
  { host: "smtpout.secureserver.net", port: 587, secure: false, name: "GoDaddy-587" },
  { host: "smtp.office365.com", port: 587, secure: false, name: "Office365" },
];

/** Existing feedback mail path. Saves still succeed when SMTP is unset or every host fails. */
export async function sendFeedbackEmail(subject: string, html: string): Promise<boolean> {
  const feedbackEmailUser = process.env.FEEDBACK_EMAIL_USER;
  const feedbackEmailPass = process.env.FEEDBACK_EMAIL_PASS;
  if (!feedbackEmailUser || !feedbackEmailPass) return false;

  for (const cfg of SMTP_CONFIGS) {
    try {
      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: feedbackEmailUser, pass: feedbackEmailPass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 12000,
      });
      await transporter.sendMail({
        from: `"Informed Ministries" <${feedbackEmailUser}>`,
        to: APP_CONTACT_EMAIL,
        subject,
        html,
      });
      console.log(`[feedback] Email sent via ${cfg.name}`);
      return true;
    } catch (smtpErr: unknown) {
      const message = smtpErr instanceof Error ? smtpErr.message : String(smtpErr);
      console.error(`[feedback] ${cfg.name} failed:`, message);
    }
  }
  console.error("[feedback] All SMTP configs failed — email not sent");
  return false;
}
