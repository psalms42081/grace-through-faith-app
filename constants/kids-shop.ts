export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: "avatar_frame" | "theme" | "celebration";
  starCost: number;
  icon: string;
  color: string;
  previewColor?: string;
}

export const SHOP_CATEGORIES = [
  { id: "avatar_frame" as const, label: "Frames", icon: "person-circle" },
  { id: "theme" as const, label: "Themes", icon: "color-palette" },
  { id: "celebration" as const, label: "Effects", icon: "sparkles" },
] as const;

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "frame-golden-crown",
    name: "Golden Crown",
    description: "A shining golden crown for your profile",
    category: "avatar_frame",
    starCost: 10,
    icon: "trophy",
    color: "#FFD700",
  },
  {
    id: "frame-angel-wings",
    name: "Angel Wings",
    description: "Beautiful angel wings around your picture",
    category: "avatar_frame",
    starCost: 15,
    icon: "sparkles",
    color: "#E8D5B7",
  },
  {
    id: "frame-rainbow",
    name: "Rainbow Glow",
    description: "A colorful rainbow frame",
    category: "avatar_frame",
    starCost: 12,
    icon: "rainbow",
    color: "#FF6B6B",
  },
  {
    id: "frame-shepherd-staff",
    name: "Shepherd's Staff",
    description: "The Good Shepherd's staff beside your name",
    category: "avatar_frame",
    starCost: 8,
    icon: "leaf",
    color: "#8B4513",
  },
  {
    id: "frame-dove",
    name: "Peace Dove",
    description: "A gentle dove of peace",
    category: "avatar_frame",
    starCost: 10,
    icon: "heart",
    color: "#87CEEB",
  },
  {
    id: "frame-star-burst",
    name: "Star Burst",
    description: "Twinkling stars around your profile",
    category: "avatar_frame",
    starCost: 20,
    icon: "star",
    color: "#9B59B6",
  },

  {
    id: "theme-ocean-blue",
    name: "Ocean Blue",
    description: "Calming ocean waves theme",
    category: "theme",
    starCost: 15,
    icon: "water",
    color: "#2980B9",
    previewColor: "#1A5276",
  },
  {
    id: "theme-garden-green",
    name: "Garden of Eden",
    description: "Lush green garden theme",
    category: "theme",
    starCost: 15,
    icon: "leaf",
    color: "#27AE60",
    previewColor: "#1E8449",
  },
  {
    id: "theme-sunset-orange",
    name: "Sunset Glow",
    description: "Warm sunset sky theme",
    category: "theme",
    starCost: 15,
    icon: "sunny",
    color: "#E67E22",
    previewColor: "#CA6F1E",
  },
  {
    id: "theme-royal-purple",
    name: "Royal Purple",
    description: "Majestic purple kingdom theme",
    category: "theme",
    starCost: 20,
    icon: "diamond",
    color: "#8E44AD",
    previewColor: "#6C3483",
  },
  {
    id: "theme-starry-night",
    name: "Starry Night",
    description: "A beautiful night sky full of stars",
    category: "theme",
    starCost: 25,
    icon: "moon",
    color: "#2C3E50",
    previewColor: "#1B2631",
  },

  {
    id: "celebration-confetti",
    name: "Confetti Burst",
    description: "Colorful confetti when you complete stories",
    category: "celebration",
    starCost: 8,
    icon: "bonfire",
    color: "#E74C3C",
  },
  {
    id: "celebration-fireworks",
    name: "Fireworks",
    description: "Sparkly fireworks for quiz victories",
    category: "celebration",
    starCost: 12,
    icon: "flash",
    color: "#F39C12",
  },
  {
    id: "celebration-rainbow-rain",
    name: "Rainbow Rain",
    description: "Colorful rainbow drops falling from the sky",
    category: "celebration",
    starCost: 15,
    icon: "rainy",
    color: "#3498DB",
  },
  {
    id: "celebration-dove-flight",
    name: "Dove Flight",
    description: "A dove flies across when you memorize a verse",
    category: "celebration",
    starCost: 18,
    icon: "airplane",
    color: "#1ABC9C",
  },
  {
    id: "celebration-golden-glow",
    name: "Golden Glow",
    description: "Everything glows gold when you finish all daily quests",
    category: "celebration",
    starCost: 25,
    icon: "sunny",
    color: "#C9933A",
  },
];

export function getShopItemById(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

export function getShopItemsByCategory(category: ShopItem["category"]): ShopItem[] {
  return SHOP_ITEMS.filter((item) => item.category === category);
}

export const DAILY_QUEST_STAR_REWARD = 2;
export const DAILY_CHAMPION_BONUS = 3;
