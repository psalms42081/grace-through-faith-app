/**
 * Derive Helmet connect-src hosts from LIVEKIT_URL.
 * If LIVEKIT_URL is unset or unparseable, return [] so CSP stays valid
 * without a hard-coded LiveKit cloud hostname.
 */
export function liveKitCspConnectSrc(livekitUrl?: string): string[] {
  const raw = (livekitUrl ?? process.env.LIVEKIT_URL ?? "").trim();
  if (!raw) return [];

  try {
    const normalized = raw.replace(/^ws:/i, "http:").replace(/^wss:/i, "https:");
    const parsed = new URL(normalized);
    if (!parsed.host) return [];
    return [`wss://${parsed.host}`, `https://${parsed.host}`];
  } catch {
    return [];
  }
}
