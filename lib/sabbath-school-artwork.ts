const ART_BASE = "https://sabbath-school.adventech.io/api/v2";

function lessonCode(lessonNumber: number): string | null {
  if (!Number.isInteger(lessonNumber) || lessonNumber < 1) return null;
  return String(lessonNumber).padStart(2, "0");
}

function quarterId(quarterCode: string | null | undefined): string | null {
  const id = quarterCode?.trim();
  if (!id || !/^\d{4}-0[1-4](?:-[a-z0-9]+)?$/i.test(id)) return null;
  return id;
}

/** Quarterly cover. The stored sync URL wins; otherwise the public cover.png. */
export function sabbathSchoolCoverUrl(
  quarterCode: string | null | undefined,
  storedUrl?: string | null,
): string | null {
  const stored = storedUrl?.trim();
  if (stored && /^https:\/\//i.test(stored)) return stored;
  const id = quarterId(quarterCode);
  if (!id) return null;
  return `${ART_BASE}/en/quarterlies/${id}/cover.png`;
}

/** Wide quarterly splash. Adult and InVerse both publish this under images/global. */
export function sabbathSchoolSplashUrl(quarterCode: string | null | undefined): string | null {
  const id = quarterId(quarterCode);
  if (!id) return null;
  return `${ART_BASE}/images/global/${id}/splash.png`;
}

/**
 * Lesson cover. Adult art is in images/global; InVerse (`-cq`) art is the
 * lesson cover.png Adventech publishes beside that lesson.
 */
export function sabbathSchoolLessonCoverUrl(
  quarterCode: string | null | undefined,
  lessonNumber: number,
): string | null {
  const id = quarterId(quarterCode);
  const code = lessonCode(lessonNumber);
  if (!id || !code) return null;
  if (id.endsWith("-cq")) {
    return `${ART_BASE}/en/quarterlies/${id}/lessons/${code}/cover.png`;
  }
  return `${ART_BASE}/images/global/${id}/${code}/cover.png`;
}
