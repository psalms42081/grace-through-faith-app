/**
 * Expand STEP TAHOT (OpenScriptures) and TAGNT (Robinson) morphology codes
 * to a single muted English line for the word sheet.
 */

const HEBREW_POS: Record<string, string> = {
  A: "adjective",
  C: "conjunction",
  D: "adverb",
  N: "noun",
  P: "pronoun",
  R: "preposition",
  S: "suffix",
  T: "particle",
  V: "verb",
};

const HEBREW_STEM: Record<string, string> = {
  q: "qal",
  N: "niphal",
  p: "piel",
  P: "pual",
  h: "hiphil",
  H: "hophal",
  t: "hithpael",
  o: "polel",
  O: "polal",
  r: "hithpolel",
  m: "poel",
  M: "poal",
  k: "palel",
  K: "pulal",
  Q: "qal passive",
  l: "pilpel",
  L: "polpal",
  f: "hithpalpel",
  D: "nithpael",
  j: "pealal",
  i: "pilel",
  u: "hothpaal",
  c: "tiphil",
  v: "hishtaphel",
  w: "nithpalel",
  y: "nithpoel",
  z: "hithpoel",
};

const ARAMAIC_STEM: Record<string, string> = {
  q: "peal",
  Q: "peil",
  u: "hithpeel",
  p: "pael",
  P: "ithpaal",
  M: "hithpaal",
  a: "aphel",
  h: "haphel",
  s: "saphel",
  e: "shaphel",
  H: "hophal",
  i: "ithpeel",
  t: "hishtaphel",
  v: "ishtaphel",
  w: "hithaphel",
  o: "polel",
  z: "ithpoel",
  r: "hithpolel",
  f: "hithpalpel",
  b: "hephal",
  c: "tiphel",
  m: "poel",
  l: "palpel",
  L: "ithpalpel",
  O: "ithpolel",
  G: "ittaphal",
};

const HEBREW_VERB_TYPE: Record<string, string> = {
  p: "perfect",
  q: "sequential perfect",
  i: "imperfect",
  w: "sequential imperfect",
  h: "cohortative",
  j: "jussive",
  v: "imperative",
  r: "participle",
  s: "passive participle",
  a: "infinitive absolute",
  c: "infinitive construct",
};

const HEBREW_NOUN_TYPE: Record<string, string> = {
  c: "common",
  g: "gentilic",
  p: "proper",
};

const HEBREW_ADJ_TYPE: Record<string, string> = {
  a: "adjective",
  c: "cardinal",
  o: "ordinal",
  g: "gentilic",
};

const HEBREW_PRON_TYPE: Record<string, string> = {
  d: "demonstrative",
  f: "indefinite",
  i: "interrogative",
  p: "personal",
  r: "relative",
};

const HEBREW_PARTICLE_TYPE: Record<string, string> = {
  a: "affirmation",
  d: "definite article",
  e: "exhortation",
  i: "interrogative",
  j: "interjection",
  m: "demonstrative",
  n: "negative",
  o: "direct object marker",
  r: "relative",
};

const HEBREW_SUFFIX_TYPE: Record<string, string> = {
  d: "directional he",
  h: "paragogic he",
  n: "paragogic nun",
  p: "pronominal",
};

const PERSON: Record<string, string> = {
  "1": "1st",
  "2": "2nd",
  "3": "3rd",
};

const GENDER: Record<string, string> = {
  m: "masculine",
  f: "feminine",
  c: "common",
  b: "both",
};

const NUMBER: Record<string, string> = {
  s: "singular",
  p: "plural",
  d: "dual",
};

const STATE: Record<string, string> = {
  a: "absolute",
  c: "construct",
  d: "determined",
};

const GREEK_POS: Record<string, string> = {
  N: "noun",
  A: "adjective",
  T: "article",
  V: "verb",
  P: "personal pronoun",
  R: "relative pronoun",
  C: "reciprocal pronoun",
  D: "demonstrative pronoun",
  K: "correlative pronoun",
  I: "interrogative pronoun",
  X: "indefinite pronoun",
  Q: "correlative pronoun",
  F: "reflexive pronoun",
  S: "possessive pronoun",
  ADV: "adverb",
  CONJ: "conjunction",
  COND: "conditional",
  PRT: "particle",
  PREP: "preposition",
  INJ: "interjection",
  ARAM: "aramaic",
  HEB: "hebrew",
};

