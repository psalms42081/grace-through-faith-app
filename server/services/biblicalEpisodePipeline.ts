import { db } from "../db";
import { biblicalEpisodes } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { generateBrollImage, generateBrollVideo } from "./runwayService";
import { generateLumaImage, generateLumaVideo, type LumaStyle, type LumaVideoModel, type LumaImageModel } from "./lumaService";
import { generateCinematicVoiceover } from "./cinematicVoiceoverService";
import {
  computeSceneTimings,
  getAudioDurationFromFile,
} from "./timingEngineService";
import { assembleCinematicVideo } from "./cinematicAssemblyService";
import type { CinematicScene } from "./sceneDirectorService";
import {
  getCachedImage,
  setCachedImage,
  getCachedVideo,
  setCachedVideo,
  getCacheStats,
} from "./pipelineCacheService";
import fs from "fs";
import path from "path";

const CLOUDINARY_CLOUD_NAME = "dy77gwpzu";
const MUSIC_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/grace-through-faith/music`;

export type VideoProvider = "runway" | "luma";

export interface EpisodeGenerationConfig {
  episodeId: string;
  script: string;
  voiceId: string;
  musicTrack: string;
  scenes: EpisodeSceneConfig[];
  scriptureAnchor: string;
  episodeTitle: string;
  cachedVoiceoverUrl?: string;
  videoProvider?: VideoProvider;
  lumaStyle?: LumaStyle;
  lumaDuration?: "5s" | "9s";
  lumaVideoModel?: LumaVideoModel;
  lumaImageModel?: LumaImageModel;
}

export interface EpisodeSceneConfig {
  sceneNumber: number;
  scriptSlice: string;
  emotion: string;
  imagePrompt: string;
  motionPrompt: string;
  durationHint: number;
  location: string;
  referenceImageUrl?: string;
  characterReferenceUrls?: string[];
  preRenderedVideoUrl?: string;
  lumaDuration?: "5s" | "9s";
}

function toCinematicScenes(configs: EpisodeSceneConfig[]): CinematicScene[] {
  return configs.map((c) => ({
    sceneNumber: c.sceneNumber,
    scriptSlice: c.scriptSlice,
    emotion: c.emotion,
    imagePrompt: c.imagePrompt,
    motionPrompt: c.motionPrompt,
    durationHint: c.durationHint,
    location: c.location,
  }));
}

export async function runBiblicalEpisodePipeline(
  config: EpisodeGenerationConfig
): Promise<string> {
  const {
    episodeId,
    script,
    voiceId,
    musicTrack,
    scenes: sceneConfigs,
    scriptureAnchor,
    episodeTitle,
  } = config;

  const provider = config.videoProvider || "runway";
  const lumaStyle = config.lumaStyle || "cinematic";
  const defaultLumaDuration = config.lumaDuration || "5s";
  const lumaVideoModel: LumaVideoModel = config.lumaVideoModel || "ray-2";
  const lumaImageModel: LumaImageModel = config.lumaImageModel || "photon-1";

  console.log(
    `[biblical-episode-pipeline] ========== Starting pipeline for "${episodeTitle}" (${episodeId}) ==========`
  );
  console.log(
    `[biblical-episode-pipeline] Provider: ${provider}${provider === "luma" ? ` (style: ${lumaStyle}, video: ${lumaVideoModel}, image: ${lumaImageModel}, default duration: ${defaultLumaDuration})` : ""}`
  );

  const scenes = toCinematicScenes(sceneConfigs);
  const musicTrackUrl = `${MUSIC_BASE_URL}/${musicTrack}`;

  try {
    const cacheStats = getCacheStats(episodeId);
    console.log(
      `[biblical-episode-pipeline] Stage 1/${7}: Generating ${scenes.length} B-roll anchor images via ${provider === "luma" ? "Luma" : "Runway"}...`
    );
    console.log(
      `[biblical-episode-pipeline] Cache status: ${cacheStats.images} cached images, ${cacheStats.videos} cached videos`
    );

    const locationMap = new Map<string, number>();
    for (const scene of scenes) {
      const loc = scene.location || `scene-${scene.sceneNumber}`;
      if (!locationMap.has(loc)) {
        locationMap.set(loc, scene.sceneNumber - 1);
      }
    }

    const uniqueLocations = Array.from(locationMap.entries());
    console.log(
      `[biblical-episode-pipeline] ${uniqueLocations.length} unique location(s): ${uniqueLocations.map(([loc]) => loc).join(", ")}`
    );

    const anchorImages = new Map<string, string>();
    let primaryAnchorUrl = "";

    if (provider === "luma") {
      const toGenerate: Array<{ loc: string; firstSceneIdx: number }> = [];
      for (const [loc, firstSceneIdx] of uniqueLocations) {
        const sceneConfig = sceneConfigs[firstSceneIdx];
        const anchorScene = scenes[firstSceneIdx];

        if (sceneConfig.referenceImageUrl) {
          anchorImages.set(loc, sceneConfig.referenceImageUrl);
          if (!primaryAnchorUrl) primaryAnchorUrl = sceneConfig.referenceImageUrl;
          console.log(`[biblical-episode-pipeline]   Pre-supplied reference for "${loc}"`);
        } else {
          const cachedUrl = getCachedImage(episodeId, loc, anchorScene.imagePrompt);
          if (cachedUrl) {
            anchorImages.set(loc, cachedUrl);
            if (!primaryAnchorUrl) primaryAnchorUrl = cachedUrl;
            console.log(`[biblical-episode-pipeline]   CACHED anchor for "${loc}": ${cachedUrl.substring(0, 80)}...`);
          } else {
            toGenerate.push({ loc, firstSceneIdx });
          }
        }
      }

      if (toGenerate.length > 0) {
        console.log(`[biblical-episode-pipeline]   Generating ${toGenerate.length} anchor image(s) in parallel via Luma...`);
        const imageResults = await Promise.all(
          toGenerate.map(async ({ loc, firstSceneIdx }) => {
            const anchorScene = scenes[firstSceneIdx];
            console.log(`[biblical-episode-pipeline]   [parallel] Generating anchor for "${loc}"...`);
            const url = await generateLumaImage(anchorScene.imagePrompt, lumaStyle, lumaImageModel);
            return { loc, firstSceneIdx, url, prompt: anchorScene.imagePrompt };
          })
        );

        for (const { loc, url, prompt } of imageResults) {
          anchorImages.set(loc, url);
          if (!primaryAnchorUrl) primaryAnchorUrl = url;
          setCachedImage(episodeId, loc, prompt, url);
          console.log(`[biblical-episode-pipeline]   Anchor for "${loc}": ${url.substring(0, 80)}...`);
        }
      }
    } else {
      for (const [loc, firstSceneIdx] of uniqueLocations) {
        const anchorScene = scenes[firstSceneIdx];
        const sceneConfig = sceneConfigs[firstSceneIdx];

        if (sceneConfig.referenceImageUrl) {
          console.log(
            `[biblical-episode-pipeline]   Using pre-supplied reference image for "${loc}" from scene ${firstSceneIdx + 1}`
          );
          anchorImages.set(loc, sceneConfig.referenceImageUrl);
          if (!primaryAnchorUrl) primaryAnchorUrl = sceneConfig.referenceImageUrl;
          console.log(
            `[biblical-episode-pipeline]   Reference for "${loc}": ${sceneConfig.referenceImageUrl.substring(0, 80)}...`
          );
        } else {
          const cachedUrl = getCachedImage(episodeId, loc, anchorScene.imagePrompt);
          if (cachedUrl) {
            anchorImages.set(loc, cachedUrl);
            if (!primaryAnchorUrl) primaryAnchorUrl = cachedUrl;
            console.log(
              `[biblical-episode-pipeline]   CACHED anchor for "${loc}": ${cachedUrl.substring(0, 80)}...`
            );
          } else {
            const charRefs = sceneConfig.characterReferenceUrls;
            console.log(
              `[biblical-episode-pipeline]   Generating anchor for "${loc}" from scene ${firstSceneIdx + 1}${charRefs?.length ? ` (with ${charRefs.length} character refs)` : ""}...`
            );
            const anchorUrl = await generateBrollImage(anchorScene.imagePrompt, charRefs);
            anchorImages.set(loc, anchorUrl);
            if (!primaryAnchorUrl) primaryAnchorUrl = anchorUrl;
            setCachedImage(episodeId, loc, anchorScene.imagePrompt, anchorUrl);
            console.log(
              `[biblical-episode-pipeline]   Anchor for "${loc}": ${anchorUrl.substring(0, 80)}...`
            );
          }
        }
      }
    }

    console.log(
      `[biblical-episode-pipeline] Stage 2/7: Animating ${scenes.length} scenes into videos via ${provider === "luma" ? "Luma" : "Runway"}...`
    );

    const sceneVideoUrls: string[] = new Array(scenes.length);
    const scenesToAnimate: Array<{ index: number; anchorImageUrl: string; motionPrompt: string; lumaDur: "5s" | "9s" }> = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneConfig = sceneConfigs[i];
      const loc = scene.location || `scene-${scene.sceneNumber}`;
      const anchorImageUrl = anchorImages.get(loc) || primaryAnchorUrl;

      if (sceneConfig.preRenderedVideoUrl) {
        sceneVideoUrls[i] = sceneConfig.preRenderedVideoUrl;
        console.log(
          `[biblical-episode-pipeline]   Scene ${i + 1}/${scenes.length} PRE-RENDERED: ${sceneConfig.preRenderedVideoUrl.substring(0, 80)}...`
        );
        continue;
      }

      const cachedVideoUrl = getCachedVideo(episodeId, i, anchorImageUrl, scene.motionPrompt);
      if (cachedVideoUrl) {
        sceneVideoUrls[i] = cachedVideoUrl;
        console.log(
          `[biblical-episode-pipeline]   Scene ${i + 1}/${scenes.length} CACHED: ${cachedVideoUrl.substring(0, 80)}...`
        );
        continue;
      }

      const lumaDur = sceneConfig.lumaDuration || defaultLumaDuration;
      scenesToAnimate.push({ index: i, anchorImageUrl, motionPrompt: scene.motionPrompt, lumaDur });
      console.log(
        `[biblical-episode-pipeline]   Scene ${i + 1}/${scenes.length} [${scene.emotion}] @${loc}: "${scene.motionPrompt.substring(0, 60)}..."${provider === "luma" ? ` (${lumaDur})` : ""}`
      );
    }

    if (scenesToAnimate.length > 0) {
      if (provider === "luma") {
        console.log(`[biblical-episode-pipeline]   Animating ${scenesToAnimate.length} scene(s) in parallel via Luma...`);
        const videoResults = await Promise.all(
          scenesToAnimate.map(async ({ index, anchorImageUrl, motionPrompt, lumaDur }) => {
            try {
              const videoUrl = await generateLumaVideo(anchorImageUrl, motionPrompt, lumaDur, lumaVideoModel);
              return { index, videoUrl, anchorImageUrl, motionPrompt };
            } catch (err) {
              console.warn(`[biblical-episode-pipeline]   Scene ${index + 1} failed, retrying with simplified motion...`);
              const videoUrl = await generateLumaVideo(anchorImageUrl, "The camera slowly pushes in. Subtle atmospheric motion.", lumaDur, lumaVideoModel);
              return { index, videoUrl, anchorImageUrl, motionPrompt };
            }
          })
        );

        for (const { index, videoUrl, anchorImageUrl, motionPrompt } of videoResults) {
          sceneVideoUrls[index] = videoUrl;
          setCachedVideo(episodeId, index, anchorImageUrl, motionPrompt, videoUrl);
          console.log(`[biblical-episode-pipeline]   Scene ${index + 1} video complete: ${videoUrl.substring(0, 80)}...`);
        }
      } else {
        for (const { index, anchorImageUrl, motionPrompt } of scenesToAnimate) {
          let videoUrl: string;
          try {
            videoUrl = await generateBrollVideo(anchorImageUrl, motionPrompt);
          } catch (err) {
            console.warn(`[biblical-episode-pipeline]   Scene ${index + 1} failed, retrying with simplified motion...`);
            videoUrl = await generateBrollVideo(anchorImageUrl, "The camera slowly pushes in. Subtle atmospheric motion.");
          }
          sceneVideoUrls[index] = videoUrl;
          setCachedVideo(episodeId, index, anchorImageUrl, motionPrompt, videoUrl);
          console.log(`[biblical-episode-pipeline]   Scene ${index + 1} video complete: ${videoUrl.substring(0, 80)}...`);
        }
      }
    }

    let voiceoverUrl: string;
    if (config.cachedVoiceoverUrl) {
      voiceoverUrl = config.cachedVoiceoverUrl;
      console.log(
        `[biblical-episode-pipeline] Stage 3/7: Using cached voiceover: ${voiceoverUrl.substring(0, 80)}...`
      );
    } else {
      console.log(
        `[biblical-episode-pipeline] Stage 3/7: Generating ElevenLabs voiceover with voice=${voiceId}...`
      );
      voiceoverUrl = await generateCinematicVoiceover(
        script,
        voiceId,
        episodeId
      );
      console.log(
        `[biblical-episode-pipeline] Voiceover generated: ${voiceoverUrl.substring(0, 80)}...`
      );
    }

    console.log(
      `[biblical-episode-pipeline] Stage 4/7: Computing scene timings...`
    );
    const voiceoverTmpPath = path.join(
      "/tmp",
      `vo-timing-ep-${episodeId}-${Date.now()}.mp3`
    );
    const voResponse = await fetch(voiceoverUrl);
    const voBuf = Buffer.from(await voResponse.arrayBuffer());
    fs.writeFileSync(voiceoverTmpPath, voBuf);

    const audioDuration = getAudioDurationFromFile(voiceoverTmpPath);
    console.log(
      `[biblical-episode-pipeline] Voiceover duration: ${audioDuration.toFixed(1)}s`
    );

    const sceneTimings = computeSceneTimings(scenes, audioDuration);

    try {
      fs.unlinkSync(voiceoverTmpPath);
    } catch {}

    console.log(
      `[biblical-episode-pipeline] Stage 5/7: FFmpeg cinematic assembly...`
    );
    const assembledVideoUrl = await assembleCinematicVideo(
      sceneVideoUrls,
      sceneTimings,
      voiceoverUrl,
      musicTrackUrl,
      episodeTitle,
      episodeId,
      scriptureAnchor
    );
    console.log(
      `[biblical-episode-pipeline] Assembly complete: ${assembledVideoUrl}`
    );

    console.log(
      `[biblical-episode-pipeline] Stage 6/7: Generating thumbnail...`
    );
    const thumbnailUrl = assembledVideoUrl
      .replace(
        "/video/upload/",
        "/video/upload/w_1080,h_1920,c_fill,so_3,f_jpg/"
      )
      .replace(/\.mp4$/, ".jpg");

    console.log(
      `[biblical-episode-pipeline] Stage 7/7: Updating biblical_episode record...`
    );
    await db
      .update(biblicalEpisodes)
      .set({
        videoUrl: assembledVideoUrl,
        duration: Math.round(audioDuration),
        status: "complete",
      })
      .where(eq(biblicalEpisodes.id, episodeId));

    console.log(
      `[biblical-episode-pipeline] ========== PIPELINE COMPLETE for "${episodeTitle}" ==========`
    );
    console.log(`[biblical-episode-pipeline]   Video: ${assembledVideoUrl}`);
    console.log(`[biblical-episode-pipeline]   Thumbnail: ${thumbnailUrl}`);
    console.log(
      `[biblical-episode-pipeline]   Duration: ${audioDuration.toFixed(1)}s`
    );

    return assembledVideoUrl;
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    console.error(
      `[biblical-episode-pipeline] FAILED for "${episodeTitle}":`,
      errorMsg
    );

    try {
      await db
        .update(biblicalEpisodes)
        .set({ status: "failed" })
        .where(eq(biblicalEpisodes.id, episodeId));
    } catch (dbErr) {
      console.error(
        `[biblical-episode-pipeline] Could not update failure status:`,
        dbErr
      );
    }

    throw error;
  }
}
