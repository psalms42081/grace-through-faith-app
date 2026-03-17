import { ImageSourcePropType } from "react-native";

export interface AtlasHotspot {
  id: string;
  targetType: "location" | "journey" | "kingdom";
  targetId: string;
  x: number;
  y: number;
  label?: string;
  radius?: number;
}

export interface AtlasPlate {
  id: string;
  title: string;
  subtitle: string;
  imageSource: ImageSourcePropType;
  aspectRatio: number;
  hotspots: AtlasHotspot[];
}

export const ATLAS_PLATES: Record<string, AtlasPlate> = {
  all: {
    id: "all",
    title: "The World of the Bible",
    subtitle: "Key locations across the ancient Near East",
    imageSource: require("../assets/plates/world-of-bible.jpg"),
    aspectRatio: 1.434,
    hotspots: [],
  },
  patriarchs: {
    id: "patriarchs",
    title: "The World of the Patriarchs",
    subtitle: "The world of Abraham, Isaac, and Jacob (c. 2000 B.C.)",
    imageSource: require("../assets/plates/world-of-patriarchs.jpg"),
    aspectRatio: 1.100,
    hotspots: [],
  },
  exodus: {
    id: "exodus",
    title: "The Route of the Exodus",
    subtitle: "Israel's journey from slavery to the Promised Land (c. 1446 B.C.)",
    imageSource: require("../assets/plates/route-of-exodus.jpg"),
    aspectRatio: 0.729,
    hotspots: [],
  },
  kingdom: {
    id: "kingdom",
    title: "The Kingdoms of Saul, David, and Solomon",
    subtitle: "The united monarchy (c. 1050 B.C.)",
    imageSource: require("../assets/plates/kingdoms-saul-david-solomon.jpg"),
    aspectRatio: 0.630,
    hotspots: [],
  },
  exile: {
    id: "exile",
    title: "Judah Is Exiled to Babylon",
    subtitle: "The Babylonian captivity (c. 586 B.C.)",
    imageSource: require("../assets/plates/exile-to-babylon.jpg"),
    aspectRatio: 1.028,
    hotspots: [],
  },
  "early-church": {
    id: "early-church",
    title: "The World of the Bible",
    subtitle: "The world of the apostles and the early church",
    imageSource: require("../assets/plates/world-of-bible.jpg"),
    aspectRatio: 1.434,
    hotspots: [],
  },
  "paul-1": {
    id: "paul-1",
    title: "Paul's First Missionary Journey",
    subtitle: "From Antioch through Cyprus and southern Asia Minor (c. A.D. 46)",
    imageSource: require("../assets/plates/pauls-first-journey.jpg"),
    aspectRatio: 0.657,
    hotspots: [],
  },
  "paul-2": {
    id: "paul-2",
    title: "Paul's Second Missionary Journey",
    subtitle: "Through Asia Minor, Macedonia, and Greece (c. A.D. 49)",
    imageSource: require("../assets/plates/pauls-second-journey.jpg"),
    aspectRatio: 1.080,
    hotspots: [],
  },
  "paul-3": {
    id: "paul-3",
    title: "Paul's Third Missionary Journey",
    subtitle: "Ephesus, Macedonia, Greece, and the journey to Jerusalem (c. A.D. 53)",
    imageSource: require("../assets/plates/pauls-third-journey.jpg"),
    aspectRatio: 1.080,
    hotspots: [],
  },
};

export type PlateId = keyof typeof ATLAS_PLATES;

export function getPlateForEra(era: string): AtlasPlate {
  const eraMap: Record<string, PlateId> = {
    All: "all",
    Patriarchs: "patriarchs",
    Exodus: "exodus",
    Kingdom: "kingdom",
    Exile: "exile",
    "Early Church": "early-church",
  };
  return ATLAS_PLATES[eraMap[era] || "all"];
}

export function getPlateForJourney(journeyId: string): AtlasPlate | null {
  const journeyMap: Record<string, PlateId> = {
    "exodus-route": "exodus",
    "paul-journey-1": "paul-1",
    "paul-journey-2": "paul-2",
    "paul-journey-3": "paul-3",
  };
  const plateId = journeyMap[journeyId];
  return plateId ? ATLAS_PLATES[plateId] : null;
}