const GREEK_TENSE: Record<string, string> = {
  P: "present",
  I: "imperfect",
  F: "future",
  A: "aorist",
  R: "perfect",
  L: "pluperfect",
  X: "no tense",
};

const GREEK_VOICE: Record<string, string> = {
  A: "active",
  M: "middle",
  P: "passive",
  E: "middle/passive",
  D: "middle deponent",
  O: "passive deponent",
  N: "middle/passive deponent",
  Q: "impersonal active",
  X: "no voice",
};

const GREEK_MOOD: Record<string, string> = {
  I: "indicative",
  S: "subjunctive",
  O: "optative",
  M: "imperative",
  N: "infinitive",
  P: "participle",
};

const GREEK_CASE: Record<string, string> = {
  N: "nominative",
  V: "vocative",
  G: "genitive",
  D: "dative",
  A: "accusative",
};

const GREEK_NUMBER: Record<string, string> = {
  S: "singular",
  P: "plural",
  D: "dual",
};

const GREEK_GENDER: Record<string, string> = {
  M: "masculine",
  F: "feminine",
  N: "neuter",
};

function joinParts(parts: Array<string | null | undefined>): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const value = (part ?? "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out.join(" · ");
}

function personGenderNumber(person?: string, gender?: string, number?: string): string | null {
  const bits = [PERSON[person ?? ""], GENDER[gender ?? ""], NUMBER[number ?? ""]].filter(Boolean);
  return bits.length ? bits.join(" ") : null;
}

function parseHebrewSegment(raw: string, aramaic: boolean): string {
  let code = raw.trim();
  if (!code) return "";
  let langAramaic = aramaic;
  if (code[0] === "A" && code.length > 1 && HEBREW_POS[code[1] ?? ""]) {
    langAramaic = true;
    code = code.slice(1);
  } else if (code[0] === "H" && code.length > 1 && HEBREW_POS[code[1] ?? ""]) {
    langAramaic = false;
    code = code.slice(1);
  }

  const pos = code[0] ?? "";
  const rest = code.slice(1);
  const posLabel = HEBREW_POS[pos];
  if (!posLabel) return "";

  if (pos === "V") {
    const stem = langAramaic ? ARAMAIC_STEM[rest[0] ?? ""] : HEBREW_STEM[rest[0] ?? ""];
    const type = HEBREW_VERB_TYPE[rest[1] ?? ""];
    let i = 2;
    let person = "";
    if (rest[i] && PERSON[rest[i]]) {
      person = rest[i]!;
      i += 1;
    }
    let gender = "";
    if (rest[i] && GENDER[rest[i]]) {
      gender = rest[i]!;
      i += 1;
    }
    let number = "";
    if (rest[i] && NUMBER[rest[i]]) {
      number = rest[i]!;
      i += 1;
    }
    return joinParts([posLabel, stem, type, personGenderNumber(person, gender, number)]);
  }

  if (pos === "N") {
    const typeCode = rest[0] ?? "";
    const type = typeCode === "c" ? null : HEBREW_NOUN_TYPE[typeCode] ?? null;
    let i = HEBREW_NOUN_TYPE[typeCode] ? 1 : 0;
    const gender = GENDER[rest[i] ?? ""];
    if (gender) i += 1;
    const number = NUMBER[rest[i] ?? ""];
    if (number) i += 1;
    const state = STATE[rest[i] ?? ""];
    return joinParts([posLabel, type, gender, number, state]);
  }

  if (pos === "A") {
    const typeCode = rest[0] ?? "";
    const type = typeCode === "a" ? null : HEBREW_ADJ_TYPE[typeCode] ?? null;
    let i = HEBREW_ADJ_TYPE[typeCode] ? 1 : 0;
    const gender = GENDER[rest[i] ?? ""];
    if (gender) i += 1;
    const number = NUMBER[rest[i] ?? ""];
    if (number) i += 1;
    const state = STATE[rest[i] ?? ""];
    return joinParts([posLabel, type, gender, number, state]);
  }

  if (pos === "P") {
    const type = HEBREW_PRON_TYPE[rest[0] ?? ""];
    let i = type ? 1 : 0;
    let person = "";
    if (rest[i] && PERSON[rest[i]]) {
      person = rest[i]!;
      i += 1;
    }
    let gender = "";
    if (rest[i] && GENDER[rest[i]]) {
      gender = rest[i]!;
      i += 1;
    }
    let number = "";
    if (rest[i] && NUMBER[rest[i]]) {
      number = rest[i]!;
    }
    return joinParts([posLabel, type, personGenderNumber(person, gender, number)]);
  }

  if (pos === "T") {
    const type = HEBREW_PARTICLE_TYPE[rest[0] ?? ""];
    return joinParts([posLabel, type]);
  }

  if (pos === "S") {
    const type = HEBREW_SUFFIX_TYPE[rest[0] ?? ""];
    let i = type ? 1 : 0;
    let person = "";
    if (rest[i] && PERSON[rest[i]]) {
      person = rest[i]!;
      i += 1;
    }
    let gender = "";
    if (rest[i] && GENDER[rest[i]]) {
      gender = rest[i]!;
      i += 1;
    }
    let number = "";
    if (rest[i] && NUMBER[rest[i]]) {
      number = rest[i]!;
    }
    return joinParts([posLabel, type, personGenderNumber(person, gender, number)]);
  }

  if (pos === "R") {
    if (rest[0] === "d") return joinParts([posLabel, "definite article"]);
    return posLabel;
  }

  return posLabel;
}

