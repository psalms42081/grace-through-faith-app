import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { getFFmpegPath } from "./ffmpegPath";

function createWhisperClient(): OpenAI {
  const directKey = process.env.OPENAI_API_KEY;
  if (!directKey) {
    throw new Error("OPENAI_API_KEY is not configured — required for Whisper audio transcription");
  }
  return new OpenAI({
    apiKey: directKey,
    baseURL: "https://api.openai.com/v1",
  });
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

function runFFmpeg(args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = getFFmpegPath();
    const proc = execFile(ffmpeg, args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export async function extractTimestamps(videoUrl: string): Promise<WordTimestamp[]> {
  const tmpDir = path.join("/tmp", `whisper-${Date.now()}`);
  const audioPath = path.join(tmpDir, "audio.mp3");

  try {
    fs.mkdirSync(tmpDir, { recursive: true });

    console.log(`[Whisper] Extracting audio directly from URL via FFmpeg...`);
    console.log(`[Whisper] URL: ${videoUrl.substring(0, 80)}...`);

    await runFFmpeg([
      "-i", videoUrl,
      "-vn",
      "-acodec", "libmp3lame",
      "-ar", "16000",
      "-ac", "1",
      "-q:a", "4",
      audioPath,
      "-y"
    ], 300000);

    const audioSize = fs.statSync(audioPath).size;
    console.log(`[Whisper] Audio extracted: ${(audioSize / 1024).toFixed(0)} KB`);

    if (audioSize > 25 * 1024 * 1024) {
      throw new Error(`Audio file is ${(audioSize / 1024 / 1024).toFixed(1)} MB — exceeds Whisper's 25 MB limit`);
    }

    console.log("[Whisper] Sending audio to Whisper API...");
    const client = createWhisperClient();
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    const rawWords = (transcription as any).words;
    if (!rawWords || !Array.isArray(rawWords) || rawWords.length === 0) {
      throw new Error("Whisper returned no word-level timestamps");
    }

    const timestamps: WordTimestamp[] = rawWords.map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    }));

    console.log(`[Whisper] Extracted ${timestamps.length} word timestamps, duration: ${timestamps[timestamps.length - 1].end.toFixed(1)}s`);

    return timestamps;
  } finally {
    try {
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
    } catch (cleanupErr) {
      console.warn("[Whisper] Failed to clean up temp files:", cleanupErr);
    }
  }
}
