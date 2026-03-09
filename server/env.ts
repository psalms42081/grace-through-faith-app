import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  AI_INTEGRATIONS_OPENAI_API_KEY: z.string().optional(),
  AI_INTEGRATIONS_OPENAI_BASE_URL: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_URL: z.string().optional(),
  RUN_STARTUP_SEEDS: z.string().optional().default("false"),
  ALLOW_INSECURE_PASSWORD_RESET: z.string().optional().default("false"),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Environment validation failed:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();

if (process.env.NODE_ENV === "production") {
  if (env.RUN_STARTUP_SEEDS === "true") {
    console.error("[security] FATAL: RUN_STARTUP_SEEDS=true in production is not allowed");
    process.exit(1);
  }
  if (env.ALLOW_INSECURE_PASSWORD_RESET === "true") {
    console.error("[security] FATAL: ALLOW_INSECURE_PASSWORD_RESET=true in production is not allowed");
    process.exit(1);
  }
}

export function logSecurityPosture() {
  console.log("[security] Environment validation: PASSED");
  console.log(`[security] JWT_SECRET: configured (${env.JWT_SECRET.length} chars)`);
  console.log(`[security] Password reset: ${env.ALLOW_INSECURE_PASSWORD_RESET === "true" ? "ENABLED (insecure)" : "DISABLED (safe)"}`);
  console.log(`[security] Startup seeds: ${env.RUN_STARTUP_SEEDS === "true" ? "WILL RUN" : "skipped"}`);
  console.log(`[security] OpenAI API: ${env.AI_INTEGRATIONS_OPENAI_API_KEY ? "configured" : "not configured"}`);
  console.log(`[security] ElevenLabs TTS: ${env.ELEVENLABS_API_KEY ? "configured" : "not configured"}`);
  console.log(`[security] LiveKit: ${env.LIVEKIT_API_KEY ? "configured" : "not configured"}`);
}
