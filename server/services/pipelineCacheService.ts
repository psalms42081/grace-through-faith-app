import fs from "fs";
import path from "path";
import crypto from "crypto";

const CACHE_DIR = path.join(process.cwd(), "data", "pipeline-cache");

interface PipelineCacheEntry {
  episodeId: string;
  promptHash: string;
  type: "image" | "video";
  url: string;
  createdAt: string;
  prompt: string;
}

interface PipelineCacheData {
  version: 1;
  entries: Record<string, PipelineCacheEntry>;
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCacheFilePath(episodeId: string): string {
  return path.join(CACHE_DIR, `${episodeId}.json`);
}

function loadCache(episodeId: string): PipelineCacheData {
  ensureCacheDir();
  const filePath = getCacheFilePath(episodeId);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (data.version === 1) return data;
    } catch {}
  }
  return { version: 1, entries: {} };
}

function saveCache(episodeId: string, cache: PipelineCacheData) {
  ensureCacheDir();
  fs.writeFileSync(getCacheFilePath(episodeId), JSON.stringify(cache, null, 2));
}

function hashPrompt(prompt: string): string {
  return crypto.createHash("sha256").update(prompt).digest("hex").substring(0, 16);
}

function makeKey(type: "image" | "video", sceneKey: string, promptHash: string): string {
  return `${type}:${sceneKey}:${promptHash}`;
}

export function getCachedImage(episodeId: string, sceneKey: string, prompt: string): string | null {
  const cache = loadCache(episodeId);
  const key = makeKey("image", sceneKey, hashPrompt(prompt));
  const entry = cache.entries[key];
  if (entry) {
    console.log(`[pipeline-cache] HIT image for scene "${sceneKey}" (hash: ${entry.promptHash})`);
    return entry.url;
  }
  console.log(`[pipeline-cache] MISS image for scene "${sceneKey}"`);
  return null;
}

export function setCachedImage(episodeId: string, sceneKey: string, prompt: string, url: string) {
  const cache = loadCache(episodeId);
  const ph = hashPrompt(prompt);
  const key = makeKey("image", sceneKey, ph);
  cache.entries[key] = {
    episodeId,
    promptHash: ph,
    type: "image",
    url,
    createdAt: new Date().toISOString(),
    prompt: prompt.substring(0, 200),
  };
  saveCache(episodeId, cache);
  console.log(`[pipeline-cache] STORED image for scene "${sceneKey}" (hash: ${ph})`);
}

export function getCachedVideo(episodeId: string, sceneIndex: number, imageUrl: string, motionPrompt: string): string | null {
  const cache = loadCache(episodeId);
  const combinedKey = `${imageUrl}|${motionPrompt}`;
  const key = makeKey("video", `scene-${sceneIndex}`, hashPrompt(combinedKey));
  const entry = cache.entries[key];
  if (entry) {
    console.log(`[pipeline-cache] HIT video for scene ${sceneIndex + 1} (hash: ${entry.promptHash})`);
    return entry.url;
  }
  console.log(`[pipeline-cache] MISS video for scene ${sceneIndex + 1}`);
  return null;
}

export function setCachedVideo(episodeId: string, sceneIndex: number, imageUrl: string, motionPrompt: string, url: string) {
  const cache = loadCache(episodeId);
  const combinedKey = `${imageUrl}|${motionPrompt}`;
  const ph = hashPrompt(combinedKey);
  const key = makeKey("video", `scene-${sceneIndex}`, ph);
  cache.entries[key] = {
    episodeId,
    promptHash: ph,
    type: "video",
    url,
    createdAt: new Date().toISOString(),
    prompt: motionPrompt.substring(0, 200),
  };
  saveCache(episodeId, cache);
  console.log(`[pipeline-cache] STORED video for scene ${sceneIndex + 1} (hash: ${ph})`);
}

export function getCacheStats(episodeId: string): { images: number; videos: number; total: number } {
  const cache = loadCache(episodeId);
  let images = 0, videos = 0;
  for (const entry of Object.values(cache.entries)) {
    if (entry.type === "image") images++;
    else videos++;
  }
  return { images, videos, total: images + videos };
}

export function clearCache(episodeId: string) {
  const filePath = getCacheFilePath(episodeId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[pipeline-cache] Cleared cache for ${episodeId}`);
  }
}
