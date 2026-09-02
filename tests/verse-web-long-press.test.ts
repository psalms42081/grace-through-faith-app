import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VERSE_LONG_PRESS_MOVE_PX,
  VERSE_LONG_PRESS_MS,
  bindVerseWebLongPress,
  createVerseWebLongPress,
  pointerCoords,
} from "../lib/verse-web-long-press";

describe("createVerseWebLongPress", () => {
  function makeController(onLongPress: (id: string) => void) {
    let pending: (() => void) | null = null;
    let scrollFns: Array<() => void> = [];
    const controller = createVerseWebLongPress({
      onLongPress,
      timers: {
        setTimeout: (fn) => {
          pending = fn;
          return 1;
        },
        clearTimeout: () => {
          pending = null;
        },
      },
      attachScrollListener: (onScroll) => {
        scrollFns.push(onScroll);
        return () => {
          scrollFns = scrollFns.filter((fn) => fn !== onScroll);
        };
      },
    });
    return {
      controller,
      fireTimer: () => {
        const fn = pending;
        pending = null;
        fn?.();
      },
      hasTimer: () => pending != null,
      scroll: () => {
        for (const fn of [...scrollFns]) fn();
      },
    };
  }

  it("starts a 400ms timer and fires long-press for the stored verse id", () => {
    const calls: string[] = [];
    const { controller, fireTimer, hasTimer } = makeController((id) => calls.push(id));
    controller.start("gen-1-3", 10, 12);
    assert.equal(hasTimer(), true);
    fireTimer();
    assert.deepEqual(calls, ["gen-1-3"]);
    assert.equal(VERSE_LONG_PRESS_MS, 400);
    assert.equal(controller.consumeSuppressedClick(), true);
    assert.equal(controller.consumeSuppressedClick(), false);
  });

  it("cancels when the pointer moves more than 8px", () => {
    const calls: string[] = [];
    const { controller, fireTimer, hasTimer } = makeController((id) => calls.push(id));
    controller.start("v-2", 0, 0);
    controller.move(VERSE_LONG_PRESS_MOVE_PX + 1, 0);
    assert.equal(hasTimer(), false);
    fireTimer();
    assert.deepEqual(calls, []);
    assert.equal(controller.consumeSuppressedClick(), false);
  });

  it("cancels on pointer up before the timer and does not suppress the following click", () => {
    const calls: string[] = [];
    const { controller, fireTimer, hasTimer } = makeController((id) => calls.push(id));
    controller.start("v-3", 4, 4);
    controller.cancel();
    assert.equal(hasTimer(), false);
    fireTimer();
    assert.deepEqual(calls, []);
    assert.equal(controller.consumeSuppressedClick(), false);
  });

  it("cancels on scroll", () => {
    const calls: string[] = [];
    const { controller, fireTimer, hasTimer, scroll } = makeController((id) => calls.push(id));
    controller.start("v-4", 1, 1);
    scroll();
    assert.equal(hasTimer(), false);
    fireTimer();
    assert.deepEqual(calls, []);
  });
});

describe("bindVerseWebLongPress", () => {
  it("wires onPointerDown to start and move past 8px to cancel", () => {
    const calls: string[] = [];
    let pending: (() => void) | null = null;
    const controller = createVerseWebLongPress({
      onLongPress: (id) => calls.push(id),
      timers: {
        setTimeout: (fn) => {
          pending = fn;
          return 1;
        },
        clearTimeout: () => {
          pending = null;
        },
      },
      attachScrollListener: () => () => {},
    });
    const handlers = bindVerseWebLongPress(controller, "john-3-16");
    handlers.onPointerDown({ pageX: 2, pageY: 3 });
    assert.equal(pending != null, true);
    handlers.onPointerMove({ pageX: 2 + VERSE_LONG_PRESS_MOVE_PX + 1, pageY: 3 });
    assert.equal(pending, null);
    handlers.onPointerDown({ clientX: 0, clientY: 0 });
    pending?.();
    assert.deepEqual(calls, ["john-3-16"]);
    const prevented: string[] = [];
    handlers.onContextMenu({ preventDefault: () => prevented.push("ok") });
    assert.deepEqual(prevented, ["ok"]);
  });
});

describe("pointerCoords", () => {
  it("prefers nativeEvent page coordinates", () => {
    assert.deepEqual(
      pointerCoords({ nativeEvent: { pageX: 8, pageY: 9 }, clientX: 1, clientY: 2 }),
      { x: 8, y: 9 },
    );
  });
});
