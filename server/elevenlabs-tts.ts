import { fetchWithTimeout } from "./services/api-client";

export const ELEVENLABS_VOICES = {
  roger: "CwhRBWXzGAHq8TQ4Fs17",
  sarah: "EXAVITQu4vr4xnSDxMaL",
  laura: "FGY2WhTYpPnrIDTdsKH5",
  charlie: "IKne3meq5aSn9XLyUdCD",
  george: "JBFqnCBsd6RMkjVDRZzb",
  callum: "N2lVS1w4EtoT3dr4eOWO",
  river: "SAz9YHcvj6GT2YYXdXww",
  harry: "SOYHLrjzK2X1ezoPC6cr",
  liam: "TX3LPaxmHKxFdv7VOQHJ",
  alice: "Xb7hH8MSUJpSbSDYk0k2",
  matilda: "XrExE9yKIg1WjnnlVkGX",
  will: "bIHbv24MWmeRgasZH58o",
  jessica: "cgSgspJ2msm6clMCkdW9",
  eric: "cjVigY5qzO86Huf0OWal",
  bella: "hpp4J3VqNfWAUOO0d1Us",
  chris: "iP95p4xoKVk53GoZ742B",
  brian: "nPczCjzI2devNBz1zQrb",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  lily: "pFZP5JQG7iQjIQuC4Bku",
  adam: "pNInz6obpgDQGcFmaJgB",
  bill: "pqHfZKP75CvOlQylNhV4",
  brittney: "kPzsL2i3teMYv0FxEYQ6",
  ember: "WtA85syCrJwasGeHGH2p",
  sarah_warm: "GuflK5NRKwVLKwEeBYTy",
  lauren: "DODLEQrClDo8wCz460ld",
  paula_moon: "psJnoAClXdhH5gn8uKNb",
  sarah_velvety: "5opxviIE64D8KxYYJKpx",
  sarah_informative: "Nhs7eitvQWFTQBsf0yiT",
  ellen_white: "XrExE9yKIg1WjnnlVkGX",
  james_white: "6sFKzaJr574YWVu4UuJF",
  joseph_bates: "HAvvFKatz0uu0Fv55Riy",
  uriah_smith: "jXkeB46JcPXXUSxzn3MD",
  jn_andrews: "zlTgutz4OiRUmJHbkQju",
} as const;

export const VOICE_METADATA: Record<string, { gender: string; style: string; bestFor: string }> = {
  roger: { gender: "male", style: "Laid-back, casual, resonant", bestFor: "conversational narration" },
  sarah: { gender: "female", style: "Mature, reassuring, confident", bestFor: "entertainment, TV" },
  laura: { gender: "female", style: "Enthusiast, quirky attitude", bestFor: "social media" },
  charlie: { gender: "male", style: "Deep, confident, energetic", bestFor: "conversational, young male characters" },
  george: { gender: "male", style: "Warm, captivating storyteller", bestFor: "narrative, documentary, biblical narrator" },
  callum: { gender: "male", style: "Husky trickster", bestFor: "character animation, villains" },
  river: { gender: "neutral", style: "Relaxed, neutral, informative", bestFor: "informational content" },
  harry: { gender: "male", style: "Fierce warrior", bestFor: "character animation, action" },
  liam: { gender: "male", style: "Energetic, social media creator", bestFor: "social media, youth" },
  alice: { gender: "female", style: "Clear, engaging educator", bestFor: "educational content" },
  matilda: { gender: "female", style: "Knowledgeable, professional", bestFor: "informative content" },
  will: { gender: "male", style: "Relaxed optimist", bestFor: "casual narration" },
  jessica: { gender: "female", style: "Playful, bright, warm", bestFor: "conversational" },
  eric: { gender: "male", style: "Smooth, trustworthy", bestFor: "conversational, gentle male characters" },
  bella: { gender: "female", style: "Professional, bright, warm", bestFor: "informative content" },
  chris: { gender: "male", style: "Charming, down-to-earth", bestFor: "conversational, relatable narration" },
  brian: { gender: "male", style: "Deep, resonant, comforting", bestFor: "Jesus voice, sacred dialogue, intimate authority" },
  daniel: { gender: "male", style: "Steady broadcaster", bestFor: "angel voice, commanding announcements, prophecy" },
  lily: { gender: "female", style: "Velvety actress", bestFor: "female characters, dramatic roles" },
  adam: { gender: "male", style: "Dominant, firm", bestFor: "God voice, authoritative declarations" },
  bill: { gender: "male", style: "Wise, mature, balanced", bestFor: "elder characters, old testament prophets" },
  brittney: { gender: "female", style: "Fun, youthful, informative", bestFor: "social media, youth content" },
  ember: { gender: "female", style: "Energetic confident protagonist", bestFor: "strong female characters" },
  sarah_warm: { gender: "female", style: "Warm and grounded", bestFor: "Mary, gentle female characters" },
  lauren: { gender: "female", style: "Friendly, comforting, soft", bestFor: "gentle female narration, prayer" },
  paula_moon: { gender: "female", style: "Sleepy-time true crime vocal", bestFor: "DO NOT USE for biblical series" },
  sarah_velvety: { gender: "female", style: "Velvety and gentle", bestFor: "narrative story, gentle female" },
  sarah_informative: { gender: "female", style: "Approachable and informative", bestFor: "educational content" },
  ellen_white: { gender: "female", style: "Prophetic, gentle, Spirit-led", bestFor: "SDA pioneer guide, devotional narration" },
  james_white: { gender: "male", style: "Commanding organizer, pastoral", bestFor: "SDA pioneer guide, leadership narration" },
  joseph_bates: { gender: "male", style: "Seasoned mariner, bold conviction", bestFor: "SDA pioneer guide, Sabbath truth narration" },
  uriah_smith: { gender: "male", style: "Scholarly, meticulous, prophetic", bestFor: "SDA pioneer guide, prophecy narration" },
  jn_andrews: { gender: "male", style: "Intellectual, missionary zeal", bestFor: "SDA pioneer guide, mission narration" },
};

