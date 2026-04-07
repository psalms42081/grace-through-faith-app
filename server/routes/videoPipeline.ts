import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import { videoPipelineJobs, biblicalEpisodes } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { generateBrollPrompts } from "../services/promptGeneratorService";
import { generateBrollImage, generateBrollVideo } from "../services/runwayService";
import { generateBibleStoryScript } from "../services/scriptGeneratorService";
import { runBibleStoryPipeline } from "../run-bible-story-pipeline";
import { getCacheStats, clearCache } from "../services/pipelineCacheService";

const router = Router();

router.post("/api/video-pipeline/generate", requireAuth, async (req, res) => {
  try {
    const { script, topic, avatarVideoUrl } = req.body;

    if (!script?.trim() || !topic?.trim()) {
      return res.status(400).json({ error: "script and topic are required" });
    }

    const [job] = await db
      .insert(videoPipelineJobs)
      .values({
        script: script.trim(),
        topic: topic.trim(),
        avatarVideoUrl: avatarVideoUrl || null,
        status: "pending",
      })
      .returning({ id: videoPipelineJobs.id });

    const jobId = job.id;
    res.json({ jobId });

    runPipeline(jobId, script.trim(), topic.trim()).catch((err) => {
      console.error(`[video-pipeline] Background pipeline error for job ${jobId}:`, err);
    });
  } catch (err) {
    console.error("[video-pipeline] Generate error:", err);
    return res.status(500).json({ error: "Failed to start video pipeline" });
  }
});

router.get("/api/video-pipeline/status/:jobId", requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;

    const [job] = await db
      .select()
      .from(videoPipelineJobs)
      .where(eq(videoPipelineJobs.id, jobId))
      .limit(1);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    return res.json(job);
  } catch (err) {
    console.error("[video-pipeline] Status error:", err);
    return res.status(500).json({ error: "Failed to fetch job status" });
  }
});

async function updateJobStatus(
  jobId: string,
  updates: Partial<{
    status: string;
    brollImageUrls: string[];
    brollVideoUrls: string[];
    errorMessage: string;
  }>
) {
  await db
    .update(videoPipelineJobs)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(videoPipelineJobs.id, jobId));
}

async function runPipeline(jobId: string, script: string, topic: string) {
  try {
    await updateJobStatus(jobId, { status: "generating_prompts" });
    console.log(`[video-pipeline] Job ${jobId}: Generating B-roll prompts...`);
    const prompts = await generateBrollPrompts(script, topic);
    await updateJobStatus(jobId, { status: "prompts_ready" });
    console.log(`[video-pipeline] Job ${jobId}: Got ${prompts.length} prompts`);

    await updateJobStatus(jobId, { status: "generating_images" });
    console.log(`[video-pipeline] Job ${jobId}: Generating images...`);
    const imageUrls: string[] = [];
    for (const prompt of prompts) {
      const imageUrl = await generateBrollImage(prompt);
      imageUrls.push(imageUrl);
      await updateJobStatus(jobId, { brollImageUrls: imageUrls });
    }
    await updateJobStatus(jobId, { status: "images_ready", brollImageUrls: imageUrls });
    console.log(`[video-pipeline] Job ${jobId}: Got ${imageUrls.length} images`);

    await updateJobStatus(jobId, { status: "generating_videos" });
    console.log(`[video-pipeline] Job ${jobId}: Generating videos...`);
    const videoUrls: string[] = [];
    for (const imageUrl of imageUrls) {
      const videoUrl = await generateBrollVideo(imageUrl);
      videoUrls.push(videoUrl);
      await updateJobStatus(jobId, { brollVideoUrls: videoUrls });
    }
    await updateJobStatus(jobId, { status: "completed", brollVideoUrls: videoUrls });
    console.log(`[video-pipeline] Job ${jobId}: Pipeline completed with ${videoUrls.length} videos`);
  } catch (err) {
    console.error(`[video-pipeline] Job ${jobId} failed:`, err);
    await updateJobStatus(jobId, {
      status: "failed",
      errorMessage: "An error occurred. Please try again.",
    });
  }
}

router.post("/api/video-pipeline/bible-story-script", requireAuth, async (req, res) => {
  try {
    const { scriptureReference, title, passageText } = req.body;

    if (!scriptureReference?.trim() || !title?.trim()) {
      return res.status(400).json({ error: "scriptureReference and title are required" });
    }

    console.log(`[video-pipeline] Bible story script request: "${title}" (${scriptureReference})`);

    const script = await generateBibleStoryScript(
      scriptureReference.trim(),
      title.trim(),
      { passageText: passageText?.trim() || undefined }
    );

    return res.json(script);
  } catch (err) {
    console.error("[video-pipeline] Bible story script error:", err);
    return res.status(500).json({ error: "An error occurred. Please try again." });
  }
});

const activePipelineJobs = new Map<string, { status: string; startedAt: number; videoUrl?: string; error?: string }>();

