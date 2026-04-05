import fs from "fs";
import path from "path";

const VOICE_ID = "XrExE9yKIg1WjnnlVkGX"; // ellen_white / matilda

const QUOTE_TEXT =
  "The Word of God is living and powerful. You have come to the right place — open your heart, and let it speak.";

const OUT_PATH = path.join(__dirname, "../assets/audio/invitation-quote.mp3");

async function generate() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set in .env");

  console.log("[generate-invitation-quote] Calling ElevenLabs...");
  console.log(`  voice_id:          ${VOICE_ID}`);
  console.log(`  stability:         0.75`);
  console.log(`  similarity_boost:  0.85`);
  console.log(`  style:             0.05`);
  console.log(`  use_speaker_boost: false`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: QUOTE_TEXT,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.85,
          style: 0.05,
          use_speaker_boost: false,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${err}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, buffer);
  console.log(
    `[generate-invitation-quote] Saved ${buffer.length} bytes → ${OUT_PATH}`
  );
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