function parseGreekTvm(raw: string): { tense?: string; voice?: string; mood?: string } {
  let i = 0;
  let tense = "";
  if (raw[i] === "2") {
    i += 1;
    const letter = raw[i] ?? "";
    tense = GREEK_TENSE[letter] ? `second ${GREEK_TENSE[letter]}` : "";
    i += 1;
  } else {
    tense = GREEK_TENSE[raw[i] ?? ""] ?? "";
    if (tense) i += 1;
  }
  const voice = GREEK_VOICE[raw[i] ?? ""] ?? "";
  if (voice) i += 1;
  const mood = GREEK_MOOD[raw[i] ?? ""] ?? "";
  return { tense, voice, mood };
}

function parseGreekCng(raw: string): Array<string | null> {
  if (!raw) return [];
  const personNum = raw.match(/^([123])([SPD])$/);
  if (personNum) {
    return [[PERSON[personNum[1] ?? ""], GREEK_NUMBER[personNum[2] ?? ""]].filter(Boolean).join(" ")];
  }
  const caseLetter = raw[0] ?? "";
  const numberLetter = raw[1] ?? "";
  const genderLetter = raw[2] ?? "";
  return [
    GREEK_CASE[caseLetter] ?? null,
    GREEK_NUMBER[numberLetter] ?? null,
    GREEK_GENDER[genderLetter] ?? null,
  ];
}

function parseRobinson(code: string): string {
  const parts = code.trim().split("-").filter(Boolean);
  if (parts.length === 0) return "";
  const posRaw = (parts[0] ?? "").toUpperCase();
  const posLabel = GREEK_POS[posRaw];
  if (!posLabel) return "";

  if (posRaw === "V") {
    const tvm = parseGreekTvm((parts[1] ?? "").toUpperCase());
    const rest: Array<string | null> = [];
    for (const extra of parts.slice(2)) {
      if (/^(P|C|S|ATT|ABB|I|N|K|LI|NUI|PRI)$/i.test(extra)) continue;
      rest.push(...parseGreekCng(extra.toUpperCase()));
    }
    return joinParts([posLabel, tvm.tense, tvm.voice, tvm.mood, ...rest]);
  }

  const rest: Array<string | null> = [];
  for (const extra of parts.slice(1)) {
    if (/^(P|C|S|ATT|ABB|I|K|LI|NUI|PRI)$/i.test(extra)) {
      if (extra.toUpperCase() === "P") rest.push("proper");
      continue;
    }
    rest.push(...parseGreekCng(extra.toUpperCase()));
  }
  return joinParts([posLabel, ...rest]);
}

export function looksLikeRobinsonMorph(code: string): boolean {
  return /[A-Za-z]+-[A-Za-z0-9]/.test(code);
}

/**
 * Expand a STEP morph code. Slash-separated Hebrew affixes expand left to right;
 * Robinson codes (with hyphens) use the Greek tables.
 */
export function expandStepMorph(
  code: string | null | undefined,
  language?: "he" | "gr" | string | null,
): string {
  const raw = (code ?? "").trim();
  if (!raw) return "";
  const aramaic = raw.startsWith("A") && !looksLikeRobinsonMorph(raw);
  if (language === "gr" || looksLikeRobinsonMorph(raw)) {
    return parseRobinson(raw);
  }
  const segments = raw.split("/").map((part) => part.trim()).filter(Boolean);
  const expanded = segments.map((segment) => parseHebrewSegment(segment, aramaic));
  return joinParts(expanded);
}
