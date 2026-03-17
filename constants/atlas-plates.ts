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
    title: "The Biblical World",
    subtitle: "Key locations across the ancient Near East",
    imageSource: require("../assets/plates/all.png"),
    aspectRatio: 1.6,
    hotspots: [
      { id: "all-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.34, y: 0.53, label: "Jerusalem" },
      { id: "all-bethlehem", targetType: "location", targetId: "bethlehem", x: 0.34, y: 0.55 },
      { id: "all-hebron", targetType: "location", targetId: "hebron", x: 0.33, y: 0.58 },
      { id: "all-jericho", targetType: "location", targetId: "jericho", x: 0.35, y: 0.51 },
      { id: "all-damascus", targetType: "location", targetId: "damascus", x: 0.40, y: 0.38, label: "Damascus" },
      { id: "all-babylon", targetType: "location", targetId: "babylon", x: 0.79, y: 0.48, label: "Babylon" },
      { id: "all-goshen", targetType: "location", targetId: "egypt-goshen", x: 0.17, y: 0.64, label: "Goshen", radius: 1.5 },
    ],
  },
  patriarchs: {
    id: "patriarchs",
    title: "World of the Patriarchs",
    subtitle: "The world of Abraham, Isaac, and Jacob",
    imageSource: require("../assets/plates/patriarchs.png"),
    aspectRatio: 1.6,
    hotspots: [
      { id: "pat-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.34, y: 0.53, label: "Jebus" },
      { id: "pat-jericho", targetType: "location", targetId: "jericho", x: 0.35, y: 0.51 },
      { id: "pat-bethlehem", targetType: "location", targetId: "bethlehem", x: 0.34, y: 0.55 },
      { id: "pat-hebron", targetType: "location", targetId: "hebron", x: 0.33, y: 0.58 },
      { id: "pat-damascus", targetType: "location", targetId: "damascus", x: 0.40, y: 0.38 },
      { id: "pat-babylon", targetType: "location", targetId: "babylon", x: 0.79, y: 0.48 },
      { id: "pat-goshen", targetType: "location", targetId: "egypt-goshen", x: 0.17, y: 0.64, radius: 1.5 },
      { id: "pat-egypt", targetType: "kingdom", targetId: "egypt", x: 0.14, y: 0.72, radius: 1.5 },
    ],
  },
  exodus: {
    id: "exodus",
    title: "The Exodus from Egypt",
    subtitle: "Israel's journey from slavery to the Promised Land",
    imageSource: require("../assets/plates/exodus.png"),
    aspectRatio: 1.6,
    hotspots: [
      { id: "exo-goshen", targetType: "location", targetId: "egypt-goshen", x: 0.25, y: 0.30, label: "Goshen" },
      { id: "exo-sinai", targetType: "location", targetId: "mount-sinai", x: 0.58, y: 0.72, label: "Mt. Sinai" },
      { id: "exo-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.78, y: 0.18 },
      { id: "exo-jericho", targetType: "location", targetId: "jericho", x: 0.81, y: 0.16, label: "Jericho" },
      { id: "exo-jordan", targetType: "location", targetId: "jordan-river", x: 0.82, y: 0.14 },
      { id: "exo-hebron", targetType: "location", targetId: "hebron", x: 0.76, y: 0.20 },
      { id: "exo-route", targetType: "journey", targetId: "exodus-route", x: 0.50, y: 0.50, label: "Exodus Route", radius: 2 },
      { id: "exo-egypt", targetType: "kingdom", targetId: "egypt", x: 0.15, y: 0.52 },
    ],
  },
  kingdom: {
    id: "kingdom",
    title: "Kingdom of Israel",
    subtitle: "The united and divided kingdom of Israel",
    imageSource: require("../assets/plates/kingdom.png"),
    aspectRatio: 1.6,
    hotspots: [
      { id: "kng-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.48, y: 0.50, label: "Jerusalem" },
      { id: "kng-bethlehem", targetType: "location", targetId: "bethlehem", x: 0.47, y: 0.52 },
      { id: "kng-jericho", targetType: "location", targetId: "jericho", x: 0.55, y: 0.47 },
      { id: "kng-hebron", targetType: "location", targetId: "hebron", x: 0.44, y: 0.56, label: "Hebron" },
      { id: "kng-galilee", targetType: "location", targetId: "sea-of-galilee", x: 0.57, y: 0.24 },
      { id: "kng-nazareth", targetType: "location", targetId: "nazareth", x: 0.49, y: 0.28 },
      { id: "kng-jordan", targetType: "location", targetId: "jordan-river", x: 0.56, y: 0.35 },
      { id: "kng-capernaum", targetType: "location", targetId: "capernaum", x: 0.57, y: 0.22 },
    ],
  },
  exile: {
    id: "exile",
    title: "Exile and Return",
    subtitle: "The Assyrian and Babylonian captivities",
    imageSource: require("../assets/plates/exile.png"),
    aspectRatio: 1.6,
    hotspots: [
      { id: "exl-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.18, y: 0.62, label: "Jerusalem" },
      { id: "exl-babylon", targetType: "location", targetId: "babylon", x: 0.72, y: 0.52, label: "Babylon" },
      { id: "exl-damascus", targetType: "location", targetId: "damascus", x: 0.25, y: 0.42 },
      { id: "exl-assyria", targetType: "kingdom", targetId: "assyria", x: 0.60, y: 0.25, label: "Assyria", radius: 2 },
      { id: "exl-babylon-emp", targetType: "kingdom", targetId: "babylon-empire", x: 0.72, y: 0.45, label: "Babylonia", radius: 2 },
    ],
  },
  "early-church": {
    id: "early-church",
    title: "World of the Early Church",
    subtitle: "The world of the apostles and the early church",
    imageSource: require("../assets/plates/early-church.png"),
    aspectRatio: 1.6,
    hotspots: [
      { id: "ec-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.82, y: 0.72, label: "Jerusalem", radius: 2 },
      { id: "ec-rome", targetType: "kingdom", targetId: "rome", x: 0.10, y: 0.18, label: "Rome", radius: 2 },
      { id: "ec-antioch", targetType: "location", targetId: "antioch", x: 0.85, y: 0.48, radius: 2 },
      { id: "ec-ephesus", targetType: "location", targetId: "ephesus", x: 0.58, y: 0.40, radius: 2 },
      { id: "ec-corinth", targetType: "location", targetId: "corinth", x: 0.42, y: 0.42, radius: 2 },
    ],
  },
  "paul-1": {
    id: "paul-1",
    title: "Paul's First Missionary Journey",
    subtitle: "From Antioch through Cyprus and southern Asia Minor",
    imageSource: require("../assets/plates/paul-1.png"),
    aspectRatio: 1.6,
    hotspots: [
      { id: "p1-antioch", targetType: "location", targetId: "antioch", x: 0.85, y: 0.48, label: "Antioch" },
      { id: "p1-cyprus", targetType: "location", targetId: "cyprus", x: 0.55, y: 0.72, label: "Cyprus" },
      { id: "p1-journey", targetType: "journey", targetId: "paul-journey-1", x: 0.50, y: 0.45, label: "Journey Route", radius: 2 },
    ],
  },
  "paul-2": {
    id: "paul-2",
    title: "Paul's Second Missionary Journey",
    subtitle: "Through Asia Minor, Macedonia, and Greece",
    imageSource: require("../assets/plates/paul-2.png"),
    aspectRatio: 1.6,
    hotspots: [
      { id: "p2-antioch", targetType: "location", targetId: "antioch", x: 0.90, y: 0.52, label: "Antioch" },
      { id: "p2-philippi", targetType: "location", targetId: "philippi", x: 0.25, y: 0.10, label: "Philippi" },
      { id: "p2-thessalonica", targetType: "location", targetId: "thessalonica", x: 0.18, y: 0.12, label: "Thessalonica" },
      { id: "p2-corinth", targetType: "location", targetId: "corinth", x: 0.16, y: 0.40, label: "Corinth" },
      { id: "p2-ephesus", targetType: "location", targetId: "ephesus", x: 0.42, y: 0.38, label: "Ephesus" },
      { id: "p2-journey", targetType: "journey", targetId: "paul-journey-2", x: 0.45, y: 0.48, label: "Journey Route", radius: 2 },
    ],
  },
  "paul-3": {
    id: "paul-3",
    title: "Paul's Third Missionary Journey",
    subtitle: "Ephesus, Macedonia, Greece, and the journey to Jerusalem",
    imageSource: require("../assets/plates/paul-3.png"),
    aspectRatio: 1.6,
    hotspots: [
      { id: "p3-antioch", targetType: "location", targetId: "antioch", x: 0.90, y: 0.52, label: "Antioch" },
      { id: "p3-ephesus", targetType: "location", targetId: "ephesus", x: 0.42, y: 0.38, label: "Ephesus" },
      { id: "p3-corinth", targetType: "location", targetId: "corinth", x: 0.16, y: 0.40, label: "Corinth" },
      { id: "p3-philippi", targetType: "location", targetId: "philippi", x: 0.25, y: 0.10, label: "Philippi" },
      { id: "p3-journey", targetType: "journey", targetId: "paul-journey-3", x: 0.50, y: 0.45, label: "Journey Route", radius: 2 },
    ],
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
