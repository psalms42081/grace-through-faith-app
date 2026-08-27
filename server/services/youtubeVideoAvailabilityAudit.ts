import type { BibleProjectVideo } from "../data/bibleProjectVideos";

const YOUTUBE_VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
const YOUTUBE_BATCH_SIZE = 50;
const TRANSIENT_HTTP_STATUSES = new Set([403, 408, 429, 500, 502, 503, 504]);

export interface CuratedYoutubeVideoReference {
  surface: string;
  topicId?: string;
  cardId: string;
  title: string;
  youtubeId: string;
  url: string;
  sourceFile: string;
}

export interface UnavailableCuratedYoutubeVideo
  extends CuratedYoutubeVideoReference {
  reason: string;
}

export interface YoutubeVideoAvailabilityAuditResult {
  checkedAssignments: number;
  checkedUniqueVideos: number;
  unavailable: UnavailableCuratedYoutubeVideo[];
}

export interface YoutubeVideoAvailabilityAuditOptions {
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  maxRequestAttempts?: number;
  requestTimeoutMs?: number;
  confirmationDelayMs?: number;
}

interface YoutubeVideoStatus {
  privacyStatus?: string;
  uploadStatus?: string;
  embeddable?: boolean;
}

interface YoutubeVideoListItem {
  id?: string;
  status?: YoutubeVideoStatus;
}

interface YoutubeVideoListResponse {
  items?: YoutubeVideoListItem[];
}

interface AvailabilityState {
  available: boolean;
  reason?: string;
}

export class YoutubeVideoAvailabilityAuditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YoutubeVideoAvailabilityAuditError";
  }
}

export function collectCuratedYoutubeVideoReferences(
  catalog: Record<string, BibleProjectVideo[]>,
): CuratedYoutubeVideoReference[] {
  return Object.entries(catalog).flatMap(([topicId, videos]) =>
    videos.map((video) => ({
      surface: "Pastoral topic videos",
      topicId,
      cardId: video.id,
      title: video.title,
      youtubeId: video.youtubeId,
      url: `https://www.youtube.com/watch?v=${video.youtubeId}`,
      sourceFile: "server/data/bibleProjectVideos.ts",
    })),
  );
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryDelay(attempt: number): number {
  return 500 * 2 ** (attempt - 1);
}

function unavailableReason(item: YoutubeVideoListItem | undefined): string | undefined {
  if (!item) {
    return "YouTube no longer returns this video; it may be removed, private, or otherwise unavailable.";
  }

  const privacyStatus = item.status?.privacyStatus;
  if (privacyStatus && privacyStatus !== "public" && privacyStatus !== "unlisted") {
    return `YouTube reports the video as ${privacyStatus}.`;
  }

  const uploadStatus = item.status?.uploadStatus;
  if (uploadStatus && uploadStatus !== "processed") {
    return `YouTube reports the upload status as ${uploadStatus}.`;
  }

  if (item.status?.embeddable === false) {
    return "YouTube reports that this video cannot be embedded in the app.";
  }

  if (!item.status) {
    throw new YoutubeVideoAvailabilityAuditError(
      "YouTube returned an incomplete availability response. Retry the audit before releasing.",
    );
  }

  return undefined;
}

async function requestAvailabilityBatch(
  youtubeIds: string[],
  apiKey: string,
  options: Required<
    Pick<
      YoutubeVideoAvailabilityAuditOptions,
      "fetchImpl" | "sleep" | "maxRequestAttempts" | "requestTimeoutMs"
    >
  >,
): Promise<Map<string, AvailabilityState>> {
  let lastTransientStatus: number | undefined;

  for (let attempt = 1; attempt <= options.maxRequestAttempts; attempt += 1) {
    const requestUrl = new URL(YOUTUBE_VIDEOS_ENDPOINT);
    requestUrl.searchParams.set("part", "status");
    requestUrl.searchParams.set("id", youtubeIds.join(","));
    requestUrl.searchParams.set("key", apiKey);

    let response: Response;
    try {
      response = await options.fetchImpl(requestUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(options.requestTimeoutMs),
      });
    } catch {
      if (attempt < options.maxRequestAttempts) {
        await options.sleep(retryDelay(attempt));
        continue;
      }
      throw new YoutubeVideoAvailabilityAuditError(
        `YouTube availability could not be reached after ${options.maxRequestAttempts} attempts. Retry the audit before releasing.`,
      );
    }

    if (!response.ok) {
      if (
        TRANSIENT_HTTP_STATUSES.has(response.status) &&
        attempt < options.maxRequestAttempts
      ) {
        lastTransientStatus = response.status;
        await options.sleep(retryDelay(attempt));
        continue;
      }

      if (TRANSIENT_HTTP_STATUSES.has(response.status)) {
        throw new YoutubeVideoAvailabilityAuditError(
          `YouTube availability remained temporarily unavailable after ${options.maxRequestAttempts} attempts (HTTP ${response.status}). Retry the audit before releasing.`,
        );
      }

      throw new YoutubeVideoAvailabilityAuditError(
        `YouTube rejected the availability audit (HTTP ${response.status}). Verify YOUTUBE_API_KEY and YouTube Data API access.`,
      );
    }

    let payload: YoutubeVideoListResponse;
    try {
      payload = (await response.json()) as YoutubeVideoListResponse;
    } catch {
      throw new YoutubeVideoAvailabilityAuditError(
        "YouTube returned an unreadable availability response. Retry the audit before releasing.",
      );
    }

    if (!Array.isArray(payload.items)) {
      throw new YoutubeVideoAvailabilityAuditError(
        "YouTube returned an incomplete availability response. Retry the audit before releasing.",
      );
    }

    const returnedById = new Map(
      payload.items
        .filter((item): item is YoutubeVideoListItem & { id: string } => Boolean(item.id))
        .map((item) => [item.id, item]),
    );

    return new Map(
      youtubeIds.map((youtubeId) => {
        const reason = unavailableReason(returnedById.get(youtubeId));
        return [youtubeId, reason ? { available: false, reason } : { available: true }];
      }),
    );
  }

  throw new YoutubeVideoAvailabilityAuditError(
    `YouTube availability remained temporarily unavailable${
      lastTransientStatus ? ` (HTTP ${lastTransientStatus})` : ""
    }. Retry the audit before releasing.`,
  );
}

