import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const CHAT_FALLBACK_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;

const TTS_VOICES = ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"] as const;
export type TTSVoice = (typeof TTS_VOICES)[number];

export function isValidVoice(voice: string): voice is TTSVoice {
  return TTS_VOICES.includes(voice as TTSVoice);
}

function getChatFallbackVoice(voice: TTSVoice): (typeof CHAT_FALLBACK_VOICES)[number] {
  if ((CHAT_FALLBACK_VOICES as readonly string[]).includes(voice)) {
    return voice as (typeof CHAT_FALLBACK_VOICES)[number];
  }
  const mapping: Record<string, (typeof CHAT_FALLBACK_VOICES)[number]> = {
    coral: "nova",
    sage: "shimmer",
    ash: "echo",
  };
  return mapping[voice] || "nova";
}

async function tryTTSHD(text: string, voice: TTSVoice, format: "wav" | "mp3"): Promise<Buffer> {
  const response = await openai.audio.speech.create({
    model: "tts-1-hd",
    voice: voice as any,
    input: text,
    response_format: format,
    speed: 1.0,
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function tryChatAudio(text: string, voice: TTSVoice, format: "wav" | "mp3"): Promise<Buffer> {
  const fallbackVoice = getChatFallbackVoice(voice);
  const response = await openai.chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice: fallbackVoice, format },
    messages: [
      {
        role: "system",
        content:
          "You are a Scripture reader. Read the given Bible passage aloud with warmth, reverence, and natural expression. " +
          "Pause briefly at commas and semicolons. Pause longer at periods, colons, and verse breaks. " +
          "Let the meaning of the words guide your tone — speak promises with hope, commands with gentle authority, " +
          "and laments with compassion. Do not add any words, commentary, or introduction. " +
          "Read only the exact text provided, but read it as a human would naturally speak it aloud in a church or devotional setting.",
      },
      { role: "user", content: text },
    ],
  });
  const audioData = (response.choices[0]?.message as any)?.audio?.data ?? "";
  if (!audioData) throw new Error("No audio data in chat response");
  return Buffer.from(audioData, "base64");
}

export async function textToSpeech(
  text: string,
  voice: TTSVoice = "nova",
  format: "wav" | "mp3" = "mp3"
): Promise<Buffer> {
  try {
    return await tryTTSHD(text, voice, format);
  } catch (hdErr: any) {
    console.warn(`tts-1-hd failed (${hdErr?.status || hdErr?.message}), falling back to gpt-audio`);
    try {
      return await tryChatAudio(text, voice, format);
    } catch (chatErr: any) {
      console.error("Both TTS methods failed:", chatErr?.message);
      throw chatErr;
    }
  }
}
