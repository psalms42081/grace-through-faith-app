import LumaAI from "lumaai";

let _client: LumaAI | null = null;

function getClient(): LumaAI {
  if (!_client) {
    const apiKey = process.env.LUMAAI_API_KEY;
    if (!apiKey) {
      throw new Error("LUMAAI_API_KEY environment variable is not set");
    }
    _client = new LumaAI({ authToken: apiKey });
  }
  return _client;
}

async function pollUntilComplete(generationId: string, label: string): Promise<any> {
  const client = getClient();
  const maxAttempts = 120;
  const pollIntervalMs = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const generation = await client.generations.get(generationId);
    console.log(`[Luma] ${label} status: ${generation.state} (attempt ${attempt}/${maxAttempts})`);

    if (generation.state === "completed") {
      return generation;
    }

    if (generation.state === "failed") {
      throw new Error(`Luma generation ${generationId} failed: ${(generation as any).failure_reason || "Unknown error"}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Luma generation ${generationId} timed out after ${(maxAttempts * pollIntervalMs) / 1000} seconds`);
}

export type LumaStyle = "cinematic" | "kids" | "dark-prophetic";
export type LumaVideoModel = "ray-2" | "ray-flash-2";
export type LumaImageModel = "photon-1" | "photon-flash-1";

function getStyleSuffix(style: LumaStyle): string {
  switch (style) {
    case "cinematic":
      return "Cinematic vertical 9:16 portrait composition. Photorealistic, high quality. Atmospheric cinematic lighting. Shallow depth of field. Film grain. Rich color grading.";
    case "kids":
      return "Pixar-style 3D animation, warm colors, child-friendly, storybook illustration style. Vertical 9:16 portrait composition. Soft lighting, rounded features, expressive characters.";
    case "dark-prophetic":
      return "Dark prophetic cinema style. Guillermo del Toro creature design meets Gustave Doré biblical engravings. Ancient, terrifying, otherworldly. Vertical 9:16 portrait composition. Dramatic chiaroscuro lighting.";
    default:
      return "Cinematic vertical 9:16 portrait composition. Photorealistic, high quality.";
  }
}

function getVideoCostEstimate(model: LumaVideoModel, duration: "5s" | "9s"): string {
  if (model === "ray-flash-2") {
    return duration === "5s" ? "$0.24" : "$0.44";
  }
  return duration === "5s" ? "$0.71" : "$1.27";
}

function getImageCostEstimate(model: LumaImageModel): string {
  return model === "photon-flash-1" ? "~$0.004" : "~$0.015";
}

export async function generateLumaImage(
  prompt: string,
  style: LumaStyle = "cinematic",
  model: LumaImageModel = "photon-1"
): Promise<string> {
  const client = getClient();
  const maxRetries = 2;
  const styleSuffix = getStyleSuffix(style);
  const fullPrompt = `${prompt}. ${styleSuffix}`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Luma] Starting image generation (${model}, ${getImageCostEstimate(model)}, attempt ${attempt + 1}/${maxRetries + 1}) with prompt: "${fullPrompt.substring(0, 100)}..."`);

      const generation = await client.generations.image.create({
        prompt: fullPrompt,
        aspect_ratio: "9:16",
        model: model as any,
      });

      const completed = await pollUntilComplete(generation.id!, `Image "${prompt.substring(0, 40)}..."`);

      const imageUrl = completed.assets?.image;
      if (!imageUrl) {
        throw new Error("Luma image generation completed but no image URL was returned");
      }

      console.log(`[Luma] Image generation complete (${model}): ${imageUrl.substring(0, 80)}...`);
      return imageUrl;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (attempt < maxRetries) {
        console.warn(`[Luma] Image generation failed (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}. Retrying...`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unreachable");
}

export async function generateLumaVideo(
  imageUrl: string,
  motionPrompt?: string,
  duration: "5s" | "9s" = "5s",
  model: LumaVideoModel = "ray-2"
): Promise<string> {
  const client = getClient();
  const maxRetries = 2;
  const defaultMotion = "The camera slowly pushes in. Subtle environmental motion — light shifts, particles drift, gentle atmosphere.";
  const finalMotion = motionPrompt || defaultMotion;
  const cost = getVideoCostEstimate(model, duration);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Luma] Starting video generation (${model}, ${duration}, ~${cost}) from image: ${imageUrl.substring(0, 80)}...`);
      console.log(`[Luma] Motion prompt: "${finalMotion.substring(0, 100)}..."`);

      const generation = await client.generations.create({
        prompt: finalMotion,
        model: model as any,
        resolution: "720p",
        duration: duration,
        keyframes: {
          frame0: {
            type: "image",
            url: imageUrl,
          },
        },
      });

      const completed = await pollUntilComplete(generation.id!, `Video scene (${model})`);

      const videoUrl = completed.assets?.video;
      if (!videoUrl) {
        throw new Error("Luma video generation completed but no video URL was returned");
      }

      console.log(`[Luma] Video generation complete (${model}): ${videoUrl.substring(0, 80)}...`);
      return videoUrl;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (attempt < maxRetries) {
        console.warn(`[Luma] Video generation failed (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}. Retrying...`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unreachable");
}

export async function generateLumaVideoFromText(
  prompt: string,
  duration: "5s" | "9s" = "5s",
  model: LumaVideoModel = "ray-2"
): Promise<string> {
  const client = getClient();
  const maxRetries = 2;
  const cost = getVideoCostEstimate(model, duration);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Luma] Starting text-to-video generation (${model}, ${duration}, ~${cost}): "${prompt.substring(0, 100)}..."`);

      const generation = await client.generations.create({
        prompt,
        model: model as any,
        resolution: "720p",
        duration: duration,
      });

      const completed = await pollUntilComplete(generation.id!, `Text-to-video (${model})`);

      const videoUrl = completed.assets?.video;
      if (!videoUrl) {
        throw new Error("Luma text-to-video completed but no video URL was returned");
      }

      console.log(`[Luma] Text-to-video complete (${model}): ${videoUrl.substring(0, 80)}...`);
      return videoUrl;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (attempt < maxRetries) {
        console.warn(`[Luma] Text-to-video failed (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}. Retrying...`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unreachable");
}
