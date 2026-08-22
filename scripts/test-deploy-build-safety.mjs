import {
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "..");
const checkerRelativePath = "scripts/check-deploy-build-safety.mjs";

function runChecker(root) {
  return spawnSync(process.execPath, [join(root, checkerRelativePath)], {
    cwd: root,
    encoding: "utf8",
  });
}

function assertAccepted(result, label) {
  if (result.status !== 0) {
    throw new Error(
      `${label} should pass, but failed:\n${result.stdout}\n${result.stderr}`,
    );
  }
}

function assertRejected(result, label) {
  if (result.status === 0) {
    throw new Error(`${label} should be rejected, but passed.`);
  }
}

const baseline = runChecker(projectRoot);
assertAccepted(baseline, "Current production build graph");
process.stdout.write(baseline.stdout);

const fixtureRoot = await mkdtemp(join(tmpdir(), "deploy-build-safety-"));

try {
  await mkdir(join(fixtureRoot, "scripts"), { recursive: true });
  for (const relativePath of [
    checkerRelativePath,
    "scripts/deploy-build.sh",
    "scripts/build.js",
    "package.json",
  ]) {
    await copyFile(
      join(projectRoot, relativePath),
      join(fixtureRoot, relativePath),
    );
  }

  const originalBuildScript = await readFile(
    join(fixtureRoot, "scripts/deploy-build.sh"),
    "utf8",
  );
  const originalPackageJson = JSON.parse(
    await readFile(join(fixtureRoot, "package.json"), "utf8"),
  );
  const originalExpoBuildHelper = await readFile(
    join(fixtureRoot, "scripts/build.js"),
    "utf8",
  );

  const fixtureBaseline = runChecker(fixtureRoot);
  assertAccepted(fixtureBaseline, "Fixture baseline");

  await writeFile(
    join(fixtureRoot, "scripts/deploy-build.sh"),
    originalBuildScript.replace(
      'echo "=== Verifying production build command allowlist ==="',
      'echo "=== Verifying production build command allowlist ==="\n' +
        'echo "$(npm run server:prod)"',
    ),
  );
  assertRejected(
    runChecker(fixtureRoot),
    "Shell command-substitution injection",
  );

  await writeFile(
    join(fixtureRoot, "scripts/deploy-build.sh"),
    originalBuildScript,
  );
  const directIndirection = structuredClone(originalPackageJson);
  directIndirection.scripts["server:build"] = "npm run server:prod";
  await writeFile(
    join(fixtureRoot, "package.json"),
    `${JSON.stringify(directIndirection, null, 2)}\n`,
  );
  assertRejected(
    runChecker(fixtureRoot),
    "Direct package-script indirection",
  );

  const nestedIndirection = structuredClone(originalPackageJson);
  nestedIndirection.scripts["expo:start:static:build"] =
    "npm run server:prod";
  await writeFile(
    join(fixtureRoot, "package.json"),
    `${JSON.stringify(nestedIndirection, null, 2)}\n`,
  );
  assertRejected(
    runChecker(fixtureRoot),
    "Nested Expo package-script indirection",
  );

  await writeFile(
    join(fixtureRoot, "package.json"),
    `${JSON.stringify(originalPackageJson, null, 2)}\n`,
  );
  await writeFile(
    join(fixtureRoot, "scripts/build.js"),
    `${originalExpoBuildHelper}\nvoid process.env.DATABASE_URL;\n`,
  );
  assertRejected(
    runChecker(fixtureRoot),
    "Transitive Expo helper modification",
  );

  console.log(
    "Production build safety negative tests passed: shell substitution, direct/nested package indirection, and helper changes were rejected.",
  );
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}