import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { db } from "./db";
import { prayerRequests, readingHistory, prayerGroupMembers, groupDiscussions, layerCompletions, progressTracks, userFeedback, users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { env } from "./env";
import { optionalAuth, getEffectiveUserId } from "./middleware/auth";
import { sql } from "drizzle-orm";
import { errorCounts } from "./index";
import { getAISemaphoreStats } from "./services/ai-semaphore";
import { getCacheStats } from "./middleware/response-cache";
import nodemailer from "nodemailer";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import bibleRoutes from "./routes/bible";
import strongsRoutes from "./routes/strongs";
import commentaryRoutes from "./routes/commentary";
import contextRoutes from "./routes/context";
import locationsTimelineRoutes from "./routes/locations-timeline";
import studyGuideRoutes from "./routes/study-guide";
import verseToolsRoutes from "./routes/verse-tools";
import deepStudyRoutes from "./routes/deep-study";
import searchRoutes from "./routes/search";
import devotionalRoutes from "./routes/devotionals";
import ttsRoutes from "./routes/tts";
import kidsRoutes from "./routes/kids";
import communityRoutes from "./routes/community";
import familyDashboardRoutes from "./routes/family-dashboard";
import formationRoutes from "./routes/formation";
import greatControversyRoutes from "./routes/great-controversy";
import sabbathSchoolRoutes from "./routes/sabbath-school";
import analyticsRoutes from "./routes/analytics";
import resourcesRoutes from "./routes/resources";
import adminPipelineRoutes from "./routes/admin-pipeline";
import adminUsersRoutes from "./routes/admin-users";
import organizationRoutes from "./routes/organizations";
import heygenRoutes from "./routes/heygen";
import videoPipelineRoutes from "./routes/videoPipeline";
import videoTopicsRoutes from "./routes/videoTopics";
import { recoverStuckHeyGenJobs } from "./routes/videoTopics";
import seriesRoutes from "./routes/series";
import plansRoutes from "./routes/plans";
import touchpointsRoutes from "./routes/touchpoints";
import sabbathTypesRoutes from "./routes/sabbath-types";
import characterRoutes from "./routes/characters";
import ellenWhiteRoutes from "./routes/ellenWhite";
import adminWorkersRoutes from "./routes/admin-workers";
import newsRoutes from "./routes/news";
import egwRoutes from "./routes/egw";
import pioneerRoutes from "./routes/pioneers";
import demoRoutes from "./routes/demo";
import youtubeRoutes from "./routes/youtube";

export async function registerRoutes(app: Express): Promise<Server> {

  if (env.RUN_STARTUP_SEEDS === "true") {
    console.log("[startup] RUN_STARTUP_SEEDS=true — running seed scripts...");

    const { seedBibleBooks } = await import("./seed-books");
    const { seedFormationData } = await import("./seed-formation");
    const { seedBeliefsWave1 } = await import("./seed-beliefs-wave1");
    const { seedBeliefsWave2 } = await import("./seed-beliefs-wave2");
    const { seedBeliefsWave3 } = await import("./seed-beliefs-wave3");
    const { seedBeliefsWave4 } = await import("./seed-beliefs-wave4");
    const { seedGlobalChurches } = await import("../scripts/seed-global-churches");

    seedBibleBooks(db).catch((err) => {
      console.error("Bible books seed error:", err);
    });

    seedFormationData(db).catch((err) => {
      console.error("Formation seed error:", err);
    });

    seedBeliefsWave1(db).catch((err) => {
      console.error("Wave 1 beliefs seed error:", err);
    });

    seedBeliefsWave2(db).catch((err) => {
      console.error("Wave 2 beliefs seed error:", err);
    });

    seedBeliefsWave3(db).catch((err) => {
      console.error("Wave 3 beliefs seed error:", err);
    });

    seedBeliefsWave4(db).catch((err) => {
      console.error("Wave 4 beliefs seed error:", err);
    });

    seedGlobalChurches().catch((err) => {
      console.error("Global churches seed error:", err);
    });

    const { seedResources } = await import("./seed-resources");
    seedResources(db).catch((err) => {
      console.error("Resources seed error:", err);
    });

    const { seedSabbathTypes } = await import("./seeds/seed-sabbath-types");
    seedSabbathTypes(db).catch((err) => {
      console.error("Sabbath types seed error:", err);
    });
  } else {
    console.log("[startup] RUN_STARTUP_SEEDS is not enabled — skipping seed scripts");
  }

  const { seedSabbathTypes: ensureSabbathTypes } = await import("./seeds/seed-sabbath-types");
  ensureSabbathTypes(db).catch((err) => {
    console.error("Sabbath types ensure error:", err);
  });

  try {
    const { seedBiblicalSeries } = await import("./seed-series");
    console.log("[startup] Running biblical series seed...");
    await seedBiblicalSeries(db);
    console.log("[startup] Biblical series seed complete.");
  } catch (err) {
    console.error("[startup] Biblical series seed FAILED:", err);
  }

  try {
    const { seedReadingPlans } = await import("./seed-reading-plans");
    console.log("[startup] Running reading plans seed...");
    await seedReadingPlans(db);
    console.log("[startup] Reading plans seed complete.");
  } catch (err) {
    console.error("[startup] Reading plans seed FAILED:", err);
  }

  try {
    const { fixDevotionalCategories } = await import("./fix-devotional-categories");
    console.log("[startup] Running devotional category fix...");
    await fixDevotionalCategories(db);
    console.log("[startup] Devotional category fix complete.");
  } catch (err) {
    console.error("[startup] Devotional category fix FAILED:", err);
  }

  app.use(authRoutes);
  app.use(userRoutes);
  app.use(bibleRoutes);
  app.use(strongsRoutes);
  app.use(commentaryRoutes);
  app.use(contextRoutes);
  app.use(locationsTimelineRoutes);
  app.use(studyGuideRoutes);
  app.use(verseToolsRoutes);
  app.use(deepStudyRoutes);
  app.use(searchRoutes);
  app.use(devotionalRoutes);
  app.use(ttsRoutes);
  app.use(kidsRoutes);
  app.use(communityRoutes);
  app.use(familyDashboardRoutes);
  app.use(formationRoutes);
  app.use(greatControversyRoutes);
  app.use(sabbathSchoolRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use(resourcesRoutes);
  app.use(adminPipelineRoutes);
  app.use(adminUsersRoutes);
  app.use(organizationRoutes);
  app.use(heygenRoutes);
  app.use(videoPipelineRoutes);
  app.use(videoTopicsRoutes);
  app.use(seriesRoutes);
  app.use(plansRoutes);
  app.use(touchpointsRoutes);
  app.use(sabbathTypesRoutes);
  app.use(characterRoutes);
  app.use("/api/ellen-white", ellenWhiteRoutes);
  app.use("/api/admin/workers", adminWorkersRoutes);
  app.use(newsRoutes);
  app.use("/api/egw", egwRoutes);
  app.use(pioneerRoutes);
  app.use("/api/demo", demoRoutes);
  app.use(youtubeRoutes);

  recoverStuckHeyGenJobs().catch((err) => {
    console.error("[startup] HeyGen recovery job failed:", err);
  });

  (async () => {
    try {
      const { videoTopics } = await import("../shared/schema");
      const { eq, ne, sql, and, isNotNull, notInArray } = await import("drizzle-orm");
      const result = await db
        .update(videoTopics)
        .set({ pipelineMode: "cinematic", updatedAt: new Date() })
        .where(ne(videoTopics.pipelineMode, "cinematic"));

      const busyStatuses = ["queued", "scene-directing", "generating-anchor", "generating-scene-videos", "generating-voiceover", "computing-timing", "assembling-video", "generating-edl", "extracting-timestamps", "generating-broll-images", "generating-broll-videos"];
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
      const staleReset = await db
        .update(videoTopics)
        .set({ assemblyStatus: null, updatedAt: new Date() })
        .where(sql`${videoTopics.assemblyStatus} IS NOT NULL AND ${videoTopics.assemblyStatus} != 'complete' AND (${videoTopics.assemblyStatus} LIKE '%failed%' OR ${videoTopics.updatedAt} < ${tenMinAgo})`);
      console.log("[startup] All video topics migrated to cinematic pipeline mode; stale/failed statuses reset");
    } catch (err) {
      console.error("[startup] Pipeline mode migration error:", err);
    }
  })();

  app.get("/api/map-embed", (req, res) => {
    const { markers, centerLat, centerLng, zoom, userLat, userLng } = req.query;
    const markersData = markers ? JSON.parse(decodeURIComponent(markers as string)) : [];
    const cLat = parseFloat(centerLat as string) || 39.8283;
    const cLng = parseFloat(centerLng as string) || -98.5795;
    const z = parseInt(zoom as string) || 4;
    const uLat = userLat ? parseFloat(userLat as string) : null;
    const uLng = userLng ? parseFloat(userLng as string) : null;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%}
.sel-m{background:#C9933A;border:2px solid #fff;border-radius:50%;width:16px;height:16px;box-shadow:0 0 6px rgba(201,147,58,0.6)}
.def-m{background:#E8456B;border:2px solid #fff;border-radius:50%;width:14px;height:14px;box-shadow:0 0 4px rgba(0,0,0,0.3)}
.usr-m{background:#4A90D9;border:3px solid #fff;border-radius:50%;width:14px;height:14px;box-shadow:0 0 8px rgba(74,144,217,0.5)}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${cLat},${cLng}],${z});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
L.control.zoom({position:'topright'}).addTo(map);
${uLat !== null && uLng !== null ? `L.marker([${uLat},${uLng}],{icon:L.divIcon({className:'',html:'<div class="usr-m"></div>',iconSize:[14,14],iconAnchor:[7,7]})}).addTo(map);` : ''}
var ms=${JSON.stringify(markersData)};
var bounds=[];
ms.forEach(function(m){
  var cls=m.selected?'sel-m':'def-m';
  var sz=m.selected?16:14;
  var mk=L.marker([m.lat,m.lng],{icon:L.divIcon({className:'',html:'<div class="'+cls+'"></div>',iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]})}).addTo(map);
  mk.bindPopup('<div style="font-family:sans-serif;text-align:center;min-width:140px;"><b style="font-size:13px;">'+m.name+'</b><br><a href="https://www.google.com/maps/dir/?api=1&destination='+m.lat+','+m.lng+'" target="_blank" style="display:inline-block;margin-top:6px;padding:5px 12px;background:#C9933A;color:#fff;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">Get Directions</a></div>',{offset:[0,-4]});
  mk.on('click',function(){map.flyTo([m.lat,m.lng],16,{duration:0.5});window.parent.postMessage(JSON.stringify({type:'markerPress',id:m.id}),'*');});
  bounds.push([m.lat,m.lng]);
});
${uLat !== null && uLng !== null ? `bounds.push([${uLat},${uLng}]);` : ''}
if(bounds.length>1)map.fitBounds(bounds,{padding:[30,30],maxZoom:12});
<\/script>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });

  const startTime = Date.now();

  app.get("/api/health", async (_req, res) => {
    const uptimeMs = Date.now() - startTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    let dbStatus: "ok" | "unreachable" = "ok";
    let resourceStats = { published: 0, draft: 0 };

    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      dbStatus = "unreachable";
    }

    if (dbStatus === "ok") {
      try {
        const counts = await db.execute(sql`
          SELECT status, COUNT(*)::int as count FROM resources GROUP BY status
        `);
        for (const row of counts.rows as any[]) {
          if (row.status === "published") resourceStats.published = row.count;
          else if (row.status === "draft") resourceStats.draft = row.count;
        }
      } catch {
      }
    }

    const status = dbStatus === "ok" ? "ok" : "degraded";
    const statusCode = status === "ok" ? 200 : 503;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
      database: dbStatus,
      version: "1.0.0",
      errors: errorCounts,
      ai: getAISemaphoreStats(),
      cache: getCacheStats(),
      resources: resourceStats,
    });
  });

  app.post("/api/feedback", optionalAuth, async (req, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const { topic, message, context, email, appVersion, platform } = req.body;
      if (!message?.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }
      const allowedTopics = ["bug", "feature", "content", "performance", "other"];
      const safeTopic = allowedTopics.includes(topic) ? topic : "other";
      const safeMessage = message.trim().substring(0, 5000);
      const safeContext = context?.trim()?.substring(0, 2000) || null;
      let safeEmail = email?.trim()?.substring(0, 255) || null;
      let displayName = "Anonymous";
      if (userId) {
        const [userRow] = await db.select({ displayName: users.displayName, username: users.username, email: users.email })
          .from(users).where(eq(users.id, userId));
        if (userRow) {
          displayName = userRow.displayName || userRow.username || (userRow.email ? userRow.email.split("@")[0] : null) || "Anonymous";
          if (!safeEmail && userRow.email) {
            safeEmail = userRow.email;
          }
        }
      }

      await db.insert(userFeedback).values({
        userId,
        topic: safeTopic,
        message: safeMessage,
        context: safeContext,
        email: safeEmail,
        appVersion: appVersion?.substring(0, 32) || null,
        platform: platform?.substring(0, 16) || null,
      });

      const feedbackEmailUser = process.env.FEEDBACK_EMAIL_USER;
      const feedbackEmailPass = process.env.FEEDBACK_EMAIL_PASS;
      if (feedbackEmailUser && feedbackEmailPass) {
        const topicLabel = safeTopic.charAt(0).toUpperCase() + safeTopic.slice(1);
        const emailHtml = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#C9933A;margin-bottom:16px;">New Feedback Received</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
              <tr><td style="padding:8px;font-weight:bold;color:#666;width:120px;">From:</td><td style="padding:8px;">${displayName}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#666;">Email:</td><td style="padding:8px;">${safeEmail || "Not provided"}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#666;">Type:</td><td style="padding:8px;">${topicLabel}</td></tr>
              ${platform ? `<tr><td style="padding:8px;font-weight:bold;color:#666;">Platform:</td><td style="padding:8px;">${platform}</td></tr>` : ""}
            </table>
            <div style="background:#f5f5f5;padding:16px;border-radius:8px;border-left:4px solid #C9933A;">
              <p style="margin:0;white-space:pre-wrap;">${safeMessage}</p>
            </div>
            ${safeContext ? `<div style="margin-top:12px;padding:12px;background:#fafafa;border-radius:8px;font-size:13px;color:#888;"><strong>Context:</strong> ${safeContext}</div>` : ""}
            <p style="margin-top:20px;font-size:12px;color:#999;">Grace Through Faith App — Automated Feedback Notification</p>
          </div>
        `;

        const smtpConfigs = [
          { host: "smtpout.secureserver.net", port: 465, secure: true, name: "GoDaddy" },
          { host: "smtpout.secureserver.net", port: 587, secure: false, name: "GoDaddy-587" },
          { host: "smtp.office365.com", port: 587, secure: false, name: "Office365" },
        ];

        let emailSent = false;
        for (const cfg of smtpConfigs) {
          if (emailSent) break;
          try {
            const transporter = nodemailer.createTransport({
              host: cfg.host,
              port: cfg.port,
              secure: cfg.secure,
              auth: { user: feedbackEmailUser, pass: feedbackEmailPass },
              tls: { rejectUnauthorized: false },
              connectionTimeout: 8000,
              greetingTimeout: 8000,
              socketTimeout: 12000,
            });
            await transporter.sendMail({
              from: `"Grace Through Faith" <${feedbackEmailUser}>`,
              to: "joseph@gracethroughfaith.app",
              subject: `[Feedback] ${topicLabel} — from ${displayName}`,
              html: emailHtml,
            });
            console.log(`[feedback] Email sent via ${cfg.name} for: ${safeTopic}`);
            emailSent = true;
          } catch (smtpErr: any) {
            console.error(`[feedback] ${cfg.name} failed:`, smtpErr.message || smtpErr);
          }
        }
        if (!emailSent) {
          console.error("[feedback] All SMTP configs failed — email not sent");
        }
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Feedback error:", err);
      res.status(500).json({ error: "Failed to save feedback" });
    }
  });

  app.get("/api/growth-map", optionalAuth, async (req, res) => {
    try {
      const userId = getEffectiveUserId(req);

      const prayerRows = await db.select().from(prayerRequests).where(eq(prayerRequests.userId, userId));
      const readingRows = await db.select().from(readingHistory).where(eq(readingHistory.userId, userId));
      const groupMemberRows = await db.select().from(prayerGroupMembers).where(eq(prayerGroupMembers.userId, userId));
      const discussionRows = await db.select().from(groupDiscussions).where(eq(groupDiscussions.userId, userId));
      const layerRows = await db.select().from(layerCompletions).where(eq(layerCompletions.userId, userId));
      const progressTrackRows = await db.select().from(progressTracks).where(eq(progressTracks.userId, userId));

      const uniqueChapters = new Set(
        readingRows.map((r: any) => `${r.bookId}-${r.chapter}`)
      );

      const studyPathProgress = progressTrackRows.reduce(
        (sum: number, p: any) => sum + (p.percentComplete || 0),
        0
      );
      const studyPathNormalized = progressTrackRows.length > 0
        ? Math.round(studyPathProgress / progressTrackRows.length / 2)
        : 0;

      const uniqueLayers = new Set(layerRows.map((l: any) => l.layer));

      const completionRate = (() => {
        const totalPossibleGoals = 7;
        const goalsHit =
          (prayerRows.length > 0 ? 1 : 0) +
          (uniqueChapters.size > 0 ? 1 : 0) +
          (groupMemberRows.length > 0 ? 1 : 0) +
          (discussionRows.length > 0 ? 1 : 0) +
          (layerRows.length > 0 ? 1 : 0) +
          (progressTrackRows.length > 0 ? 1 : 0) +
          (readingRows.length >= 7 ? 1 : 0);
        return Math.round((goalsHit / totalPossibleGoals) * 100);
      })();

      res.json({
        prayer: { count: prayerRows.length },
        scripture: { chaptersRead: uniqueChapters.size },
        service: {
          groupCount: groupMemberRows.length,
          discussionCount: discussionRows.length,
        },
        character: { completionRate },
        wisdom: {
          studyDepthUsage: uniqueLayers.size,
          studyPathProgress: studyPathNormalized,
        },
      });
    } catch (err) {
      console.error("Growth map error:", err);
      res.json({
        prayer: { count: 0 },
        scripture: { chaptersRead: 0 },
        service: { groupCount: 0, discussionCount: 0 },
        character: { completionRate: 0 },
        wisdom: { studyDepthUsage: 0, studyPathProgress: 0 },
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
