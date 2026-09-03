export interface Pioneer {
  id: string;
  name: string;
  shortName: string;
  voiceId: string;
  voiceKey: string;
  photoAsset: any;
  photoPath: string;
  sourceUrl?: string;
  portraitScale?: number;
  portraitOffsetX?: number;
  portraitOffsetY?: number;
  era: string;
  role: string;
}

/** Author portraits without TTS personas. Do not add these to PIONEERS. */
export interface PioneerAuthorPortrait {
  id: string;
  name: string;
  photoAsset: any;
  photoPath: string;
  sourceUrl: string;
}

export const PIONEER_AUTHOR_PORTRAITS: PioneerAuthorPortrait[] = [
  {
    id: "john-loughborough",
    name: "John Norton Loughborough",
    photoAsset: require("@/assets/images/john-loughborough.jpg"),
    photoPath: "assets/images/john-loughborough.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:John_Norton_Loughborough.jpg",
  },
  {
    id: "ej-waggoner",
    name: "Ellet Joseph Waggoner",
    photoAsset: require("@/assets/images/ellet-waggoner.jpg"),
    photoPath: "assets/images/ellet-waggoner.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Ellet_Joseph_Waggoner.jpg",
  },
  {
    id: "stephen-haskell",
    name: "Stephen Nelson Haskell",
    photoAsset: require("@/assets/images/stephen-haskell.jpg"),
    photoPath: "assets/images/stephen-haskell.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Stephen_N_Haskell.jpg",
  },
  {
    id: "at-jones",
    name: "Alonzo Trevier Jones",
    photoAsset: require("@/assets/images/alonzo-t-jones.jpg"),
    photoPath: "assets/images/alonzo-t-jones.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Alonzo_T._Jones.jpg",
  },
];

export const PIONEERS: Pioneer[] = [
  {
    id: "ellen-white",
    name: "Ellen G. White",
    shortName: "Ellen",
    voiceId: "XrExE9yKIg1WjnnlVkGX",
    voiceKey: "ellen_white",
    photoAsset: require("@/assets/images/ellen-white-portrait.png"),
    photoPath: "assets/images/ellen-white-portrait.png",
    portraitScale: 1.8,
    portraitOffsetX: -0.22,
    portraitOffsetY: 0.22,
    era: "1827-1915",
    role: "Prophet & Co-Founder",
  },
  {
    id: "james-white",
    name: "James Springer White",
    shortName: "James",
    voiceId: "6sFKzaJr574YWVu4UuJF",
    voiceKey: "james_white",
    photoAsset: require("@/assets/images/james-white.png"),
    photoPath: "assets/images/james-white.png",
    portraitScale: 1.62,
    portraitOffsetY: 0.24,
    era: "1821-1881",
    role: "Organizer & Co-Founder",
  },
  {
    id: "joseph-bates",
    name: "Joseph Bates",
    shortName: "Joseph",
    voiceId: "HAvvFKatz0uu0Fv55Riy",
    voiceKey: "joseph_bates",
    photoAsset: require("@/assets/images/joseph-bates.png"),
    photoPath: "assets/images/joseph-bates.png",
    portraitScale: 1.6,
    portraitOffsetY: 0.24,
    era: "1792-1872",
    role: "Sea Captain & Co-Founder",
  },
  {
    id: "uriah-smith",
    name: "Uriah Smith",
    shortName: "Uriah",
    voiceId: "jXkeB46JcPXXUSxzn3MD",
    voiceKey: "uriah_smith",
    photoAsset: require("@/assets/images/uriah-smith.png"),
    photoPath: "assets/images/uriah-smith.png",
    portraitScale: 1.62,
    portraitOffsetY: 0.18,
    era: "1832-1903",
    role: "Editor & Theologian",
  },
  {
    id: "jn-andrews",
    name: "John Nevins Andrews",
    shortName: "John",
    voiceId: "zlTgutz4OiRUmJHbkQju",
    voiceKey: "jn_andrews",
    photoAsset: require("@/assets/images/john-andrews.png"),
    photoPath: "assets/images/john-andrews.png",
    portraitScale: 1.6,
    portraitOffsetY: 0.26,
    era: "1829-1883",
    role: "First Missionary & Scholar",
  },
];

export function getPioneerById(id: string): Pioneer | undefined {
  return PIONEERS.find((p) => p.id === id);
}

export function getDefaultPioneer(): Pioneer {
  return PIONEERS[0];
}

export function getPioneerPortrait(slug: string): {
  photoAsset: any;
  sourceUrl?: string;
} | undefined {
  const author = PIONEER_AUTHOR_PORTRAITS.find((item) => item.id === slug);
  if (author) {
    return { photoAsset: author.photoAsset, sourceUrl: author.sourceUrl };
  }
  const pioneer = PIONEERS.find((item) => item.id === slug);
  if (pioneer) {
    return { photoAsset: pioneer.photoAsset, sourceUrl: pioneer.sourceUrl };
  }
  return undefined;
}
