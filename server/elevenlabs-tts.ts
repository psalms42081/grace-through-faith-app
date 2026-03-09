import { fetchWithTimeout } from "./services/api-client";

const ELEVENLABS_VOICES = {
  george: "JBFqnCBsd6RMkjVDRZzb",
  callum: "N2lVS1w4EtoT3dr4eOWO",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  brian: "nPczCjzI2devNBz1zQrb",
  sarah: "EXAVITQu4vr4xnSDxMaL",
  lily: "pFZP5JQG7iQjIQuC4Bku",
  alice: "Xb7hH8MSUJpSbSDYk0k2",
} as const;

export type TTSVoice = keyof typeof ELEVENLABS_VOICES;

export function isValidVoice(voice: string): voice is TTSVoice {
  return Object.keys(ELEVENLABS_VOICES).includes(voice);
}

export async function textToSpeech(
  text: string,
  voice: TTSVoice = "george",
  format: "mp3" = "mp3"
): Promise<Buffer> {
  const voiceId = ELEVENLABS_VOICES[voice] || ELEVENLABS_VOICES.george;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable is not set.");
  }

  console.log(`[ElevenLabs TTS] Generating audio for voice="${voice}" (${voiceId}), text=${text.length} chars`);

  const response = await fetchWithTimeout(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    service: "elevenlabs",
    serviceLabel: "elevenlabs-tts",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  console.log(`[ElevenLabs TTS] Success: voice="${voice}", ${buf.length} bytes`);
  return buf;
}
