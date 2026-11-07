export type SessionHighlight = {
  id: string;
  verseId: string;
  color: string;
  startWord: number | null;
  endWord: number | null;
  bookId: number | null;
  chapter: number | null;
  verse: number | null;
  verseText: string | null;
  bookName: string | null;
  createdAt: string;
};

type Listener = () => void;

let highlights: SessionHighlight[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function getSessionHighlights(): SessionHighlight[] {
  return highlights;
}

export function subscribeSessionHighlights(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addSessionHighlight(
  input: Omit<SessionHighlight, "id" | "createdAt"> & { id?: string },
): SessionHighlight {
  const row: SessionHighlight = {
    ...input,
    id: input.id ?? `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  highlights = [row, ...highlights.filter((item) => item.id !== row.id)];
  emit();
  return row;
}

export function removeSessionHighlight(id: string): void {
  const next = highlights.filter((item) => item.id !== id);
  if (next.length === highlights.length) return;
  highlights = next;
  emit();
}
