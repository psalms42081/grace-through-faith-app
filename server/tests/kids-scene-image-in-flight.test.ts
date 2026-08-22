/**
 * Run with: npx tsx server/tests/kids-scene-image-in-flight.test.ts
 *
 * Proves concurrent requests for one scene share a single generation and that
 * a completed or failed generation does not block a later retry.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { createInFlightRequestCoalescer } from "../services/in-flight-request-coalescer";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function settleRequest() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("kids scene image in-flight coalescer", () => {
  it("shares one generation across concurrent requests for the same scene", async () => {
    const pending = deferred<string>();
    const coalescer = createInFlightRequestCoalescer<string>();
    let generationCalls = 0;
    const generate = () => {
      generationCalls += 1;
      return pending.promise;
    };

    const first = coalescer.run("scene-a", generate);
    const second = coalescer.run("scene-a", generate);

    assert.equal(generationCalls, 1);
    pending.resolve("/generated/scene-a.png");
    assert.equal(await first, "/generated/scene-a.png");
    assert.equal(await second, "/generated/scene-a.png");
  });

  it("releases a settled request so a later attempt can run", async () => {
    const coalescer = createInFlightRequestCoalescer<string>();
    let generationCalls = 0;

    assert.equal(
      await coalescer.run("scene-a", async () => {
        generationCalls += 1;
        return "/generated/first.png";
      }),
      "/generated/first.png",
    );
    await settleRequest();

    assert.equal(
      await coalescer.run("scene-a", async () => {
        generationCalls += 1;
        return "/generated/second.png";
      }),
      "/generated/second.png",
    );
    assert.equal(generationCalls, 2);
  });

  it("releases a failed generation so a later request can retry", async () => {
    const coalescer = createInFlightRequestCoalescer<string>();
    let generationCalls = 0;

    await assert.rejects(
      () =>
        coalescer.run("scene-a", async () => {
          generationCalls += 1;
          throw new Error("generation failed");
        }),
      /generation failed/,
    );
    await settleRequest();

    assert.equal(
      await coalescer.run("scene-a", async () => {
        generationCalls += 1;
        return "/generated/retry.png";
      }),
      "/generated/retry.png",
    );
    assert.equal(generationCalls, 2);
  });
});