router.post("/api/video-pipeline/bible-story-produce-internal", async (req, res) => {
  const internalKey = req.headers["x-internal-key"];
  if (internalKey !== process.env.JWT_SECRET?.substring(0, 16)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const { episodeId, scriptureReference, title, passageText } = req.body;
    if (!episodeId?.trim() || !scriptureReference?.trim() || !title?.trim()) {
      return res.status(400).json({ error: "episodeId, scriptureReference, and title are required" });
    }
    if (activePipelineJobs.has(episodeId) && activePipelineJobs.get(episodeId)?.status === "running") {
      return res.status(409).json({ error: "Pipeline already running for this episode", status: "running" });
    }
    activePipelineJobs.set(episodeId, { status: "running", startedAt: Date.now() });
    res.json({ message: `Pipeline started for "${title}" (${scriptureReference})`, episodeId, status: "running" });
    runBibleStoryPipeline(scriptureReference.trim(), title.trim(), episodeId.trim(), passageText?.trim() || undefined)
      .then((videoUrl) => {
        activePipelineJobs.set(episodeId, { status: "complete", startedAt: activePipelineJobs.get(episodeId)!.startedAt, videoUrl });
        console.log(`[video-pipeline] Bible story production COMPLETE for "${title}": ${videoUrl}`);
      })
      .catch((err) => {
        activePipelineJobs.set(episodeId, {
          status: "failed",
          startedAt: activePipelineJobs.get(episodeId)!.startedAt,
          error: "An error occurred. Please try again.",
        });
        console.error(`[video-pipeline] Bible story production FAILED for "${title}":`, err);
      });
  } catch (err) {
    console.error("[video-pipeline] bible-story-produce-internal error:", err);
    return res.status(500).json({ error: "An error occurred. Please try again." });
  }
});

router.get("/api/video-pipeline/bible-story-status-internal/:episodeId", async (req, res) => {
  const internalKey = req.headers["x-internal-key"];
  if (internalKey !== process.env.JWT_SECRET?.substring(0, 16)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { episodeId } = req.params;
  const job = activePipelineJobs.get(episodeId);
  if (!job) {
    return res.status(404).json({ error: "No pipeline job found for this episode" });
  }
  const elapsed = Math.round((Date.now() - job.startedAt) / 1000);
  return res.json({ episodeId, status: job.status, elapsedSeconds: elapsed, videoUrl: job.videoUrl, error: job.error });
});

router.post("/api/video-pipeline/bible-story-produce", requireAuth, async (req, res) => {
  try {
    const { episodeId, scriptureReference, title, passageText } = req.body;

    if (!episodeId?.trim() || !scriptureReference?.trim() || !title?.trim()) {
      return res.status(400).json({ error: "episodeId, scriptureReference, and title are required" });
    }

    if (activePipelineJobs.has(episodeId) && activePipelineJobs.get(episodeId)?.status === "running") {
      return res.status(409).json({ error: "Pipeline already running for this episode", status: "running" });
    }

    activePipelineJobs.set(episodeId, { status: "running", startedAt: Date.now() });

    res.json({
      message: `Pipeline started for "${title}" (${scriptureReference})`,
      episodeId,
      status: "running",
      checkStatusUrl: `/api/video-pipeline/bible-story-status/${episodeId}`,
    });

    runBibleStoryPipeline(scriptureReference.trim(), title.trim(), episodeId.trim(), passageText?.trim() || undefined)
      .then((videoUrl) => {
        activePipelineJobs.set(episodeId, { status: "complete", startedAt: activePipelineJobs.get(episodeId)!.startedAt, videoUrl });
        console.log(`[video-pipeline] Bible story production COMPLETE for "${title}": ${videoUrl}`);
      })
      .catch((err) => {
        activePipelineJobs.set(episodeId, {
          status: "failed",
          startedAt: activePipelineJobs.get(episodeId)!.startedAt,
          error: "An error occurred. Please try again.",
        });
        console.error(`[video-pipeline] Bible story production FAILED for "${title}":`, err);
      });
  } catch (err) {
    console.error("[video-pipeline] Bible story produce error:", err);
    return res.status(500).json({ error: "An error occurred. Please try again." });
  }
});

router.get("/api/video-pipeline/bible-story-status/:episodeId", requireAuth, async (req, res) => {
  const { episodeId } = req.params;
  const job = activePipelineJobs.get(episodeId);

  if (!job) {
    const [episode] = await db.select().from(biblicalEpisodes).where(eq(biblicalEpisodes.id, episodeId));
    if (episode) {
      return res.json({
        episodeId,
        status: episode.status,
        videoUrl: episode.videoUrl,
        title: episode.title,
      });
    }
    return res.status(404).json({ error: "No pipeline job found for this episode" });
  }

  const elapsed = Math.round((Date.now() - job.startedAt) / 1000);
  return res.json({
    episodeId,
    status: job.status,
    elapsedSeconds: elapsed,
    videoUrl: job.videoUrl,
    error: job.error,
  });
});

router.get("/api/video-pipeline/bible-story-cache-internal/:episodeId", async (req, res) => {
  const internalKey = req.headers["x-internal-key"];
  if (internalKey !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { episodeId } = req.params;
  const stats = getCacheStats(episodeId);
  res.json({ episodeId, cache: stats });
});

router.delete("/api/video-pipeline/bible-story-cache-internal/:episodeId", async (req, res) => {
  const internalKey = req.headers["x-internal-key"];
  if (internalKey !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { episodeId } = req.params;
  clearCache(episodeId);
  res.json({ episodeId, message: "Cache cleared" });
});

export default router;
