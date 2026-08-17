import { logSecurityPosture } from "./env";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";

const app = express();
app.set("trust proxy", 1);
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCacheControl(app: express.Application) {
  app.use((_req, res, next) => {
    if (process.env.NODE_ENV === "development" && !_req.path.startsWith("/assets/")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    // Allow any explicitly configured public domain
    if (process.env.PUBLIC_DOMAIN) {
      origins.add(`https://${process.env.PUBLIC_DOMAIN}`);
    }

    const origin = req.header("origin");

    const isDev = process.env.NODE_ENV === "development";
    const isLocalhost = isDev && (
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:")
    );

    // React Native apps don't send Origin headers — allow all non-browser requests
    const isMobileApp = !origin;

    if (isMobileApp || (origin && (origins.has(origin) || isLocalhost))) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Id, X-Content-Language");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
}

const AI_PATH_PATTERNS = ["/generate", "/study-guide", "/context", "/semantic", "/tts", "/scene/"];
const SLOW_THRESHOLD_NORMAL = 2000;
const SLOW_THRESHOLD_AI = 15000;

function isAIRoute(path: string): boolean {
  return AI_PATH_PATTERNS.some((p) => path.includes(p));
}

export const errorCounts = { validation: 0, auth: 0, not_found: 0, rate_limit: 0, server: 0, total: 0 };

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const reqPath = req.path;

    res.on("finish", () => {
      if (!reqPath.startsWith("/api")) return;

      const duration = Date.now() - start;
      const status = res.statusCode;
      const threshold = isAIRoute(reqPath) ? SLOW_THRESHOLD_AI : SLOW_THRESHOLD_NORMAL;
      const isSlow = duration > threshold;

      let logLine = `[req] ${req.method} ${reqPath} ${status} ${duration}ms`;
      if (isSlow) {
        logLine = `[SLOW] ${logLine} (threshold: ${threshold}ms)`;
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  const isDev = process.env.NODE_ENV === "development";

  log("Serving static Expo files with dynamic manifest routing");

  app.use("/assets/kids-scenes", express.static(path.resolve(process.cwd(), "assets", "kids-scenes"), {
    maxAge: "1h",
    etag: true,
  }));

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets"), {
    maxAge: "1h",
    etag: true,
  }));

  app.use("/comparison-deck", express.static(path.resolve(process.cwd(), "comparison-deck"), {
    maxAge: "5m",
    etag: true,
  }));

  const privacyPath = path.resolve(process.cwd(), "server", "templates", "privacy.html");
  const privacyHtml = fs.readFileSync(privacyPath, "utf-8");
  app.get("/privacy", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(privacyHtml);
  });

  const robotsTxt = fs.readFileSync(path.resolve(process.cwd(), "server", "templates", "robots.txt"), "utf-8");
  app.get("/robots.txt", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).send(robotsTxt);
  });

  const sitemapXml = fs.readFileSync(path.resolve(process.cwd(), "server", "templates", "sitemap.xml"), "utf-8");
  app.get("/sitemap.xml", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).send(sitemapXml);
  });

  if (isDev) {
    log("Dev mode: Metro proxy already configured before middleware");
    return;
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path === "/manifest" || req.path === "/") {
      const platform = req.header("expo-platform");
      if (platform && (platform === "ios" || platform === "android")) {
        return serveExpoManifest(platform, res);
      }
    }

    next();
  });

  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  const webDistPath = path.resolve(process.cwd(), "dist");
  const webIndexPath = path.join(webDistPath, "index.html");
  const hasWebBuild = fs.existsSync(webIndexPath);

  if (hasWebBuild) {
    app.use(express.static(webDistPath, { maxAge: "1h", index: false }));

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      if (req.accepts("html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        return res.sendFile(webIndexPath);
      }
      next();
    });
    log("Serving Expo web build from dist/ for browser requests");
  } else {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path === "/" && !req.path.startsWith("/api")) {
        return serveLandingPage({
          req,
          res,
          landingPageTemplate,
          appName,
        });
      }
      next();
    });
    log("No web build found — serving landing page for browser requests");
  }

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function categorizeError(status: number): keyof typeof errorCounts {
  if (status === 400) return "validation";
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limit";
  return "server";
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    const category = categorizeError(status);

    errorCounts[category]++;
    errorCounts.total++;

    console.error(`[error] ${req.method} ${req.path} ${status} ${category}: ${message}`);
    if (status >= 500) {
      console.error("[error] Stack:", err);
    }

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

(async () => {
  logSecurityPosture();

  app.get("/__health", (_req, res) => {
    res.status(200).send("ok");
  });

  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }));

  if (process.env.NODE_ENV === "development") {
    const { createProxyMiddleware } = require("http-proxy-middleware");

    // Mockup sandbox proxy — must come BEFORE the Metro catch-all
    const mockupProxy = createProxyMiddleware({
      target: "http://localhost:3333",
      changeOrigin: true,
      ws: true,
      logger: undefined,
      timeout: 120000,
      proxyTimeout: 120000,
      selfHandleResponse: false,
    });
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/__mockup")) return mockupProxy(req, res, next);
      next();
    });

    const metroProxy = createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: true,
      ws: true,
      logger: undefined,
      timeout: 300000,
      proxyTimeout: 300000,
      selfHandleResponse: false,
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api") || req.path === "/__health" || req.path === "/robots.txt" || req.path === "/sitemap.xml") {
        return next();
      }
      return metroProxy(req, res, next);
    });

    log("Dev mode: Metro proxy installed BEFORE middleware (no Helmet/CSP on bundle)");
  }

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
        connectSrc: ["'self'", "wss://creator-zrsltrcv.livekit.cloud", "https://creator-zrsltrcv.livekit.cloud", "https://www.youtube.com", "https://*.tile.openstreetmap.org"],
        mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com"],
        workerSrc: ["'self'", "blob:"],
        imgSrc: ["'self'", "data:", "blob:", "https://img.youtube.com", "https://i.ytimg.com", "https://*.tile.openstreetmap.org", "https://res.cloudinary.com"],
        fontSrc: ["'self'", "https:", "data:"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com", "https://www.youtube-nocookie.com", "https://grace-through-faith.replit.app", "https://*.replit.dev"],
        frameAncestors: ["'self'", "https://grace-through-faith.replit.app", "https://*.replit.dev"],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));
  setupCacheControl(app);
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    async () => {
      console.log(`express server serving on port ${port}`);
      console.log(`[deploy-debug] Server bound to 0.0.0.0:${port} at ${new Date().toISOString()}`);
      try {
        const { initSabbathSchoolSync } = await import("./services/sabbath-school-sync");
        initSabbathSchoolSync();
      } catch (err) {
        console.error("Sabbath School sync init failed:", err);
      }

      try {
        const { db: startupDb } = await import("./db");
        const { kidsStoryScenes } = await import("../shared/schema");
        const { eq } = await import("drizzle-orm");
        const scene = await startupDb.select({ imageUrl: kidsStoryScenes.imageUrl }).from(kidsStoryScenes).where(eq(kidsStoryScenes.id, "9abff9f2-d84e-456b-a6ca-86e12e1328b1")).limit(1);
        if (scene.length && scene[0].imageUrl === "/assets/kids-scenes/creation-animals-scene-2.png") {
          await startupDb.update(kidsStoryScenes).set({ imageUrl: "/assets/kids-scenes/creation-animals-scene-2.png?v=2" }).where(eq(kidsStoryScenes.id, "9abff9f2-d84e-456b-a6ca-86e12e1328b1"));
          console.log("[startup] Updated creation-animals-scene-2 image URL with cache buster");
        }
        const relScene3 = await startupDb.select({ imageUrl: kidsStoryScenes.imageUrl }).from(kidsStoryScenes).where(eq(kidsStoryScenes.id, "48fb7e67-db7c-47cc-b00e-3770045df83a")).limit(1);
        if (relScene3.length && relScene3[0].imageUrl === "/assets/kids-scenes/teen-relationships-scene-3.png") {
          await startupDb.update(kidsStoryScenes).set({ imageUrl: "/assets/kids-scenes/teen-relationships-scene-3.png?v=2" }).where(eq(kidsStoryScenes.id, "48fb7e67-db7c-47cc-b00e-3770045df83a"));
          console.log("[startup] Updated teen-relationships-scene-3 image URL with cache buster");
        }
        const { like } = await import("drizzle-orm");
        const whoseScenes = await startupDb.select({ id: kidsStoryScenes.id, narration: kidsStoryScenes.narration }).from(kidsStoryScenes).where(like(kidsStoryScenes.narration, "%knowing exactly whose you are%"));
        for (const s of whoseScenes) {
          await startupDb.update(kidsStoryScenes).set({ narration: s.narration!.replace("knowing exactly whose you are", "knowing exactly who you are") }).where(eq(kidsStoryScenes.id, s.id));
          console.log("[startup] Fixed 'whose' -> 'who' in scene", s.id);
        }
      } catch (err) {
        console.error("[startup] Scene image URL fix failed:", err);
      }

      setTimeout(async () => {
        try {
          const { runCacheWarmup } = await import("./services/cache-warmup");
          await runCacheWarmup();
        } catch (err) {
          console.error("Cache warmup failed:", err);
        }
      }, 30000);

      const FOUR_HOURS = 4 * 60 * 60 * 1000;
      setTimeout(async () => {
        try {
          const { runAnalyticsRollup } = await import("./workers/analyticsRollupWorker");
          await runAnalyticsRollup();
          setInterval(async () => {
            try { await runAnalyticsRollup(); } catch (err) { console.error("[Worker] Analytics rollup failed:", err); }
          }, FOUR_HOURS);
          console.log("[Workers] Analytics rollup worker scheduled (every 4h)");
        } catch (err) {
          console.error("[Workers] Analytics rollup initial run failed:", err);
        }
      }, 60000);

      setTimeout(async () => {
        try {
          const { runHeatmapTiles } = await import("./workers/heatmapTileWorker");
          const { runActivityPattern } = await import("./workers/activityPatternWorker");
          await runHeatmapTiles();
          await runActivityPattern();
          setInterval(async () => {
            try { await runHeatmapTiles(); } catch (err) { console.error("[Worker] Heatmap tiles failed:", err); }
            try { await runActivityPattern(); } catch (err) { console.error("[Worker] Activity pattern failed:", err); }
          }, FOUR_HOURS);
          console.log("[Workers] Heatmap tile + activity pattern workers scheduled (every 4h, +2h offset)");
        } catch (err) {
          console.error("[Workers] Heatmap/activity pattern initial run failed:", err);
        }
      }, 60000 + 2 * 60 * 60 * 1000);
    },
  );

  server.on("error", (err: NodeJS.ErrnoException) => {
    console.error(`[deploy-debug] Server listen error:`, err.message);
    if (err.code === "EADDRINUSE") {
      console.error(`[deploy-debug] Port ${port} is already in use!`);
    }
  });

  function gracefulShutdown(signal: string) {
    console.log(`[shutdown] Received ${signal}, closing server...`);
    server.close(() => {
      console.log(`[shutdown] Server closed cleanly`);
      process.exit(0);
    });
    setTimeout(() => {
      console.log(`[shutdown] Forcing exit after timeout`);
      process.exit(1);
    }, 3000);
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
})();
