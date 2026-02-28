import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
  if (!audioData) throw new Error("No audio data returned");
  const buf = Buffer.from(audioData, "base64");
  console.log(`[TTS] Success: voice="${audioVoice}", ${buf.length} bytes`);
  return buf;
}
