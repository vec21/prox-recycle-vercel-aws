/**
 * POST /api/claims
 * Finalizes a scan result:
 *   1. Creates a claim record in DynamoDB
 *   2. Updates user balance + recycledWeight atomically
 *   3. Marks the bounty as completed
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import {
  createClaim,
  addToUserBalance,
  completeBounty,
  upsertUser,
} from './_lib/dynamo.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, bountyId, scanResult } = (req.body ?? {}) as {
    userId?: string;
    bountyId?: string;
    scanResult?: Record<string, unknown>;
  };

  if (!userId || !bountyId || !scanResult) {
    return res.status(400).json({ error: 'userId, bountyId, and scanResult are required' });
  }

  try {
    const now = new Date().toISOString();
    const rewardKz = typeof scanResult.rewardKz === 'number' ? Math.round(scanResult.rewardKz) : 0;
    const weight = typeof scanResult.estimatedWeight === 'number' ? scanResult.estimatedWeight : 0;

    // Ensure user record exists
    await upsertUser(userId, {});

    // Create the claim record
    const claimId = uuidv4();
    await createClaim({
      claimId,
      userId,
      bountyId,
      status: 'completed',
      materialValidated: String(scanResult.material ?? 'Unknown'),
      weightValidated: weight,
      rewardKz,
      co2SavedKg: typeof scanResult.co2SavedKg === 'number' ? scanResult.co2SavedKg : 0,
      citations: Array.isArray(scanResult.citations)
        ? (scanResult.citations as Array<{ id: string; source: string }>)
        : [],
      provider: String(scanResult.provider ?? 'mock'),
      createdAt: now,
      completedAt: now,
    });

    // Update user balance and recycled weight
    await addToUserBalance(userId, rewardKz, weight, {
      amount: rewardKz,
      material: scanResult.material,
      weight,
      co2SavedKg: scanResult.co2SavedKg,
      citations: scanResult.citations,
      provider: scanResult.provider,
      date: now,
    });

    // Mark bounty done
    await completeBounty(bountyId);

    return res.json({ success: true, claimId, rewardKz });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[claims]', message);
    return res.status(500).json({ error: 'Failed to finalize claim', detail: message });
  }
}
