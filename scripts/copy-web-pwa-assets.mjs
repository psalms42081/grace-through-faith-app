import { copyFile, access } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const distDir = resolve(root, "dist");
const files = [
  ["public/sw.js", "dist/sw.js"],
  ["public/manifest.json", "dist/manifest.json"],
];

await access(resolve(distDir, "index.html"));

for (const [from, to] of files) {
  await copyFile(resolve(root, from), resolve(root, to));
}

console.log("Copied public/sw.js and public/manifest.json into dist/");
