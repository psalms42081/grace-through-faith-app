import { logSecurityPosture } from "./env";
import express from "express";
import helmet from "helmet";
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

    const origin = req.header("origin");

    const isDev = process.env.NODE_ENV === "development";
    const isLocalhost = isDev && (
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:")
    );

    if (origin && (origins.has(origin) || isLocalhost)) {
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
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
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
    maxAge: "7d",
    immutable: true,
    etag: true,
  }));

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets"), {
    maxAge: "1h",
    etag: true,
  }));

  if (isDev) {
    const { createProxyMiddleware } = require("http-proxy-middleware");
    const metroProxy = createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: true,
      ws: true,
      logger: undefined,
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      return metroProxy(req, res, next);
    });

    log("Dev mode: Proxying all non-API requests to Metro on port 8081");
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

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'", "wss://creator-zrsltrcv.livekit.cloud", "https://creator-zrsltrcv.livekit.cloud"],
        mediaSrc: ["'self'", "blob:"],
        workerSrc: ["'self'", "blob:"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "https:", "data:"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        frameSrc: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
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

      setTimeout(async () => {
        try {
          const { runCacheWarmup } = await import("./services/cache-warmup");
          await runCacheWarmup();
        } catch (err) {
          console.error("Cache warmup failed:", err);
        }
      }, 30000);
    },
  );

  server.on("error", (err: NodeJS.ErrnoException) => {
    console.error(`[deploy-debug] Server listen error:`, err.message);
    if (err.code === "EADDRINUSE") {
      console.error(`[deploy-debug] Port ${port} is already in use!`);
    }
  });
})();
