export interface Pioneer {
  id: string;
  name: string;
  shortName: string;
  voiceId: string;
  voiceKey: string;
  photoAsset: any;
  photoPath: string;
  portraitScale?: number;
  portraitOffsetX?: number;
  portraitOffsetY?: number;
  era: string;
  role: string;
}

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
