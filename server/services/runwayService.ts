import RunwayML from "@runwayml/sdk";

let _client: RunwayML | null = null;

function getClient(): RunwayML {
  if (!_client) {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) {
      throw new Error("RUNWAY_API_KEY environment variable is not set");
    }
    _client = new RunwayML({ apiKey });
  }
  return _client;
}

async function pollTaskUntilComplete(taskId: string): Promise<any> {
  const client = getClient();
  const maxAttempts = 120;
  const pollIntervalMs = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const task = await client.tasks.retrieve(taskId);
    console.log(`[Runway] Task ${taskId} status: ${task.status} (attempt ${attempt + 1}/${maxAttempts})`);

    if (task.status === "SUCCEEDED") {
      return task;
    }

    if (task.status === "FAILED" || task.status === "CANCELLED") {
      throw new Error(`Runway task ${taskId} ${task.status}: ${(task as any).failure || "Unknown error"}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Runway task ${taskId} timed out after ${(maxAttempts * pollIntervalMs) / 1000} seconds`);
}

function extractSceneEssence(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("dragon") && lower.includes("woman")) {
    return "A vast celestial panorama. On one side, a brilliant radiant figure glowing with golden light stands serenely. On the distant opposite side of the heavens, a shadowy silhouette of an ancient ornate serpentine sculpture looms against dark clouds. Dramatic Renaissance chiaroscuro lighting. Biblical fine art painting. Museum quality. Vertical 9:16.";
  }
  if (lower.includes("dragon") && (lower.includes("star") || lower.includes("tail"))) {
    return "A dramatic night sky over ancient lands. Meteors and shooting stars cascade across the heavens in brilliant streaks of light. Dark storm clouds gather. Dramatic cosmic event. Biblical fine art painting style with rich golden and deep blue tones. Vertical 9:16 composition. Museum quality.";
  }
  if (lower.includes("dragon") || lower.includes("serpent")) {
    return "An ancient ornate serpentine stone sculpture carved into the side of a dark mountain, illuminated by dramatic shafts of golden light breaking through storm clouds. Biblical Renaissance painting style. Rich warm tones. Museum quality. Vertical 9:16.";
  }
  if (lower.includes("birth") || lower.includes("child") || lower.includes("born")) {
    return "A radiant celestial scene. Golden divine light pours down from parted clouds onto a peaceful landscape below. A bright star shines above. Atmosphere of sacred triumph and divine protection. Biblical fine art painting. Rich warm tones. Vertical 9:16.";
  }
  if (lower.includes("wilderness") || lower.includes("fled") || lower.includes("refuge")) {
    return "A solitary cloaked figure walking through a vast, serene desert wilderness at golden hour. Towering rock formations frame the path. Warm golden light. A sense of divine protection and peaceful journey. Biblical fine art painting style. Vertical 9:16.";
  }
  if (lower.includes("heaven") || lower.includes("celestial") || lower.includes("wonder")) {
    return "A breathtaking celestial scene. The heavens open with layers of golden and violet light. Stars shimmer across an infinite sky. An atmosphere of awe and divine majesty. Biblical fine art painting style. Rich warm palette. Vertical 9:16.";
  }
  return `A serene biblical scene with dramatic golden lighting. Classical Renaissance painting composition. Rich warm color palette. Museum quality fine art. Vertical 9:16 portrait format.`;
}

