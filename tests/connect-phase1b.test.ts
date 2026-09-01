import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { ENABLE_ORG_TOOLS, ENABLE_PREMIUM } from "../lib/feature-flags";
import {
  ADULT_CONFIRM_REQUIRED,
  BIBLE_GROUP_INVITE_ALPHABET,
  BIBLE_GROUP_INVITE_CODE_LENGTH,
  buildSsWeekKey,
  generateBibleGroupInviteCode,
  isUnambiguousInviteCode,
  normalizeBibleGroupInviteCode,
  parseGroupCurriculum,
} from "../lib/bible-small-group";

const repoRoot = path.resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

describe("bible small group invite codes", () => {
  it("uses a short unambiguous alphabet (no 0/O/1/I)", () => {
    assert.equal(BIBLE_GROUP_INVITE_CODE_LENGTH, 6);
    assert.doesNotMatch(BIBLE_GROUP_INVITE_ALPHABET, /[01OI]/);
    for (let i = 0; i < 200; i++) {
      const code = generateBibleGroupInviteCode();
      assert.equal(isUnambiguousInviteCode(code), true);
      assert.doesNotMatch(code, /[01OI]/);
    }
  });

  it("normalizes pasted codes to uppercase letters and digits", () => {
    assert.equal(normalizeBibleGroupInviteCode(" ab-c12 "), "ABC12");
    assert.equal(parseGroupCurriculum("inverse"), "inverse");
    assert.equal(parseGroupCurriculum("cornerstone"), "adult");
    assert.equal(parseGroupCurriculum(null), "adult");
  });
});

describe("ss week key", () => {
  it("identifies a week by track + quarter + lesson, not lesson HTML", () => {
    assert.equal(buildSsWeekKey("adult", "2026-Q3", 10), "adult:2026-Q3:10");
    const routes = read("server/routes/bible-groups.ts");
    assert.match(routes, /ssWeekKey/);
    assert.match(routes, /currentWeek\.ssWeekKey/);
    assert.doesNotMatch(routes, /contentMarkdown/);
    assert.doesNotMatch(routes, /content_html/);
    assert.match(routes, /resolveCurrentWeekPointer/);
  });
});

