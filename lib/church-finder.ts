/** Pure church-finder rules. Coverage countries come from the caller (the database), never a fixed list. */

const KM_PER_MILE = 1.609344;

const COUNTRY_ALIASES: Record<string, string> = {
  "united states of america": "united states",
  usa: "united states",
  us: "united states",
  "u s": "united states",
  "u s a": "united states",
  uk: "united kingdom",
  "u k": "united kingdom",
  "great britain": "united kingdom",
  britain: "united kingdom",
  czechia: "czech republic",
};

export type ChurchDistanceUnit = "mi" | "km";

export type ResolvedChurchPlace = {
  lat: number;
  lng: number;
  place: string;
  country: string;
};

export type ChurchPoint = {
  country: string;
  lat: string;
  lng: string;
};

export function countryKey(name: string): string {
  const stripped = name.trim().toLowerCase().replace(/\./g, " ").replace(/\s+/g, " ").trim();
  return COUNTRY_ALIASES[stripped] ?? stripped;
}

export function isCoveredCountry(country: string, coveredCountries: string[]): boolean {
  const key = countryKey(country);
  if (!key) return false;
  return coveredCountries.some((covered) => countryKey(covered) === key);
}

export function formatCountryList(countries: string[]): string {
  const names = [...new Set(countries.map((country) => country.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function churchCoverageLine(verifiedCount: number, countryCount: number): string {
  return `Lists ${verifiedCount} verified churches in ${countryCount} countries`;
}

export function defaultChurchDistanceUnit(input: {
  locale: string | null;
  resolvedCountry: string | null;
  override: ChurchDistanceUnit | null;
}): ChurchDistanceUnit {
  if (input.override === "mi" || input.override === "km") return input.override;
  const locale = (input.locale ?? "").trim().toLowerCase().replace(/_/g, "-");
  if (locale === "en-us" || locale.startsWith("en-us-")) return "mi";
  if (input.resolvedCountry && countryKey(input.resolvedCountry) === "united states") return "mi";
  return "km";
}

export function formatChurchDistance(km: number, unit: ChurchDistanceUnit): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (unit === "km") {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${Math.round(km)} km`;
  }
  const miles = km / KM_PER_MILE;
  if (miles < 0.1) return `${Math.round(km * 3280.84)} ft`;
  return `${Math.round(miles)} mi`;
}

export const CHURCH_RADIUS_KM = [25, 50, 100, 500] as const;
export const CHURCH_RADIUS_MI = [25, 50, 100, 300] as const;

export function churchRadiusOptions(unit: ChurchDistanceUnit): readonly number[] {
  return unit === "mi" ? CHURCH_RADIUS_MI : CHURCH_RADIUS_KM;
}

export function churchRadiusToKm(value: number, unit: ChurchDistanceUnit): number {
  return unit === "mi" ? value * KM_PER_MILE : value;
}

export function matchingChurchRadius(radiusKm: number, unit: ChurchDistanceUnit): number {
  const options = churchRadiusOptions(unit);
  return options.reduce((best, option) => {
    const bestGap = Math.abs(churchRadiusToKm(best, unit) - radiusKm);
    const gap = Math.abs(churchRadiusToKm(option, unit) - radiusKm);
    return gap < bestGap ? option : best;
  });
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function churchesNearResolvedPlace<T extends ChurchPoint>(input: {
  churches: T[];
  resolved: ResolvedChurchPlace | null;
  coveredCountries: string[];
  radiusKm: number;
}): {
  churches: (T & { distance: number })[];
  outsideCoverage: boolean;
  resolvedPlace: string | null;
  resolvedCountry: string | null;
  origin: { lat: number; lng: number } | null;
} {
  const resolved = input.resolved;
  if (!resolved) {
    return {
      churches: [],
      outsideCoverage: false,
      resolvedPlace: null,
      resolvedCountry: null,
      origin: null,
    };
  }

  if (!isCoveredCountry(resolved.country, input.coveredCountries)) {
    return {
      churches: [],
      outsideCoverage: true,
      resolvedPlace: resolved.place,
      resolvedCountry: resolved.country,
      origin: { lat: resolved.lat, lng: resolved.lng },
    };
  }

  const wanted = countryKey(resolved.country);
  const churches = input.churches
    .filter((church) => countryKey(church.country) === wanted)
    .map((church) => ({
      ...church,
      distance: haversineKm(resolved.lat, resolved.lng, parseFloat(church.lat), parseFloat(church.lng)),
    }))
    .filter((church) => Number.isFinite(church.distance) && church.distance <= input.radiusKm)
    .sort((a, b) => a.distance - b.distance);

  return {
    churches,
    outsideCoverage: false,
    resolvedPlace: resolved.place,
    resolvedCountry: resolved.country,
    origin: { lat: resolved.lat, lng: resolved.lng },
  };
}
