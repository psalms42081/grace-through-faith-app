import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const TTS_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
export type TTSVoice = (typeof TTS_VOICES)[number];

export function isValidVoice(voice: string): voice is TTSVoice {
  return TTS_VOICES.includes(voice as TTSVoice);
}

export async function textToSpeech(
  text: string,
  voice: TTSVoice = "alloy",
  format: "wav" | "mp3" = "mp3"
): Promise<Buffer> {
  const response = await openai.chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice, format },
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
  return Buffer.from(audioData, "base64");
}
