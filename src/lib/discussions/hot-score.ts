/**
 * Hot score formula adapted from spec §7. Newer + more upvoted ranks higher.
 * We compute on every write so the index stays cheap to sort.
 */
export function hotScore(args: {
  upvoteCount: number;
  replyCount: number;
  createdAt: Date;
  now?: Date;
}): number {
  const now = args.now ?? new Date();
  const ageHours = Math.max(
    0,
    (now.getTime() - args.createdAt.getTime()) / (1000 * 60 * 60)
  );
  const engagement = Math.max(args.upvoteCount, 0) + Math.max(args.replyCount, 0) * 0.5;
  return Math.log10(Math.max(engagement, 1) + 1) - ageHours / 12;
}
