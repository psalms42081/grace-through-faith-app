import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import { heygenVideos } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/api/heygen/avatars", requireAuth, async (_req, res) => {
  try {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "HeyGen API key not configured" });
    }

    const response = await fetch("https://api.heygen.com/v2/avatars", {
      headers: { "X-Api-Key": apiKey, "Accept": "application/json" },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[heygen] Avatars API error:", response.status, errText);
      return res.status(response.status).json({ error: "Failed to fetch avatars from HeyGen" });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error("[heygen] Avatars error:", err);
    return res.status(500).json({ error: "Failed to fetch avatars" });
  }
});

router.post("/api/heygen/generate", requireAuth, async (req, res) => {
  try {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "HeyGen API key not configured" });
    }

    const userId = req.authUserId!;
    const { avatarId, script, title } = req.body;
    if (!avatarId || !script?.trim()) {
      return res.status(400).json({ error: "avatarId and script are required" });
    }

    const response = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: "avatar",
              avatar_id: avatarId,
              avatar_style: "normal",
            },
            voice: {
              type: "text",
              input_text: script.trim(),
            },
          },
        ],
        title: title?.trim() || "Grace Through Faith Video",
        callback_id: "gtf-callback",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[heygen] Generate API error:", response.status, errText);
      return res.status(response.status).json({ error: "Failed to generate video with HeyGen" });
    }

    const data = await response.json();
    const videoId = data.data?.video_id;

    if (videoId) {
      await db.insert(heygenVideos).values({
        videoId,
        title: title?.trim() || "Grace Through Faith Video",
        avatarId,
        script: script.trim(),
        status: "pending",
        userId,
      });
    }

    return res.json({ videoId, status: data.data?.status });
  } catch (err) {
    console.error("[heygen] Generate error:", err);
    return res.status(500).json({ error: "Failed to generate video" });
  }
});

router.post("/api/heygen/webhook", async (req, res) => {
  const webhookSecret = process.env.HEYGEN_WEBHOOK_SECRET;
  if (webhookSecret) {
    const token = req.headers["x-webhook-secret"] || req.query.token;
    if (token !== webhookSecret) {
      console.warn("[heygen] Webhook rejected: invalid or missing secret token");
      return res.status(401).json({ error: "Unauthorized" });
    }
  } else {
    console.warn("[heygen] HEYGEN_WEBHOOK_SECRET not set — webhook is unprotected");
  }

  try {
    const { event_type, event_data } = req.body;
    const videoId = event_data?.video_id;
    const status = event_data?.status || event_type;

    console.log(`[heygen] Webhook received: event=${event_type} videoId=${videoId} status=${status}`);

    if (!videoId) {
      return res.status(200).json({ received: true });
    }

    if (status === "completed" || event_type === "avatar_video.success") {
      const apiKey = process.env.HEYGEN_API_KEY;
      if (!apiKey) {
        console.error("[heygen] Webhook: API key not configured, cannot fetch video URL");
        return res.status(200).json({ received: true });
      }

      const statusResponse = await fetch(
        `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
        { headers: { "X-Api-Key": apiKey, "Accept": "application/json" } }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const videoUrl = statusData.data?.video_url;

        if (videoUrl) {
          await db
            .update(heygenVideos)
            .set({ status: "completed", videoUrl, updatedAt: new Date() })
            .where(eq(heygenVideos.videoId, videoId));
          console.log(`[heygen] Video completed: ${videoId} → ${videoUrl}`);
        }
      } else {
        console.error("[heygen] Failed to fetch video status:", statusResponse.status);
      }
    } else if (status === "failed" || event_type === "avatar_video.fail") {
      await db
        .update(heygenVideos)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(heygenVideos.videoId, videoId));
      console.log(`[heygen] Video failed: ${videoId}`);
    } else {
      await db
        .update(heygenVideos)
        .set({ status: status || "processing", updatedAt: new Date() })
        .where(eq(heygenVideos.videoId, videoId));
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[heygen] Webhook error:", err);
    return res.status(200).json({ received: true });
  }
});

export default router;