function softenPromptForModeration(prompt: string, attempt: number): string {
  if (attempt >= 2) {
    const safe = extractSceneEssenceV2(prompt);
    console.log(`[Runway] Nuclear safe prompt (attempt ${attempt + 1}): "${safe.substring(0, 120)}..."`);
    return safe;
  }

  let softened = prompt;

  const removals = [
    /\bfierce\b/gi, /\bmenacing(ly)?\b/gi, /\bthreatening\b/gi,
    /\bdevour\b/gi, /\battack\b/gi, /\bkill\b/gi, /\bdestroy\b/gi,
    /\bterr(ifying|ible|or)\b/gi, /\bhorr(ifying|ible|or)\b/gi,
    /\bviolent\b/gi, /\bblood(y|ied)?\b/gi,
    /\bfear(ful|ed)?\b/gi, /\bscream(ing|s)?\b/gi,
    /\bcry(ing)?\b/gi, /\bpain(ed|ful)?\b/gi,
    /\bagony\b/gi, /\bsuffer(ing|s)?\b/gi,
    /\blabor(s|ing)?\b/gi, /\btravail(ing|s)?\b/gi,
    /\bwrath\b/gi, /\bfury\b/gi, /\brage\b/gi,
    /\bfixed on (her|him)\b/gi, /\bmonstrous\b/gi,
    /\bready to be delivered\b/gi, /\blooms?\b/gi,
    /\bcoiled\b/gi, /\bready to strike\b/gi,
    /\bpounce\b/gi, /\bhunt(ing|s)?\b/gi,
    /\bprey\b/gi, /\bvictim\b/gi,
    /\bpowerful\b/gi, /\boverwhelming\b/gi,
    /\benormous\b/gi,
    /\bgive birth\b/gi, /\bbirth\b/gi, /\bpregnant\b/gi,
    /\bchild\b/gi, /\bbaby\b/gi, /\binfant\b/gi,
    /\bnaked\b/gi, /\bundressed\b/gi,
  ];

  for (const pattern of removals) {
    softened = softened.replace(pattern, "");
  }

  softened = softened.replace(/\bdragon\b/gi, "ancient ornate multi-headed serpentine creature");
  softened = softened.replace(/\bseven heads\b/gi, "seven carved serpentine heads on long necks from one body");
  softened = softened.replace(/\bten horns\b/gi, "ornate horns across its crowned heads");
  softened = softened.replace(/\bstars.*earth\b/gi, "stars sweep across the sky");
  softened = softened.replace(/\bwoman\b/gi, "robed figure in golden light");
  softened = softened.replace(/\bbefore the\b/gi, "distant from the");
  softened = softened.replace(/\bstood before\b/gi, "appears in the distance from");

  softened = softened.replace(/\s{2,}/g, " ").trim();
  softened = `${softened}. Classical fine-art biblical painting style, peaceful composition, non-violent, reverent, museum quality.`;

  if (softened.length > 950) {
    softened = softened.substring(0, 940).replace(/\s+\S*$/, "") + ".";
    console.log(`[Runway] Softened prompt truncated to ${softened.length} chars to fit Runway 1000-char limit`);
  }

  console.log(`[Runway] Softened prompt (attempt ${attempt + 1}): "${softened.substring(0, 120)}..."`);
  return softened;
}

function extractSceneEssenceV2(prompt: string): string {
  const lower = prompt.toLowerCase();

  const hasDragon = lower.includes("dragon") || lower.includes("serpent") || lower.includes("beast") || lower.includes("creature");
  const hasWoman = lower.includes("woman") || lower.includes("radiant figure") || lower.includes("robed figure");
  const hasWilderness = lower.includes("wilderness") || lower.includes("desert") || lower.includes("flee");
  const hasTomb = lower.includes("tomb") || lower.includes("sepulch");
  const hasThrone = lower.includes("throne") || lower.includes("ascend") || lower.includes("caught up");

  if (hasDragon && hasWoman) {
    return "A vast ancient landscape under dramatic twilight skies. On the left, a robed figure in flowing white and gold garments stands serenely bathed in warm golden light. On the right at a great distance, an ornate multi-headed serpentine stone sculpture with crowned heads sits perched on ancient rocky cliffs. Classical Renaissance biblical painting style. Peaceful, reverent atmosphere. Vertical 9:16.";
  }
  if (hasDragon) {
    return "An ancient ornate stone sculpture of a multi-headed serpentine creature with seven crowned heads on long necks emerging from one body, carved from dark red stone with golden crown details. Set against a dramatic twilight sky with stars. Classical fine art style, museum quality sculpture photography. Vertical 9:16.";
  }
  if (hasThrone) {
    return "A breathtaking celestial throne room bathed in brilliant white-gold light. Rays of divine radiance stream downward from above. A glowing ethereal light ascends upward toward the throne. Ancient heavenly architecture with pillars of light. Classical Renaissance painting style. Awe-inspiring, reverent. Vertical 9:16.";
  }
  if (hasWilderness) {
    return "A robed figure in flowing white and gold garments walks through a vast rugged wilderness landscape. Rocky terrain, sparse vegetation, dramatic mountain backdrop. Golden hour lighting. Ancient Near Eastern setting. Photorealistic biblical cinematography. Peaceful, contemplative. Vertical 9:16.";
  }
  if (hasWoman) {
    return "A serene robed figure in flowing white and gold garments, standing in a celestial setting bathed in warm golden light. Stars shimmer in the background. A crown of stars above her head. Ancient Near Eastern appearance, dark hair. Classical Renaissance painting composition. Reverent, peaceful. Vertical 9:16.";
  }
  if (hasTomb) {
    return "An ancient limestone tomb entrance at dawn. Soft golden-pink light breaks over the hills of ancient Judea. A large stone rolled away from the entrance. Lush olive trees nearby. Photorealistic biblical cinematography. Vertical 9:16.";
  }
  if (lower.includes("heaven") || lower.includes("celestial") || lower.includes("wonder")) {
    return "A breathtaking celestial scene. The heavens open with layers of golden and violet light. Stars shimmer across an infinite sky. An atmosphere of awe and divine majesty. Biblical fine art painting style. Rich warm palette. Vertical 9:16.";
  }
  return `A serene biblical scene with dramatic golden lighting. Ancient Near Eastern landscape with stone architecture and olive trees. Classical Renaissance painting composition. Rich warm color palette. Museum quality fine art. Vertical 9:16 portrait format.`;
}

