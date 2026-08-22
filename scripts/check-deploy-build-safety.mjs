import { readFile } from "node:fs/promises";

const buildScriptPath = new URL("./deploy-build.sh", import.meta.url);
const buildScript = await readFile(buildScriptPath, "utf8");

const forbidden = [
  {
    label: "Drizzle schema push",
    pattern: /\bdrizzle-kit\s+push\b/i,
  },
  {
    label: "numbered migration runner",
    pattern: /\brun-numbered-migrations\b/i,
  },
  {
    label: "catalog migration wrapper",
    pattern: /\bprepare-devotional-catalog\b/i,
  },
  {
    label: "schema fallback/repair",
    pattern: /\b(?:ensure-tables|reconcile-constraints|normalize-verse-columns)\b/i,
  },
  {
    label: "raw schema DDL",
    pattern: /\b(?:CREATE|ALTER|DROP)\s+(?:TABLE|INDEX|SEQUENCE|CONSTRAINT|COLUMN|TYPE|FUNCTION|TRIGGER)\b/i,
  },
];

const violations = forbidden
  .filter(({ pattern }) => pattern.test(buildScript))
  .map(({ label }) => label);

if (violations.length > 0) {
  console.error(
    `Production build must not mutate database schema. Remove: ${violations.join(", ")}.`,
  );
  process.exit(1);
}

console.log("Production build schema-ownership check passed.");