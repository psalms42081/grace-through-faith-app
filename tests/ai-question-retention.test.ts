import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("AI question retention", () => {
  it("keeps a 30-day cutoff and spares the SDA lens marker", () => {
    const source = readFileSync(
      new URL("../server/services/ai-question-retention.ts", import.meta.url),
      "utf8",
    );
    const warmup = readFileSync(
      new URL("../server/services/cache-warmup.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /AI_QUESTION_RETENTION_DAYS = 30/);
    assert.match(source, /SEARCH_CACHE_LENS_MARKER_HASH = "sda-lens-cache-version"/);
    assert.match(warmup, /SDA_LENS_MARKER_HASH = "sda-lens-cache-version"/);
  });

  it("purges search_cache rows older than 30 days except the lens marker", () => {
    const source = readFileSync(
      new URL("../server/services/ai-question-retention.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /\.delete\(searchCache\)/);
    assert.match(source, /lt\(searchCache\.createdAt, cutoff\)/);
    assert.match(source, /ne\(searchCache\.queryHash, SEARCH_CACHE_LENS_MARKER_HASH\)/);
  });

  it("starts the daily purge from the server boot path", () => {
    const server = readFileSync(new URL("../server/index.ts", import.meta.url), "utf8");
    assert.match(server, /startAiQuestionRetentionScheduler/);
  });
});
