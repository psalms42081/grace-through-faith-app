type VerseMapQueryClient = {
  invalidateQueries: (filters: { queryKey: [string] }) => unknown;
};

/**
 * Allows one automatic generation request per active verse-map key. A new
 * verse-map key resets the gate; failures intentionally do not.
 */
export class VerseMapGenerationGate {
  private activeKey: string | null = null;
  private attempted = false;

  resetFor(verseMapKey: string | null) {
    if (this.activeKey !== verseMapKey) {
      this.activeKey = verseMapKey;
      this.attempted = false;
    }
  }

  tryStart(verseMapKey: string | null) {
    if (!verseMapKey || this.activeKey !== verseMapKey || this.attempted) {
      return false;
    }

    this.attempted = true;
    return true;
  }
}

export function refreshVerseMapAfterGeneration(
  queryClient: VerseMapQueryClient,
  verseMapKey: string | null,
) {
  if (verseMapKey) {
    queryClient.invalidateQueries({ queryKey: [verseMapKey] });
  }
}