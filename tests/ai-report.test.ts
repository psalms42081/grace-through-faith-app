import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  AI_REPORT_LIMITS,
  AI_REPORT_LINK_LABEL,
  AI_REPORT_REASONS,
  AI_REPORT_THANKS,
  aiReportText,
  parseAiReport,
} from "../lib/ai-report";

const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(name)) out.push(full);
  }
  return out;
}

describe("AI report payload", () => {
  it("offers the four reasons and the sheet copy", () => {
    assert.deepEqual(AI_REPORT_REASONS, ["Inaccurate", "Offensive or harmful", "Theologically concerning", "Other"]);
    assert.equal(AI_REPORT_LINK_LABEL, "Report this answer");
    assert.equal(AI_REPORT_THANKS, "Thanks, we'll review this");
  });

  it("accepts a report from a guest with no comment", () => {
    const parsed = parseAiReport({
      feature: "Explain this verse",
      reference: " Matthew 5:1 ",
      version: "KJV",
      responseText: "  Blessed are the poor in spirit…  ",
      reason: "Inaccurate",
      comment: "   ",
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.value, {
      feature: "Explain this verse",
      reference: "Matthew 5:1",
      version: "KJV",
      responseText: "Blessed are the poor in spirit…",
      reason: "Inaccurate",
      comment: null,
    });
  });

  it("requires a feature, a known reason and the response text", () => {
    assert.equal(parseAiReport(null).ok, false);
    assert.equal(parseAiReport({ reason: "Other", responseText: "x" }).ok, false);
    assert.equal(parseAiReport({ feature: "Deep dive", reason: "Rude", responseText: "x" }).ok, false);
    assert.equal(parseAiReport({ feature: "Deep dive", reason: "Other", responseText: "  " }).ok, false);
    const longComment = parseAiReport({
      feature: "Deep dive",
      reason: "Other",
      responseText: "x",
      comment: "a".repeat(AI_REPORT_LIMITS.comment + 1),
    });
    assert.equal(longComment.ok, false);
  });

  it("trims fields to their columns and caps the stored answer", () => {
    const parsed = parseAiReport({
      feature: "f".repeat(100),
      reference: "r".repeat(200),
      version: "v".repeat(50),
      responseText: "t".repeat(AI_REPORT_LIMITS.responseText + 500),
      reason: "Other",
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.value.feature.length, AI_REPORT_LIMITS.feature);
    assert.equal(parsed.value.reference?.length, AI_REPORT_LIMITS.reference);
    assert.equal(parsed.value.version?.length, AI_REPORT_LIMITS.version);
    assert.equal(parsed.value.responseText.length, AI_REPORT_LIMITS.responseText);
    assert.ok(parsed.value.responseText.endsWith("…"));
  });

  it("flattens structured answers into readable text", () => {
    assert.equal(aiReportText("  hello "), "hello");
    assert.equal(aiReportText(["one", "", "two"]), "one\ntwo");
    assert.equal(
      aiReportText({ reflection: "Trust God.", question: "Why?", empty: null, list: ["a", "b"] }),
      "reflection: Trust God.\nquestion: Why?\nlist:\na\nb",
    );
    assert.equal(aiReportText([{ reference: "John 3:16", text: "For God so loved" }]), "reference: John 3:16\ntext: For God so loved");
  });
});

describe("AI report sheet", () => {
  const sheet = read("components/ReportAiAnswer.tsx");

  it("is a link that opens a sheet with reasons, a comment box, Send, and a thank-you", () => {
    assert.match(sheet, /export function ReportAiAnswer\(/);
    assert.match(sheet, /\{AI_REPORT_LINK_LABEL\}/);
    assert.match(sheet, /name="flag-outline"/);
    assert.match(sheet, /AI_REPORT_REASONS\.map/);
    assert.match(sheet, /accessibilityRole="radio"/);
    assert.match(sheet, /Comment \(optional\)/);
    assert.match(sheet, /maxLength=\{AI_REPORT_LIMITS\.comment\}/);
    assert.match(sheet, />\s*Send\s*</);
    assert.match(sheet, /\{AI_REPORT_THANKS\}/);
    assert.match(sheet, /setTimeout\(onClose, THANKS_VISIBLE_MS\)/);
    assert.match(sheet, /apiRequest\("POST", "\/api\/ai-reports"/);
    assert.match(sheet, /responseText: aiReportText\(responseText\)/);
    assert.match(sheet, /disabled=\{!canSend\}/);
    // No sign-in gate: guests report too.
    assert.doesNotMatch(sheet, /useAuth|isAuthenticated/);
    // Readable at the largest system text size.
    assert.match(sheet, /maxFontSizeMultiplier=\{FONT_CAP\}/);
    assert.match(sheet, /maxHeight: "90%"/);
    assert.match(sheet, /<ScrollView/);
  });

  it("appears under every AI-generated block in the app", () => {
    const files = [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "components"))];
    const surfaces = files.filter((file) => {
      const source = readFileSync(file, "utf8");
      return /<AIGeneratedLabel\b/.test(source) && !file.endsWith("AIGeneratedLabel.tsx");
    });
    assert.ok(surfaces.length >= 20, `found ${surfaces.length} AI surfaces`);
    for (const file of surfaces) {
      const source = readFileSync(file, "utf8");
      assert.match(source, /<ReportAiAnswer\b/, `${path.relative(ROOT, file)} has no Report this answer link`);
    }
  });

  it("covers Explain this verse and Deep dive with the verse reference and version", () => {
    const explain = read("app/verse-explain.tsx");
    assert.match(explain, /feature="Explain this verse"[\s\S]*?reference=\{reference\}[\s\S]*?version=\{txLabel\}[\s\S]*?responseText=\{aiExplanation\}/);
    const study = read("app/(tabs)/study.tsx");
    for (const feature of ["Deep dive passage sections", "Deep dive word study", "Deep dive context", "Deep dive application"]) {
      assert.match(study, new RegExp(`feature="${feature}"`), feature);
    }
    assert.match(study, /feature=\{`Historic voices/);
  });
});

describe("AI report server", () => {
  it("stores reports in ai_reports and emails the contact address", () => {
    const migration = read("migrations/0029_ai_reports.sql");
    assert.match(migration, /CREATE TABLE IF NOT EXISTS "public"\."ai_reports"/);
    for (const column of ["id", "created_at", "user_id", "feature", "reference", "version", "response_text", "reason", "comment"]) {
      assert.match(migration, new RegExp(`"${column}"`), column);
    }
    assert.match(migration, /"user_id" varchar REFERENCES "public"\."users"\("id"\) ON DELETE set null/);
    assert.match(migration, /"response_text" text NOT NULL/);

    const schema = read("shared/schema.ts");
    assert.match(schema, /export const aiReports = pgTable\("ai_reports"/);
    assert.match(schema, /responseText: text\("response_text"\)\.notNull\(\)/);

    const route = read("server/routes/ai-report.ts");
    assert.match(route, /router\.post\("\/api\/ai-reports", optionalAuth, aiReportLimiter/);
    assert.match(route, /parseAiReport\(req\.body\)/);
    assert.match(route, /db\s*\.insert\(aiReports\)/);
    assert.match(route, /sendFeedbackEmail\(subject, html\)/);
    assert.match(route, /\[AI report\]/);
    assert.match(route, /escapeFeedbackHtml\(report\.responseText\)/);

    const routes = read("server/routes.ts");
    assert.match(routes, /import aiReportRoutes from "\.\/routes\/ai-report"/);
    assert.match(routes, /app\.use\(aiReportRoutes\)/);

    const limiter = read("server/middleware/rate-limit.ts");
    assert.match(limiter, /export const aiReportLimiter = rateLimit\(/);
  });
});

describe("OTA updates reach the live API without a shell override", () => {
  it(".env.production pins EXPO_PUBLIC_DOMAIN and is committed", () => {
    const env = read(".env.production");
    assert.match(env, /^EXPO_PUBLIC_DOMAIN=informedministries\.app$/m);
    assert.doesNotMatch(env, /DATABASE_URL|JWT|KEY|SECRET|PASS/);
    const gitignore = read(".gitignore");
    for (const line of gitignore.split(/\r?\n/)) {
      const rule = line.trim();
      if (!rule || rule.startsWith("#")) continue;
      assert.notEqual(rule, ".env.production");
      assert.notEqual(rule, ".env*");
      assert.notEqual(rule, ".env.*");
    }
  });

  it("a release bundle falls back to the live host instead of throwing", () => {
    const client = read("lib/query-client.ts");
    assert.match(client, /export const PRODUCTION_API_HOST = "informedministries\.app"/);
    assert.match(client, /return `https:\/\/\$\{PRODUCTION_API_HOST\}\/`;\s*\}\s*$/m);
    assert.doesNotMatch(client, /throw new Error\("EXPO_PUBLIC_DOMAIN is not set/);
    assert.match(client, /if \(__DEV__ && host\) \{\s*return `http:\/\/\$\{host\}\/`;/);
  });
});
