import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  churchDirectoryQueryReady,
  churchSubmissionValues,
  isNavigableDirectoryChurch,
  verifiedDirectoryWhere,
} from "../services/church-directory";
import { isVerifiedStreetAddress } from "../../scripts/insert-sda-churches";
import { liveKitCspConnectSrc } from "../livekit-csp";
import { getOpenAIApiKey, getOpenAIBaseURL, openaiClientOptions } from "../openai-env";
import { churchMapEmbedUrl, joinApiPath } from "../../lib/join-api-path";

const repoRoot = path.resolve(process.cwd());

describe("church directory query gating", () => {
  it("does not query without coordinates or a city/suburb search", () => {
    assert.equal(churchDirectoryQueryReady({}), false);
    assert.equal(churchDirectoryQueryReady({ city: "   " }), false);
    assert.equal(churchDirectoryQueryReady({ lat: "-37.8" }), false);
  });

  it("is ready for city search or lat/lng", () => {
    assert.equal(churchDirectoryQueryReady({ city: "Melbourne" }), true);
    assert.equal(churchDirectoryQueryReady({ lat: "-37.8", lng: "144.9" }), true);
  });
});

describe("verified directory visibility", () => {
  it("treats only verified=true as navigable", () => {
    assert.equal(isNavigableDirectoryChurch({ verified: true }), true);
    assert.equal(isNavigableDirectoryChurch({ verified: false }), false);
    assert.equal(isNavigableDirectoryChurch({}), false);
  });

  it("builds a verified=true where clause for list and detail APIs", () => {
    const clause = verifiedDirectoryWhere();
    assert.ok(clause);
    const community = readFileSync(path.join(repoRoot, "server/routes/community.ts"), "utf8");
    assert.match(community, /verifiedDirectoryWhere\(\)/);
    assert.match(community, /router\.get\("\/api\/churches"/);
    assert.match(community, /router\.get\("\/api\/churches\/:id"/);
    assert.equal((community.match(/verifiedDirectoryWhere\(\)/g) ?? []).length >= 4, true);
  });
});

describe("street-address verified heuristic", () => {
  it("is true when address contains a digit and is not the city", () => {
    assert.equal(isVerifiedStreetAddress("12501 Old Columbia Pike", "Silver Spring"), true);
    assert.equal(isVerifiedStreetAddress("ul. Pirogova 26", "Lipetsk"), true);
    assert.equal(isVerifiedStreetAddress("123 Main", "Sydney"), true);
  });

  it("is true when address contains a street word without a number", () => {
    assert.equal(isVerifiedStreetAddress("High Street", "Bendigo"), true);
    assert.equal(isVerifiedStreetAddress("Graham St", "Wonthaggi"), true);
    assert.equal(isVerifiedStreetAddress("Flora Street, Cnr Church St", "Flemington"), true);
  });

  it("is false when address equals city, even if it contains a digit or street word", () => {
    assert.equal(isVerifiedStreetAddress("Melbourne", "Melbourne"), false);
    assert.equal(isVerifiedStreetAddress("  berlin  ", "Berlin"), false);
    assert.equal(isVerifiedStreetAddress("123 City", "123 City"), false);
    assert.equal(isVerifiedStreetAddress("High Street", "High Street"), false);
  });

  it("is false for Contact Conference Office placeholders", () => {
    assert.equal(isVerifiedStreetAddress("Contact Conference Office", "Darwin"), false);
    assert.equal(isVerifiedStreetAddress("contact conference office", "Perth"), false);
  });

  it("is false when address has neither a street word nor a digit", () => {
    assert.equal(isVerifiedStreetAddress("Fischerstrasse", "Hannover"), false);
  });
});

describe("church_submissions do not insert into sda_church", () => {
  it("only shapes a pending church_submissions row", () => {
    const values = churchSubmissionValues({
      name: "  Hope SDA  ",
      city: "  Perth ",
      country: "Australia",
      address: "  ",
      userId: null,
    });
    assert.deepEqual(values, {
      name: "Hope SDA",
      city: "Perth",
      country: "Australia",
      address: null,
      userId: null,
      status: "pending",
    });
    assert.equal("source" in values, false);
    assert.equal("verified" in values, false);
  });

  it("recordChurchSubmission writes churchSubmissions only", () => {
    const source = readFileSync(path.join(repoRoot, "server/services/church-directory.ts"), "utf8");
    assert.match(source, /insert\(churchSubmissions\)/);
    assert.doesNotMatch(source, /insert\(sdaChurches\)/);
    const community = readFileSync(path.join(repoRoot, "server/routes/community.ts"), "utf8");
    assert.match(community, /\/api\/churches\/submissions/);
    assert.match(community, /recordChurchSubmission/);
    assert.doesNotMatch(
      community.slice(community.indexOf("/api/churches/submissions")),
      /insert\(sdaChurches\)/,
    );
  });
});

describe("sda_church rebuild migration 0008", () => {
  const migrationsDir = path.join(repoRoot, "migrations");
  const files0008 = readdirSync(migrationsDir).filter((name) => name.startsWith("0008_"));

  it("has exactly one 0008 file that rebuilds the directory", () => {
    assert.deepEqual(files0008, ["0008_rebuild_sda_church.sql"]);
    assert.equal(existsSync(path.join(migrationsDir, "0008_dedupe_sda_church.sql")), false);
  });

  it("truncates, adds source and verified, unique index, and aborts on claims", () => {
    const sql = readFileSync(path.join(migrationsDir, "0008_rebuild_sda_church.sql"), "utf8");
    assert.match(sql, /TRUNCATE TABLE "public"\."sda_church"/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS "source" varchar NOT NULL DEFAULT 'unknown'/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS "verified" boolean NOT NULL DEFAULT false/);
    assert.match(sql, /sda_church_name_address_city_country_uniq/);
    assert.match(sql, /sda_church_id IS NOT NULL/);
    assert.match(sql, /RAISE EXCEPTION/);
    assert.match(sql, /church_submissions/);
    assert.match(sql, /sda_church_pre_truncate_count/);
    assert.match(sql, /sda_church_post_truncate_count/);
  });
});

describe("synthetic full-global seed is gone", () => {
  it("does not keep seed-full-global-churches or directory-counts", () => {
    assert.equal(existsSync(path.join(repoRoot, "scripts/seed-full-global-churches.ts")), false);
    assert.equal(existsSync(path.join(repoRoot, "scripts/directory-counts.json")), false);
  });
});

describe("church finder tell-us empty state", () => {
  it("offers a submission form and does not invent churches", () => {
    const finder = readFileSync(path.join(repoRoot, "app/church-connect.tsx"), "utf8");
    assert.match(finder, /Can't find your church\? Tell us/);
    assert.match(finder, /\/api\/churches\/submissions/);
    assert.match(finder, /we don't invent results/);
    assert.match(finder, /church-connect-tell-name/);
    assert.match(finder, /church-connect-tell-city/);
    assert.match(finder, /church-connect-tell-country/);
  });
});

describe("church map embed URL join", () => {
  it("does not produce //api when API base has a trailing slash", () => {
    const trailing = "https://example.com/";
    const joined = joinApiPath(trailing, "/api/map-embed");
    assert.equal(joined, "https://example.com/api/map-embed");
    assert.equal(joined.includes("//api"), false);

    const embed = churchMapEmbedUrl(trailing, new URLSearchParams({ zoom: "4" }));
    assert.equal(embed.includes("//api"), false);
    assert.match(embed, /^https:\/\/example\.com\/api\/map-embed\?/);

    const noSlash = joinApiPath("https://example.com", "/api/map-embed");
    assert.equal(noSlash, "https://example.com/api/map-embed");
    assert.equal(joinApiPath("http://192.168.1.8:5000/", "/api/map-embed"), "http://192.168.1.8:5000/api/map-embed");
    assert.equal(
      joinApiPath("https://gracethroughfaith.app/", "/api/map-embed"),
      "https://gracethroughfaith.app/api/map-embed",
    );
  });

  it("ChurchMap uses the join helper, not string concat of base + /api", () => {
    const native = readFileSync(path.join(repoRoot, "components/ChurchMap.tsx"), "utf8");
    const web = readFileSync(path.join(repoRoot, "components/ChurchMap.web.tsx"), "utf8");
    const builder = readFileSync(path.join(repoRoot, "lib/church-map-url.ts"), "utf8");
    const qc = readFileSync(path.join(repoRoot, "lib/query-client.ts"), "utf8");
    assert.match(qc, /return `https:\/\/\$\{host\}\/`/);
    assert.match(qc, /Platform\.OS === "web"/);
    assert.match(qc, /window\.location\?\.origin/);
    assert.match(builder, /churchMapEmbedUrl\(getApiUrl\(\)/);
    assert.doesNotMatch(native, /\$\{base\}\/api\/map-embed/);
    assert.doesNotMatch(web, /\$\{base\}\/api\/map-embed/);
    assert.match(native, /buildChurchMapEmbedUrl/);
    assert.match(web, /buildChurchMapEmbedUrl/);
  });
});

describe("church map-embed route is honest OSM", () => {
  it("serves Leaflet OSM tiles with no Google Maps key", () => {
    const routes = readFileSync(path.join(repoRoot, "server/routes.ts"), "utf8");
    assert.match(routes, /app\.get\("\/api\/map-embed"/);
    assert.match(routes, /tile\.openstreetmap\.org/);
    assert.match(routes, /unpkg\.com\/leaflet@1\.9\.4/);
    assert.doesNotMatch(routes, /maps\.googleapis|GOOGLE_MAPS|AIza/);
  });

  it("finder toggle and detail header both keep ChurchMap", () => {
    const finder = readFileSync(path.join(repoRoot, "app/church-connect.tsx"), "utf8");
    const detail = readFileSync(path.join(repoRoot, "app/church/[id].tsx"), "utf8");
    assert.match(finder, /church-connect-map-toggle/);
    assert.match(finder, /<ChurchMap/);
    assert.match(detail, /<ChurchMap/);
    assert.match(detail, /s\.mapSection/);
  });
});

describe("church connect Path B restyle", () => {
  it("uses Path B ink/coral/muted tokens and drops gold", () => {
    const finder = readFileSync(path.join(repoRoot, "app/church-connect.tsx"), "utf8");
    const detail = readFileSync(path.join(repoRoot, "app/church/[id].tsx"), "utf8");
    for (const source of [finder, detail]) {
      assert.match(source, /PathB/);
      assert.match(source, /PathB\.coral/);
      assert.match(source, /PathB\.ink/);
      assert.match(source, /HV2\.inkMutedText/);
      assert.doesNotMatch(source, /#C9933A/);
      assert.doesNotMatch(source, /theme\.accent/);
    }
  });
});

describe("startup path never seeds churches", () => {
  it("does not import or call seedGlobalChurches", () => {
    const routes = readFileSync(path.join(repoRoot, "server/routes.ts"), "utf8");
    assert.doesNotMatch(routes, /seedGlobalChurches/);
    assert.doesNotMatch(routes, /seed-global-churches/);
    assert.doesNotMatch(routes, /seed-worldwide-churches/);
    assert.doesNotMatch(routes, /reseed-sda-churches/);
  });
});

describe("LiveKit CSP hosts", () => {
  it("omits extra hosts when the URL is empty", () => {
    assert.deepEqual(liveKitCspConnectSrc(""), []);
  });

  it("derives wss and https hosts from LIVEKIT_URL", () => {
    assert.deepEqual(
      liveKitCspConnectSrc("wss://example.livekit.cloud"),
      ["wss://example.livekit.cloud", "https://example.livekit.cloud"],
    );
  });

  it("returns empty for unparseable URLs so CSP stays valid", () => {
    assert.deepEqual(liveKitCspConnectSrc("not a url"), []);
  });
});

describe("OpenAI env mapping", () => {
  const keys = [
    "OPENAI_API_KEY",
    "OPENAI_BASE_URL",
    "AI_INTEGRATIONS_OPENAI_API_KEY",
    "AI_INTEGRATIONS_OPENAI_BASE_URL",
  ] as const;
  const snapshot = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of keys) {
      const value = snapshot[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function clearAll() {
    for (const key of keys) delete process.env[key];
  }

  it("prefers OPENAI_* over legacy AI_INTEGRATIONS_OPENAI_* names", () => {
    clearAll();
    process.env.OPENAI_API_KEY = "new-key";
    process.env.OPENAI_BASE_URL = "https://api.example/v1";
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY = "legacy-key";
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL = "https://legacy.example/v1";
    assert.equal(getOpenAIApiKey(), "new-key");
    assert.equal(getOpenAIBaseURL(), "https://api.example/v1");
  });

  it("falls back to legacy names so production does not go dark", () => {
    clearAll();
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY = "legacy-key";
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL = "https://legacy.example/v1";
    assert.equal(getOpenAIApiKey(), "legacy-key");
    assert.equal(getOpenAIBaseURL(), "https://legacy.example/v1");
    assert.deepEqual(openaiClientOptions(), {
      apiKey: "legacy-key",
      baseURL: "https://legacy.example/v1",
    });
  });
});
