/**
 * Tiny external store shared between the reader screen and the stack header it does not render.
 *
 * The reader's header title and back button are declared in the route's layout options so they
 * exist from the first native header frame. The screen registers what those buttons should do
 * while it is focused. Nothing about the header's size comes from the screen.
 */

export type ReaderHeaderActions = {
  openChapterPicker: () => void;
  goBack: () => void;
};

const actionStack: ReaderHeaderActions[] = [];

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
