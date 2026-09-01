/** Whole-word LORD from API.Bible `nd` spans (and other editions that already use LORD). */
export function splitDivineNameRuns(
  text: string
): { text: string; isDivineName: boolean }[] {
  if (!text) return [];
  return text
    .split(/\b(LORD)\b/)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, isDivineName: part === "LORD" }));
}
