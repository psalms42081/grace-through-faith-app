import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("sign-in refreshes user-scoped queries", () => {
  it("refetches after the session changes and does not clear the whole cache", () => {
    const auth = read("../contexts/AuthContext.tsx");
    const refresh = read("../lib/user-scoped-queries.ts");
    assert.match(auth, /refreshUserScopedQueries\(queryClient\)/);
    assert.match(auth, /await migrateGuestData\(data\.token\)/);
    assert.doesNotMatch(auth, /queryClient\.clear\(\)/);
    const login = auth.slice(auth.indexOf("const login = useCallback"), auth.indexOf("const register = useCallback"));
    assert.ok(login.indexOf("await migrateGuestData") < login.indexOf("setUser(data.user)"));
    assert.match(refresh, /cancelQueries/);
    assert.match(refresh, /removeQueries/);
    assert.match(refresh, /refetchQueries/);
    for (const marker of [
      "/api/reading-streaks",
      "/api/me/",
      "/api/bible-groups",
      "/api/bookmarks",
      "/api/highlights",
      "/api/notes",
      "/api/prayers",
      "/api/devotionals",
    ]) {
      assert.match(refresh, new RegExp(marker.replace(/\//g, "\\/")));
    }
  });

  it("shows a retry when Profile church or groups fail", () => {
    const profile = read("../app/(tabs)/profile.tsx");
    const groups = read("../components/bible-groups/ProfileGroupsSection.tsx");
    assert.match(profile, /profile-church-retry/);
    assert.match(profile, /Couldn't load your church\./);
    assert.match(profile, /refetchMyChurch/);
    assert.match(groups, /profile-groups-retry/);
    assert.match(groups, /Couldn't load your groups\./);
    assert.match(groups, /void refetch\(\)/);
  });
});
