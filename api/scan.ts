/**
 * POST /api/scan
 * Accepts a base64 JPEG image and returns an AI-grounded scan result.
 * All credentials stay server-side in Vercel environment variables.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeWaste, pipelineMode } from './_lib/scan-engine.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.json({ status: 'ok', mode: pipelineMode });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = (req.body ?? {}) as { image?: string };
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Missing base64 "image" field.' });
  }

  try {
    const result = await analyzeWaste(image);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[scan] AI analysis failed:', message);
    return res.status(502).json({ error: 'AI analysis failed', detail: message });
  }
}
