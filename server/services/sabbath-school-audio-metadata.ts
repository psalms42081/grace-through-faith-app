type JsonObject = Record<string, unknown>;

const ADVENTECH_API_BASE_URL = "https://sabbath-school.adventech.io/api/v2/";
const AUDIO_URL_KEYS = ["src", "mp3", "audio", "audioUrl", "url", "href", "file", "path"];

export type SabbathSchoolAudioMetadata = {
  lessonNumber: number;
  dayNumber: number;
  audioUrl: string;
};

function asObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonObject;
}

function collectObjects(value: unknown, out: JsonObject[] = []): JsonObject[] {
  const object = asObject(value);
  if (object) {
    out.push(object);
    for (const child of Object.values(object)) {
      collectObjects(child, out);
    }
    return out;
  }

  if (Array.isArray(value)) {
    for (const child of value) collectObjects(child, out);
  }

  return out;
}

function pickString(object: JsonObject, keys: string[]): string | null {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function pickPositiveInteger(object: JsonObject, keys: string[]): number | null {
  for (const key of keys) {
    const value = object[key];
    const parsed =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number.parseInt(value, 10)
          : Number.NaN;
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseTarget(
  object: JsonObject,
  quarterCode: string,
  language: string
): { lessonNumber: number; dayNumber: number } | null {
  const directLesson = pickPositiveInteger(object, [
    "lesson",
    "lessonNumber",
    "lesson_number",
    "week",
    "weekNumber",
  ]);
  const directDay = pickPositiveInteger(object, ["day", "dayNumber", "day_number"]);
  if (directLesson !== null && directDay !== null) {
    return { lessonNumber: directLesson, dayNumber: directDay };
  }

  const languagePattern = escapeRegExp(language);
  const quarterPattern = escapeRegExp(quarterCode);
  const targetPattern = new RegExp(
    `^${languagePattern}\\/${quarterPattern}\\/(\\d{1,2})\\/(\\d{1,2})$`,
    "i"
  );
  const targetIndexPattern = new RegExp(
    `^${languagePattern}-${quarterPattern}-(\\d{1,2})-(\\d{1,2})$`,
    "i"
  );

  for (const key of ["target", "targetIndex", "reference", "id"]) {
    const probe = typeof object[key] === "string" ? object[key].trim() : "";
    const match = probe.match(targetPattern) || probe.match(targetIndexPattern);
    if (!match) continue;
    return {
      lessonNumber: Number.parseInt(match[1], 10),
      dayNumber: Number.parseInt(match[2], 10),
    };
  }

  return null;
}

function sourcePriority(object: JsonObject): number {
  const artist = pickString(object, ["artist", "author", "source"]) || "";
  if (/adult bible study guides?/i.test(artist)) return 100;
  if (/ellen\s+g\.?\s*white|teacher|inside story/i.test(artist)) return -10;
  return 0;
}

export function normalizeSabbathSchoolAudioUrl(
  value: unknown,
  baseUrl?: string
): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = baseUrl
      ? new URL(value.trim(), baseUrl)
      : new URL(value.trim());
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    if (!parsed.pathname.toLowerCase().endsWith(".mp3")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function extractSabbathSchoolAudioMetadata(
  payload: unknown,
  quarterCode: string,
  language: string = "en"
): SabbathSchoolAudioMetadata[] {
  const selected = new Map<
    string,
    SabbathSchoolAudioMetadata & { priority: number }
  >();

  for (const object of collectObjects(payload)) {
    const target = parseTarget(object, quarterCode, language);
    if (!target) continue;

    const rawUrl = pickString(object, AUDIO_URL_KEYS);
    const audioUrl = normalizeSabbathSchoolAudioUrl(
      rawUrl,
      ADVENTECH_API_BASE_URL
    );
    if (!audioUrl) continue;

    const key = `${target.lessonNumber}:${target.dayNumber}`;
    const candidate = {
      ...target,
      audioUrl,
      priority: sourcePriority(object),
    };
    const current = selected.get(key);
    if (!current || candidate.priority > current.priority) {
      selected.set(key, candidate);
    }
  }

  return [...selected.values()]
    .sort(
      (left, right) =>
        left.lessonNumber - right.lessonNumber || left.dayNumber - right.dayNumber
    )
    .map(({ priority: _priority, ...metadata }) => metadata);
}