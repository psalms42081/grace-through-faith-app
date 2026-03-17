#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "assets", "plates");

const W = 1600;
const H = 1000;

const C = {
  parchment: "#F0E2C8",
  parchmentLight: "#F5EAD6",
  parchmentDark: "#D8C8A8",
  land: "#E8D8B8",
  water: "#BDCDD8",
  waterEdge: "#A0B0BD",
  waterDeep: "#9AB4C8",
  coast: "#9B8B70",
  river: "#A0BCD0",
  dot: "#3D2B1F",
  label: "#3D2B1F",
  labelFaint: "#7B6B58",
  route: "#8B4513",
  routeAlt: "#A0522D",
  title: "#2A1F14",
  subtitle: "#6B5B48",
  border: "#C8B898",
  terrain: "#D8C8A0",
  desert: "#E8D8A8",
};

function createProjection(bounds, padding = 70) {
  const latMid = (bounds.latMin + bounds.latMax) / 2;
  const cosLat = Math.cos((latMid * Math.PI) / 180);
  const geoW = (bounds.lngMax - bounds.lngMin) * cosLat;
  const geoH = bounds.latMax - bounds.latMin;
  const drawW = W - padding * 2;
  const drawH = H - padding * 2;
  const scaleX = drawW / geoW;
  const scaleY = drawH / geoH;
  const scale = Math.min(scaleX, scaleY);
  const offX = padding + (drawW - geoW * scale) / 2;
  const offY = padding + (drawH - geoH * scale) / 2;
  return (lat, lng) => ({
    x: offX + (lng - bounds.lngMin) * cosLat * scale,
    y: offY + (bounds.latMax - lat) * scale,
  });
}

