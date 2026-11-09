/**
 * Web fades a background on each word. Native must not: a JS-driven
 * backgroundColor on every span freezes Isaiah 40 and Psalm 119, and the
 * grey boxes never clear. Native plays one overlay instead.
 */
export function wordStudyPulsesEachWord(os: string): boolean {
  return os === "web";
}
