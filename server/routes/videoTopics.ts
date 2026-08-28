import { Router, Request, Response } from "express";
import { requireAuth, requirePipelineAccess } from "../middleware/auth";
import { db } from "../db";
import { videoTopics, videoAvatars, topicVideos } from "../../shared/schema";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { generateVideoScript } from "../services/scriptGeneratorService";
import { uploadVideoFromUrl } from "../services/cloudinaryService";
import { runCinematicPipeline } from "../services/cinematicPipelineService";
import { runCinematicNarrativePipeline } from "../services/cinematicNarrativePipeline";
import { expandTopicCrossReferences, expandAllTopicsCrossReferences } from "../services/crossReferenceExpander";

const router = Router();

async function resolveAvatar(avatarId: string | null) {
  if (avatarId) {
    const [avatar] = await db
      .select()
      .from(videoAvatars)
      .where(eq(videoAvatars.id, avatarId));
    if (avatar) return avatar;
  }

  const [defaultAvatar] = await db
    .select()
    .from(videoAvatars)
    .where(eq(videoAvatars.isDefault, true));

  return defaultAvatar || null;
}

async function checkAndUpdateHeyGenVideo(topicId: string, heygenVideoId: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${heygenVideoId}`,
      { headers: { "X-Api-Key": apiKey, "Accept": "application/json" } }
    );

    if (!res.ok) {
      console.error(`[video-topics] HeyGen status check HTTP ${res.status} for topic=${topicId}`);
      return false;
    }

    const data = await res.json();
    const status = data.data?.status;
    const videoUrl = data.data?.video_url;

    if (status === "completed" && videoUrl) {
      let permanentUrl = videoUrl;
      try {
        const publicId = `topic-${topicId}-${heygenVideoId}`;
        permanentUrl = await uploadVideoFromUrl(videoUrl, publicId);
        console.log(`[video-topics] Video uploaded to Cloudinary: topic=${topicId}`);
      } catch (uploadErr) {
        console.error(`[video-topics] Failed to upload to Cloudinary, using HeyGen URL: topic=${topicId}`, uploadErr);
      }
      await db
        .update(videoTopics)
        .set({ avatarVideoUrl: permanentUrl, status: "avatar-ready", updatedAt: new Date() })
        .where(eq(videoTopics.id, topicId));
      console.log(`[video-topics] Video completed: topic=${topicId} url=${permanentUrl.substring(0, 80)}...`);
      return true;
    }

    if (status === "failed") {
      const errDetail = data.data?.error?.detail || data.data?.error?.message || "Unknown HeyGen error";
      await db
        .update(videoTopics)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(videoTopics.id, topicId));
      console.error(`[video-topics] Video failed: topic=${topicId} error=${errDetail}`);
      return true;
    }

    return false;
  } catch (err) {
    console.error(`[video-topics] Status check error for topic=${topicId}:`, err);
    return false;
  }
}

export async function recoverStuckHeyGenJobs() {
  try {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      console.log("[video-topics] No HEYGEN_API_KEY — skipping recovery check");
      return;
    }

    const stuckTopics = await db
      .select()
      .from(videoTopics)
      .where(eq(videoTopics.status, "generating"));

    if (stuckTopics.length === 0) {
      console.log("[video-topics] No stuck generating topics found");
      return;
    }

    console.log(`[video-topics] Recovery: found ${stuckTopics.length} stuck topic(s) in 'generating' status`);

    for (const topic of stuckTopics) {
      const heygenVideoId = topic.avatarVideoUrl;
      if (!heygenVideoId || heygenVideoId.startsWith("http")) {
        console.log(`[video-topics] Recovery: topic=${topic.id} has no HeyGen video ID — marking as failed`);
        await db
          .update(videoTopics)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(videoTopics.id, topic.id));
        continue;
      }

      console.log(`[video-topics] Recovery: checking HeyGen status for topic=${topic.id} videoId=${heygenVideoId}`);
      const resolved = await checkAndUpdateHeyGenVideo(topic.id, heygenVideoId, apiKey);

      if (!resolved) {
        console.log(`[video-topics] Recovery: topic=${topic.id} still processing — starting background poll`);
        pollHeyGenStatus(topic.id, heygenVideoId, apiKey).catch((err) => {
          console.error(`[video-topics] Recovery poll error for topic=${topic.id}:`, err);
        });
      }
    }
  } catch (err) {
    console.error("[video-topics] Recovery check failed:", err);
  }
}

router.get("/api/evangelism-videos", async (_req, res) => {
  try {
    const allTopics = await db
      .select({
        id: videoTopics.id,
        title: videoTopics.title,
        description: videoTopics.description,
        scriptureAnchor: videoTopics.scriptureAnchor,
        category: videoTopics.category,
        avatarVideoUrl: videoTopics.avatarVideoUrl,
        finalVideoUrl: videoTopics.finalVideoUrl,
        thumbnailUrl: videoTopics.thumbnailUrl,
        language: videoTopics.language,
        createdAt: videoTopics.createdAt,
      })
      .from(videoTopics)
      .orderBy(videoTopics.priority);

    const completedTopicVideos = await db
      .select()
      .from(topicVideos)
      .where(eq(topicVideos.assemblyStatus, "complete"));

    const topicVideoMap = new Map<string, typeof completedTopicVideos>();
    for (const tv of completedTopicVideos) {
      if (!topicVideoMap.has(tv.topicId)) {
        topicVideoMap.set(tv.topicId, []);
      }
      topicVideoMap.get(tv.topicId)!.push(tv);
    }

    const results: any[] = [];
    const seen = new Set<string>();

    for (const topic of allTopics) {
      if (seen.has(topic.title)) continue;
      seen.add(topic.title);

      const scriptureVideos = topicVideoMap.get(topic.id) || [];

      if (scriptureVideos.length > 0) {
        for (const sv of scriptureVideos) {
          const svUrl = sv.finalVideoUrl || sv.assembledVideoUrl;
          if (!svUrl) continue;
          results.push({
            id: sv.id,
            topicId: topic.id,
            title: topic.title,
            description: topic.description,
            scriptureAnchor: sv.scriptureAnchor,
            category: topic.category,
            videoUrl: svUrl,
            thumbnailUrl: sv.thumbnailUrl,
            language: topic.language,
            createdAt: sv.createdAt,
          });
        }
      } else if (topic.finalVideoUrl && topic.finalVideoUrl.startsWith("http")) {
          results.push({
            id: topic.id,
            topicId: topic.id,
            title: topic.title,
            description: topic.description,
            scriptureAnchor: topic.scriptureAnchor,
            category: topic.category,
            videoUrl: topic.finalVideoUrl,
            thumbnailUrl: topic.thumbnailUrl,
            language: topic.language,
            createdAt: topic.createdAt,
          });
      }
    }

    res.json(results);
  } catch (err: any) {
    console.error("Failed to fetch evangelism videos:", err);
    res.status(500).json({ error: "Failed to fetch evangelism videos" });
  }
});

router.get("/api/video-topics", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const topics = await db
      .select()
      .from(videoTopics)
      .orderBy(videoTopics.priority);
    res.json(topics);
  } catch (err: any) {
    console.error("Failed to fetch video topics:", err);
    res.status(500).json({ error: "Failed to fetch video topics" });
  }
});

router.post("/api/video-topics/:id/generate-script", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const id = String(req.params.id);

    const [topic] = await db
      .select()
      .from(videoTopics)
      .where(eq(videoTopics.id, id));

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    if (topic.status === "generating") {
      return res.status(400).json({ error: "Video is currently being processed. Please wait for it to finish." });
    }

    await db
      .update(videoTopics)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(videoTopics.id, id));

    const script = await generateVideoScript(
      topic.title,
      topic.scriptureAnchor || "",
      topic.targetAgeGroup || "teens",
      topic.category || undefined
    );

    const newStatus = topic.avatarVideoUrl ? "avatar-ready" : "script-ready";
    const [updated] = await db
      .update(videoTopics)
      .set({
        generatedScript: script,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(videoTopics.id, id))
      .returning();

    console.log(`[video-topics] Script generated for topic="${topic.title}" (${script.length} chars)`);
    res.json(updated);
  } catch (err: any) {
    console.error("Failed to generate script:", err);
    const catchId = String(req.params.id);
    const [current] = await db.select({ status: videoTopics.status, avatarVideoUrl: videoTopics.avatarVideoUrl })
      .from(videoTopics).where(eq(videoTopics.id, catchId)).catch(() => []);
    const restoreStatus = current?.avatarVideoUrl ? "avatar-ready" : (current?.status === "generating" ? "script-ready" : current?.status || "failed");
    await db
      .update(videoTopics)
      .set({ status: restoreStatus, updatedAt: new Date() })
      .where(eq(videoTopics.id, catchId))
      .catch(() => {});
    res.status(500).json({ error: "Failed to generate script" });
  }
});

router.patch("/api/video-topics/:id", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { generatedScript } = req.body;

    if (typeof generatedScript !== "string" || !generatedScript.trim()) {
      return res.status(400).json({ error: "Script text is required." });
    }

    const [topic] = await db
      .select()
      .from(videoTopics)
      .where(eq(videoTopics.id, id));

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const [updated] = await db
      .update(videoTopics)
      .set({
        generatedScript: generatedScript.trim(),
        updatedAt: new Date(),
      })
      .where(eq(videoTopics.id, id))
      .returning();

    console.log(`[video-topics] Script updated for "${updated.title}" by admin`);
    res.json(updated);
  } catch (err: any) {
    console.error("[video-topics] Error updating script:", err);
    res.status(500).json({ error: "Failed to update script" });
  }
});

router.post("/api/video-topics/:id/submit-heygen", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const id = String(req.params.id);

    const [topic] = await db
      .select()
      .from(videoTopics)
      .where(eq(videoTopics.id, id));

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    if (!topic.generatedScript?.trim()) {
      return res.status(400).json({ error: "No script available. Generate a script first." });
    }

    const avatar = await resolveAvatar(topic.avatarId);
    if (!avatar) {
      return res.status(500).json({ error: "No avatar found for this topic" });
    }

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "HeyGen API key not configured" });
    }

    const callbackDomain = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN || "";
    const webhookSecret = process.env.HEYGEN_WEBHOOK_SECRET || "";
    const callbackUrl = callbackDomain
      ? `https://${callbackDomain}/api/webhooks/heygen${webhookSecret ? `?token=${webhookSecret}` : ""}`
      : "";

    console.log(`[video-topics] Submitting to HeyGen: topic="${topic.title}" avatar="${avatar.name}" (${avatar.heygenAvatarId}) voice=${avatar.heygenVoiceId}`);

    const requestBody: any = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: avatar.heygenAvatarId,
            avatar_style: "normal",
            motion_model: "AvatarIV",
          },
          voice: {
            type: "text",
            input_text: topic.generatedScript.trim(),
            voice_id: avatar.heygenVoiceId,
            emotion: "Friendly",
          },
          background: {
            type: "color",
            value: "#000000",
          },
        },
      ],
      use_avatar_iv_model: true,
      dimension: {
        width: 1080,
        height: 1920,
      },
      title: `${topic.title} - Informed Ministries`,
      callback_id: `video-topic-${id}`,
    };

    if (callbackUrl) {
      requestBody.callback_url = callbackUrl;
      console.log(`[video-topics] HeyGen callback URL: ${callbackUrl}`);
    }

    const heygenResponse = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!heygenResponse.ok) {
      const errText = await heygenResponse.text();
      console.error("[video-topics] HeyGen generate error:", heygenResponse.status, errText);
      await db
        .update(videoTopics)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(videoTopics.id, id));
      return res.status(heygenResponse.status).json({ error: "Failed to generate avatar video with HeyGen" });
    }

    const heygenData = await heygenResponse.json();
    const videoId = heygenData.data?.video_id;

    if (!videoId) {
      await db
        .update(videoTopics)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(videoTopics.id, id));
      return res.status(500).json({ error: "No video ID returned from HeyGen" });
    }

    const [updated] = await db
      .update(videoTopics)
      .set({
        avatarVideoUrl: videoId,
        status: "generating",
        updatedAt: new Date(),
      })
      .where(eq(videoTopics.id, id))
      .returning();

    console.log(`[video-topics] HeyGen video submitted: topicId=${id} videoId=${videoId} avatar=${avatar.name}`);
    res.json(updated);

    pollHeyGenStatus(id, videoId, apiKey).catch((err) => {
      console.error(`[video-topics] Background poll error for topic=${id}:`, err);
    });
  } catch (err: any) {
    console.error("[video-topics] Submit to HeyGen failed:", err);
    const catchId = String(req.params.id);
    await db
      .update(videoTopics)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(videoTopics.id, catchId))
      .catch(() => {});
    res.status(500).json({ error: "Failed to submit to HeyGen" });
  }
});

