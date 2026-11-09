/**
 * Tiny external store shared between the reader screen and the stack header it does not render.
 *
 * The reader's header title and back button are declared in the route's layout options so they
 * exist from the first native header frame. The screen registers what those buttons should do
 * while it is focused, and publishes the measurements the title uses to cap its width.
 */

export type ReaderHeaderActions = {
  openChapterPicker: () => void;
  goBack: () => void;
};

export type ReaderHeaderWidths = {
  /** Width of the reader column (the header spans the same width). 0 until measured. */
  headerWidth: number;
  /** Measured width of the right-hand chips. 0 until measured. */
  chipsWidth: number;
};

let widths: ReaderHeaderWidths = { headerWidth: 0, chipsWidth: 0 };
const listeners = new Set<() => void>();
const actionStack: ReaderHeaderActions[] = [];

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeReaderHeader(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getReaderHeaderWidths(): ReaderHeaderWidths {
  return widths;
}

export function setReaderHeaderWidths(next: Partial<ReaderHeaderWidths>): void {
  const merged = { ...widths, ...next };
  if (merged.headerWidth === widths.headerWidth && merged.chipsWidth === widths.chipsWidth) return;
  widths = merged;
  emit();
}

/** The focused reader registers its handlers; the most recent registration wins. */
export function registerReaderHeaderActions(actions: ReaderHeaderActions): () => void {
  actionStack.push(actions);
  return () => {
    const index = actionStack.lastIndexOf(actions);
    if (index >= 0) actionStack.splice(index, 1);
  };
}

export function currentReaderHeaderActions(): ReaderHeaderActions | undefined {
  return actionStack[actionStack.length - 1];
}
