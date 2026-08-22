/**
 * Run with: npx tsx tests/kids-story-scene-illustration-request.test.ts
 *
 * These tests cover the request policy independently from React Native so a
 * state update during loading cannot accidentally cancel or repeat a request.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  createSceneIllustrationRequestController,
  type SceneIllustrationState,
} from "../lib/kids-story-scene-illustration-request";

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

describe("scene illustration request lifecycle", () => {
  it("keeps one request through loading updates and calls the latest callback once", async () => {
    const request = deferred<{ imageUrl: string }>();
    const requests: string[] = [];
    const states: SceneIllustrationState[] = [];
    const initialCallbackUrls: string[] = [];
    const latestCallbackUrls: string[] = [];
    const controller = createSceneIllustrationRequestController({
      baseUrl: "https://kids.example",
      requestImage: (sceneId) => {
        requests.push(sceneId);
        return request.promise;
      },
      onStateChange: (state) => states.push(state),
      onImageLoaded: (url) => initialCallbackUrls.push(url),
    });

    assert.equal(controller.start("scene-a", true), true);
    assert.equal(controller.getState().loading, true);
    assert.equal(requests.length, 1);

    // React may re-render for loading state or receive a newer callback prop.
    // Neither event should create or cancel another request.
    controller.updateOnImageLoaded((url) => latestCallbackUrls.push(url));
    assert.equal(controller.start("scene-a", true), false);
    assert.equal(controller.getState().loading, true);
    assert.equal(requests.length, 1);

    request.resolve({ imageUrl: "/generated/scene-a.png" });
    await settleRequest();

    assert.equal(requests.length, 1);
    assert.deepEqual(initialCallbackUrls, []);
    assert.deepEqual(latestCallbackUrls, ["https://kids.example/generated/scene-a.png"]);
    assert.deepEqual(controller.getState(), {
      imageUrl: "https://kids.example/generated/scene-a.png",
      loading: false,
      failed: false,
    });
    assert.equal(states.length, 2);
  });

  it("ignores an old scene result after the visible scene changes", async () => {
    const firstRequest = deferred<{ imageUrl: string }>();
    const secondRequest = deferred<{ imageUrl: string }>();
    const pending = [firstRequest, secondRequest];
    const callbackUrls: string[] = [];
    const controller = createSceneIllustrationRequestController({
      baseUrl: "https://kids.example",
      requestImage: () => pending.shift()!.promise,
      onStateChange: () => {},
      onImageLoaded: (url) => callbackUrls.push(url),
    });

    controller.start("scene-a", true);
    controller.start("scene-b", true);

    firstRequest.resolve({ imageUrl: "/generated/scene-a.png" });
    await settleRequest();
    assert.deepEqual(callbackUrls, []);
    assert.equal(controller.getState().imageUrl, null);

    secondRequest.resolve({ imageUrl: "/generated/scene-b.png" });
    await settleRequest();
    assert.deepEqual(callbackUrls, ["https://kids.example/generated/scene-b.png"]);
  });

  it("ignores a result after its scene is hidden", async () => {
    const request = deferred<{ imageUrl: string }>();
    let requestCalls = 0;
    const callbackUrls: string[] = [];
    const controller = createSceneIllustrationRequestController({
      baseUrl: "https://kids.example",
      requestImage: () => {
        requestCalls += 1;
        return request.promise;
      },
      onStateChange: () => {},
      onImageLoaded: (url) => callbackUrls.push(url),
    });

    controller.start("scene-a", true);
    controller.start("scene-a", false);

    // This mirrors a FlatList remount while the original fetch continues.
    const remountedCallbackUrls: string[] = [];
    const remountedController = createSceneIllustrationRequestController({
      baseUrl: "https://kids.example",
      requestImage: () => {
        requestCalls += 1;
        return request.promise;
      },
      onStateChange: () => {},
      onImageLoaded: (url) => remountedCallbackUrls.push(url),
    });
    remountedController.start("scene-a", true);
    assert.equal(requestCalls, 1);

    request.resolve({ imageUrl: "/generated/scene-a.png" });
    await settleRequest();

    assert.deepEqual(callbackUrls, []);
    assert.deepEqual(remountedCallbackUrls, ["https://kids.example/generated/scene-a.png"]);
    assert.equal(remountedController.getState().imageUrl, "https://kids.example/generated/scene-a.png");
  });

  it("releases a failed shared request so a remount can retry", async () => {
    const failedRequest = deferred<{ imageUrl: string }>();
    const retryRequest = deferred<{ imageUrl: string }>();
    let requestCalls = 0;
    const requestImage = () => {
      requestCalls += 1;
      return requestCalls === 1 ? failedRequest.promise : retryRequest.promise;
    };
    const firstController = createSceneIllustrationRequestController({
      baseUrl: "https://kids.example",
      requestImage,
      onStateChange: () => {},
    });

    firstController.start("scene-retry", true);
    failedRequest.reject(new Error("temporary failure"));
    await settleRequest();
    assert.equal(firstController.getState().failed, true);

    const callbackUrls: string[] = [];
    const remountedController = createSceneIllustrationRequestController({
      baseUrl: "https://kids.example",
      requestImage,
      onStateChange: () => {},
      onImageLoaded: (url) => callbackUrls.push(url),
    });
    remountedController.start("scene-retry", true);
    assert.equal(requestCalls, 2);

    retryRequest.resolve({ imageUrl: "/generated/retry.png" });
    await settleRequest();
    assert.deepEqual(callbackUrls, ["https://kids.example/generated/retry.png"]);
  });
});