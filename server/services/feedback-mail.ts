import { APP_CONTACT_EMAIL } from "../../constants/app";

export function escapeFeedbackHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const RESEND_URL = "https://api.resend.com/emails";
/** Verified sending address on the informedministries.app domain in Resend. */
export const FEEDBACK_FROM = "Informed Ministries <noreply@informedministries.app>";
const REPLY_TO = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

export type FeedbackEmailOptions = {
  /** The person's address, when we know it. Omitted for guests. */
  replyTo?: string | null;
};

/** Strip the API key and any Resend token so a logged error cannot reveal it. */
export function redactMailSecret(message: string): string {
  const key = process.env.RESEND_API_KEY;
  const stripped = key ? message.split(key).join("[redacted]") : message;
  return stripped.replace(/\bre_[A-Za-z0-9_-]+\b/g, "[redacted]");
}

function replyToAddress(value: string | null | undefined): string | undefined {
  const address = value?.trim();
  return address && REPLY_TO.test(address) ? address : undefined;
}

async function resendErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text) as {
      message?: unknown;
      name?: unknown;
      error?: unknown;
    };
    const nested = json.error;
    const detail =
      typeof json.message === "string"
        ? json.message
        : typeof nested === "string"
          ? nested
          : nested && typeof nested === "object" && typeof (nested as { message?: unknown }).message === "string"
            ? (nested as { message: string }).message
            : "";
    const name = typeof json.name === "string" ? `${json.name}: ` : "";
    return (name + detail).trim() || text.slice(0, 500) || res.statusText;
  } catch {
    return text.slice(0, 500) || res.statusText;
  }
}

/**
 * Sends one notification to hello@informedministries.app through Resend.
 * Returns false when the key is missing or Resend rejects the message, and never throws:
 * the report or feedback row is already saved by the time this runs.
 */
export async function sendFeedbackEmail(
  subject: string,
  html: string,
  options?: FeedbackEmailOptions,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[feedback] RESEND_API_KEY is not set — email not sent");
    return false;
  }

  const replyTo = replyToAddress(options?.replyTo);
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FEEDBACK_FROM,
        to: [APP_CONTACT_EMAIL],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject,
        html,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      const detail = redactMailSecret(await resendErrorMessage(res));
      console.error(`[feedback] Resend failed (${res.status}): ${detail}`);
      return false;
    }
    console.log("[feedback] Email sent via Resend");
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[feedback] Resend request failed: ${redactMailSecret(message)}`);
    return false;
  }
}

/** Calendar time in Sydney, including AEST or AEDT. */
export function formatSydneyTime(value: Date | string | null | undefined): string {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date);
}

export type NewAccountNotice = {
  displayName: string;
  email: string;
  method: string;
  createdAt: Date | string | null | undefined;
};

/** Subject and body for the new-account notice. The display name is one line. */
export function newAccountEmail(account: NewAccountNotice): { subject: string; html: string } {
  const name = account.displayName.replace(/[\r\n]+/g, " ").trim() || "New member";
  const when = formatSydneyTime(account.createdAt);
  const cell = (value: string) => escapeFeedbackHtml(value || "Not provided");
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#C9933A;margin-bottom:16px;">New account</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr><td style="padding:8px;font-weight:bold;color:#666;width:160px;">Display name:</td><td style="padding:8px;">${cell(name)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;color:#666;">Email:</td><td style="padding:8px;">${cell(account.email)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;color:#666;">Sign-up method:</td><td style="padding:8px;">${cell(account.method)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;color:#666;">Created:</td><td style="padding:8px;">${cell(when)} (Sydney)</td></tr>
      </table>
      <p style="margin-top:20px;font-size:12px;color:#999;">Informed Ministries App — New account notification</p>
    </div>
  `;
  return { subject: `[New account] ${name}`, html };
}

/** Best-effort notice. sendFeedbackEmail never throws, so sign-up is unaffected. */
export function notifyNewAccount(account: NewAccountNotice): Promise<boolean> {
  const { subject, html } = newAccountEmail(account);
  return sendFeedbackEmail(subject, html, { replyTo: account.email });
}
