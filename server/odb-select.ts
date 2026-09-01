export type DatedPost = { date: string };

function dayKey(value: string): string {
  return (value || "").slice(0, 10);
}

export function pickPublishedForDate<T extends DatedPost>(
  posts: T[],
  dateKey: string,
): { post: T; exact: boolean } | null {
  const eligible = posts
    .filter((post) => {
      const key = dayKey(post.date);
      return /^\d{4}-\d{2}-\d{2}$/.test(key) && key <= dateKey;
    })
    .sort((a, b) => dayKey(b.date).localeCompare(dayKey(a.date)));

  if (eligible.length === 0) return null;

  const exact = eligible.find((post) => dayKey(post.date) === dateKey);
  if (exact) return { post: exact, exact: true };
  return { post: eligible[0], exact: false };
}
