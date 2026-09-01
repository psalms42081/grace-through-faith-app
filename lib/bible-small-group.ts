/** Private Bible small groups — invite codes, curriculum, SS week keys. */

export const BIBLE_GROUP_CURRICULA = ["adult", "inverse"] as const;
export type BibleGroupCurriculum = (typeof BIBLE_GROUP_CURRICULA)[number];

/** Unambiguous alphabet: no 0/O/1/I. */
export const BIBLE_GROUP_INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const BIBLE_GROUP_INVITE_CODE_LENGTH = 6;

export function generateBibleGroupInviteCode(
  random: () => number = Math.random,
): string {
  let code = "";
  for (let i = 0; i < BIBLE_GROUP_INVITE_CODE_LENGTH; i++) {
    const index = Math.floor(random() * BIBLE_GROUP_INVITE_ALPHABET.length);
    code += BIBLE_GROUP_INVITE_ALPHABET[index];
  }
  return code;
}

export function normalizeBibleGroupInviteCode(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isUnambiguousInviteCode(code: string): boolean {
  if (code.length !== BIBLE_GROUP_INVITE_CODE_LENGTH) return false;
  return [...code].every((ch) => BIBLE_GROUP_INVITE_ALPHABET.includes(ch));
}

export function parseGroupCurriculum(value: unknown): BibleGroupCurriculum {
  return value === "inverse" ? "inverse" : "adult";
}

/** Stable week id for the group's track — not lesson HTML. */
export function buildSsWeekKey(
  curriculum: string,
  quarterCode: string,
  lessonNumber: number,
): string {
  return `${curriculum}:${quarterCode}:${lessonNumber}`;
}

export type SabbathSchoolWeekPointer = {
  ssWeekKey: string;
  curriculum: BibleGroupCurriculum;
  quarterCode: string;
  lessonNumber: number;
  lessonTitle: string;
  startDate: string | null;
  endDate: string | null;
};

export const ADULT_CONFIRM_REQUIRED = "ADULT_CONFIRM_REQUIRED";
