import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

export function getFFmpegPath(): string {
  if (!ffmpegStatic) {
    throw new Error("ffmpeg-static did not resolve a binary path");
  }
  return ffmpegStatic;
}

export function getFFprobePath(): string {
  if (!ffprobeStatic?.path) {
    throw new Error("ffprobe-static did not resolve a binary path");
  }
  return ffprobeStatic.path;
}
