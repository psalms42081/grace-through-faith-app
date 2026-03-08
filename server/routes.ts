import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { db } from "./db";
import { users, prayerRequests, readingHistory, prayerGroupMembers, groupDiscussions, layerCompletions, progressTracks } from "../shared/schema";
import { eq } from "drizzle-orm";
import { seedFormationData } from "./seed-formation";
import { seedBeliefsWave1 } from "./seed-beliefs-wave1";
import { seedBeliefsWave2 } from "./seed-beliefs-wave2";
import { seedBeliefsWave3 } from "./seed-beliefs-wave3";
import { seedBeliefsWave4 } from "./seed-beliefs-wave4";
import { seedGlobalChurches } from "../scripts/seed-global-churches";
import { seedBibleBooks } from "./seed-books";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import bibleRoutes from "./routes/bible";
import studyRoutes from "./routes/study";
import devotionalRoutes from "./routes/devotionals";
import ttsRoutes from "./routes/tts";
import kidsRoutes from "./routes/kids";
import communityRoutes from "./routes/community";
import familyDashboardRoutes from "./routes/family-dashboard";
import formationRoutes from "./routes/formation";
import greatControversyRoutes from "./routes/great-controversy";
import sabbathSchoolRoutes from "./routes/sabbath-school";
import analyticsRoutes from "./routes/analytics";

export async function registerRoutes(app: Express): Promise<Server> {

  db.select().from(users).where(eq(users.id, "guest")).then((rows) => {
    if (rows.length === 0) {
      db.insert(users).values({ id: "guest", username: "guest", password: "guest" }).then(() => {
        console.log("Guest user created");
      });
    }
  });

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

  app.use(authRoutes);
  app.use(userRoutes);
  app.use(bibleRoutes);
  app.use(studyRoutes);
  app.use(devotionalRoutes);
  app.use(ttsRoutes);
  app.use(kidsRoutes);
  app.use(communityRoutes);
  app.use(familyDashboardRoutes);
  app.use(formationRoutes);
  app.use(greatControversyRoutes);
  app.use(sabbathSchoolRoutes);
  app.use("/api/analytics", analyticsRoutes);

  app.get("/api/growth-map", async (req, res) => {
    try {
      const userId = (req.query.userId as string) || "guest";

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