export const BIBLICAL_VOICE_ROLES: Record<string, string> = {
  narrator: ELEVENLABS_VOICES.george,
  jesus: ELEVENLABS_VOICES.brian,
  angel: ELEVENLABS_VOICES.daniel,
  god: ELEVENLABS_VOICES.adam,
  moses: ELEVENLABS_VOICES.bill,
  peter: ELEVENLABS_VOICES.charlie,
  paul: ELEVENLABS_VOICES.roger,
  david: ELEVENLABS_VOICES.chris,
  mary: ELEVENLABS_VOICES.sarah_warm,
  mary_magdalene: ELEVENLABS_VOICES.lily,
  satan: ELEVENLABS_VOICES.callum,
  dragon: ELEVENLABS_VOICES.callum,
  elder_prophet: ELEVENLABS_VOICES.bill,
  young_male: ELEVENLABS_VOICES.will,
  woman: ELEVENLABS_VOICES.sarah_velvety,
  default_male: ELEVENLABS_VOICES.eric,
  default_female: ELEVENLABS_VOICES.lauren,
};

export type TTSVoice = keyof typeof ELEVENLABS_VOICES;

export function isValidVoice(voice: string): voice is TTSVoice {
  return Object.keys(ELEVENLABS_VOICES).includes(voice);
}

export function resolveVoiceId(voiceOrRole: string): string {
  if (ELEVENLABS_VOICES[voiceOrRole as TTSVoice]) {
    return ELEVENLABS_VOICES[voiceOrRole as TTSVoice];
  }
  const roleKey = voiceOrRole.toLowerCase().replace(/\s+/g, "_");
  if (BIBLICAL_VOICE_ROLES[roleKey]) {
    return BIBLICAL_VOICE_ROLES[roleKey];
  }
  return ELEVENLABS_VOICES.george;
}

// ElevenLabs language codes for eleven_multilingual_v2
// Maps our i18n codes to ElevenLabs language_code values
const ELEVENLABS_LANG_MAP: Record<string, string> = {
  en: "en", es: "es", fr: "fr", pt: "pt", de: "de",
  zh: "zh", ja: "ja", ko: "ko", hi: "hi", ar: "ar",
  ru: "ru", id: "id", it: "it", nl: "nl", tr: "tr",
  pl: "pl", uk: "uk", ro: "ro", hr: "hr", sv: "sv",
  fil: "fil", sw: "en", am: "en", // fallback for unsupported
};

export async function textToSpeech(
  text: string,
  voice: TTSVoice = "george",
  format: "mp3" = "mp3",
  langCode?: string
): Promise<Buffer> {
  const voiceId = ELEVENLABS_VOICES[voice] || ELEVENLABS_VOICES.george;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable is not set.");
  }

  // Use multilingual model when a non-English language is specified
  const isEnglish = !langCode || langCode === "en";
  const modelId = isEnglish ? "eleven_turbo_v2_5" : "eleven_multilingual_v2";
  const elevenLang = langCode ? (ELEVENLABS_LANG_MAP[langCode] ?? "en") : "en";

  console.log(`[ElevenLabs TTS] voice="${voice}", model="${modelId}", lang="${elevenLang}", text=${text.length} chars`);

  const bodyPayload: Record<string, any> = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  };

  // Only pass language_code for multilingual model
  if (!isEnglish && elevenLang !== "en") {
    bodyPayload.language_code = elevenLang;
  }

  const response = await fetchWithTimeout(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    service: "elevenlabs",
    serviceLabel: "elevenlabs-tts",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify(bodyPayload),
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
