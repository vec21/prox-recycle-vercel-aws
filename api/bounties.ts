/**
 * GET  /api/bounties        — list available bounties
 * POST /api/bounties        — seed initial bounties (idempotent)
 * PUT  /api/bounties        — claim a bounty { bountyId, userId }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import {
  getAvailableBounties,
  seedBounties,
  claimBounty,
  type BountyRecord,
} from './_lib/dynamo.js';

const MATERIALS = ['PET', 'Aluminum', 'Cardboard', 'Glass'] as const;

function generateBounties(): BountyRecord[] {
  return Array.from({ length: 10 }, () => ({
    bountyId: uuidv4(),
    material: MATERIALS[Math.floor(Math.random() * MATERIALS.length)],
    value: Math.floor(Math.random() * 500) + 50,
    // Normalized percentage coordinates (5–90%) used by the CSS-positioned UI map.
    // These are NOT geographic lat/lng values.
    lat: Math.round(5 + Math.random() * 85),
    lng: Math.round(5 + Math.random() * 85),
    status: 'available' as const,
    type: Math.random() > 0.7 ? ('surge' as const) : ('regular' as const),
    createdAt: new Date().toISOString(),
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const bounties = await getAvailableBounties();
      if (bounties.length === 0) {
        const seeded = generateBounties();
        await seedBounties(seeded);
        return res.json(seeded);
      }
      return res.json(bounties);
    }

    if (req.method === 'POST') {
      const existing = await getAvailableBounties();
      if (existing.length === 0) {
        const seeded = generateBounties();
        await seedBounties(seeded);
        return res.json({ seeded: seeded.length });
      }
      return res.json({ seeded: 0, message: 'Bounties already exist' });
    }

    if (req.method === 'PUT') {
      const { bountyId, userId } = (req.body ?? {}) as {
        bountyId?: string;
        userId?: string;
      };
      if (!bountyId || !userId) {
        return res.status(400).json({ error: 'bountyId and userId are required' });
      }
      await claimBounty(bountyId, userId);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[bounties]', message);
    if (message.includes('ConditionalCheckFailed')) {
      return res.status(409).json({ error: 'Bounty no longer available' });
    }
    return res.status(500).json({ error: 'Internal error', detail: message });
  }
}
