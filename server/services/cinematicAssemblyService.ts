import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { getFFmpegPath, getFFprobePath } from "./ffmpegPath";
import type { SceneTiming } from "./timingEngineService";

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;
const MUSIC_VOLUME = 0.06;
const END_CARD_DURATION = 4;
const SCENE_TRANSITION_DURATION = 0.8;

const CLOUDINARY_CLOUD_NAME = "dy77gwpzu";
const LOGO_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/grace-through-faith/logo.png`;

function findFontPath(): string | null {
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  try {
    const result = execSync(
      "fc-list :style=Bold -f '%{file}\\n' 2>/dev/null | head -1",
      { encoding: "utf-8", timeout: 3000 }
    ).trim();
    if (result && fs.existsSync(result)) return result;
  } catch {}
  return null;
}

function ensureCloudinaryConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary credentials");
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download ${url}: ${response.status} ${response.statusText}`
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  console.log(
    `[cinematic-assembly] Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB → ${path.basename(destPath)}`
  );
}

function getVideoDuration(filePath: string): number {
  const ffprobe = getFFprobePath();
  const result = execSync(
    `"${ffprobe}" -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
    { stdio: "pipe", timeout: 15000 }
  )
    .toString()
    .trim();
  return parseFloat(result);
}

export async function assembleCinematicVideo(
  sceneVideoUrls: string[],
  sceneTimings: SceneTiming[],
  voiceoverUrl: string,
  musicTrackUrl: string,
  topicTitle: string,
  topicId: string,
  scriptureAnchor: string | null
): Promise<string> {
  const tmpDir = path.join("/tmp", `cinematic-${topicId}-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const ffmpeg = getFFmpegPath();
  const ffprobe = getFFprobePath();

  try {
    console.log(
      `[cinematic-assembly] Starting assembly for "${topicTitle}" (${topicId})`
    );
    console.log(
      `[cinematic-assembly] ${sceneVideoUrls.length} scenes, voiceover + music`
    );

    console.log("[cinematic-assembly] Step 1: Downloading assets...");
    const voiceoverPath = path.join(tmpDir, "voiceover.mp3");
    const musicPath = path.join(tmpDir, "music.mp3");

    await downloadFile(voiceoverUrl, voiceoverPath);
    await downloadFile(musicTrackUrl, musicPath);

    const scenePaths: string[] = [];
    for (let i = 0; i < sceneVideoUrls.length; i++) {
      const scenePath = path.join(tmpDir, `scene_${i}.mp4`);
      await downloadFile(sceneVideoUrls[i], scenePath);
      scenePaths.push(scenePath);
    }

    console.log(
      "[cinematic-assembly] Step 2: Time-stretching scenes to match timing..."
    );
    const stretchedPaths: string[] = [];
    const MAX_SLOWMO_FACTOR = 2.0;

    for (let i = 0; i < scenePaths.length; i++) {
      const timing = sceneTimings[i];
      const clipDuration = getVideoDuration(scenePaths[i]);
      const isLastScene = i === scenePaths.length - 1;
      const transitionBuffer = isLastScene ? 0 : SCENE_TRANSITION_DURATION / 2;
      const targetDuration = timing.targetDuration + transitionBuffer;
      const stretchedPath = path.join(tmpDir, `stretched_${i}.mp4`);

      const scaledClipPath = path.join(tmpDir, `scaled_${i}.mp4`);
      execSync(
        `"${ffmpeg}" -y -i "${scenePaths[i]}" ` +
          `-vf "scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease,pad=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,fps=30,format=yuv420p" ` +
          `-c:v libx264 -preset ultrafast -crf 23 -an "${scaledClipPath}"`,
        { stdio: "pipe", timeout: 120000 }
      );
      const scaledDuration = getVideoDuration(scaledClipPath);

      if (targetDuration <= scaledDuration + 0.5) {
        execSync(
          `"${ffmpeg}" -y -i "${scaledClipPath}" -t ${targetDuration.toFixed(3)} -c:v libx264 -preset ultrafast -crf 23 -an "${stretchedPath}"`,
          { stdio: "pipe", timeout: 60000 }
        );
      } else {
        const stretchFactor = targetDuration / scaledDuration;

        if (stretchFactor <= MAX_SLOWMO_FACTOR) {
          const setptsFactor = stretchFactor.toFixed(4);
          execSync(
            `"${ffmpeg}" -y -i "${scaledClipPath}" ` +
              `-vf "setpts=${setptsFactor}*PTS,fps=30,format=yuv420p" ` +
              `-c:v libx264 -preset ultrafast -crf 23 -an "${stretchedPath}"`,
            { stdio: "pipe", timeout: 180000 }
          );
        } else {
          const slowmoDuration = scaledDuration * MAX_SLOWMO_FACTOR;
          const slowmoPath = path.join(tmpDir, `slowmo_${i}.mp4`);
          execSync(
            `"${ffmpeg}" -y -i "${scaledClipPath}" ` +
              `-vf "setpts=${MAX_SLOWMO_FACTOR.toFixed(1)}*PTS,fps=30,format=yuv420p" ` +
              `-c:v libx264 -preset ultrafast -crf 23 -an "${slowmoPath}"`,
            { stdio: "pipe", timeout: 180000 }
          );

          const repsNeeded = Math.ceil(targetDuration / slowmoDuration) + 1;
          const concatSlowmoList = path.join(tmpDir, `slowmo_concat_${i}.txt`);
          const entries: string[] = [];
          for (let r = 0; r < repsNeeded; r++) {
            entries.push(`file '${slowmoPath}'`);
          }
          fs.writeFileSync(concatSlowmoList, entries.join("\n"));

          const loopedPath = path.join(tmpDir, `looped_${i}.mp4`);
          execSync(
            `"${ffmpeg}" -y -f concat -safe 0 -i "${concatSlowmoList}" ` +
              `-t ${targetDuration.toFixed(3)} -c:v libx264 -preset ultrafast -crf 23 -an "${loopedPath}"`,
            { stdio: "pipe", timeout: 180000 }
          );

          fs.copyFileSync(loopedPath, stretchedPath);
        }

        const actualDur = getVideoDuration(stretchedPath);
        if (Math.abs(actualDur - targetDuration) > 0.5) {
          const trimmedPath = path.join(tmpDir, `trimmed_${i}.mp4`);
          execSync(
            `"${ffmpeg}" -y -i "${stretchedPath}" -t ${targetDuration.toFixed(3)} -c:v copy -an "${trimmedPath}"`,
            { stdio: "pipe", timeout: 60000 }
          );
          fs.copyFileSync(trimmedPath, stretchedPath);
        }
      }

      const actualDuration = getVideoDuration(stretchedPath);
      console.log(
        `[cinematic-assembly]   Scene ${i + 1}: ${clipDuration.toFixed(1)}s → ${actualDuration.toFixed(1)}s (target ${targetDuration.toFixed(1)}s) [slow-motion stretch]`
      );
      stretchedPaths.push(stretchedPath);
    }

    console.log("[cinematic-assembly] Step 3: Generating end card...");
    const endCardPath = path.join(tmpDir, "endcard.mp4");
    const fontPath = findFontPath();
    const hasDrawtext = (() => {
      try {
        const out = execSync(`"${ffmpeg}" -filters 2>&1`, {
          encoding: "utf-8",
          timeout: 5000,
        });
        return out.includes("drawtext");
      } catch {
        return false;
      }
    })();

    const scriptureText = scriptureAnchor || "";
    const urlText = "gracethroughfaith.app";

    let logoPath: string | null = null;
    try {
      logoPath = path.join(tmpDir, "logo.png");
      await downloadFile(LOGO_URL, logoPath);
    } catch {
      console.warn("[cinematic-assembly] Could not download logo, skipping");
      logoPath = null;
    }

    if (hasDrawtext && fontPath) {
      try {
        const escapedScripture = scriptureText
          .replace(/'/g, "'\\''")
          .replace(/:/g, "\\:");
        const escapedUrl = urlText.replace(/:/g, "\\:").replace(/\./g, "\\.");

        let endCardFilter = "";
        if (logoPath && fs.existsSync(logoPath)) {
          endCardFilter =
            `[0:v][1:v]overlay=(W-w)/2:(H-h)/2-100[bg];` +
            `[bg]drawtext=fontfile='${fontPath}':text='${escapedScripture}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h/2)+60:alpha='if(lt(t,0.5),t/0.5,if(lt(t,3),1,(${END_CARD_DURATION}-t)/1))',` +
            `drawtext=fontfile='${fontPath}':text='${escapedUrl}':fontcolor=0xCCCCCC:fontsize=28:x=(w-text_w)/2:y=(h/2)+120:alpha='if(lt(t,0.8),t/0.8,if(lt(t,3),1,(${END_CARD_DURATION}-t)/1))'`;

          execSync(
            `"${ffmpeg}" -y -f lavfi -i color=c=black:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:d=${END_CARD_DURATION}:r=30 ` +
              `-i "${logoPath}" ` +
              `-f lavfi -i anullsrc=r=44100:cl=stereo ` +
              `-filter_complex "${endCardFilter}" ` +
              `-c:v libx264 -preset fast -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 128k -shortest "${endCardPath}"`,
            { stdio: "pipe", timeout: 30000 }
          );
        } else {
          endCardFilter =
            `drawtext=fontfile='${fontPath}':text='Grace Through Faith':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h/2)-40:alpha='if(lt(t,0.5),t/0.5,if(lt(t,3),1,(${END_CARD_DURATION}-t)/1))',` +
            `drawtext=fontfile='${fontPath}':text='${escapedScripture}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h/2)+40:alpha='if(lt(t,0.5),t/0.5,if(lt(t,3),1,(${END_CARD_DURATION}-t)/1))',` +
            `drawtext=fontfile='${fontPath}':text='${escapedUrl}':fontcolor=0xCCCCCC:fontsize=28:x=(w-text_w)/2:y=(h/2)+100:alpha='if(lt(t,0.8),t/0.8,if(lt(t,3),1,(${END_CARD_DURATION}-t)/1))'`;

          execSync(
            `"${ffmpeg}" -y -f lavfi -i color=c=black:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:d=${END_CARD_DURATION}:r=30 ` +
              `-f lavfi -i anullsrc=r=44100:cl=stereo ` +
              `-vf "${endCardFilter}" ` +
              `-c:v libx264 -preset fast -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 128k -shortest "${endCardPath}"`,
            { stdio: "pipe", timeout: 30000 }
          );
        }
        console.log("[cinematic-assembly] End card generated with text overlay");
      } catch (err) {
        console.warn(
          "[cinematic-assembly] End card text overlay failed, using plain black:",
          err
        );
        execSync(
          `"${ffmpeg}" -y -f lavfi -i color=c=black:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:d=${END_CARD_DURATION}:r=30 ` +
            `-f lavfi -i anullsrc=r=44100:cl=stereo ` +
            `-c:v libx264 -preset fast -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 128k -shortest "${endCardPath}"`,
          { stdio: "pipe", timeout: 30000 }
        );
      }
    } else {
      execSync(
        `"${ffmpeg}" -y -f lavfi -i color=c=black:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:d=${END_CARD_DURATION}:r=30 ` +
          `-f lavfi -i anullsrc=r=44100:cl=stereo ` +
          `-c:v libx264 -preset fast -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 128k -shortest "${endCardPath}"`,
        { stdio: "pipe", timeout: 30000 }
      );
    }

    stretchedPaths.push(endCardPath);

    console.log("[cinematic-assembly] Step 4: Joining scenes with crossfade transitions...");
    const concatenatedPath = path.join(tmpDir, "concatenated.mp4");

    if (stretchedPaths.length === 1) {
      fs.copyFileSync(stretchedPaths[0], concatenatedPath);
    } else {
      let currentPath = stretchedPaths[0];

      for (let i = 1; i < stretchedPaths.length; i++) {
        const isEndCard = i === stretchedPaths.length - 1;
        const transitionType = isEndCard ? "fade" : "dissolve";
        const transitionDur = isEndCard
          ? SCENE_TRANSITION_DURATION * 1.5
          : SCENE_TRANSITION_DURATION;

        const currentDuration = getVideoDuration(currentPath);
        const offset = Math.max(0, currentDuration - transitionDur);

        const outputPath = path.join(tmpDir, `xfade_${i}.mp4`);

        try {
          execSync(
            `"${ffmpeg}" -y -i "${currentPath}" -i "${stretchedPaths[i]}" ` +
              `-filter_complex "` +
              `[0:v][1:v]xfade=transition=${transitionType}:duration=${transitionDur.toFixed(3)}:offset=${offset.toFixed(3)},format=yuv420p[v]` +
              `" -map "[v]" -c:v libx264 -preset ultrafast -crf 23 -an "${outputPath}"`,
            { stdio: "pipe", timeout: 300000 }
          );
          console.log(
            `[cinematic-assembly]   Transition ${i}/${stretchedPaths.length - 1}: ${transitionType} (${transitionDur.toFixed(1)}s) at ${offset.toFixed(1)}s`
          );
        } catch (xfadeErr) {
          console.warn(
            `[cinematic-assembly]   xfade failed for scene ${i}, falling back to hard cut`
          );
          const concatFallbackList = path.join(tmpDir, `fallback_${i}.txt`);
          fs.writeFileSync(
            concatFallbackList,
            `file '${currentPath}'\nfile '${stretchedPaths[i]}'`
          );
          execSync(
            `"${ffmpeg}" -y -f concat -safe 0 -i "${concatFallbackList}" ` +
              `-c:v copy -an "${outputPath}"`,
            { stdio: "pipe", timeout: 120000 }
          );
        }

        currentPath = outputPath;
      }

      fs.copyFileSync(currentPath, concatenatedPath);
    }

    const concatDuration = getVideoDuration(concatenatedPath);
    console.log(
      `[cinematic-assembly] Joined with transitions: ${concatDuration.toFixed(1)}s`
    );

    console.log(
      "[cinematic-assembly] Step 5: Mixing voiceover + background music..."
    );
    const finalPath = path.join(tmpDir, "final.mp4");

    const musicFadeOut = Math.max(0, concatDuration - 2).toFixed(1);

    execSync(
      `"${ffmpeg}" -y -i "${concatenatedPath}" -i "${voiceoverPath}" -i "${musicPath}" ` +
        `-filter_complex "` +
        `[1:a]apad=pad_dur=5[voice];` +
        `[2:a]volume=${MUSIC_VOLUME},afade=t=in:st=0:d=2,afade=t=out:st=${musicFadeOut}:d=2[music];` +
        `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]` +
        `" -map 0:v -map "[aout]" ` +
        `-c:v copy -c:a aac -ar 44100 -ac 2 -b:a 192k -shortest "${finalPath}"`,
      { stdio: "pipe", timeout: 300000 }
    );

    let uploadPath = finalPath;
    const finalSizeBytes = fs.statSync(finalPath).size;
    const finalSizeMB = finalSizeBytes / 1024 / 1024;
    const finalDuration = getVideoDuration(finalPath);
    console.log(
      `[cinematic-assembly] Final video: ${finalDuration.toFixed(1)}s, ${finalSizeMB.toFixed(1)} MB`
    );

    const MAX_UPLOAD_MB = 95;
    if (finalSizeMB > MAX_UPLOAD_MB) {
      console.log(
        `[cinematic-assembly] Step 5b: Compressing video (${finalSizeMB.toFixed(1)} MB > ${MAX_UPLOAD_MB} MB limit)...`
      );
      const compressedPath = path.join(tmpDir, "compressed.mp4");
      const targetBitrate = Math.floor(
        (MAX_UPLOAD_MB * 8 * 1024) / finalDuration
      );
      execSync(
        `"${ffmpeg}" -y -i "${finalPath}" ` +
          `-c:v libx264 -preset medium -b:v ${targetBitrate}k -maxrate ${Math.floor(targetBitrate * 1.5)}k -bufsize ${Math.floor(targetBitrate * 2)}k ` +
          `-c:a aac -b:a 128k "${compressedPath}"`,
        { stdio: "pipe", timeout: 600000 }
      );
      const compressedSize = (
        fs.statSync(compressedPath).size /
        1024 /
        1024
      ).toFixed(1);
      console.log(
        `[cinematic-assembly] Compressed: ${finalSizeMB.toFixed(1)} MB → ${compressedSize} MB`
      );
      uploadPath = compressedPath;
    }

    console.log("[cinematic-assembly] Step 6: Uploading to Cloudinary...");
    ensureCloudinaryConfigured();

    const slug = topicTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const publicId = `${slug}-cinematic`;

    const uploadResult = await cloudinary.uploader.upload(uploadPath, {
      resource_type: "video",
      folder: "grace-through-faith/cinematic-videos",
      public_id: publicId,
      overwrite: true,
    });

    console.log(
      `[cinematic-assembly] Upload complete: ${uploadResult.secure_url}`
    );
    return uploadResult.secure_url;
  } finally {
    try {
      const files = fs.readdirSync(tmpDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tmpDir, file));
      }
      fs.rmdirSync(tmpDir);
      console.log(`[cinematic-assembly] Cleaned up: ${tmpDir}`);
    } catch (cleanupErr) {
      console.warn("[cinematic-assembly] Cleanup failed:", cleanupErr);
    }
  }
}