async function pollHeyGenStatus(topicId: string, videoId: string, apiKey: string) {
  const MAX_POLLS = 40;
  const INTERVAL_MS = 30_000;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, INTERVAL_MS));

    const [current] = await db
      .select({ status: videoTopics.status })
      .from(videoTopics)
      .where(eq(videoTopics.id, topicId));

    if (!current || current.status === "avatar-ready" || current.status === "failed") {
      console.log(`[video-topics] Poll stopping: topic=${topicId} already resolved (status=${current?.status})`);
      return;
    }

    const resolved = await checkAndUpdateHeyGenVideo(topicId, videoId, apiKey);
    console.log(`[video-topics] Poll ${i + 1}/${MAX_POLLS}: topic=${topicId} resolved=${resolved}`);
    if (resolved) return;
  }

  console.error(`[video-topics] Poll timeout (${MAX_POLLS * INTERVAL_MS / 60000} min): topic=${topicId} videoId=${videoId}`);
  await db
    .update(videoTopics)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(videoTopics.id, topicId));
}

router.post("/api/webhooks/heygen", async (req: Request, res: Response) => {
  const webhookSecret = process.env.HEYGEN_WEBHOOK_SECRET;
  if (webhookSecret) {
    const token = req.headers["x-webhook-secret"] || req.query.token;
    if (token !== webhookSecret) {
      console.warn("[video-topics] Webhook rejected: invalid or missing secret token");
      return res.status(401).json({ error: "Unauthorized" });
    }
  } else {
    console.warn("[video-topics] HEYGEN_WEBHOOK_SECRET not set — webhook is unprotected");
  }

  try {
    const body = req.body;
    console.log(`[video-topics] HeyGen webhook received:`, JSON.stringify(body).substring(0, 500));

    const eventType = body.event_type || body.type;
    const eventData = body.data || body;
    const callbackId = eventData.callback_id || body.callback_id;
    const videoId = eventData.video_id || body.video_id;
    const videoUrl = eventData.video_url || body.video_url;
    const status = eventData.status || body.status;

    let topicId: string | null = null;

    if (callbackId && callbackId.startsWith("video-topic-")) {
      topicId = callbackId.replace("video-topic-", "");
    }

    if (!topicId && videoId) {
      const topics = await db
        .select()
        .from(videoTopics)
        .where(eq(videoTopics.avatarVideoUrl, videoId));
      if (topics.length > 0) {
        topicId = topics[0].id;
      }
    }

    if (!topicId) {
      console.log(`[video-topics] HeyGen webhook: could not match to any topic (callbackId=${callbackId} videoId=${videoId})`);
      return res.status(200).json({ received: true });
    }

    if (eventType === "avatar_video.success" || status === "completed") {
      if (videoUrl) {
        let permanentUrl = videoUrl;
        try {
          const publicId = `topic-${topicId}-${videoId || Date.now()}`;
          permanentUrl = await uploadVideoFromUrl(videoUrl, publicId);
          console.log(`[video-topics] Webhook: video uploaded to Cloudinary for topic=${topicId}`);
        } catch (uploadErr) {
          console.error(`[video-topics] Webhook: failed to upload to Cloudinary, using HeyGen URL: topic=${topicId}`, uploadErr);
        }
        await db
          .update(videoTopics)
          .set({ avatarVideoUrl: permanentUrl, status: "avatar-ready", updatedAt: new Date() })
          .where(eq(videoTopics.id, topicId));
        console.log(`[video-topics] Webhook: video completed for topic=${topicId} url=${permanentUrl.substring(0, 80)}...`);
      } else if (videoId) {
        const apiKey = process.env.HEYGEN_API_KEY;
        if (apiKey) {
          await checkAndUpdateHeyGenVideo(topicId, videoId, apiKey);
        }
      }
    } else if (eventType === "avatar_video.fail" || status === "failed") {
      await db
        .update(videoTopics)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(videoTopics.id, topicId));
      console.log(`[video-topics] Webhook: video failed for topic=${topicId}`);
    } else {
      console.log(`[video-topics] Webhook: unhandled event_type=${eventType} status=${status} for topic=${topicId}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[video-topics] Webhook error:", err);
    res.status(200).json({ received: true, error: "An error occurred. Please try again." });
  }
});

router.get("/api/video-topics/:id/check-heygen-status", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const id = String(req.params.id);

    const [topic] = await db
      .select()
      .from(videoTopics)
      .where(eq(videoTopics.id, id));

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const videoId = topic.avatarVideoUrl;
    if (!videoId || videoId.startsWith("http")) {
      return res.json({
        status: topic.status,
        avatarVideoUrl: topic.avatarVideoUrl,
        message: videoId ? "Video already completed" : "No HeyGen video ID found",
      });
    }

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "HeyGen API key not configured" });
    }

    const resolved = await checkAndUpdateHeyGenVideo(id, videoId, apiKey);

    if (resolved) {
      const [updated] = await db
        .select()
        .from(videoTopics)
        .where(eq(videoTopics.id, id));
      return res.json({
        status: updated?.status || "unknown",
        avatarVideoUrl: updated?.avatarVideoUrl,
        heygenStatus: updated?.status === "avatar-ready" ? "completed" : "failed",
      });
    }

    return res.json({
      status: topic.status,
      heygenStatus: "processing",
      message: "Video is still processing",
    });
  } catch (err: any) {
    console.error("[video-topics] Check HeyGen status error:", err);
    res.status(500).json({ error: "Failed to check video status" });
  }
});

router.post("/api/video-topics/:id/generate-cinematic", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const id = String(req.params.id);

    const [topic] = await db
      .select()
      .from(videoTopics)
      .where(eq(videoTopics.id, id));

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    if (!topic.generatedScript?.trim()) {
      return res.status(400).json({ error: "No script available. Generate a script first." });
    }

    if (!topic.musicTrack) {
      return res.status(400).json({ error: "No music track assigned to this topic." });
    }

    const busyStatuses = ["scene-directing", "generating-anchor", "generating-scene-videos", "generating-voiceover", "computing-timing", "assembling-video", "generating-edl", "extracting-timestamps", "generating-broll-images", "generating-broll-videos", "queued"];
    if (topic.assemblyStatus && busyStatuses.includes(topic.assemblyStatus)) {
      return res.status(400).json({ error: "Pipeline is already running for this topic." });
    }

    const isCinematicMode = topic.pipelineMode === "cinematic";

    if (!isCinematicMode && !topic.avatarVideoUrl?.startsWith("http")) {
      return res.status(400).json({ error: "No completed avatar video. Submit to HeyGen first." });
    }

    await db
      .update(videoTopics)
      .set({ assemblyStatus: "queued", updatedAt: new Date() })
      .where(eq(videoTopics.id, id));

    if (isCinematicMode) {
      console.log(`[video-topics] Starting CINEMATIC NARRATIVE pipeline for "${topic.title}" (${id})`);
      runCinematicNarrativePipeline(id).catch((err) => {
        console.error(`[video-topics] Cinematic narrative pipeline failed for topic=${id}:`, err);
      });
    } else {
      console.log(`[video-topics] Starting legacy cinematic pipeline for "${topic.title}" (${id})`);
      runCinematicPipeline(id).catch((err) => {
        console.error(`[video-topics] Legacy cinematic pipeline failed for topic=${id}:`, err);
      });
    }

    res.json({ message: `${isCinematicMode ? "Cinematic narrative" : "Cinematic"} pipeline started`, topicId: id, status: "queued" });
  } catch (err: any) {
    console.error("[video-topics] Generate cinematic error:", err);
    res.status(500).json({ error: "Failed to start cinematic pipeline" });
  }
});

router.patch("/api/video-topics/:id/review", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { action, notes } = req.body;

    if (!action || (action !== "approve" && action !== "reject")) {
      return res.status(400).json({ error: "Invalid action. Must be 'approve' or 'reject'." });
    }

    const [topic] = await db
      .select()
      .from(videoTopics)
      .where(eq(videoTopics.id, id));

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    if (action === "approve") {
      const [updated] = await db
        .update(videoTopics)
        .set({
          reviewStatus: "approved",
          publishedAt: new Date(),
          reviewNotes: notes || null,
          updatedAt: new Date(),
        })
        .where(eq(videoTopics.id, id))
        .returning();

      console.log(`[video-topics] Topic "${topic.title}" APPROVED and published`);
      res.json(updated);
    } else {
      const [updated] = await db
        .update(videoTopics)
        .set({
          reviewStatus: "rejected",
          reviewNotes: notes || null,
          updatedAt: new Date(),
        })
        .where(eq(videoTopics.id, id))
        .returning();

      console.log(`[video-topics] Topic "${topic.title}" REJECTED${notes ? `: ${notes}` : ""}`);
      res.json(updated);
    }
  } catch (err: any) {
    console.error("[video-topics] Review error:", err);
    res.status(500).json({ error: "Failed to process review" });
  }
});

router.get("/api/video-topics/:id/scriptures", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const id = String(req.params.id);
    const videos = await db
      .select()
      .from(topicVideos)
      .where(eq(topicVideos.topicId, id))
      .orderBy(topicVideos.createdAt);

    res.json(videos);
  } catch (err: any) {
    console.error("[video-topics] Get scriptures error:", err);
    res.status(500).json({ error: "Failed to fetch scriptures" });
  }
});

router.post("/api/video-topics/:id/scriptures", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { scriptureAnchor } = req.body;

    if (!scriptureAnchor?.trim()) {
      return res.status(400).json({ error: "Scripture anchor is required" });
    }

    const [topic] = await db
      .select()
      .from(videoTopics)
      .where(eq(videoTopics.id, id));

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const existing = await db
      .select({ id: topicVideos.id })
      .from(topicVideos)
      .where(
        and(
          eq(topicVideos.topicId, id),
          eq(topicVideos.scriptureAnchor, scriptureAnchor.trim())
        )
      );

    if (existing.length > 0) {
      return res.status(409).json({ error: "Scripture already added to this topic" });
    }

    const [inserted] = await db
      .insert(topicVideos)
      .values({
        topicId: id,
        scriptureAnchor: scriptureAnchor.trim(),
      })
      .returning();

    res.json(inserted);
  } catch (err: any) {
    console.error("[video-topics] Add scripture error:", err);
    res.status(500).json({ error: "Failed to add scripture" });
  }
});

router.delete("/api/topic-videos/:videoId", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const videoId = String(req.params.videoId);
    const [deleted] = await db
      .delete(topicVideos)
      .where(eq(topicVideos.id, videoId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Topic video not found" });
    }

    res.json({ message: "Scripture video deleted", id: videoId });
  } catch (err: any) {
    console.error("[video-topics] Delete topic video error:", err);
    res.status(500).json({ error: "Failed to delete topic video" });
  }
});

router.post("/api/topic-videos/:videoId/generate", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const videoId = String(req.params.videoId);

    const [topicVideo] = await db
      .select()
      .from(topicVideos)
      .where(eq(topicVideos.id, videoId));

    if (!topicVideo) {
      return res.status(404).json({ error: "Topic video not found" });
    }

    const [topic] = await db
      .select()
      .from(videoTopics)
      .where(eq(videoTopics.id, topicVideo.topicId));

    if (!topic) {
      return res.status(404).json({ error: "Parent topic not found" });
    }

    if (!topic.musicTrack) {
      return res.status(400).json({ error: "No music track assigned to the parent topic." });
    }

    const busyStatuses = ["scene-directing", "generating-anchor", "generating-scene-videos", "generating-voiceover", "computing-timing", "assembling-video", "queued"];
    if (topicVideo.assemblyStatus && busyStatuses.includes(topicVideo.assemblyStatus)) {
      return res.status(400).json({ error: "Pipeline is already running for this scripture video." });
    }

    if (!topicVideo.generatedScript?.trim()) {
      console.log(`[video-topics] Generating fresh script for cross-ref "${topic.title}" - ${topicVideo.scriptureAnchor}`);
      const avatarInfo = await resolveAvatar(topic.avatarId);
      const script = await generateVideoScript(topic.title, {
        targetAgeGroup: topic.targetAgeGroup || "teens",
        scriptureAnchor: topicVideo.scriptureAnchor,
        category: topic.category || undefined,
        avatarGender: avatarInfo?.gender || "female",
      });

      await db
        .update(topicVideos)
        .set({ generatedScript: script, assemblyStatus: "queued", updatedAt: new Date() })
        .where(eq(topicVideos.id, videoId));
    } else {
      await db
        .update(topicVideos)
        .set({ assemblyStatus: "queued", updatedAt: new Date() })
        .where(eq(topicVideos.id, videoId));
    }

    console.log(`[video-topics] Starting cinematic pipeline for "${topic.title}" - ${topicVideo.scriptureAnchor} (topicVideo=${videoId})`);
    runCinematicNarrativePipeline(topic.id, videoId).catch((err) => {
      console.error(`[video-topics] Pipeline failed for topicVideo=${videoId}:`, err);
      db.update(topicVideos)
        .set({ assemblyStatus: "failed", updatedAt: new Date() })
        .where(eq(topicVideos.id, videoId))
        .catch(() => {});
    });

    res.json({ message: "Pipeline started", topicVideoId: videoId, status: "queued" });
  } catch (err: any) {
    console.error("[video-topics] Generate topic video error:", err);
    res.status(500).json({ error: "Failed to start pipeline for scripture video" });
  }
});

router.get("/api/evangelism-videos/library", async (_req, res) => {
  try {
    const allTopics = await db
      .select({
        id: videoTopics.id,
        title: videoTopics.title,
        description: videoTopics.description,
        category: videoTopics.category,
      })
      .from(videoTopics)
      .orderBy(videoTopics.priority);

    const allVideos = await db
      .select()
      .from(topicVideos)
      .where(eq(topicVideos.assemblyStatus, "complete"));

    const topicMap = new Map<string, any>();
    for (const t of allTopics) {
      topicMap.set(t.id, { ...t, videos: [] });
    }

    for (const v of allVideos) {
      const topic = topicMap.get(v.topicId);
      if (topic) {
        topic.videos.push({
          id: v.id,
          scriptureAnchor: v.scriptureAnchor,
          videoUrl: v.finalVideoUrl,
          thumbnailUrl: v.thumbnailUrl,
          createdAt: v.createdAt,
        });
      }
    }

    const library = Array.from(topicMap.values()).filter((t) => t.videos.length > 0);
    res.json(library);
  } catch (err: any) {
    console.error("Failed to fetch video library:", err);
    res.status(500).json({ error: "Failed to fetch video library" });
  }
});

router.post("/api/video-topics/cleanup-avatar-videos", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const result = await db
      .update(videoTopics)
      .set({ avatarVideoUrl: null })
      .where(sql`${videoTopics.avatarVideoUrl} IS NOT NULL AND ${videoTopics.avatarVideoUrl} != ''`)
      .returning({ id: videoTopics.id, title: videoTopics.title });
    res.json({ cleaned: result.length, topics: result });
  } catch (err) {
    console.error("[video-topics] Cleanup error:", err);
    res.status(500).json({ error: "An error occurred. Please try again." });
  }
});

router.post("/api/video-topics/:id/expand-cross-references", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const id = String(req.params.id);
    const maxReferences = parseInt(req.body.maxReferences) || 7;
    const result = await expandTopicCrossReferences(id, maxReferences);
    res.json(result);
  } catch (err) {
    console.error("[video-topics] Cross-reference expansion error:", err);
    res.status(500).json({ error: "An error occurred. Please try again." });
  }
});

router.post("/api/video-topics/expand-all-cross-references", requireAuth, requirePipelineAccess, async (req, res) => {
  try {
    const maxReferences = parseInt(req.body.maxReferences) || 7;
    res.json({ message: "Cross-reference expansion started for all topics", status: "running" });
    expandAllTopicsCrossReferences(maxReferences).then((result) => {
      console.log(`[cross-ref] Bulk expansion complete: ${result.expanded}/${result.total} topics expanded, ${result.errors.length} errors`);
    }).catch((err) => {
      console.error("[cross-ref] Bulk expansion failed:", err);
    });
  } catch (err) {
    console.error("[video-topics] Bulk cross-reference error:", err);
    res.status(500).json({ error: "An error occurred. Please try again." });
  }
});

router.delete("/api/video-avatars/cleanup-unused", requireAuth, requirePipelineAccess, async (_req, res) => {
  try {
    const usedAvatarIds = await db
      .selectDistinct({ avatarId: videoTopics.avatarId })
      .from(videoTopics);
    const usedIds = new Set(usedAvatarIds.map(r => r.avatarId).filter(Boolean));

    const allAvatars = await db.select({ id: videoAvatars.id, name: videoAvatars.name }).from(videoAvatars);
    const unusedAvatars = allAvatars.filter(a => !usedIds.has(a.id));

    if (unusedAvatars.length === 0) {
      return res.json({ message: "No unused avatars to remove", deleted: 0 });
    }

    for (const avatar of unusedAvatars) {
      await db.delete(videoAvatars).where(eq(videoAvatars.id, avatar.id));
    }

    console.log(`[cleanup] Deleted ${unusedAvatars.length} unused avatars: ${unusedAvatars.map(a => a.name).join(", ")}`);
    res.json({ message: `Deleted ${unusedAvatars.length} unused avatars`, deleted: unusedAvatars.length, names: unusedAvatars.map(a => a.name) });
  } catch (err) {
    console.error("[cleanup] Avatar cleanup error:", err);
    res.status(500).json({ error: "An error occurred. Please try again." });
  }
});

export default router;
