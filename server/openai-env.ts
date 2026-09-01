/**
 * OpenAI credentials.
 *
 * Preferred names:
 *   OPENAI_API_KEY
 *   OPENAI_BASE_URL
 *
 * Legacy Replit aliases (still accepted so existing production env does not go dark):
 *   AI_INTEGRATIONS_OPENAI_API_KEY
 *   AI_INTEGRATIONS_OPENAI_BASE_URL
 *
 * Whisper transcription in whisperService.ts still requires OPENAI_API_KEY against
 * api.openai.com — the integrations proxy may not support audio.
 */
function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function getOpenAIApiKey(): string | undefined {
  return firstDefined(process.env.OPENAI_API_KEY, process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
}

export function getOpenAIBaseURL(): string | undefined {
  return firstDefined(process.env.OPENAI_BASE_URL, process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);
}

export function openaiClientOptions(): { apiKey: string | undefined; baseURL?: string } {
  const apiKey = getOpenAIApiKey();
  const baseURL = getOpenAIBaseURL();
  return baseURL ? { apiKey, baseURL } : { apiKey };
}