async function requestAvailability(
  youtubeIds: string[],
  apiKey: string,
  options: Required<
    Pick<
      YoutubeVideoAvailabilityAuditOptions,
      "fetchImpl" | "sleep" | "maxRequestAttempts" | "requestTimeoutMs"
    >
  >,
): Promise<Map<string, AvailabilityState>> {
  const results = new Map<string, AvailabilityState>();

  for (const batch of chunk(youtubeIds, YOUTUBE_BATCH_SIZE)) {
    const batchResults = await requestAvailabilityBatch(batch, apiKey, options);
    for (const [youtubeId, state] of batchResults) {
      results.set(youtubeId, state);
    }
  }

  return results;
}

export async function auditCuratedYoutubeVideoAvailability(
  source:
    | Record<string, BibleProjectVideo[]>
    | CuratedYoutubeVideoReference[],
  apiKey: string,
  options: YoutubeVideoAvailabilityAuditOptions = {},
): Promise<YoutubeVideoAvailabilityAuditResult> {
  if (!apiKey.trim()) {
    throw new YoutubeVideoAvailabilityAuditError(
      "YOUTUBE_API_KEY is required for the curated video release audit.",
    );
  }

  const references = Array.isArray(source)
    ? source
    : collectCuratedYoutubeVideoReferences(source);
  const youtubeIds = [...new Set(references.map((reference) => reference.youtubeId))];
  if (youtubeIds.length === 0) {
    return {
      checkedAssignments: 0,
      checkedUniqueVideos: 0,
      unavailable: [],
    };
  }

  const requestOptions = {
    fetchImpl: options.fetchImpl ?? fetch,
    sleep: options.sleep ?? defaultSleep,
    maxRequestAttempts: options.maxRequestAttempts ?? 4,
    requestTimeoutMs: options.requestTimeoutMs ?? 15_000,
  };

  const firstCheck = await requestAvailability(youtubeIds, apiKey, requestOptions);
  const candidates = youtubeIds.filter(
    (youtubeId) => firstCheck.get(youtubeId)?.available === false,
  );

  if (candidates.length === 0) {
    return {
      checkedAssignments: references.length,
      checkedUniqueVideos: youtubeIds.length,
      unavailable: [],
    };
  }

  await requestOptions.sleep(options.confirmationDelayMs ?? 1_500);
  const confirmation = await requestAvailability(candidates, apiKey, requestOptions);
  const unavailableById = new Map(
    candidates
      .map((youtubeId) => [youtubeId, confirmation.get(youtubeId)] as const)
      .filter((entry): entry is readonly [string, AvailabilityState] =>
        entry[1]?.available === false,
      ),
  );

  const unavailable = references
    .filter((reference) => unavailableById.has(reference.youtubeId))
    .map((reference) => ({
      ...reference,
      reason:
        unavailableById.get(reference.youtubeId)?.reason ??
        "YouTube reports this video as unavailable.",
    }))
    .sort(
      (left, right) =>
        left.surface.localeCompare(right.surface) ||
        (left.topicId ?? "").localeCompare(right.topicId ?? "") ||
        left.title.localeCompare(right.title) ||
        left.cardId.localeCompare(right.cardId),
    );

  return {
    checkedAssignments: references.length,
    checkedUniqueVideos: youtubeIds.length,
    unavailable,
  };
}

export function formatUnavailableCuratedVideoReport(
  result: YoutubeVideoAvailabilityAuditResult,
): string {
  if (result.unavailable.length === 0) {
    return [
      "Curated video availability audit passed.",
      `Checked ${result.checkedUniqueVideos} unique YouTube video(s) across ${result.checkedAssignments} topic card assignment(s).`,
    ].join(" ");
  }

  const affectedLocations = new Set(
    result.unavailable.map((failure) =>
      failure.topicId
        ? `${failure.surface}:${failure.topicId}`
        : failure.surface,
    ),
  ).size;
  const lines = [
    `CURATED VIDEO RELEASE BLOCKED: ${result.unavailable.length} unavailable card assignment(s) across ${affectedLocations} location(s).`,
    `Checked ${result.checkedUniqueVideos} unique YouTube video(s) across ${result.checkedAssignments} curated card assignment(s).`,
    "",
  ];

  for (const failure of result.unavailable) {
    const location = failure.topicId
      ? `Topic "${failure.topicId}" on ${failure.surface}`
      : `Surface "${failure.surface}"`;
    lines.push(
      `- ${location} — card "${failure.title}" (${failure.cardId})`,
      `  YouTube ID: ${failure.youtubeId}`,
      `  URL: ${failure.url}`,
      `  Reason: ${failure.reason}`,
      `  Edit: ${failure.sourceFile}`,
    );
  }

  lines.push(
    "",
    "Remove or replace every listed card in its named source file, then rerun npm run audit:touchpoint-videos before release.",
  );

  return lines.join("\n");
}