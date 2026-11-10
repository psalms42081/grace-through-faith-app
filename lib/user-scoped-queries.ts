import type { Query, QueryClient } from "@tanstack/react-query";

/**
 * Queries whose result depends on who is signed in. Scripture and other
 * public catalogs are not in this list.
 */
const USER_SCOPED_MARKERS = [
  "userId=",
  "sabbath-school-current",
  "/api/me/",
  "/api/bible-groups",
  "/api/organizations/my-org",
  "/api/leader-requests",
  "/api/groups",
  "/api/prayers",
  "/api/notes",
  "/api/bookmarks",
  "/api/highlights",
  "/api/reading-streaks",
  "/api/reading-history",
  "/api/spiritual-rings",
  "/api/devotionals",
  "/api/user-plans",
  "/api/plans/",
  "/api/user/preferences",
  "/api/push/",
  "/api/study-journal",
  "/api/study-guide",
  "/api/sabbath-school",
  "/api/tracks/progress",
  "/api/tracks/",
  "/api/lessons/",
];

export function isUserScopedQuery(query: Pick<Query, "queryKey">): boolean {
  const text = query.queryKey
    .map((part) => (typeof part === "string" ? part : JSON.stringify(part ?? "")))
    .join("\n");
  return USER_SCOPED_MARKERS.some((marker) => text.includes(marker));
}

/**
 * Drop cached account data and let mounted screens fetch it again.
 * Call only after the auth token getter already matches the new session,
 * so a guest response cannot be stored under the signed-in key.
 */
export async function refreshUserScopedQueries(client: QueryClient): Promise<void> {
  await client.cancelQueries({ predicate: isUserScopedQuery });
  client.removeQueries({ predicate: isUserScopedQuery });
  await client.refetchQueries({ predicate: isUserScopedQuery, type: "active" });
}