function toPath(coords, proj, close = false) {
  const pts = coords.map(([lat, lng]) => proj(lat, lng));
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++)
    d += ` L${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
  if (close) d += " Z";
  return d;
}

function smoothPath(coords, proj) {
  const pts = coords.map(([lat, lng]) => proj(lat, lng));
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const cpx = (prev.x + cur.x) / 2;
    const cpy = (prev.y + cur.y) / 2;
    d += ` Q${prev.x.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${cpy.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last.x.toFixed(1)},${last.y.toFixed(1)}`;
  return d;
}

const MEDITERRANEAN = [
  [50, -10],[50, 50],
  [42, 42],[41.5, 29],[41, 28.5],
  [40.5, 26],[39, 26.5],[38, 26.5],[37, 27.5],
  [36.5, 29],[36.8, 31],[36.5, 33],[36.8, 34.5],[36.5, 35.5],[36.2, 36],
  [35.5, 35.9],[34.5, 35.8],[34, 35.5],
  [33, 35.1],[32.8, 35],[32.2, 34.8],[31.8, 34.5],[31.3, 34],
  [31, 32.5],[31.4, 31.5],[31, 30.5],[31.5, 29.5],[31.3, 27.5],[31.5, 25],
  [31, 20],[33, 10],[35, 0],[37, -10],[50, -10],
];

const GULF_OF_SUEZ = [
  [30, 32.3],[29.5, 32.5],[29, 32.8],[28.5, 33],[28, 33.2],[27.5, 33.5],
  [27.5, 34],[28, 33.6],[28.5, 33.4],[29, 33.2],[29.5, 33],[30, 32.7],
];
const GULF_OF_AQABA = [
  [29.5, 34.7],[29, 34.6],[28.5, 34.4],[28, 34.2],[27.5, 34],
  [27.5, 34.5],[28, 34.6],[28.5, 34.8],[29, 35],[29.5, 35.1],
];
const RED_SEA_MAIN = [
  [27.5, 33.5],[27, 33.8],[26, 34.2],[25, 35],[24, 35.5],
  [24, 37],[25, 36.5],[26, 36],[27, 35.5],[27.5, 34.5],
];
const DEAD_SEA = [
  [31.82, 35.37],[31.6, 35.45],[31.3, 35.42],[31.1, 35.38],
  [31.3, 35.3],[31.6, 35.33],[31.82, 35.32],
];
const SEA_OF_GALILEE = [
  [32.9, 35.55],[32.85, 35.62],[32.75, 35.62],
  [32.68, 35.55],[32.75, 35.48],[32.85, 35.48],
];
const PERSIAN_GULF = [
  [30.2, 47.8],[29, 48.5],[28, 49.5],[27, 50.5],[26, 52],[25.5, 54],
  [26.5, 56],[27.5, 53],[28.5, 51],[29.5, 49.5],[30.5, 48.5],
];
const BLACK_SEA = [
  [46, 27],[46, 42],[42, 42],[41.5, 41],[41, 40],
  [41, 37],[41.2, 34],[41.5, 32],[41.3, 30],[41.2, 29],
  [41.5, 28.5],[42, 28],[42, 27],[46, 27],
];

const NILE = [
  [24, 33],[25, 32.8],[26, 32.5],[27, 31.8],[28, 31.2],
  [29, 31],[30, 31],[30.5, 31.2],[31, 31.5],
];
const JORDAN = [[33.2, 35.6],[32.9, 35.55],[32.7, 35.55],[32.3, 35.5],[31.85, 35.45]];
const EUPHRATES = [
  [38.5, 38],[37.5, 38.5],[36.5, 38],[35.5, 39],[34.5, 40.5],
  [33.5, 42],[33, 43.5],[32.5, 44.5],[32, 45.5],[31, 47],[30.2, 47.8],
];
const TIGRIS = [
  [38.5, 40.5],[37.5, 42],[36.5, 43],[35.5, 43.5],[34.5, 44.5],
  [33.5, 44.3],[33, 44.5],[32.5, 45],[31.5, 46.5],[30.5, 47.5],[30.2, 47.8],
];

const GREECE_LAND = [
  [42, 20],[42, 26],[41, 26],[40.5, 25],[40, 24],[40.5, 23],
  [40, 22.5],[39.5, 23],[39, 23],[38.5, 23.5],[38, 24],
  [37.8, 23.5],[37.5, 23],[37, 22.5],[36.5, 22.5],
  [37, 22],[37.5, 21.5],[38, 21.5],[38.5, 21],[39, 20.5],
  [39.5, 20],[40, 20],[40.5, 20],[42, 20],
];
const ITALY_LAND = [
  [46, 7],[46, 13],[44.5, 12],[44, 12.5],[43, 14],[42, 15],
  [41, 17],[40.5, 18],[40, 18.5],[39.5, 17],[39, 16.5],
  [38.5, 16.5],[38, 16],[38, 15.5],[38.5, 16],
  [39, 16],[40, 15.5],[41, 14],[41.5, 13],[42, 11.5],
  [43, 10],[44, 8.5],[46, 7],
];
const SICILY = [
  [38.3, 13],[38, 12.5],[37.5, 13],[37, 14],[37, 15],
  [37.5, 15.5],[38, 15.5],[38.3, 15],[38.5, 14],[38.3, 13],
];
const CYPRUS = [
  [35.4, 32],[35.6, 32.5],[35.5, 33.5],[35.2, 34],
  [34.9, 34.5],[34.7, 33.5],[34.7, 32.5],[35, 32],[35.4, 32],
];
const CRETE = [
  [35.5, 23.5],[35.3, 24.5],[35.2, 25],[35, 26],
  [35.2, 26],[35.4, 25],[35.5, 24],[35.6, 23.5],
];
const TURKEY_INTERIOR = [
  [42, 26],[42, 42],[41, 40],[40.5, 38],[40, 36],
  [39.5, 35],[38.5, 35],[38, 34.5],[37.5, 34],
  [37, 33.5],[36.8, 34.5],[36.5, 33],[36.8, 31],
  [36.5, 29],[37, 27.5],[38, 26.5],[39, 26.5],[40.5, 26],[42, 26],
];
const NORTH_AFRICA = [
  [31.5, 25],[31.3, 27.5],[31.5, 29.5],[31, 30.5],[31.4, 31.5],
  [31, 32.5],[31.3, 34],[20, 34],[20, 25],[31.5, 25],
];
const ARABIA_LAND = [
  [30, 34.8],[29.5, 35.1],[29, 36],[28, 37],[27, 38],
  [25, 40],[22, 42],[20, 44],[20, 55],[30.2, 47.8],
  [30, 45],[30, 40],[30, 36],[30, 34.8],
];

function waterBodies(ids, proj) {
  const all = {
    mediterranean: MEDITERRANEAN,
    gulfOfSuez: GULF_OF_SUEZ,
    gulfOfAqaba: GULF_OF_AQABA,
    redSeaMain: RED_SEA_MAIN,
    deadSea: DEAD_SEA,
    seaOfGalilee: SEA_OF_GALILEE,
    persianGulf: PERSIAN_GULF,
    blackSea: BLACK_SEA,
  };
  return ids
    .filter((id) => all[id])
    .map(
      (id) =>
        `<path d="${toPath(all[id], proj, true)}" fill="${C.water}" stroke="${C.coast}" stroke-width="0.8"/>`,
    )
    .join("\n");
}

function landMasses(ids, proj) {
  const all = {
    greece: GREECE_LAND,
    italy: ITALY_LAND,
    sicily: SICILY,
    cyprus: CYPRUS,
    crete: CRETE,
    turkeyInterior: TURKEY_INTERIOR,
    northAfrica: NORTH_AFRICA,
    arabia: ARABIA_LAND,
  };
  return ids
    .filter((id) => all[id])
    .map(
      (id) =>
        `<path d="${toPath(all[id], proj, true)}" fill="${C.parchment}" stroke="none"/>`,
    )
    .join("\n");
}

function rivers(ids, proj) {
  const all = {
    nile: NILE,
    jordan: JORDAN,
    euphrates: EUPHRATES,
    tigris: TIGRIS,
  };
  return ids
    .filter((id) => all[id])
    .map(
      (id) =>
        `<path d="${smoothPath(all[id], proj)}" fill="none" stroke="${C.river}" stroke-width="2.5" stroke-linecap="round"/>`,
    )
    .join("\n");
}

function cityDots(cities, proj) {
  return cities
    .map((c) => {
      const p = proj(c.lat, c.lng);
      const r = c.major ? 5 : 3.5;
      const fs = c.major ? 22 : 17;
      const offsets = {
        right: { dx: r + 6, dy: fs * 0.35, anchor: "start" },
        left: { dx: -(r + 6), dy: fs * 0.35, anchor: "end" },
        above: { dx: 0, dy: -(r + 6), anchor: "middle" },
        below: { dx: 0, dy: r + fs + 2, anchor: "middle" },
      };
      const off = offsets[c.labelPos || "right"];
      const weight = c.major ? "bold" : "normal";
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${C.dot}" stroke="${C.parchment}" stroke-width="1.5"/>
<text x="${(p.x + off.dx).toFixed(1)}" y="${(p.y + off.dy).toFixed(1)}" text-anchor="${off.anchor}" font-family="Georgia, 'Times New Roman', serif" font-size="${fs}" font-weight="${weight}" fill="${C.label}">${c.name}</text>`;
    })
    .join("\n");
}

