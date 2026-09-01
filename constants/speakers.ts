import { displayInitials } from "@/lib/user-initials";

const SPEAKER_COLORS: Record<string, string> = {
  "Joel Osteen": "#4A90D9",
  "Joyce Meyer": "#9B59B6",
  "Tony Evans": "#2C3E50",
  "Charles Stanley": "#1A5276",
  "T.D. Jakes": "#6C3483",
  "Priscilla Shirer": "#C0392B",
  "Rick Warren": "#16A085",
  "John MacArthur": "#2E4053",
  "Lysa TerKeurst": "#E74C8C",
  "Doug Batchelor": "#27AE60",
  "Doug Batchelor - Amazing Facts": "#27AE60",
  "Amazing Facts": "#27AE60",
  "3ABN": "#1ABC9C",
  "3ABN Today": "#1ABC9C",
  "3ABN Today Family": "#1ABC9C",
  "3ABN Kids": "#1ABC9C",
  "Hillsong Worship": "#F39C12",
  "Hillsong UNITED": "#F39C12",
  "Bethel Music": "#8E44AD",
  "Maverick City Music": "#D35400",
  "Elevation Worship": "#2980B9",
  "Sinach": "#E91E63",
  "Cory Asbury": "#3498DB",
  "Phil Wickham": "#1E88E5",
  "MercyMe": "#00897B",
  "Laura Story": "#AB47BC",
  "Kirk Franklin": "#FF6F00",
  "Tasha Cobbs Leonard": "#AD1457",
  "Hezekiah Walker": "#6A1B9A",
  "Richard Smallwood": "#4E342E",
  "Donald Lawrence": "#283593",
  "All Sons & Daughters": "#00695C",
  "Housefires": "#BF360C",
  "Francesca Battistelli": "#C2185B",
  "It Is Written": "#1565C0",
  "The Bible Project": "#FF8A65",
  "Saddleback Kids": "#42A5F5",
  "VeggieTales": "#66BB6A",
  "John Newton": "#5D4037",
  "Carl Boberg": "#4E342E",
  "Horatio Spafford": "#3E2723",
  "Thomas Chisholm": "#4E342E",
  "Dallan Forgaill": "#33691E",
  "Fanny Crosby": "#6D4C41",
  "Traditional": "#795548",
  "Various Artists": "#607D8B",
};

export function getSpeakerColor(name: string): string {
  return SPEAKER_COLORS[name] || generateColorFromName(name);
}

function generateColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export function getSpeakerInitials(name: string): string {
  if (name === "3ABN" || name === "3ABN Today" || name === "3ABN Today Family" || name === "3ABN Kids") return "3A";
  if (name === "Various Artists") return "VA";
  if (name === "VeggieTales") return "VT";
  if (name.includes(" - ")) {
    const mainName = name.split(" - ")[0];
    return displayInitials(mainName);
  }
  return displayInitials(name);
}
