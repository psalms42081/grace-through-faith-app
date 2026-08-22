import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const buildScriptPath = new URL("./deploy-build.sh", import.meta.url);
const packageJsonPath = new URL("../package.json", import.meta.url);
const expoBuildHelperPath = new URL("./build.js", import.meta.url);

const buildScript = await readFile(buildScriptPath, "utf8");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const expoBuildHelper = await readFile(expoBuildHelperPath, "utf8");

const allowedExecutableLines = new Set([
  "#!/bin/bash",
  "set -euo pipefail",
  'echo "=== Database-free production build v1 ==="',
  'echo "=== Verifying production build command allowlist ==="',
  "npm run test:deploy-build-safety",
  'echo "=== Building server ==="',
  "npm run server:build",
  'echo "=== Building Expo static (mobile) ==="',
  "npm run expo:static:build",
  'echo "=== Cleaning stale web build ==="',
  "rm -rf dist/",
  'echo "Old dist/ removed"',
  'echo "=== Building Expo web (fresh) ==="',
  "npx expo export --platform web --output-dir dist",
  "if [ ! -f dist/index.html ]; then",
  'echo "DEPLOY BLOCKED: Expo web build failed — dist/index.html not found"',
  "exit 1",
  "fi",
  'echo "Web build verified: dist/index.html exists"',
  'echo "=== Database-free build complete ==="',
]);

const executableLines = buildScript
  .split(/\r?\n/)
  .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
  .filter(
    ({ line }) =>
      line.length > 0 &&
      (!line.startsWith("#") || line === "#!/bin/bash"),
  );

const violations = executableLines.filter(
  ({ line }) => !allowedExecutableLines.has(line),
);

if (violations.length > 0) {
  console.error(
    "Production build contains commands outside the database-free allowlist:",
  );
  for (const { line, lineNumber } of violations) {
    console.error(`  scripts/deploy-build.sh:${lineNumber}: ${line}`);
  }
  process.exit(1);
}

const expectedPackageScripts = {
  "test:deploy-build-safety": "node scripts/test-deploy-build-safety.mjs",
  "server:build":
    "esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outdir=server_dist",
  "expo:static:build": "node scripts/build.js",
  "expo:start:static:build": "npx expo start --no-dev --minify --localhost",
};

const packageScriptViolations = Object.entries(expectedPackageScripts).filter(
  ([name, expected]) => packageJson.scripts?.[name] !== expected,
);

if (packageScriptViolations.length > 0) {
  console.error(
    "Production build package-script indirection changed outside the database-free allowlist:",
  );
  for (const [name, expected] of packageScriptViolations) {
    console.error(
      `  ${name}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(packageJson.scripts?.[name])}`,
    );
  }
  process.exit(1);
}

const expectedExpoBuildHelperSha256 =
  "047ff94bf48f350a4a8812823ec7d046e5a2a36d970795e83a553786cf0a6618";
const expoBuildHelperSha256 = createHash("sha256")
  .update(expoBuildHelper)
  .digest("hex");

if (expoBuildHelperSha256 !== expectedExpoBuildHelperSha256) {
  console.error(
    "scripts/build.js changed after its database-free command graph was audited. " +
      "Review every spawned command, then update the expected checksum deliberately.",
  );
  process.exit(1);
}

const forbiddenDatabaseSignals = [
  /\bDATABASE_URL\b/i,
  /\bpsql\b/i,
  /\bpostgres(?:ql)?\b/i,
  /\bdrizzle(?:-kit)?\b/i,
  /\bserver:prod\b/i,
  /\bserver_dist\/index\.js\b/i,
  /\bserver\/db\b/i,
  /\b(?:seed|dedup|promote|verify-production)\b/i,
  /\btest:devotional-catalog\b/i,
  /\bsecurity-regression\b/i,
  /\bfrom\s+["']pg["']/i,
  /\brequire\(\s*["']pg["']\s*\)/i,
];

const checkedSources = [
  ["scripts/deploy-build.sh", buildScript],
  ["scripts/build.js", expoBuildHelper],
];

const databaseSignal = checkedSources
  .flatMap(([file, source]) =>
    forbiddenDatabaseSignals
      .filter((pattern) => pattern.test(source))
      .map((pattern) => ({ file, pattern })),
  )
  .at(0);

if (databaseSignal) {
  console.error(
    `Production build contains a forbidden database/runtime signal in ${databaseSignal.file}: ${databaseSignal.pattern}.`,
  );
  process.exit(1);
}

console.log(
  "Production build command graph passed: fixed commands, pinned package scripts, no database or runtime-server signals.",
);