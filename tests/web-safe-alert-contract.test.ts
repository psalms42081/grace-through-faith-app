import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const TARGET_DIRS = ["app", "components"].map((dir) => join(REPO_ROOT, dir));

const ALERT_RE = /\bAlert\.(alert|prompt)\s*\(/;

function walkTsx(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules") continue;
      walkTsx(full, acc);
    } else if (/\.(ts|tsx|js|jsx)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("web-safe alerts", () => {
  it("does not use Alert.alert or Alert.prompt in app/ or components/", () => {
    const hits: string[] = [];
    for (const dir of TARGET_DIRS) {
      for (const file of walkTsx(dir)) {
        const source = readFileSync(file, "utf8");
        if (ALERT_RE.test(source)) {
          hits.push(relative(REPO_ROOT, file).replace(/\\/g, "/"));
        }
      }
    }
    assert.deepEqual(
      hits,
      [],
      `Alert.alert/prompt is a no-op on web. Found in:\n${hits.join("\n")}`,
    );
  });

  it("resets reading history with a web-safe confirm sheet and the existing endpoint", () => {
    const settings = readFileSync(join(REPO_ROOT, "app", "settings.tsx"), "utf8");
    assert.match(settings, /confirmWebSafe/);
    assert.match(settings, /testID:\s*"settings-reset-history-confirm"/);
    assert.match(settings, /testID:\s*"settings-sign-out-confirm"/);
    assert.match(settings, /DELETE", "\/api\/reading-history\/reset"/);
    assert.match(settings, /Reading history cleared/);
    assert.doesNotMatch(settings, /Alert\.alert|window\.confirm|window\.alert/);
    assert.doesNotMatch(settings, /inlineConfirm/);
  });
});
