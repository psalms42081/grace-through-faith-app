import { APP_CONTACT_EMAIL } from "../../constants/app";
import type { ResolvedChurchPlace } from "../../lib/church-finder";

export const NOMINATIM_USER_AGENT = `InformedMinistriesApp/1.0 (${APP_CONTACT_EMAIL})`;
export const NOMINATIM_MIN_INTERVAL_MS = 1000;
export const GEOCODE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  suburb?: string;
  state?: string;
  country?: string;
};

type NominatimFeature = {
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
};

function placeFromAddress(address: NominatimAddress | undefined, fallback: string): string {
  const locality =
    address?.city ||
    address?.town ||
    address?.village ||
    address?.hamlet ||
    address?.municipality ||
    address?.suburb;
  if (locality && address?.state) return `${locality}, ${address.state}`;
  if (locality) return locality;
  const first = fallback.split(",")[0]?.trim();
  return first || fallback;
}

export function parseNominatimFeature(feature: NominatimFeature | null | undefined): ResolvedChurchPlace | null {
  if (!feature) return null;
  const lat = parseFloat(feature.lat ?? "");
  const lng = parseFloat(feature.lon ?? "");
  const country = feature.address?.country?.trim() ?? "";
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !country) return null;
  const fallback = feature.display_name || feature.name || country;
  return {
    lat,
    lng,
    country,
    place: placeFromAddress(feature.address, fallback),
  };
}

export function parseNominatimSearch(body: unknown): ResolvedChurchPlace | null {
  if (!Array.isArray(body) || body.length === 0) return null;
  return parseNominatimFeature(body[0] as NominatimFeature);
}

export function parseNominatimReverse(body: unknown): ResolvedChurchPlace | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return parseNominatimFeature(body as NominatimFeature);
}

export function parseZippopotam(body: unknown): ResolvedChurchPlace | null {
  if (!body || typeof body !== "object") return null;
  const record = body as {
    country?: string;
    places?: { "place name"?: string; state?: string; latitude?: string; longitude?: string }[];
  };
  const country = record.country?.trim() ?? "";
  const place = record.places?.[0];
  if (!place || !country) return null;
  const lat = parseFloat(place.latitude ?? "");
  const lng = parseFloat(place.longitude ?? "");
  const name = place["place name"]?.trim() ?? "";
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !name) return null;
  return {
    lat,
    lng,
    country,
    place: place.state ? `${name}, ${place.state}` : name,
  };
}

/** Serialize Nominatim calls so each one starts at least `intervalMs` after the previous. */
export function createRequestGate(intervalMs: number) {
  let nextAt = 0;
  let tail: Promise<void> = Promise.resolve();
  return function gate<T>(
    run: () => Promise<T>,
    now: () => number = Date.now,
    wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  ): Promise<T> {
    const job = tail.then(async () => {
      const delay = Math.max(0, nextAt - now());
      if (delay > 0) await wait(delay);
      nextAt = now() + intervalMs;
      return run();
    });
    tail = job.then(
      () => undefined,
      () => undefined,
    );
    return job;
  };
}

const nominatimGate = createRequestGate(NOMINATIM_MIN_INTERVAL_MS);

async function readJson(url: string): Promise<unknown | null> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": NOMINATIM_USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  return response.json();
}

async function readNominatim(url: string): Promise<unknown | null> {
  return nominatimGate(() => readJson(url));
}

type CachePool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

async function cachePool(): Promise<CachePool | null> {
  try {
    const { pool } = await import("../db");
    return pool;
  } catch (err) {
    console.error("Church geocode cache unavailable:", err);
    return null;
  }
}

/** Cached hits live in Postgres table church_geocode_cache, keyed by the normalized query. */
export async function readGeocodeCache(queryKey: string): Promise<ResolvedChurchPlace | null> {
  const pool = await cachePool();
  if (!pool) return null;
  try {
    const result = await pool.query(
      `SELECT lat, lng, place, country
         FROM church_geocode_cache
        WHERE query_key = $1 AND expires_at > now()`,
      [queryKey],
    );
    const row = result.rows[0];
    if (!row) return null;
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    const place = typeof row.place === "string" ? row.place : "";
    const country = typeof row.country === "string" ? row.country : "";
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !place || !country) return null;
    return { lat, lng, place, country };
  } catch (err) {
    console.error("Church geocode cache read failed:", err);
    return null;
  }
}

export async function writeGeocodeCache(queryKey: string, hit: ResolvedChurchPlace): Promise<void> {
  const pool = await cachePool();
  if (!pool) return;
  const expiresAt = new Date(Date.now() + GEOCODE_CACHE_TTL_MS);
  try {
    await pool.query(
      `INSERT INTO church_geocode_cache (query_key, lat, lng, place, country, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (query_key) DO UPDATE
         SET lat = EXCLUDED.lat,
             lng = EXCLUDED.lng,
             place = EXCLUDED.place,
             country = EXCLUDED.country,
             expires_at = EXCLUDED.expires_at`,
      [queryKey, hit.lat, hit.lng, hit.place, hit.country, expiresAt],
    );
  } catch (err) {
    console.error("Church geocode cache write failed:", err);
  }
}

export function geocodeCacheKey(query: string): string {
  return query.trim().toLowerCase();
}

/** Resolve a ZIP or city to a point. US 5-digit ZIPs use Zippopotam; everything else uses Nominatim. */
export async function geocodeChurchQuery(query: string): Promise<ResolvedChurchPlace | null> {
  const cacheKey = geocodeCacheKey(query);
  if (!cacheKey) return null;
  const cached = await readGeocodeCache(cacheKey);
  if (cached) return cached;

  const zip = query.trim().match(/^(\d{5})(?:-\d{4})?$/);
  let hit: ResolvedChurchPlace | null = null;
  if (zip) {
    const body = await readJson(`https://api.zippopotam.us/us/${zip[1]}`);
    hit = parseZippopotam(body);
  }
  if (!hit) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query.trim());
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "1");
    const body = await readNominatim(url.toString());
    hit = parseNominatimSearch(body);
  }
  if (hit) await writeGeocodeCache(cacheKey, hit);
  return hit;
}

export async function reverseGeocodeChurch(lat: number, lng: number): Promise<ResolvedChurchPlace | null> {
  const cacheKey = geocodeCacheKey(`reverse:${lat.toFixed(2)},${lng.toFixed(2)}`);
  const cached = await readGeocodeCache(cacheKey);
  if (cached) return cached;
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  const body = await readNominatim(url.toString());
  const hit = parseNominatimReverse(body);
  if (hit) await writeGeocodeCache(cacheKey, hit);
  return hit;
}
