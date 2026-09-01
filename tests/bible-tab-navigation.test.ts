import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  goBibleBooksBack,
  goBibleReaderBack,
  stackCanGoBackFromState,
} from "../lib/bible-tab-navigation";

function fakeRouter() {
  const calls: string[] = [];
  return {
    calls,
    back: () => calls.push("back"),
    replace: (target: string) => calls.push(`replace:${target}`),
    navigate: (target: string) => calls.push(`navigate:${target}`),
  };
}

describe("stackCanGoBackFromState", () => {
  it("is true only when a stack has a screen above index 0", () => {
    assert.equal(stackCanGoBackFromState({ type: "stack", index: 0 }), false);
    assert.equal(stackCanGoBackFromState({ type: "stack", index: 1 }), true);
    assert.equal(stackCanGoBackFromState({ type: "tab", index: 1 }), false);
    assert.equal(stackCanGoBackFromState(undefined), false);
  });
});

describe("goBibleReaderBack", () => {
  it("pops when the nested stack can pop so VOTD deep links still unwind", () => {
    const router = fakeRouter();
    goBibleReaderBack(router as any, true, true);
    assert.deepEqual(router.calls, ["back"]);
  });

  it("replaces to Books when the tab reader is the stack root", () => {
    const router = fakeRouter();
    goBibleReaderBack(router as any, false, true);
    assert.deepEqual(router.calls, ["replace:/(tabs)/read"]);
  });

  it("does not dispatch GO_BACK from Books at stack root", () => {
    const router = fakeRouter();
    goBibleBooksBack(router as any, false);
    assert.deepEqual(router.calls, []);
  });
});
