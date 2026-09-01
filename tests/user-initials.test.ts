import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { displayInitials } from "../lib/user-initials";

describe("displayInitials", () => {
  it("uses a single initial when only one name is stored", () => {
    assert.equal(displayInitials("Joe"), "J");
  });

  it("uses first + last initials when a last name exists", () => {
    assert.equal(displayInitials("Joe Hu"), "JH");
    assert.equal(displayInitials("Joe Hunter"), "JH");
  });

  it("trims and collapses whitespace", () => {
    assert.equal(displayInitials("  Joe   Hu  "), "JH");
  });

  it("returns ? for empty names", () => {
    assert.equal(displayInitials(""), "?");
    assert.equal(displayInitials("   "), "?");
  });

  it("never uses the first two letters of one word", () => {
    assert.notEqual(displayInitials("Joe"), "JO");
  });

  it("takes the first letter of a hyphenated last token", () => {
    assert.equal(displayInitials("Mary-Jane Smith"), "MS");
    assert.equal(displayInitials("Jean-Luc Picard"), "JP");
  });

  it("ignores generational suffixes", () => {
    assert.equal(displayInitials("Joe Hu Jr"), "JH");
    assert.equal(displayInitials("Joe Hunter III"), "JH");
  });
});
