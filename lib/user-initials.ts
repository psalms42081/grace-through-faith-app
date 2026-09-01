const SUFFIXES = new Set(["jr", "sr", "jnr", "snr", "ii", "iii", "iv", "v"]);

function isSuffix(token: string): boolean {
  return SUFFIXES.has(token.replace(/\./g, "").toLowerCase());
}

/** First + last name initials for avatars. Never the first two letters of one word. */
export function displayInitials(name: string): string {
  const tokens = name
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0 && !isSuffix(token));

  if (tokens.length === 0) return "?";

  const first = tokens[0][0];
  if (tokens.length === 1) return first.toUpperCase();

  return (first + tokens[tokens.length - 1][0]).toUpperCase();
}
