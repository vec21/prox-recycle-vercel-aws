/**
 * GET /api/users/[userId]  — fetch user profile from DynamoDB
 * PUT /api/users/[userId]  — update display name / settings
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUser, upsertUser } from '../_lib/dynamo.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.query as { userId: string };

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    if (req.method === 'GET') {
      const user = await getUser(userId);
      if (!user) {
        const created = await upsertUser(userId, {});
        return res.json(created);
      }
      return res.json(user);
    }

    if (req.method === 'PUT') {
      const { displayName, notificationsEnabled } = (req.body ?? {}) as {
        displayName?: string;
        notificationsEnabled?: boolean;
      };
      const updated = await upsertUser(userId, {
        ...(displayName !== undefined && { displayName }),
        ...(notificationsEnabled !== undefined && { notificationsEnabled }),
      });
      return res.json(updated);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[users]', message);
    return res.status(500).json({ error: 'Internal error', detail: message });
  }
}
