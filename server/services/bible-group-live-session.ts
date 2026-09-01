export const LIVE_HEARTBEAT_STALE_MS = 5 * 60 * 1000;

export type LiveSessionHeartbeatRow = {
  endedAt: Date | string | null;
  lastHeartbeatAt: Date | string | null;
  startedAt: Date | string;
};

function asTime(value: Date | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const t = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(t) ? t : null;
}

export function isOpenLiveSession(
  row: LiveSessionHeartbeatRow | null | undefined,
): row is LiveSessionHeartbeatRow {
  return row != null && row.endedAt == null;
}

/** Prefer last heartbeat; if it is NULL (host just started), fall back to started_at. */
export function liveHeartbeatMs(row: LiveSessionHeartbeatRow, now = Date.now()): number {
  return asTime(row.lastHeartbeatAt) ?? asTime(row.startedAt) ?? now;
}

export function isLiveSessionStale(row: LiveSessionHeartbeatRow, now = Date.now()): boolean {
  return now - liveHeartbeatMs(row, now) > LIVE_HEARTBEAT_STALE_MS;
}

/**
 * Policy for GET /api/bible-groups/:id/live:
 * - no row / ended row → null (do not treat a wrapper as live)
 * - open row with NULL heartbeat and recent started_at → keep
 * - open row whose heartbeat (or started_at fallback) is older than 5 minutes → stale (caller auto-ends)
 */
export function activeLiveSessionOrNull<T extends LiveSessionHeartbeatRow>(
  row: T | null | undefined,
  now = Date.now(),
): T | null {
  if (!isOpenLiveSession(row)) return null;
  if (isLiveSessionStale(row, now)) return null;
  return row;
}