describe("migration 0009 bible small groups", () => {
  it("is the numbered 0009 file and does not drop prayer_groups", () => {
    const migrationsDir = path.join(repoRoot, "migrations");
    const files0009 = readdirSync(migrationsDir).filter((f) => f.startsWith("0009_"));
    assert.deepEqual(files0009, ["0009_bible_small_groups.sql"]);
    assert.equal(existsSync(path.join(migrationsDir, "0009_bible_small_groups.sql")), true);
    const sql = read("migrations/0009_bible_small_groups.sql");
    assert.match(sql, /adult_confirmed_at" timestamptz/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS "public"\."bible_small_group"/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS "public"\."bible_small_group_member"/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS "public"\."bible_small_group_post"/);
    assert.match(sql, /bible_small_group_member_group_user_uniq/);
    assert.match(sql, /UNIQUE \("group_id", "user_id"\)/);
    assert.match(sql, /ss_week_key/);
    assert.match(sql, /sda_church/);
    assert.doesNotMatch(sql, /DROP TABLE .*prayer_groups/);
    assert.doesNotMatch(sql, /prayer_groups/);
  });
});

describe("adult gate", () => {
  it("requires adult_confirmed_at on create and join, with a confirm endpoint", () => {
    const routes = read("server/routes/bible-groups.ts");
    assert.match(routes, /\/api\/me\/adult-confirm/);
    assert.match(routes, /adultConfirmedAt/);
    assert.match(routes, /ADULT_CONFIRM_REQUIRED/);
    assert.equal(ADULT_CONFIRM_REQUIRED, "ADULT_CONFIRM_REQUIRED");
    const createIdx = routes.indexOf('"/api/bible-groups"');
    const joinIdx = routes.indexOf("/api/bible-groups/join");
    assert.ok(createIdx >= 0, "create route must exist");
    assert.ok(joinIdx > createIdx, "join route must follow create");
    assert.match(routes, /requireAdult/);
    assert.equal((routes.match(/requireAdult/g) ?? []).length >= 2, true);
  });
});

describe("private groups only", () => {
  it("lists mine only, joins by invite code, and has no public browse/search", () => {
    const routes = read("server/routes/bible-groups.ts");
    assert.match(routes, /eq\(bibleSmallGroupMembers\.userId, userId\)/);
    assert.match(routes, /\/api\/bible-groups\/join/);
    assert.match(routes, /inviteCode/);
    assert.doesNotMatch(routes, /\/api\/bible-groups\/search/);
    assert.doesNotMatch(routes, /\/api\/bible-groups\/discover/);
    assert.doesNotMatch(routes, /isPublic/);
    assert.match(routes, /requireAuth/);
    const community = read("server/routes/community.ts");
    assert.doesNotMatch(community, /\/api\/bible-groups/);
  });
});

describe("kids mode hides groups", () => {
  it("gates Profile and Home on isKidsMode and never renders groups in Kids Home", () => {
    const profile = read("app/(tabs)/profile.tsx");
    const home = read("app/(tabs)/home-v2.tsx");
    const kidsHome = read("app/(tabs)/index.tsx");
    const kidsSs = read("app/kids/sabbath-school.tsx");
    assert.match(profile, /isKidsMode/);
    assert.match(profile, /!isKidsMode && <ProfileGroupsSection/);
    assert.match(home, /isKidsMode/);
    assert.match(home, /enabled: isAuthenticated && !isKidsMode/);
    assert.match(home, /!isKidsMode && myGroups\.length > 0/);
    assert.doesNotMatch(kidsHome, /bible-group/);
    assert.doesNotMatch(kidsHome, /\/api\/bible-groups/);
    assert.doesNotMatch(kidsSs, /bible-group/);
    assert.doesNotMatch(kidsSs, /\/api\/bible-groups/);
  });
});

describe("Profile and Home surfaces", () => {
  it("replaces Small groups coming soon with My Groups create/join", () => {
    const profile = read("app/(tabs)/profile.tsx");
    assert.doesNotMatch(profile, /Small groups coming soon/);
    assert.doesNotMatch(profile, /profile-groups-placeholder/);
    assert.match(profile, /ProfileGroupsSection/);
    const section = read("components/bible-groups/ProfileGroupsSection.tsx");
    assert.match(section, /profile-create-group/);
    assert.match(section, /profile-join-group/);
    assert.match(section, /I am 18 or over/);
    assert.match(section, /\/\(auth\)\/login/);
  });

  it("omits the Home card unless the user belongs to a group", () => {
    const home = read("app/(tabs)/home-v2.tsx");
    const card = read("components/home-v2/HomeBibleGroupCard.tsx");
    assert.match(home, /myGroups\.length > 0/);
    assert.match(home, /HomeBibleGroupCard/);
    assert.match(card, /home-bible-group-card/);
    assert.match(card, /if \(groups\.length === 0\) return null/);
    assert.doesNotMatch(card, /#C9933A/);
  });
});

describe("group home reuses SS day reader", () => {
  it("opens the existing tab-contained sabbath-school-day route", () => {
    const screen = read("app/bible-group/[id].tsx");
    assert.match(screen, /buildSabbathSchoolTabRoute\("sabbath-school-day"/);
    assert.match(screen, /bible-group-lesson-card/);
    assert.match(screen, /ssWeekKey/);
    assert.doesNotMatch(screen, /contentMarkdown/);
    assert.doesNotMatch(screen, /#C9933A/);
    assert.match(screen, /bible-group-regen-code/);
    assert.match(screen, /Remove member/);
    assert.match(screen, /\/\(tabs\)\/profile/);
    assert.match(screen, /GroupHeader/);
    assert.match(screen, /Go live/);
    assert.match(screen, /Live now · Join/);
    assert.match(screen, /Share with the group/);
  });
});

describe("SS current-week resolver reuse", () => {
  it("uses loadCurrentSabbathSchoolLesson / getCurrentLessonNumber, not a copy of lesson HTML", () => {
    const current = read("server/services/sabbath-school-current.ts");
    const ssRoutes = read("server/routes/sabbath-school.ts");
    assert.match(current, /getCurrentLessonNumber/);
    assert.match(current, /buildSsWeekKey/);
    assert.match(ssRoutes, /loadCurrentSabbathSchoolLesson/);
    assert.match(ssRoutes, /\/api\/sabbath-school\/current/);
    assert.doesNotMatch(current, /contentMarkdown/);
  });
});

describe("locked constraints stay in place", () => {
  it("does not bump flags, tabs, persist buster, or delete prayer_groups", () => {
    assert.equal(ENABLE_ORG_TOOLS, false);
    assert.equal(ENABLE_PREMIUM, false);
    const tabs = read("app/(tabs)/_layout.tsx");
    assert.match(tabs, /name="connect"/);
    assert.match(tabs, /href: null/);
    const schema = read("shared/schema.ts");
    assert.match(schema, /export const prayerGroups = pgTable/);
    assert.match(schema, /export const bibleSmallGroups = pgTable/);
    assert.match(schema, /adultConfirmedAt/);
    const persist = read("lib/query-client.ts");
    assert.match(persist, /QUERY_PERSIST_BUSTER = "structure-v5"/);
    const pkg = read("package.json");
    assert.doesNotMatch(pkg, /bible-group/);
  });
});
