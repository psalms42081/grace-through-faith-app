import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  churchCoverageLine,
  churchRadiusToKm,
  churchesNearResolvedPlace,
  defaultChurchDistanceUnit,
  formatChurchDistance,
  formatCountryList,
  matchingChurchRadius,
} from "../lib/church-finder";
import {
  GEOCODE_CACHE_TTL_MS,
  NOMINATIM_MIN_INTERVAL_MS,
  NOMINATIM_USER_AGENT,
  createRequestGate,
  parseNominatimSearch,
  parseZippopotam,
} from "../server/services/church-geocode";
import { APP_CONTACT_EMAIL } from "../constants/app";

const repoRoot = path.resolve(process.cwd());

describe("church coverage line", () => {
  it("states the verified count and country count from the caller", () => {
    assert.equal(formatCountryList(["New Zealand", "Australia"]), "Australia and New Zealand");
    assert.equal(churchCoverageLine(381, 69), "Lists 381 verified churches in 69 countries");
  });
});

describe("church distance units", () => {
  it("uses miles for en-US or a US place, kilometres otherwise, and the toggle wins", () => {
    assert.equal(defaultChurchDistanceUnit({ locale: "en-US", resolvedCountry: null, override: null }), "mi");
    assert.equal(defaultChurchDistanceUnit({ locale: "en-AU", resolvedCountry: "United States", override: null }), "mi");
    assert.equal(defaultChurchDistanceUnit({ locale: "en-AU", resolvedCountry: "Australia", override: null }), "km");
    assert.equal(defaultChurchDistanceUnit({ locale: "en-US", resolvedCountry: "United States", override: "km" }), "km");
    assert.equal(formatChurchDistance(15.24, "mi"), "9 mi");
    assert.equal(formatChurchDistance(15.24, "km"), "15 km");
    assert.equal(Math.round(churchRadiusToKm(25, "mi") * 10) / 10, 40.2);
    assert.equal(churchRadiusToKm(50, "km"), 50);
    assert.equal(matchingChurchRadius(50, "km"), 50);
    assert.equal(matchingChurchRadius(50, "mi"), 25);
  });
});

describe("churches near a resolved place", () => {
  const covered = ["Australia", "United States"];
  const beverly = { lat: 34.0901, lng: -118.4065, country: "United States", place: "Beverly Hills, California" };

  it("measures from the resolved place and drops churches in another country", () => {
    const result = churchesNearResolvedPlace({
      resolved: beverly,
      coveredCountries: covered,
      radiusKm: 50,
      churches: [
        { id: "sydney", country: "Australia", lat: "-33.8688", lng: "151.2093" },
        { id: "glendale", country: "United States", lat: "34.1425", lng: "-118.2551" },
      ],
    });
    assert.equal(result.outsideCoverage, false);
    assert.deepEqual(result.churches.map((church) => church.id), ["glendale"]);
    assert.ok(result.churches[0].distance > 10 && result.churches[0].distance < 20);
    assert.equal(result.origin?.lat, beverly.lat);
  });

  it("returns no churches when the place is outside covered countries, even if one is next door", () => {
    const result = churchesNearResolvedPlace({
      resolved: { lat: 43.7384, lng: 7.4246, country: "Monaco", place: "Monaco" },
      coveredCountries: covered,
      radiusKm: 500,
      churches: [{ id: "nice", country: "France", lat: "43.7102", lng: "7.2620" }],
    });
    assert.equal(result.outsideCoverage, true);
    assert.equal(result.churches.length, 0);
    assert.equal(result.resolvedPlace, "Monaco");
  });
});

describe("geocoder payloads", () => {
  it("reads a US ZIP and a Nominatim city", () => {
    const zip = parseZippopotam({
      country: "United States",
      places: [{ "place name": "Beverly Hills", state: "California", latitude: "34.0901", longitude: "-118.4065" }],
    });
    assert.equal(zip?.place, "Beverly Hills, California");
    assert.equal(zip?.country, "United States");

    const city = parseNominatimSearch([
      {
        lat: "32.7762719",
        lon: "-96.7968559",
        display_name: "Dallas, Dallas County, Texas, United States",
        address: { city: "Dallas", state: "Texas", country: "United States" },
      },
    ]);
    assert.equal(city?.place, "Dallas, Texas");
    assert.equal(city?.country, "United States");
  });
});

describe("nominatim client", () => {
  it("identifies the app with the contact email and spaces requests one second apart", async () => {
    assert.equal(NOMINATIM_USER_AGENT, `InformedMinistriesApp/1.0 (${APP_CONTACT_EMAIL})`);
    assert.equal(GEOCODE_CACHE_TTL_MS, 30 * 24 * 60 * 60 * 1000);
    assert.equal(NOMINATIM_MIN_INTERVAL_MS, 1000);

    const gate = createRequestGate(1000);
    let now = 0;
    const stamps: number[] = [];
    await Promise.all([
      gate(async () => { stamps.push(now); }, () => now, async (ms) => { now += ms; }),
      gate(async () => { stamps.push(now); }, () => now, async (ms) => { now += ms; }),
    ]);
    assert.deepEqual(stamps, [0, 1000]);

    const source = readFileSync(path.join(repoRoot, "server/services/church-geocode.ts"), "utf8");
    assert.match(source, /church_geocode_cache/);
    assert.match(source, /NOMINATIM_USER_AGENT/);
    assert.match(source, /readNominatim/);
  });
});

describe("church finder screen", () => {
  it("shows a data-driven coverage line, a remembered unit toggle, and the outside-coverage empty state", () => {
    const finder = readFileSync(path.join(repoRoot, "app/church-connect.tsx"), "utf8");
    assert.match(finder, /churchCoverageLine/);
    assert.match(finder, /church-connect-coverage/);
    assert.match(finder, /church-connect-see-countries/);
    assert.match(finder, /See countries/);
    assert.match(finder, /@grace-through-faith\/church-distance-unit/);
    assert.match(finder, /church-connect-unit-toggle/);
    assert.match(finder, /churchRadiusToKm/);
    assert.match(finder, />\s*Miles\s*</);
    assert.doesNotMatch(finder, /Math\.round\(r \/ 1\.609344\)/);
    assert.match(finder, /No listed churches near \$\{resolvedPlace\} yet/);
    assert.match(finder, /params\.set\("place"/);
    assert.doesNotMatch(finder, /ip-api|ipapi|geoip/i);
  });
});
