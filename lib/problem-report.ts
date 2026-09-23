/** Adult "Report a problem" payload. Screens match the adult tab bar, plus Other. */

export const PROBLEM_REPORT_SCREENS = [
  "Home",
  "Bible",
  "Devotions",
  "Discover",
  "Profile",
  "Other",
] as const;

export type ProblemReportScreen = (typeof PROBLEM_REPORT_SCREENS)[number];

export type ProblemReportInput = {
  message: string;
  screen: ProblemReportScreen;
  device: string | null;
  email: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseProblemReport(
  body: unknown,
): { ok: true; value: ProblemReportInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "What happened is required" };
  }
  const raw = body as Record<string, unknown>;
  const message = typeof raw.message === "string" ? raw.message.trim() : "";
  if (!message) return { ok: false, error: "What happened is required" };
  if (message.length > 5000) {
    return { ok: false, error: "Please keep this under 5000 characters" };
  }
  const screen = typeof raw.screen === "string" ? raw.screen.trim() : "";
  if (!PROBLEM_REPORT_SCREENS.includes(screen as ProblemReportScreen)) {
    return { ok: false, error: "Choose a screen" };
  }
  const device =
    typeof raw.device === "string" ? raw.device.trim().slice(0, 1000) : "";
  const emailRaw = typeof raw.email === "string" ? raw.email.trim().slice(0, 255) : "";
  if (emailRaw && !EMAIL_RE.test(emailRaw)) {
    return { ok: false, error: "Enter a valid email or leave it blank" };
  }
  return {
    ok: true,
    value: {
      message,
      screen: screen as ProblemReportScreen,
      device: device || null,
      email: emailRaw || null,
    },
  };
}
