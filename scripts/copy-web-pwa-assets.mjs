import { copyFile, access, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const distDir = resolve(root, "dist");
const indexPath = resolve(distDir, "index.html");
const swSourcePath = resolve(root, "public", "sw.js");
const swDestPath = resolve(distDir, "sw.js");
const manifestFrom = resolve(root, "public", "manifest.json");
const manifestTo = resolve(distDir, "manifest.json");

await access(indexPath);

const indexHtml = await readFile(indexPath, "utf8");
const buildId = createHash("sha256").update(indexHtml).digest("hex").slice(0, 12);

let swSource = await readFile(swSourcePath, "utf8");
if (!swSource.includes("__SW_BUILD_ID__")) {
  throw new Error("public/sw.js is missing the __SW_BUILD_ID__ placeholder");
}
swSource = swSource.replaceAll("__SW_BUILD_ID__", buildId);
await writeFile(swDestPath, swSource, "utf8");

await copyFile(manifestFrom, manifestTo);

console.log(`Copied PWA assets into dist/ (sw build id ${buildId})`);
