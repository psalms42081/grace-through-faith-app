type SabbathTestListener = (mode: "welcome" | "closing") => void;

const listeners: Set<SabbathTestListener> = new Set();

export function onSabbathTestTrigger(listener: SabbathTestListener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function emitSabbathTestTrigger(mode: "welcome" | "closing") {
  listeners.forEach((fn) => fn(mode));
}