const IMAGE_PROMPT_SUFFIX = `
Cinematic vertical 9:16 portrait composition. Photorealistic, high quality.
Atmospheric cinematic lighting. Shallow depth of field. Film grain. Rich color grading.
`.trim();

export async function generateBrollImage(prompt: string, referenceImageUrls?: string[]): Promise<string> {
  const client = getClient();
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const currentPrompt = attempt === 0
        ? `${prompt}. ${IMAGE_PROMPT_SUFFIX}`
        : `${softenPromptForModeration(prompt, attempt)}. ${IMAGE_PROMPT_SUFFIX}`;

      console.log(`[Runway] Starting B-roll image generation (gen4_image, attempt ${attempt + 1}/${maxRetries + 1}) with prompt: "${currentPrompt.substring(0, 100)}..."`);
      if (referenceImageUrls?.length) {
        console.log(`[Runway] Using ${referenceImageUrls.length} character reference image(s)`);
      }

      const createParams: any = {
        model: "gen4_image",
        promptText: currentPrompt,
        ratio: "1080:1920",
      };

      if (referenceImageUrls?.length) {
        createParams.referenceImages = referenceImageUrls.map(uri => ({
          uri,
          referenceType: "character",
        }));
      }

      const response = await (client.textToImage as any).create(createParams);
      const taskId = response.id;
      console.log(`[Runway] Image generation task created: ${taskId}`);

      const completedTask = await pollTaskUntilComplete(taskId);

      const imageUrl = completedTask.output?.[0] || completedTask.artifacts?.[0]?.url;
      if (!imageUrl) {
        console.error(`[Runway] No image URL in completed task response:`, JSON.stringify(completedTask).substring(0, 500));
        throw new Error("Runway image generation completed but no image URL was returned");
      }

      console.log(`[Runway] Image generation complete: ${imageUrl}`);
      return imageUrl;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isCreditError = msg.toLowerCase().includes("enough credits") || msg.toLowerCase().includes("insufficient credits");
      const isModerationFail = msg.toLowerCase().includes("moderation") || msg.toLowerCase().includes("content");

      if (isCreditError) {
        console.error(`[Runway] OUT OF CREDITS — stopping immediately (no point retrying). Check your Runway API credit balance.`);
        throw error;
      }

      if (isModerationFail && attempt < maxRetries) {
        console.warn(`[Runway] Content moderation failure on attempt ${attempt + 1}. Softening prompt and retrying...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      if (attempt < maxRetries && !isModerationFail) {
        console.warn(`[Runway] B-roll image failed (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}. Retrying...`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unreachable");
}

export async function generateBrollVideo(imageUrl: string, motionPrompt?: string): Promise<string> {
  const client = getClient();
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const defaultMotion = "The camera slowly pushes in. Subtle environmental motion — light shifts, particles drift, gentle atmosphere.";
      const finalMotion = motionPrompt || defaultMotion;

      console.log(`[Runway] Starting B-roll video generation (gen4_5) from image: ${imageUrl.substring(0, 80)}...`);
      console.log(`[Runway] Motion prompt: "${finalMotion.substring(0, 100)}..."`);

      const response = await client.imageToVideo.create({
        model: "gen4.5" as any,
        promptImage: imageUrl,
        promptText: finalMotion,
        ratio: "720:1280" as any,
        duration: 10,
      });

      const taskId = response.id;
      console.log(`[Runway] Video generation task created: ${taskId}`);

      const completedTask = await pollTaskUntilComplete(taskId);

      const videoUrl = completedTask.output?.[0] || completedTask.artifacts?.[0]?.url;
      if (!videoUrl) {
        console.error(`[Runway] No video URL in completed task response:`, JSON.stringify(completedTask).substring(0, 500));
        throw new Error("Runway video generation completed but no video URL was returned");
      }

      console.log(`[Runway] Video generation complete: ${videoUrl}`);
      return videoUrl;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isCreditError = msg.toLowerCase().includes("enough credits") || msg.toLowerCase().includes("insufficient credits");

      if (isCreditError) {
        console.error(`[Runway] OUT OF CREDITS — stopping immediately. Check your Runway API credit balance.`);
        throw error;
      }

      if (attempt < maxRetries) {
        console.warn(`[Runway] B-roll video failed (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}. Retrying...`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unreachable");
}
