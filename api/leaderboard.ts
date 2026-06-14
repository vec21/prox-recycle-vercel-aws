/**
 * GET /api/leaderboard
 * Returns top 10 users ranked by total recycled weight, fetched from DynamoDB.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLeaderboard } from './_lib/dynamo.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const leaders = await getLeaderboard(10);
    return res.json(leaders);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[leaderboard]', message);
    return res.status(500).json({ error: 'Failed to fetch leaderboard', detail: message });
  }
}
