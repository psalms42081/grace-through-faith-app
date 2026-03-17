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
    imageSource: require("../assets/plates/patriarchs.jpg"),
    aspectRatio: 660 / 530,
    hotspots: [
      { id: "all-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.16, y: 0.62, label: "Jerusalem" },
      { id: "all-bethlehem", targetType: "location", targetId: "bethlehem", x: 0.16, y: 0.65 },
      { id: "all-hebron", targetType: "location", targetId: "hebron", x: 0.14, y: 0.68 },
      { id: "all-jericho", targetType: "location", targetId: "jericho", x: 0.19, y: 0.59 },
      { id: "all-damascus", targetType: "location", targetId: "damascus", x: 0.24, y: 0.37, label: "Damascus" },
      { id: "all-babylon", targetType: "location", targetId: "babylon", x: 0.63, y: 0.57, label: "Babylon" },
      { id: "all-goshen", targetType: "location", targetId: "egypt-goshen", x: 0.05, y: 0.72, label: "Goshen", radius: 1.5 },
    ],
  },
  patriarchs: {
    id: "patriarchs",
    title: "Abram's Journey to the Promised Land",
    subtitle: "The world of Abraham, Isaac, and Jacob",
    imageSource: require("../assets/plates/patriarchs.jpg"),
    aspectRatio: 660 / 530,
    hotspots: [
      { id: "pat-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.16, y: 0.62, label: "Jebus" },
      { id: "pat-jericho", targetType: "location", targetId: "jericho", x: 0.19, y: 0.59 },
      { id: "pat-bethlehem", targetType: "location", targetId: "bethlehem", x: 0.16, y: 0.65 },
      { id: "pat-hebron", targetType: "location", targetId: "hebron", x: 0.14, y: 0.68 },
      { id: "pat-damascus", targetType: "location", targetId: "damascus", x: 0.24, y: 0.37 },
      { id: "pat-babylon", targetType: "location", targetId: "babylon", x: 0.63, y: 0.57 },
      { id: "pat-goshen", targetType: "location", targetId: "egypt-goshen", x: 0.05, y: 0.72, radius: 1.5 },
      { id: "pat-egypt", targetType: "kingdom", targetId: "egypt", x: 0.05, y: 0.78, radius: 1.5 },
    ],
  },
  exodus: {
    id: "exodus",
    title: "The Exodus from Egypt",
    subtitle: "Israel's journey from slavery to the Promised Land",
    imageSource: require("../assets/plates/exodus.jpg"),
    aspectRatio: 660 / 530,
    hotspots: [
      { id: "exo-goshen", targetType: "location", targetId: "egypt-goshen", x: 0.16, y: 0.32, label: "Goshen" },
      { id: "exo-sinai", targetType: "location", targetId: "mount-sinai", x: 0.52, y: 0.82, label: "Mt. Sinai" },
      { id: "exo-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.55, y: 0.23 },
      { id: "exo-jericho", targetType: "location", targetId: "jericho", x: 0.58, y: 0.21, label: "Jericho" },
      { id: "exo-jordan", targetType: "location", targetId: "jordan-river", x: 0.60, y: 0.20 },
      { id: "exo-hebron", targetType: "location", targetId: "hebron", x: 0.48, y: 0.26 },
      { id: "exo-route", targetType: "journey", targetId: "exodus-route", x: 0.35, y: 0.55, label: "Exodus Route", radius: 2 },
      { id: "exo-egypt", targetType: "kingdom", targetId: "egypt", x: 0.08, y: 0.42 },
    ],
  },
  kingdom: {
    id: "kingdom",
    title: "During the Reign of David",
    subtitle: "The united and divided kingdom of Israel",
    imageSource: require("../assets/plates/kingdom.jpg"),
    aspectRatio: 530 / 661,
    hotspots: [
      { id: "kng-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.50, y: 0.59, label: "Jerusalem" },
      { id: "kng-bethlehem", targetType: "location", targetId: "bethlehem", x: 0.48, y: 0.62 },
      { id: "kng-jericho", targetType: "location", targetId: "jericho", x: 0.57, y: 0.55 },
      { id: "kng-hebron", targetType: "location", targetId: "hebron", x: 0.42, y: 0.68, label: "Hebron" },
      { id: "kng-galilee", targetType: "location", targetId: "sea-of-galilee", x: 0.50, y: 0.21 },
      { id: "kng-damascus", targetType: "location", targetId: "damascus", x: 0.82, y: 0.10 },
      { id: "kng-nazareth", targetType: "location", targetId: "nazareth", x: 0.38, y: 0.23 },
      { id: "kng-jordan", targetType: "location", targetId: "jordan-river", x: 0.56, y: 0.38 },
      { id: "kng-capernaum", targetType: "location", targetId: "capernaum", x: 0.48, y: 0.19 },
    ],
  },
  exile: {
    id: "exile",
    title: "Israel and Judah's Exile",
    subtitle: "The Assyrian and Babylonian captivities",
    imageSource: require("../assets/plates/exile.jpg"),
    aspectRatio: 654 / 530,
    hotspots: [
      { id: "exl-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.17, y: 0.82, label: "Jerusalem" },
      { id: "exl-babylon", targetType: "location", targetId: "babylon", x: 0.62, y: 0.70, label: "Babylon" },
      { id: "exl-damascus", targetType: "location", targetId: "damascus", x: 0.25, y: 0.55 },
      { id: "exl-assyria", targetType: "kingdom", targetId: "assyria", x: 0.52, y: 0.30, label: "Assyria", radius: 2 },
      { id: "exl-babylon-emp", targetType: "kingdom", targetId: "babylon-empire", x: 0.62, y: 0.62, label: "Babylonia", radius: 2 },
    ],
  },
  "early-church": {
    id: "early-church",
    title: "The Roman Empire",
    subtitle: "The world of the apostles and the early church",
    imageSource: require("../assets/plates/early-church.jpg"),
    aspectRatio: 951 / 530,
    hotspots: [
      { id: "ec-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.57, y: 0.73, label: "Jerusalem", radius: 2 },
      { id: "ec-rome", targetType: "kingdom", targetId: "rome", x: 0.30, y: 0.22, label: "Rome", radius: 2 },
      { id: "ec-antioch", targetType: "location", targetId: "antioch", x: 0.53, y: 0.48, radius: 2 },
      { id: "ec-ephesus", targetType: "location", targetId: "ephesus", x: 0.42, y: 0.42, radius: 2 },
      { id: "ec-corinth", targetType: "location", targetId: "corinth", x: 0.35, y: 0.42, radius: 2 },
    ],
  },
  "paul-1": {
    id: "paul-1",
    title: "Paul's First Missionary Journey",
    subtitle: "From Antioch through Cyprus and southern Asia Minor",
    imageSource: require("../assets/plates/paul-1.jpg"),
    aspectRatio: 660 / 530,
    hotspots: [
      { id: "p1-antioch", targetType: "location", targetId: "antioch", x: 0.82, y: 0.47, label: "Antioch" },
      { id: "p1-cyprus", targetType: "location", targetId: "cyprus", x: 0.68, y: 0.56, label: "Cyprus" },
      { id: "p1-ephesus", targetType: "location", targetId: "ephesus", x: 0.36, y: 0.30, label: "Ephesus" },
      { id: "p1-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.90, y: 0.88 },
      { id: "p1-corinth", targetType: "location", targetId: "corinth", x: 0.10, y: 0.25, label: "Corinth" },
      { id: "p1-thessalonica", targetType: "location", targetId: "thessalonica", x: 0.15, y: 0.05 },
      { id: "p1-philippi", targetType: "location", targetId: "philippi", x: 0.28, y: 0.03 },
      { id: "p1-journey", targetType: "journey", targetId: "paul-journey-1", x: 0.55, y: 0.42, label: "Journey Route", radius: 2 },
    ],
  },
  "paul-2": {
    id: "paul-2",
    title: "Paul's Second Missionary Journey",
    subtitle: "Through Asia Minor, Macedonia, and Greece",
    imageSource: require("../assets/plates/paul-2.jpg"),
    aspectRatio: 660 / 530,
    hotspots: [
      { id: "p2-antioch", targetType: "location", targetId: "antioch", x: 0.84, y: 0.50, label: "Antioch" },
      { id: "p2-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.92, y: 0.90 },
      { id: "p2-philippi", targetType: "location", targetId: "philippi", x: 0.30, y: 0.05, label: "Philippi" },
      { id: "p2-thessalonica", targetType: "location", targetId: "thessalonica", x: 0.16, y: 0.04, label: "Thessalonica" },
      { id: "p2-corinth", targetType: "location", targetId: "corinth", x: 0.08, y: 0.24, label: "Corinth" },
      { id: "p2-ephesus", targetType: "location", targetId: "ephesus", x: 0.36, y: 0.30, label: "Ephesus" },
      { id: "p2-cyprus", targetType: "location", targetId: "cyprus", x: 0.70, y: 0.57 },
      { id: "p2-journey", targetType: "journey", targetId: "paul-journey-2", x: 0.45, y: 0.48, label: "Journey Route", radius: 2 },
    ],
  },
  "paul-3": {
    id: "paul-3",
    title: "Paul's Third Missionary Journey",
    subtitle: "Ephesus, Macedonia, Greece, and the journey to Jerusalem",
    imageSource: require("../assets/plates/paul-3.jpg"),
    aspectRatio: 660 / 530,
    hotspots: [
      { id: "p3-antioch", targetType: "location", targetId: "antioch", x: 0.82, y: 0.52, label: "Antioch" },
      { id: "p3-jerusalem", targetType: "location", targetId: "jerusalem", x: 0.90, y: 0.90 },
      { id: "p3-ephesus", targetType: "location", targetId: "ephesus", x: 0.34, y: 0.32, label: "Ephesus" },
      { id: "p3-corinth", targetType: "location", targetId: "corinth", x: 0.10, y: 0.24, label: "Corinth" },
      { id: "p3-philippi", targetType: "location", targetId: "philippi", x: 0.27, y: 0.04, label: "Philippi" },
      { id: "p3-thessalonica", targetType: "location", targetId: "thessalonica", x: 0.14, y: 0.04 },
      { id: "p3-cyprus", targetType: "location", targetId: "cyprus", x: 0.70, y: 0.55 },
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