function routeLine(coords, proj, color = C.route, width = 3, dash = "") {
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<path d="${smoothPath(coords, proj)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"${dashAttr}/>`;
}

function regionLabels(labels, proj) {
  return labels
    .map((l) => {
      const p = proj(l.lat, l.lng);
      return `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${l.size || 16}" font-style="italic" fill="${C.labelFaint}" letter-spacing="4" opacity="0.5">${l.name}</text>`;
    })
    .join("\n");
}

function terrainShading(areas, proj) {
  return areas
    .map((a, i) => {
      const p = proj(a.lat, a.lng);
      return `<radialGradient id="terrain${i}" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="${C.terrain}" stop-opacity="0.25"/>
  <stop offset="100%" stop-color="${C.parchment}" stop-opacity="0"/>
</radialGradient>
<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${a.rx || 80}" ry="${a.ry || 50}" fill="url(#terrain${i})"/>`;
    })
    .join("\n");
}

function buildSVG(config) {
  const proj = createProjection(config.bounds, config.padding || 70);

  const terrainDefs = (config.terrain || [])
    .map((a, i) => {
      return `<radialGradient id="terrain${i}" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${C.terrain}" stop-opacity="0.2"/>
    <stop offset="100%" stop-color="${C.parchment}" stop-opacity="0"/>
  </radialGradient>`;
    })
    .join("\n");

  const terrainEllipses = (config.terrain || [])
    .map((a, i) => {
      const p = proj(a.lat, a.lng);
      return `<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${a.rx || 80}" ry="${a.ry || 50}" fill="url(#terrain${i})"/>`;
    })
    .join("\n");

  const titleX = config.titlePos?.x || 80;
  const titleY = config.titlePos?.y || 72;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
  <linearGradient id="parchBg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.parchmentLight}"/>
    <stop offset="100%" stop-color="${C.parchment}"/>
  </linearGradient>
  <linearGradient id="waterGrad" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0%" stop-color="${C.water}"/>
    <stop offset="100%" stop-color="${C.waterDeep}"/>
  </linearGradient>
  ${terrainDefs}
  <clipPath id="mapClip"><rect x="0" y="0" width="${W}" height="${H}" rx="0"/></clipPath>
</defs>
<g clip-path="url(#mapClip)">
  <rect width="${W}" height="${H}" fill="url(#parchBg)"/>
  ${waterBodies(config.water || [], proj)}
  ${landMasses(config.land || [], proj)}
  ${terrainEllipses}
  ${rivers(config.rivers || [], proj)}
  ${(config.routes || []).map((r) => routeLine(r.coords, proj, r.color || C.route, r.width || 3, r.dash || "")).join("\n")}
  ${regionLabels(config.regions || [], proj)}
  ${cityDots(config.cities || [], proj)}
  <text x="${titleX}" y="${titleY}" font-family="Georgia, 'Times New Roman', serif" font-size="38" font-weight="bold" fill="${C.title}">${config.title}</text>
</g>
</svg>`;
}

const MAPS = [
  {
    id: "all",
    title: "The Biblical World",
    bounds: { latMin: 26, latMax: 38, lngMin: 28, lngMax: 48 },
    water: ["mediterranean", "gulfOfSuez", "gulfOfAqaba", "redSeaMain", "deadSea", "seaOfGalilee", "persianGulf"],
    land: ["northAfrica", "arabia"],
    rivers: ["nile", "jordan", "euphrates", "tigris"],
    terrain: [
      { lat: 32, lng: 35.5, rx: 60, ry: 80 },
      { lat: 36, lng: 43, rx: 120, ry: 60 },
      { lat: 28, lng: 33.5, rx: 70, ry: 50 },
    ],
    regions: [
      { name: "CANAAN", lat: 32.5, lng: 35, size: 14 },
      { name: "EGYPT", lat: 29, lng: 31, size: 16 },
      { name: "MESOPOTAMIA", lat: 34, lng: 43, size: 14 },
      { name: "ARABIA", lat: 27.5, lng: 40, size: 14 },
    ],
    cities: [
      { name: "Jerusalem", lat: 31.77, lng: 35.23, major: true, labelPos: "right" },
      { name: "Bethlehem", lat: 31.70, lng: 35.21, labelPos: "left" },
      { name: "Hebron", lat: 31.53, lng: 35.10, labelPos: "left" },
      { name: "Jericho", lat: 31.87, lng: 35.44, labelPos: "right" },
      { name: "Damascus", lat: 33.51, lng: 36.29, major: true, labelPos: "right" },
      { name: "Babylon", lat: 32.54, lng: 44.42, major: true, labelPos: "right" },
      { name: "Goshen", lat: 30.85, lng: 31.90, labelPos: "below" },
      { name: "Ur", lat: 30.96, lng: 46.10, labelPos: "right" },
      { name: "Nineveh", lat: 36.36, lng: 43.15, labelPos: "right" },
    ],
    titlePos: { x: 80, y: 72 },
  },
  {
    id: "patriarchs",
    title: "World of the Patriarchs",
    bounds: { latMin: 26, latMax: 38, lngMin: 28, lngMax: 48 },
    water: ["mediterranean", "gulfOfSuez", "gulfOfAqaba", "redSeaMain", "deadSea", "seaOfGalilee", "persianGulf"],
    land: ["northAfrica", "arabia"],
    rivers: ["nile", "jordan", "euphrates", "tigris"],
    terrain: [
      { lat: 32, lng: 35.5, rx: 60, ry: 80 },
      { lat: 28, lng: 33.5, rx: 70, ry: 50 },
    ],
    regions: [
      { name: "CANAAN", lat: 32.5, lng: 35, size: 14 },
      { name: "EGYPT", lat: 29, lng: 31, size: 16 },
      { name: "MESOPOTAMIA", lat: 34.5, lng: 43, size: 14 },
    ],
    routes: [
      {
        coords: [
          [30.96, 46.10],[33, 44],[35, 41],[36.87, 39.03],
          [36, 37],[33.51, 36.29],[32.5, 35.5],[31.77, 35.23],
          [31.53, 35.10],[31.25, 34.79],
        ],
        color: C.route, width: 3.5, dash: "10,5",
      },
    ],
    cities: [
      { name: "Ur", lat: 30.96, lng: 46.10, major: true, labelPos: "below" },
      { name: "Haran", lat: 36.87, lng: 39.03, major: true, labelPos: "above" },
      { name: "Damascus", lat: 33.51, lng: 36.29, labelPos: "above" },
      { name: "Shechem", lat: 32.21, lng: 35.28, labelPos: "right" },
      { name: "Hebron", lat: 31.53, lng: 35.10, major: true, labelPos: "left" },
      { name: "Beersheba", lat: 31.25, lng: 34.79, major: true, labelPos: "left" },
      { name: "Bethel", lat: 31.93, lng: 35.24, labelPos: "left" },
      { name: "Jerusalem", lat: 31.77, lng: 35.23, labelPos: "right" },
      { name: "Goshen", lat: 30.85, lng: 31.90, labelPos: "below" },
      { name: "Babylon", lat: 32.54, lng: 44.42, labelPos: "right" },
    ],
    titlePos: { x: 80, y: 72 },
  },
  {
    id: "exodus",
    title: "The Exodus from Egypt",
    bounds: { latMin: 26, latMax: 33, lngMin: 29, lngMax: 37 },
    water: ["mediterranean", "gulfOfSuez", "gulfOfAqaba", "redSeaMain", "deadSea"],
    land: ["northAfrica", "arabia"],
    rivers: ["nile", "jordan"],
    terrain: [
      { lat: 28.5, lng: 33.5, rx: 90, ry: 70 },
      { lat: 31, lng: 35.5, rx: 50, ry: 60 },
    ],
    regions: [
      { name: "EGYPT", lat: 28, lng: 30.5, size: 18 },
      { name: "SINAI", lat: 28.5, lng: 33.8, size: 15 },
      { name: "CANAAN", lat: 32, lng: 35.5, size: 15 },
      { name: "WILDERNESS", lat: 29.5, lng: 34.5, size: 12 },
    ],
    routes: [
      {
        coords: [
          [30.85, 31.90],[30.5, 32.2],[30, 32.5],
          [29.5, 33],[29, 33.5],[28.54, 33.97],
          [29, 34.2],[29.5, 34.5],[30, 34.5],
          [30.5, 34.8],[31, 35],
        ],
        color: C.route, width: 3.5, dash: "10,5",
      },
    ],
    cities: [
      { name: "Goshen", lat: 30.85, lng: 31.90, major: true, labelPos: "above" },
      { name: "Mt. Sinai", lat: 28.54, lng: 33.97, major: true, labelPos: "below" },
      { name: "Kadesh-Barnea", lat: 30.5, lng: 34.5, labelPos: "right" },
      { name: "Jericho", lat: 31.87, lng: 35.44, labelPos: "right" },
      { name: "Jerusalem", lat: 31.77, lng: 35.23, labelPos: "left" },
      { name: "Hebron", lat: 31.53, lng: 35.10, labelPos: "left" },
      { name: "Beersheba", lat: 31.25, lng: 34.79, labelPos: "left" },
    ],
    titlePos: { x: 80, y: 72 },
  },
  {
    id: "kingdom",
    title: "Kingdom of Israel",
    bounds: { latMin: 29.5, latMax: 34, lngMin: 33.5, lngMax: 37 },
    water: ["mediterranean", "deadSea", "seaOfGalilee"],
    rivers: ["jordan"],
    terrain: [
      { lat: 31.5, lng: 35.3, rx: 70, ry: 100 },
      { lat: 33, lng: 35.5, rx: 50, ry: 40 },
    ],
    regions: [
      { name: "JUDAH", lat: 31.2, lng: 35, size: 16 },
      { name: "ISRAEL", lat: 32.8, lng: 35.3, size: 16 },
      { name: "PHILISTIA", lat: 31.5, lng: 34.4, size: 13 },
      { name: "MOAB", lat: 31.3, lng: 35.8, size: 13 },
    ],
    cities: [
      { name: "Jerusalem", lat: 31.77, lng: 35.23, major: true, labelPos: "left" },
      { name: "Bethlehem", lat: 31.70, lng: 35.21, labelPos: "right" },
      { name: "Hebron", lat: 31.53, lng: 35.10, major: true, labelPos: "left" },
      { name: "Beersheba", lat: 31.25, lng: 34.79, labelPos: "below" },
      { name: "Samaria", lat: 32.28, lng: 35.19, major: true, labelPos: "left" },
      { name: "Shechem", lat: 32.21, lng: 35.28, labelPos: "right" },
      { name: "Jericho", lat: 31.87, lng: 35.44, labelPos: "right" },
      { name: "Capernaum", lat: 32.88, lng: 35.57, labelPos: "above" },
      { name: "Nazareth", lat: 32.70, lng: 35.30, labelPos: "left" },
      { name: "Dan", lat: 33.25, lng: 35.65, labelPos: "right" },
      { name: "Megiddo", lat: 32.58, lng: 35.18, labelPos: "left" },
    ],
    titlePos: { x: 80, y: 72 },
  },
  {
    id: "exile",
    title: "Exile and Return",
    bounds: { latMin: 28, latMax: 37, lngMin: 32, lngMax: 48 },
    water: ["mediterranean", "deadSea", "seaOfGalilee", "persianGulf"],
    rivers: ["jordan", "euphrates", "tigris"],
    terrain: [
      { lat: 32, lng: 35.5, rx: 50, ry: 60 },
      { lat: 35, lng: 43, rx: 100, ry: 50 },
    ],
    regions: [
      { name: "JUDAH", lat: 31.3, lng: 35, size: 14 },
      { name: "BABYLONIA", lat: 32, lng: 44, size: 16 },
      { name: "ASSYRIA", lat: 35.5, lng: 43, size: 15 },
      { name: "MEDIA", lat: 35, lng: 47, size: 14 },
    ],
    routes: [
      {
        coords: [
          [31.77, 35.23],[32.5, 36],[33.51, 36.29],
          [34.5, 38],[35, 40],[34.5, 42],[33.5, 43.5],[32.54, 44.42],
        ],
        color: C.route, width: 3, dash: "10,5",
      },
      {
        coords: [
          [32.54, 44.42],[33, 43],[34, 41],[35, 39.5],
          [34.5, 37.5],[33.51, 36.29],[32, 35.5],[31.77, 35.23],
        ],
        color: "#2E7D32", width: 2.5, dash: "6,4",
      },
    ],
    cities: [
      { name: "Jerusalem", lat: 31.77, lng: 35.23, major: true, labelPos: "left" },
      { name: "Babylon", lat: 32.54, lng: 44.42, major: true, labelPos: "right" },
      { name: "Nineveh", lat: 36.36, lng: 43.15, major: true, labelPos: "right" },
      { name: "Damascus", lat: 33.51, lng: 36.29, labelPos: "above" },
      { name: "Susa", lat: 32.19, lng: 48.26, labelPos: "right" },
    ],
    titlePos: { x: 80, y: 72 },
  },
  {
    id: "early-church",
    title: "World of the Early Church",
    bounds: { latMin: 28, latMax: 43, lngMin: 10, lngMax: 40 },
    water: ["mediterranean", "blackSea"],
    land: ["greece", "italy", "sicily", "cyprus", "crete", "turkeyInterior", "northAfrica"],
    rivers: ["nile", "jordan"],
    terrain: [
      { lat: 38, lng: 32, rx: 100, ry: 60 },
      { lat: 31, lng: 35, rx: 40, ry: 50 },
    ],
    regions: [
      { name: "ASIA MINOR", lat: 39, lng: 32, size: 16 },
      { name: "MACEDONIA", lat: 41, lng: 23, size: 13 },
      { name: "ACHAIA", lat: 38, lng: 22, size: 12 },
      { name: "EGYPT", lat: 29.5, lng: 30, size: 14 },
      { name: "SYRIA", lat: 35, lng: 37, size: 13 },
      { name: "ITALIA", lat: 42, lng: 12.5, size: 13 },
    ],
    cities: [
      { name: "Jerusalem", lat: 31.77, lng: 35.23, major: true, labelPos: "below" },
      { name: "Antioch", lat: 36.20, lng: 36.16, major: true, labelPos: "right" },
      { name: "Ephesus", lat: 37.94, lng: 27.34, major: true, labelPos: "below" },
      { name: "Corinth", lat: 37.91, lng: 22.88, major: true, labelPos: "below" },
      { name: "Rome", lat: 41.90, lng: 12.50, major: true, labelPos: "right" },
      { name: "Thessalonica", lat: 40.63, lng: 22.94, labelPos: "above" },
      { name: "Philippi", lat: 41.01, lng: 24.29, labelPos: "above" },
      { name: "Athens", lat: 37.97, lng: 23.72, labelPos: "left" },
      { name: "Alexandria", lat: 31.20, lng: 29.92, labelPos: "below" },
      { name: "Caesarea", lat: 32.50, lng: 34.89, labelPos: "left" },
    ],
    titlePos: { x: 80, y: 72 },
  },
  {
    id: "paul-1",
    title: "Paul's First Missionary Journey",
    bounds: { latMin: 33, latMax: 40, lngMin: 27, lngMax: 38 },
    water: ["mediterranean"],
    land: ["cyprus", "turkeyInterior"],
    rivers: [],
    terrain: [
      { lat: 38, lng: 33, rx: 100, ry: 50 },
    ],
    regions: [
      { name: "ASIA MINOR", lat: 39, lng: 32, size: 15 },
      { name: "CYPRUS", lat: 34.5, lng: 33, size: 13 },
      { name: "SYRIA", lat: 35.5, lng: 37, size: 14 },
    ],
    routes: [
      {
        coords: [
          [36.20, 36.16],[36, 35],[35.5, 33.5],[35, 33],
          [34.7, 33],[34.6, 32.5],
          [35.4, 32],[36, 30],[37, 28.5],
          [37.8, 30],[38, 31],[37.5, 32],
          [37, 32.5],[36.8, 34.5],[36.2, 36],
        ],
        color: C.route, width: 3.5,
      },
    ],
    cities: [
      { name: "Antioch", lat: 36.20, lng: 36.16, major: true, labelPos: "right" },
      { name: "Seleucia", lat: 36.10, lng: 35.90, labelPos: "left" },
      { name: "Salamis", lat: 35.18, lng: 33.90, labelPos: "right" },
      { name: "Paphos", lat: 34.76, lng: 32.42, labelPos: "below" },
      { name: "Perga", lat: 36.96, lng: 30.85, labelPos: "above" },
      { name: "Pisidian Antioch", lat: 38.30, lng: 31.18, labelPos: "above" },
      { name: "Iconium", lat: 37.87, lng: 32.49, labelPos: "above" },
      { name: "Lystra", lat: 37.58, lng: 32.35, labelPos: "below" },
      { name: "Derbe", lat: 37.36, lng: 33.34, labelPos: "below" },
      { name: "Attalia", lat: 36.88, lng: 30.69, labelPos: "below" },
    ],
    titlePos: { x: 80, y: 72 },
  },
  {
    id: "paul-2",
    title: "Paul's Second Missionary Journey",
    bounds: { latMin: 33, latMax: 42, lngMin: 20, lngMax: 38 },
    water: ["mediterranean", "blackSea"],
    land: ["greece", "cyprus", "crete", "turkeyInterior"],
    rivers: [],
    terrain: [
      { lat: 39, lng: 32, rx: 80, ry: 40 },
    ],
    regions: [
      { name: "ASIA MINOR", lat: 39.5, lng: 32, size: 14 },
      { name: "MACEDONIA", lat: 41, lng: 23, size: 13 },
      { name: "ACHAIA", lat: 37.5, lng: 22, size: 12 },
    ],
    routes: [
      {
        coords: [
          [36.20, 36.16],[37, 34],[37.5, 32.5],[38, 31],
          [39, 30],[40, 28],[40.5, 26.5],
          [41.01, 24.29],[40.63, 22.94],
          [39.5, 23],[38.5, 23.5],[37.97, 23.72],
          [37.91, 22.88],
        ],
        color: C.route, width: 3.5,
      },
      {
        coords: [
          [37.91, 22.88],[38, 24],[38.5, 26],
          [37.94, 27.34],[36.5, 29],[36.2, 33],
          [35.5, 34],[34.5, 35.8],[33.5, 35.5],
          [32.5, 35],[31.77, 35.23],
        ],
        color: C.route, width: 3.5, dash: "8,4",
      },
    ],
    cities: [
      { name: "Antioch", lat: 36.20, lng: 36.16, major: true, labelPos: "right" },
      { name: "Philippi", lat: 41.01, lng: 24.29, major: true, labelPos: "above" },
      { name: "Thessalonica", lat: 40.63, lng: 22.94, major: true, labelPos: "left" },
      { name: "Athens", lat: 37.97, lng: 23.72, major: true, labelPos: "below" },
      { name: "Corinth", lat: 37.91, lng: 22.88, major: true, labelPos: "below" },
      { name: "Ephesus", lat: 37.94, lng: 27.34, major: true, labelPos: "below" },
      { name: "Troas", lat: 39.95, lng: 26.24, labelPos: "left" },
      { name: "Berea", lat: 40.52, lng: 22.20, labelPos: "left" },
      { name: "Derbe", lat: 37.36, lng: 33.34, labelPos: "below" },
      { name: "Jerusalem", lat: 31.77, lng: 35.23, labelPos: "left" },
    ],
    titlePos: { x: 80, y: 72 },
  },
  {
    id: "paul-3",
    title: "Paul's Third Missionary Journey",
    bounds: { latMin: 33, latMax: 42, lngMin: 20, lngMax: 38 },
    water: ["mediterranean", "blackSea"],
    land: ["greece", "cyprus", "crete", "turkeyInterior"],
    rivers: [],
    terrain: [
      { lat: 39, lng: 32, rx: 80, ry: 40 },
    ],
    regions: [
      { name: "ASIA MINOR", lat: 39.5, lng: 32, size: 14 },
      { name: "MACEDONIA", lat: 41, lng: 23, size: 13 },
      { name: "ACHAIA", lat: 37.5, lng: 22, size: 12 },
    ],
    routes: [
      {
        coords: [
          [36.20, 36.16],[37, 34],[37.5, 32.5],
          [37.94, 27.34],
        ],
        color: C.route, width: 3.5,
      },
      {
        coords: [
          [37.94, 27.34],[38.5, 26],[39.5, 24],
          [40.63, 22.94],[39.5, 23],
          [38.5, 23.5],[37.91, 22.88],
        ],
        color: C.route, width: 3.5,
      },
      {
        coords: [
          [37.91, 22.88],[38.5, 24],[39.5, 24.5],
          [40.5, 25],[41.01, 24.29],
          [40, 26],[38, 26.5],[37.94, 27.34],
          [37, 28.5],[36.5, 30],[36.8, 34.5],
          [35.5, 35.5],[34, 35.5],[33, 35.2],
          [32.5, 35],[31.77, 35.23],
        ],
        color: C.route, width: 3.5, dash: "8,4",
      },
    ],
    cities: [
      { name: "Antioch", lat: 36.20, lng: 36.16, major: true, labelPos: "right" },
      { name: "Ephesus", lat: 37.94, lng: 27.34, major: true, labelPos: "below" },
      { name: "Philippi", lat: 41.01, lng: 24.29, major: true, labelPos: "above" },
      { name: "Thessalonica", lat: 40.63, lng: 22.94, labelPos: "left" },
      { name: "Corinth", lat: 37.91, lng: 22.88, major: true, labelPos: "below" },
      { name: "Troas", lat: 39.95, lng: 26.24, labelPos: "left" },
      { name: "Miletus", lat: 37.53, lng: 27.28, labelPos: "right" },
      { name: "Tyre", lat: 33.27, lng: 35.20, labelPos: "left" },
      { name: "Caesarea", lat: 32.50, lng: 34.89, labelPos: "left" },
      { name: "Jerusalem", lat: 31.77, lng: 35.23, major: true, labelPos: "left" },
    ],
    titlePos: { x: 80, y: 72 },
  },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const svgDir = path.join(OUT_DIR, "svg");
  fs.mkdirSync(svgDir, { recursive: true });

  for (const map of MAPS) {
    const svg = buildSVG(map);
    const svgPath = path.join(svgDir, `${map.id}.svg`);
    fs.writeFileSync(svgPath, svg);
    console.log(`SVG: ${svgPath}`);
  }

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch (e) {
    console.error("sharp not available, SVGs saved but no PNG conversion");
    return;
  }

  for (const map of MAPS) {
    const svgPath = path.join(svgDir, `${map.id}.svg`);
    const pngPath = path.join(OUT_DIR, `${map.id}.png`);
    const svgBuf = fs.readFileSync(svgPath);
    await sharp(svgBuf, { density: 150 })
      .resize(W, H)
      .png({ quality: 95, compressionLevel: 6 })
      .toFile(pngPath);
    console.log(`PNG: ${pngPath}`);
  }

  console.log("\nDone! Generated 9 map plates.");
}

main().catch(console.error);
