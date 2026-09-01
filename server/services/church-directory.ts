import { eq } from "drizzle-orm";
import type { db } from "../db";
import { churchSubmissions, sdaChurches } from "../../shared/schema";

export type ChurchDirectoryQuery = {
  lat?: string;
  lng?: string;
  city?: string;
};

/** Directory list only runs with a city/suburb search or coordinates. No fake nearby dump. */
export function churchDirectoryQueryReady(query: ChurchDirectoryQuery): boolean {
  const searchTerm = typeof query.city === "string" ? query.city.trim() : "";
  const hasTextSearch = searchTerm.length > 0;
  const hasCoords = Boolean(query.lat && query.lng);
  return hasTextSearch || hasCoords;
}

/** Finder and public church APIs show only verified=true rows. Unverified stay hidden. */
export function verifiedDirectoryWhere() {
  return eq(sdaChurches.verified, true);
}

export function isNavigableDirectoryChurch(church: { verified?: boolean | null }): boolean {
  return church.verified === true;
}

export type ChurchSubmissionInput = {
  name: string;
  city: string;
  country: string;
  address?: string | null;
  userId?: string | null;
};

/** Persist a user report. Never writes to sda_church. */
export function churchSubmissionValues(input: ChurchSubmissionInput) {
  const name = input.name.trim();
  const city = input.city.trim();
  const country = input.country.trim();
  const address = typeof input.address === "string" ? input.address.trim() : "";
  return {
    name,
    city,
    country,
    address: address.length > 0 ? address : null,
    userId: input.userId ?? null,
    status: "pending" as const,
  };
}

export async function recordChurchSubmission(
  database: Pick<typeof db, "insert">,
  input: ChurchSubmissionInput,
) {
  const values = churchSubmissionValues(input);
  if (!values.name || !values.city || !values.country) {
    throw new Error("name, city, and country are required");
  }
  const [row] = await database.insert(churchSubmissions).values(values).returning();
  return row;
}
