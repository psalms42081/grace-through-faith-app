import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { seedFormationData } from "./seed-formation";
import { seedBeliefsWave1 } from "./seed-beliefs-wave1";
import { seedBeliefsWave2 } from "./seed-beliefs-wave2";
import { seedBeliefsWave3 } from "./seed-beliefs-wave3";
import { seedBeliefsWave4 } from "./seed-beliefs-wave4";
import { seedGlobalChurches } from "../scripts/seed-global-churches";

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

export async function registerRoutes(app: Express): Promise<Server> {

  db.select().from(users).where(eq(users.id, "guest")).then((rows) => {
    if (rows.length === 0) {
      db.insert(users).values({ id: "guest", username: "guest", password: "guest" }).then(() => {
        console.log("Guest user created");
      });
    }
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

  const httpServer = createServer(app);
  return httpServer;
}
