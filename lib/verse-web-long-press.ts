/** Web-only verse long-press. RN-web Text does not fire onLongPress. */

export const VERSE_LONG_PRESS_MS = 400;
export const VERSE_LONG_PRESS_MOVE_PX = 8;

export type VersePointerEvent = {
  nativeEvent?: { pageX?: number; pageY?: number; clientX?: number; clientY?: number };
  pageX?: number;
  pageY?: number;
  clientX?: number;
  clientY?: number;
  preventDefault?: () => void;
};

export type VerseWebLongPressTimers = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

export type VerseWebLongPressController = {
  start: (verseId: string, x: number, y: number) => void;
  move: (x: number, y: number) => void;
  /** Clears an in-flight timer (pointer up, cancel, scroll, move past threshold). */
  cancel: () => void;
  /** True once after a fired long-press so the following click does not also select. */
  consumeSuppressedClick: () => boolean;
};

function defaultAttachScrollListener(onScroll: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onScroll();
  window.addEventListener("scroll", handler, true);
  document.addEventListener("scroll", handler, true);
  return () => {
    window.removeEventListener("scroll", handler, true);
    document.removeEventListener("scroll", handler, true);
  };
}

export function pointerCoords(event: VersePointerEvent): { x: number; y: number } {
  const native = event.nativeEvent;
  return {
    x: native?.pageX ?? native?.clientX ?? event.pageX ?? event.clientX ?? 0,
    y: native?.pageY ?? native?.clientY ?? event.pageY ?? event.clientY ?? 0,
  };
}

export function createVerseWebLongPress(options: {
  onLongPress: (verseId: string) => void;
  delayMs?: number;
  moveThresholdPx?: number;
  timers?: VerseWebLongPressTimers;
  attachScrollListener?: (onScroll: () => void) => () => void;
}): VerseWebLongPressController {
  const delayMs = options.delayMs ?? VERSE_LONG_PRESS_MS;
  const moveThresholdPx = options.moveThresholdPx ?? VERSE_LONG_PRESS_MOVE_PX;
  const setTimer = options.timers?.setTimeout ?? setTimeout;
  const clearTimer = options.timers?.clearTimeout ?? clearTimeout;
  const attachScroll = options.attachScrollListener ?? defaultAttachScrollListener;

  let verseId: string | null = null;
  let timer: unknown = null;
  let startX = 0;
  let startY = 0;
  let suppressClick = false;
  let detachScroll: (() => void) | null = null;

  function detachScrollListener() {
    detachScroll?.();
    detachScroll = null;
  }

  function clearInFlight() {
    if (timer != null) {
      clearTimer(timer as ReturnType<typeof setTimeout>);
      timer = null;
    }
    verseId = null;
    detachScrollListener();
  }

  function cancel() {
    clearInFlight();
  }

  function start(id: string, x: number, y: number) {
    clearInFlight();
    verseId = id;
    startX = x;
    startY = y;
    detachScroll = attachScroll(cancel);
    timer = setTimer(() => {
      const firedId = verseId;
      timer = null;
      verseId = null;
      detachScrollListener();
      if (!firedId) return;
      suppressClick = true;
      options.onLongPress(firedId);
    }, delayMs);
  }

  function move(x: number, y: number) {
    if (timer == null) return;
    const dx = x - startX;
    const dy = y - startY;
    if (dx * dx + dy * dy > moveThresholdPx * moveThresholdPx) {
      cancel();
    }
  }

  function consumeSuppressedClick() {
    if (!suppressClick) return false;
    suppressClick = false;
    return true;
  }

  return { start, move, cancel, consumeSuppressedClick };
}

export function bindVerseWebLongPress(
  controller: VerseWebLongPressController,
  verseId: string,
) {
  return {
    onPointerDown: (event: VersePointerEvent) => {
      const { x, y } = pointerCoords(event);
      controller.start(verseId, x, y);
    },
    onPointerMove: (event: VersePointerEvent) => {
      const { x, y } = pointerCoords(event);
      controller.move(x, y);
    },
    onPointerUp: () => {
      controller.cancel();
    },
    onPointerCancel: () => {
      controller.cancel();
    },
    onContextMenu: (event: { preventDefault?: () => void }) => {
      event.preventDefault?.();
    },
  };
}
