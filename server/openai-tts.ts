import OpenAI from "openai";
import { getTimeout } from "./services/api-client";
import { withAIConcurrency } from "./services/ai-semaphore";

const _openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  timeout: getTimeout("openai"),
});

const originalCreate: (...args: any[]) => any = _openai.chat.completions.create.bind(_openai.chat.completions);
_openai.chat.completions.create = ((...args: any[]) =>
  withAIConcurrency(() => originalCreate(...args))) as any;

const openai = _openai;

const TTS_VOICES = ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"] as const;
export type TTSVoice = (typeof TTS_VOICES)[number];

export function isValidVoice(voice: string): voice is TTSVoice {
  return TTS_VOICES.includes(voice as TTSVoice);
}

const SUPPORTED_AUDIO_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;

const VOICE_FALLBACK: Record<string, (typeof SUPPORTED_AUDIO_VOICES)[number]> = {
  alloy: "alloy",
  echo: "echo",
  fable: "fable",
  onyx: "onyx",
  nova: "nova",
  shimmer: "shimmer",
  ash: "onyx",
  coral: "shimmer",
  sage: "nova",
};

export async function textToSpeech(
  text: string,
  voice: TTSVoice = "nova",
  format: "wav" | "mp3" = "mp3"
): Promise<Buffer> {
  const audioVoice = VOICE_FALLBACK[voice] || "nova";
  console.log(`[TTS] voice="${voice}" → audioVoice="${audioVoice}", text=${text.length} chars`);

  const response = await openai.chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice: audioVoice, format },
    messages: [
      {
        role: "system",
        content:
          "Read the following text aloud exactly as written. Do not add, remove, skip, repeat, or rearrange any words. " +
          "Do not add introductions, commentary, verse numbers, or conclusions. " +
          "Read every word in order from start to finish, once only. " +
          "Use a warm, reverent tone appropriate for Scripture reading.",
      },
      { role: "user", content: text },
    ],
  });

  const audioData = (response.choices[0]?.message as any)?.audio?.data ?? "";
  if (!audioData) throw new Error("No audio data returned");
  const buf = Buffer.from(audioData, "base64");
  console.log(`[TTS] Success: voice="${audioVoice}", ${buf.length} bytes`);
  return buf;
}
