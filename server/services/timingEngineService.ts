import { execSync } from "child_process";
import { getFFprobePath } from "./ffmpegPath";
import type { CinematicScene } from "./sceneDirectorService";

export interface SceneTiming {
  sceneNumber: number;
  startTime: number;
  endTime: number;
  targetDuration: number;
  wordCount: number;
}

export function getAudioDuration(audioUrl: string): number {
  const ffprobe = getFFprobePath();
  const result = execSync(
    `"${ffprobe}" -v error -show_entries format=duration -of csv=p=0 "${audioUrl}"`,
    { stdio: "pipe", timeout: 30000 }
  ).toString().trim();

  const duration = parseFloat(result);
  if (isNaN(duration) || duration <= 0) {
    throw new Error(`Invalid audio duration: ${result}`);
  }
  return duration;
}

export function getAudioDurationFromFile(filePath: string): number {
  const ffprobe = getFFprobePath();
  const result = execSync(
    `"${ffprobe}" -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
    { stdio: "pipe", timeout: 15000 }
  ).toString().trim();

  const duration = parseFloat(result);
  if (isNaN(duration) || duration <= 0) {
    throw new Error(`Invalid audio duration from file: ${result}`);
  }
  return duration;
}

export function computeSceneTimings(
  scenes: CinematicScene[],
  totalAudioDuration: number
): SceneTiming[] {
  const wordCounts = scenes.map(
    (s) =>
      s.scriptSlice
        .replace(/[^\w\s']/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 0).length
  );
  const totalWords = wordCounts.reduce((sum, c) => sum + c, 0);

  if (totalWords === 0) {
    throw new Error("Scenes contain no recognizable words");
  }

  const timings: SceneTiming[] = [];
  let cursor = 0;

  for (let i = 0; i < scenes.length; i++) {
    const proportion = wordCounts[i] / totalWords;
    const duration = proportion * totalAudioDuration;
    const start = cursor;
    const end =
      i === scenes.length - 1 ? totalAudioDuration : cursor + duration;

    timings.push({
      sceneNumber: scenes[i].sceneNumber,
      startTime: parseFloat(start.toFixed(3)),
      endTime: parseFloat(end.toFixed(3)),
      targetDuration: parseFloat((end - start).toFixed(3)),
      wordCount: wordCounts[i],
    });

    cursor = end;
  }

  console.log(
    `[timing-engine] ${totalWords} words across ${totalAudioDuration.toFixed(1)}s audio → ${scenes.length} scenes`
  );
  for (const t of timings) {
    console.log(
      `[timing-engine]   Scene ${t.sceneNumber}: ${t.startTime.toFixed(1)}s–${t.endTime.toFixed(1)}s (${t.targetDuration.toFixed(1)}s, ${t.wordCount} words)`
    );
  }

  return timings;
}
