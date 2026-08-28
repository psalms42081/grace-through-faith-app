import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import type { EDLSegment } from "./editDecisionListService";
import type { WordTimestamp } from "./whisperService";
import { getFFmpegPath, getFFprobePath } from "./ffmpegPath";

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;
const MUSIC_VOLUME = 0.06;
const END_CARD_DURATION = 3;
function findFontPath(): string | null {
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/nix/store",
  ];
  for (const p of candidates) {
    if (p === "/nix/store") continue;
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  try {
    const result = execSync("fc-list :style=Bold -f '%{file}\\n' 2>/dev/null | head -1", { encoding: "utf-8", timeout: 3000 }).trim();
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
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  console.log(`[assembly] Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB → ${path.basename(destPath)}`);
}

function computeProportionalTimings(
  edl: EDLSegment[],
  timestamps: WordTimestamp[]
): { start: number; end: number }[] {
  const totalAudioDuration = timestamps[timestamps.length - 1].end;

  const segmentWordCounts = edl.map((seg) =>
    seg.text.replace(/[^\w\s']/g, "").split(/\s+/).filter((w) => w.length > 0).length
  );
  const totalWords = segmentWordCounts.reduce((sum, c) => sum + c, 0);

  if (totalWords === 0) {
    throw new Error("EDL segments contain no recognizable words");
  }

  const timings: { start: number; end: number }[] = [];
  let cursor = 0;

  for (let i = 0; i < edl.length; i++) {
    const proportion = segmentWordCounts[i] / totalWords;
    const duration = proportion * totalAudioDuration;
    const start = cursor;
    const end = i === edl.length - 1 ? totalAudioDuration : cursor + duration;
    timings.push({ start, end });
    cursor = end;
  }

  const snappedTimings: { start: number; end: number }[] = [];
  for (let i = 0; i < timings.length; i++) {
    const rawStart = timings[i].start;
    const rawEnd = timings[i].end;

    let bestStartIdx = 0;
    let bestStartDist = Infinity;
    let bestEndIdx = timestamps.length - 1;
    let bestEndDist = Infinity;

    for (let t = 0; t < timestamps.length; t++) {
      const startDist = Math.abs(timestamps[t].start - rawStart);
      if (startDist < bestStartDist) {
        bestStartDist = startDist;
        bestStartIdx = t;
      }
      const endDist = Math.abs(timestamps[t].end - rawEnd);
      if (endDist < bestEndDist) {
        bestEndDist = endDist;
        bestEndIdx = t;
      }
    }

    const snappedStart = i === 0 ? 0 : timestamps[bestStartIdx].start;
    const snappedEnd = i === timings.length - 1 ? totalAudioDuration : timestamps[bestEndIdx].end;

    snappedTimings.push({
      start: snappedStart,
      end: Math.max(snappedEnd, snappedStart + 0.2),
    });
  }

  for (let i = 1; i < snappedTimings.length; i++) {
    if (snappedTimings[i].start !== snappedTimings[i - 1].end) {
      snappedTimings[i].start = snappedTimings[i - 1].end;
    }
  }

  console.log(`[assembly] Proportional timing: ${totalWords} words across ${totalAudioDuration.toFixed(1)}s audio`);
  return snappedTimings;
}

export async function assembleVideo(
  avatarVideoUrl: string,
  editDecisionList: EDLSegment[],
  whisperTimestamps: WordTimestamp[],
  brollVideoUrls: string[],
  musicTrackUrl: string,
  topicTitle: string,
  topicId: string
): Promise<string> {
  const tmpDir = path.join("/tmp", `assembly-${topicId}-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const avatarPath = path.join(tmpDir, "avatar.mp4");
  const musicPath = path.join(tmpDir, "music.mp3");
  const endCardPath = path.join(tmpDir, "endcard.mp4");
  const concatListPath = path.join(tmpDir, "concat.txt");
  const concatenatedPath = path.join(tmpDir, "concatenated.mp4");
  const finalPath = path.join(tmpDir, "final.mp4");

  try {
    console.log(`[assembly] Starting video assembly for "${topicTitle}" (${topicId})`);
    console.log(`[assembly] EDL: ${editDecisionList.length} segments, ${brollVideoUrls.length} B-roll clips`);

    console.log("[assembly] Step 1: Downloading assets...");
    await downloadFile(avatarVideoUrl, avatarPath);

    const brollPaths: string[] = [];
    let brollIdx = 0;
    for (let i = 0; i < editDecisionList.length; i++) {
      if (editDecisionList[i].type === "broll") {
        if (brollIdx >= brollVideoUrls.length) {
          throw new Error(`EDL has more B-roll segments than provided B-roll URLs (${brollVideoUrls.length})`);
        }
        const brollPath = path.join(tmpDir, `broll_${brollIdx}.mp4`);
        await downloadFile(brollVideoUrls[brollIdx], brollPath);
        brollPaths.push(brollPath);
        brollIdx++;
      }
    }

    await downloadFile(musicTrackUrl, musicPath);

    console.log("[assembly] Step 2: Computing proportional segment timings...");
    const segmentTimings = computeProportionalTimings(editDecisionList, whisperTimestamps);
    for (let i = 0; i < editDecisionList.length; i++) {
      const timing = segmentTimings[i];
      const seg = editDecisionList[i];
      console.log(`[assembly]   Segment ${i} (${seg.type}): ${timing.start.toFixed(2)}s - ${timing.end.toFixed(2)}s (${(timing.end - timing.start).toFixed(2)}s) "${seg.text.substring(0, 50)}..."`);
    }

    const ffmpeg = getFFmpegPath();
    const ffprobe = getFFprobePath();
    console.log(`[assembly] Using ffmpeg: ${ffmpeg}`);
    console.log(`[assembly] Using ffprobe: ${ffprobe}`);

    console.log("[assembly] Step 2.5: Normalizing avatar video (30fps, yuv420p)...");
    const normalizedAvatarPath = path.join(tmpDir, "avatar_normalized.mp4");
    execSync(
      `"${ffmpeg}" -y -i "${avatarPath}" -vf "fps=30,format=yuv420p" ` +
      `-c:v libx264 -preset fast -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 128k "${normalizedAvatarPath}"`,
      { stdio: "pipe", timeout: 120000 }
    );
    console.log("[assembly] Avatar normalized successfully");

    console.log("[assembly] Step 2.6: Extracting full avatar audio track...");
    const fullAudioPath = path.join(tmpDir, "avatar_audio.aac");
    execSync(
      `"${ffmpeg}" -y -i "${normalizedAvatarPath}" -vn -c:a aac -ar 44100 -ac 2 -b:a 128k "${fullAudioPath}"`,
      { stdio: "pipe", timeout: 60000 }
    );
    console.log("[assembly] Full avatar audio extracted");

    console.log("[assembly] Step 3: Cutting segments and building concat list...");
    const segmentPaths: string[] = [];
    let currentBrollIdx = 0;

    for (let i = 0; i < editDecisionList.length; i++) {
      const seg = editDecisionList[i];
      const timing = segmentTimings[i];
      const duration = timing.end - timing.start;
      const segPath = path.join(tmpDir, `seg_${i}.mp4`);

      if (duration <= 0.1) {
        console.warn(`[assembly] Skipping segment ${i} with duration ${duration.toFixed(3)}s`);
        if (seg.type === "broll") currentBrollIdx++;
        continue;
      }

      if (seg.type === "avatar") {
        execSync(
          `"${ffmpeg}" -y -i "${normalizedAvatarPath}" -ss ${timing.start.toFixed(3)} -t ${duration.toFixed(3)} ` +
          `-vf "scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease,pad=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black" ` +
          `-c:v libx264 -preset ultrafast -crf 23 -c:a aac -ar 44100 -ac 2 -b:a 128k "${segPath}"`,
          { stdio: "pipe", timeout: 60000 }
        );
      } else {
        const brollClipPath = brollPaths[currentBrollIdx];
        currentBrollIdx++;

        const audioSegPath = path.join(tmpDir, `audio_seg_${i}.aac`);
        execSync(
          `"${ffmpeg}" -y -i "${fullAudioPath}" -ss ${timing.start.toFixed(3)} -t ${duration.toFixed(3)} ` +
          `-c:a aac -ar 44100 -ac 2 -b:a 128k "${audioSegPath}"`,
          { stdio: "pipe", timeout: 30000 }
        );

        execSync(
          `"${ffmpeg}" -y -stream_loop -1 -i "${brollClipPath}" -i "${audioSegPath}" ` +
          `-filter_complex "` +
          `[0:v]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT},trim=duration=${duration.toFixed(3)},setpts=PTS-STARTPTS,fps=30[bv]` +
          `" -map "[bv]" -map 1:a ` +
          `-c:v libx264 -preset ultrafast -crf 23 -c:a aac -ar 44100 -ac 2 -b:a 128k -shortest "${segPath}"`,
          { stdio: "pipe", timeout: 60000 }
        );
      }

      segmentPaths.push(segPath);
      console.log(`[assembly]   Cut segment ${i} (${seg.type}): ${duration.toFixed(2)}s → ${path.basename(segPath)}`);
    }

    console.log("[assembly] Step 4: Generating end card...");
    let endCardGenerated = false;
    const hasDrawtext = (() => {
      try {
        const out = execSync(`"${ffmpeg}" -filters 2>&1`, { encoding: "utf-8", timeout: 5000 });
        return out.includes("drawtext");
      } catch { return false; }
    })();

    if (hasDrawtext) {
      try {
        const fontPath = findFontPath();
        const drawtextFilter = fontPath
          ? `drawtext=fontfile='${fontPath}':text='Informed Ministries':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=(h-text_h)/2:alpha='if(lt(t,0.5),t/0.5,if(lt(t,2.5),1,(3-t)/0.5))'`
          : `drawtext=text='Informed Ministries':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=(h-text_h)/2:alpha='if(lt(t,0.5),t/0.5,if(lt(t,2.5),1,(3-t)/0.5))'`;
        console.log(`[assembly] End card using drawtext, font: ${fontPath || "built-in default"}`);
        execSync(
          `"${ffmpeg}" -y -f lavfi -i color=c=black:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:d=${END_CARD_DURATION}:r=30 ` +
          `-f lavfi -i anullsrc=r=44100:cl=stereo ` +
          `-vf "${drawtextFilter}" ` +
          `-c:v libx264 -preset ultrafast -crf 23 -c:a aac -ar 44100 -ac 2 -b:a 128k -shortest "${endCardPath}"`,
          { stdio: "pipe", timeout: 30000 }
        );
        endCardGenerated = true;
      } catch (drawErr) {
        console.warn("[assembly] drawtext failed, falling back to plain end card:", drawErr);
      }
    }

    if (!endCardGenerated) {
      console.log("[assembly] End card: plain black (drawtext not available)");
      execSync(
        `"${ffmpeg}" -y -f lavfi -i color=c=black:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:d=${END_CARD_DURATION}:r=30 ` +
        `-f lavfi -i anullsrc=r=44100:cl=stereo ` +
        `-c:v libx264 -preset ultrafast -crf 23 -c:a aac -ar 44100 -ac 2 -b:a 128k -shortest "${endCardPath}"`,
        { stdio: "pipe", timeout: 30000 }
      );
    }
    segmentPaths.push(endCardPath);

    console.log("[assembly] Step 5: Concatenating all segments...");
    const concatContent = segmentPaths.map((p) => `file '${p}'`).join("\n");
    fs.writeFileSync(concatListPath, concatContent);

    execSync(
      `"${ffmpeg}" -y -f concat -safe 0 -i "${concatListPath}" ` +
      `-c:v libx264 -preset ultrafast -crf 23 -c:a aac -ar 44100 -ac 2 -b:a 128k "${concatenatedPath}"`,
      { stdio: "pipe", timeout: 120000 }
    );

    const concatDuration = execSync(
      `"${ffprobe}" -v error -show_entries format=duration -of csv=p=0 "${concatenatedPath}"`,
      { stdio: "pipe", timeout: 15000 }
    ).toString().trim();
    console.log(`[assembly] Concatenated video: ${parseFloat(concatDuration).toFixed(1)}s`);

    console.log("[assembly] Step 6: Mixing background music...");
    execSync(
      `"${ffmpeg}" -y -i "${concatenatedPath}" -i "${musicPath}" ` +
      `-filter_complex "` +
      `[1:a]volume=${MUSIC_VOLUME},afade=t=in:st=0:d=1.5,afade=t=out:st=${(parseFloat(concatDuration) - 2).toFixed(1)}:d=2[music];` +
      `[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[aout]` +
      `" -map 0:v -map "[aout]" ` +
      `-c:v copy -c:a aac -ar 44100 -ac 2 -b:a 192k "${finalPath}"`,
      { stdio: "pipe", timeout: 120000 }
    );

    const finalSize = (fs.statSync(finalPath).size / 1024 / 1024).toFixed(1);
    const finalDuration = execSync(
      `"${ffprobe}" -v error -show_entries format=duration -of csv=p=0 "${finalPath}"`,
      { stdio: "pipe", timeout: 15000 }
    ).toString().trim();
    console.log(`[assembly] Final video: ${parseFloat(finalDuration).toFixed(1)}s, ${finalSize} MB`);

    console.log("[assembly] Step 7: Uploading to Cloudinary...");
    ensureCloudinaryConfigured();

    const slug = topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const publicId = `${slug}-assembled`;

    const uploadResult = await cloudinary.uploader.upload(finalPath, {
      resource_type: "video",
      folder: "grace-through-faith/assembled-videos",
      public_id: publicId,
      overwrite: true,
    });

    console.log(`[assembly] Upload complete: ${uploadResult.secure_url}`);
    console.log(`[assembly] Video assembly finished for "${topicTitle}"`);

    return uploadResult.secure_url;
  } finally {
    try {
      const files = fs.readdirSync(tmpDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tmpDir, file));
      }
      fs.rmdirSync(tmpDir);
      console.log(`[assembly] Cleaned up temp directory: ${tmpDir}`);
    } catch (cleanupErr) {
      console.warn("[assembly] Failed to clean up temp files:", cleanupErr);
    }
  }
}
