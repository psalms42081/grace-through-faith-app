import RunwayML from "@runwayml/sdk";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { getFFmpegPath } from "../server/services/ffmpegPath";

const TEST_SCRIPT = `Sometimes I feel like I'm just floating through life, like I don't really belong anywhere. I look around at my friends, and I wonder if they're all put together while I'm still trying to figure out who I am.`;

const CHARACTER_PROMPT = `Medium close-up shot of a teenage girl with natural makeup, light brown wavy hair, small gold hoop earrings, wearing a light blue-gray striped button-up shirt, sitting at a desk in a bright naturally lit bedroom with white shelves and framed photos in the background, looking directly at the camera with a warm empathetic expression, cinematic, natural lighting, photorealistic, 9:16 vertical portrait composition`;

const MOTION_PROMPT = `The camera holds steady in a medium close-up as the girl speaks directly to camera with gentle natural expressions — subtle head tilts, soft blinks, slight lip movements, empathetic eye contact. Warm natural light from a window shifts slightly. Shallow depth of field.`;

async function runFFmpegAsync(args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const ffmpeg = getFFmpegPath();
    execFile(ffmpeg, args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stderr || stdout);
    });
  });
}

async function main() {
  const outDir = path.join("/tmp", `runway-test-${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`\n=== RUNWAY + ELEVENLABS PIPELINE TEST ===`);
  console.log(`Output dir: ${outDir}\n`);

  const runwayKey = process.env.RUNWAY_API_KEY;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!runwayKey) throw new Error("RUNWAY_API_KEY not set");
  if (!elevenLabsKey) throw new Error("ELEVENLABS_API_KEY not set");

  const client = new RunwayML({ apiKey: runwayKey });

  console.log("STEP 1: Generating character anchor image via Runway gen4_image...");
  console.log(`Prompt: ${CHARACTER_PROMPT.substring(0, 100)}...`);
  const imgTask = await client.textToImage.create({
    model: "gen4_image",
    promptText: CHARACTER_PROMPT,
    ratio: "1080:1920" as any,
  });
  console.log(`Image task created: ${imgTask.id}`);

  let imageUrl = "";
  for (let i = 0; i < 120; i++) {
    const status = await client.tasks.retrieve(imgTask.id);
    console.log(`  Image task status: ${status.status} (attempt ${i + 1})`);
    if (status.status === "SUCCEEDED") {
      imageUrl = (status as any).output?.[0] || "";
      break;
    }
    if (status.status === "FAILED") {
      throw new Error(`Image generation failed: ${JSON.stringify(status)}`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  if (!imageUrl) throw new Error("Image generation timed out");
  console.log(`\nCharacter anchor image: ${imageUrl}\n`);

  const imgResponse = await fetch(imageUrl);
  const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
  const anchorPath = path.join(outDir, "anchor.png");
  fs.writeFileSync(anchorPath, imgBuffer);
  console.log(`Anchor image saved: ${anchorPath} (${(imgBuffer.length / 1024).toFixed(0)} KB)`);

  console.log("\nSTEP 2: Animating character via Runway gen4.5 image-to-video...");
  console.log(`Motion: ${MOTION_PROMPT.substring(0, 100)}...`);
  const vidTask = await client.imageToVideo.create({
    model: "gen4.5" as any,
    promptImage: imageUrl,
    promptText: MOTION_PROMPT,
    ratio: "720:1280" as any,
    duration: 10,
  });
  console.log(`Video task created: ${vidTask.id}`);

  let videoUrl = "";
  for (let i = 0; i < 180; i++) {
    const status = await client.tasks.retrieve(vidTask.id);
    console.log(`  Video task status: ${status.status} (attempt ${i + 1})`);
    if (status.status === "SUCCEEDED") {
      videoUrl = (status as any).output?.[0] || "";
      break;
    }
    if (status.status === "FAILED") {
      throw new Error(`Video generation failed: ${JSON.stringify(status)}`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  if (!videoUrl) throw new Error("Video generation timed out");
  console.log(`\nCharacter video: ${videoUrl}\n`);

  const vidResponse = await fetch(videoUrl);
  const vidBuffer = Buffer.from(await vidResponse.arrayBuffer());
  const videoPath = path.join(outDir, "character.mp4");
  fs.writeFileSync(videoPath, vidBuffer);
  console.log(`Character video saved: ${videoPath} (${(vidBuffer.length / 1024 / 1024).toFixed(1)} MB)`);

  console.log("\nSTEP 3: Generating voice via ElevenLabs TTS...");
  console.log(`Script: ${TEST_SCRIPT.substring(0, 80)}...`);
  const ttsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/pFZP5JQG7iQjIQuC4Bku?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": elevenLabsKey,
      },
      body: JSON.stringify({
        text: TEST_SCRIPT,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!ttsResponse.ok) {
    const errText = await ttsResponse.text();
    throw new Error(`ElevenLabs error: ${ttsResponse.status} ${errText}`);
  }
  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
  const audioPath = path.join(outDir, "voice.mp3");
  fs.writeFileSync(audioPath, audioBuffer);
  console.log(`Voice audio saved: ${audioPath} (${(audioBuffer.length / 1024).toFixed(0)} KB)`);

  console.log("\nSTEP 4: Combining video + audio with FFmpeg...");
  const finalPath = path.join(outDir, "final-combined.mp4");

  await runFFmpegAsync([
    "-i", videoPath,
    "-i", audioPath,
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "128k",
    "-shortest",
    "-map", "0:v:0",
    "-map", "1:a:0",
    finalPath,
    "-y"
  ], 60000);

  const finalSize = fs.statSync(finalPath).size;
  console.log(`\nFinal combined video: ${finalPath} (${(finalSize / 1024 / 1024).toFixed(1)} MB)`);

  const copyPath = "attached_assets/runway-pipeline-test.mp4";
  fs.copyFileSync(finalPath, copyPath);
  console.log(`\nCopied to: ${copyPath}`);

  console.log(`\n=== TEST COMPLETE ===`);
  console.log(`Files in ${outDir}:`);
  console.log(`  anchor.png     - Character anchor image`);
  console.log(`  character.mp4  - Runway animated video (no audio)`);
  console.log(`  voice.mp3      - ElevenLabs voice audio`);
  console.log(`  final-combined.mp4 - Video + audio combined`);
  console.log(`\nAlso copied final to: ${copyPath}`);
}

main().catch((err) => {
  console.error("\n=== TEST FAILED ===");
  console.error(err);
  process.exit(1);
});
