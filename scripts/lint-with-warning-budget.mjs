import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const budgetPath = new URL("../eslint-warning-budget.json", import.meta.url);
const budget = JSON.parse(readFileSync(budgetPath, "utf8"));

const result = spawnSync(
  "npx",
  ["expo", "lint", "--", "--format", "json"],
  {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  },
);

if (result.error) {
  console.error(`Unable to run ESLint: ${result.error.message}`);
  process.exit(1);
}

let reports;
try {
  reports = JSON.parse(result.stdout);
} catch {
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.stdout) process.stdout.write(result.stdout);
  console.error("ESLint did not return a valid JSON report.");
  process.exit(1);
}

const errors = [];
const warnings = [];
const warningCounts = new Map();

for (const report of reports) {
  const file = report.filePath.startsWith(rootDir)
    ? report.filePath.slice(rootDir.length)
    : report.filePath;
  const sourceLines = (report.source ?? "").split(/\r?\n/);

  for (const message of report.messages) {
    const sourceLine = (sourceLines[(message.line ?? 1) - 1] ?? "").trim();
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify([
          file,
          message.ruleId ?? "unknown",
          message.message,
          sourceLine,
        ]),
      )
      .digest("hex");
    const finding = { ...message, file, fingerprint };
    if (message.severity === 2) {
      errors.push(finding);
    } else if (message.severity === 1) {
      warnings.push(finding);
      const rule = message.ruleId ?? "unknown";
      warningCounts.set(rule, (warningCounts.get(rule) ?? 0) + 1);
    }
  }
}

const budgetRegressions = [];
const knownRules = new Set([
  ...Object.keys(budget.byRule),
  ...warningCounts.keys(),
]);

for (const rule of [...knownRules].sort()) {
  const actual = warningCounts.get(rule) ?? 0;
  const allowed = budget.byRule[rule] ?? 0;
  if (actual > allowed) {
    budgetRegressions.push({ rule, actual, allowed });
  }
}

if (warnings.length > budget.total) {
  budgetRegressions.push({
    rule: "all warnings",
    actual: warnings.length,
    allowed: budget.total,
  });
}

const allowedFingerprintCounts = new Map();
const activeFingerprints = [];
const retiredFingerprintCounts = new Map();
for (const fingerprint of budget.retiredFingerprints ?? []) {
  retiredFingerprintCounts.set(
    fingerprint,
    (retiredFingerprintCounts.get(fingerprint) ?? 0) + 1,
  );
}
const packedFingerprints = Buffer.from(budget.fingerprintsBase64, "base64");
if (packedFingerprints.length % 32 !== 0) {
  console.error("The ESLint warning baseline fingerprint data is invalid.");
  process.exit(1);
}
for (let offset = 0; offset < packedFingerprints.length; offset += 32) {
  const fingerprint = packedFingerprints
    .subarray(offset, offset + 32)
    .toString("hex");
  const retired = retiredFingerprintCounts.get(fingerprint) ?? 0;
  if (retired > 0) {
    retiredFingerprintCounts.set(fingerprint, retired - 1);
    continue;
  }
  activeFingerprints.push(fingerprint);
  allowedFingerprintCounts.set(
    fingerprint,
    (allowedFingerprintCounts.get(fingerprint) ?? 0) + 1,
  );
}
const activeFingerprintCount = activeFingerprints.length;
const unknownRetiredFingerprintCount = [
  ...retiredFingerprintCounts.values(),
].reduce((total, count) => total + count, 0);
if (
  activeFingerprintCount !== (budget.fingerprintPoolTotal ?? budget.total) ||
  unknownRetiredFingerprintCount !== 0
) {
  console.error("The ESLint warning fingerprint pool is invalid.");
  process.exit(1);
}

const packedLocations = Buffer.from(budget.locationsBase64, "base64");
if (packedLocations.length !== activeFingerprintCount * 8) {
  console.error("The ESLint warning baseline location data is invalid.");
  process.exit(1);
}

function occurrenceKey(fingerprint, line, column, endLine, endColumn) {
  return [
    fingerprint,
    line ?? 0,
    column ?? 0,
    endLine ?? 0,
    endColumn ?? 0,
  ].join(":");
}

const allowedOccurrenceCounts = new Map();
for (let index = 0; index < activeFingerprints.length; index += 1) {
  const offset = index * 8;
  const key = occurrenceKey(
    activeFingerprints[index],
    packedLocations.readUInt16BE(offset),
    packedLocations.readUInt16BE(offset + 2),
    packedLocations.readUInt16BE(offset + 4),
    packedLocations.readUInt16BE(offset + 6),
  );
  allowedOccurrenceCounts.set(key, (allowedOccurrenceCounts.get(key) ?? 0) + 1);
}

const seenFingerprintCounts = new Map();
const newWarnings = [];
for (const warning of warnings) {
  const seen = (seenFingerprintCounts.get(warning.fingerprint) ?? 0) + 1;
  seenFingerprintCounts.set(warning.fingerprint, seen);
  const allowed = allowedFingerprintCounts.get(warning.fingerprint) ?? 0;
  if (seen > allowed) newWarnings.push(warning);
}

function printFinding(finding) {
  const rule = finding.ruleId ? `  ${finding.ruleId}` : "";
  console.error(
    `${finding.file}:${finding.line}:${finding.column}  ${finding.message}${rule}`,
  );
}

if (errors.length > 0) {
  console.error(`\nESLint found ${errors.length} error(s):\n`);
  for (const error of errors) printFinding(error);
}

if (budgetRegressions.length > 0) {
  console.error("\nESLint warning budget exceeded:");
  for (const regression of budgetRegressions) {
    console.error(
      `  ${regression.rule}: ${regression.actual} warning(s), budget ${regression.allowed}`,
    );
  }
}

if (newWarnings.length > 0) {
  console.error("\nESLint found warning(s) outside the legacy baseline:\n");
  for (const warning of newWarnings) printFinding(warning);
}

if (
  errors.length > 0 ||
  budgetRegressions.length > 0 ||
  newWarnings.length > 0 ||
  result.status !== 0
) {
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(1);
}

const hookWarnings = warningCounts.get("react-hooks/exhaustive-deps") ?? 0;
console.log("ESLint passed with no errors or new warnings.");
console.log(
  `Temporary warning budget: ${warnings.length}/${budget.total} total; ` +
    `${hookWarnings}/${budget.byRule["react-hooks/exhaustive-deps"]} React hook dependencies.`,
);
console.log("Run `npm run lint:report` to inspect the legacy warning backlog.");