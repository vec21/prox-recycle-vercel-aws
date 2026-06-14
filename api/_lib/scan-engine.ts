/**
 * AI scan pipeline for Prox-Recycle (Vercel edition).
 *
 * Two-step pipeline (when Groq key is present):
 *   [1] Groq llama-4-scout → describes the waste image in plain text
 *   [2] Local grounding engine → classifies material, computes reward + CO₂,
 *       detects fraud, emits knowledge-base citation IDs
 *
 * Falls back to mock mode when no GROQ_API_KEY is set.
 */

import OpenAI from 'openai';

const KNOWLEDGE_SOURCE = 'recycling-knowledge.md';

export interface Citation {
  id: string;
  source: string;
}

export interface ScanResult {
  material: string;
  count: number;
  isWaste: boolean;
  confidence: number;
  estimatedWeight: number;
  fraudDetected: boolean;
  explanation: string;
  rewardKz: number;
  co2SavedKg: number;
  citations: Citation[];
  grounded: boolean;
  provider: 'groq-grounded' | 'mock';
}

// ── Price / CO₂ table (mirrors recycling-knowledge.md) ──────────────────────
const PRICE_TABLE: Record<
  string,
  { rate: number; mult: number; co2: number; priceId: string; classId: string; co2Id: string }
> = {
  PET:       { rate: 300, mult: 2.0, co2: 1.5, priceId: 'PRICE-PET',   classId: 'CLASS-PET',  co2Id: 'CO2-PET'  },
  Aluminum:  { rate: 450, mult: 2.5, co2: 9.0, priceId: 'PRICE-ALU',   classId: 'CLASS-ALU',  co2Id: 'CO2-ALU'  },
  Cardboard: { rate: 80,  mult: 1.0, co2: 0.9, priceId: 'PRICE-CARD',  classId: 'CLASS-CARD', co2Id: 'CO2-CARD' },
  Glass:     { rate: 60,  mult: 1.0, co2: 0.3, priceId: 'PRICE-GLASS', classId: 'CLASS-GLASS',co2Id: 'CO2-GLASS'},
};

const MATERIAL_KEYWORDS: Record<string, string[]> = {
  Aluminum:  ['aluminum', 'aluminium', 'can ', 'cans', 'tin', 'metal'],
  PET:       ['pet', 'plastic', 'bottle'],
  Cardboard: ['cardboard', 'carton', 'box', 'paper'],
  Glass:     ['glass', 'jar'],
};

const VISION_PROMPT = `You are a recycling vision analyst. Describe ONLY what you see in this image, 
factually and concisely. Report:
- The dominant recyclable material (plastic/PET, aluminum can, cardboard, glass, or none).
- Approximate number of items.
- Rough total size/weight estimate.
- Whether it looks like a real photo of physical waste, or a stock photo/screenshot/irrelevant image.
Answer in 2-4 short sentences. Do NOT compute any reward.`;

// ── Groq client ──────────────────────────────────────────────────────────────
const groqKey = process.env.GROQ_API_KEY;
const groqModel = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

const groqClient = groqKey
  ? new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' })
  : null;

export const pipelineMode: 'live' | 'mock' = groqKey ? 'live' : 'mock';

// ── Vision step ──────────────────────────────────────────────────────────────
async function describeImage(base64Image: string): Promise<string> {
  const completion = await groqClient!.chat.completions.create({
    model: groqModel,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: VISION_PROMPT },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
        ] as never,
      },
    ],
  });
  return completion.choices[0]?.message?.content ?? '';
}

// ── Local grounding engine ───────────────────────────────────────────────────
function groundDescription(description: string): ScanResult {
  const text = description.toLowerCase();
  const fraud = /stock photo|screenshot|irrelevant|not a real|no recyclable/.test(text);

  let material = 'Unidentified';
  for (const [mat, words] of Object.entries(MATERIAL_KEYWORDS)) {
    if (words.some((w) => text.includes(w))) {
      material = mat;
      break;
    }
  }

  const countMatch = text.match(/(\d+)\s*(items?|bottles?|cans?|pieces?|units?)/);
  const count = countMatch ? Number(countMatch[1]) : 1;
  const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*kg/);
  const estimatedWeight = weightMatch
    ? Number(weightMatch[1])
    : parseFloat((0.3 + count * 0.07).toFixed(2));

  const ref = PRICE_TABLE[material];

  if (fraud || !ref) {
    return {
      material: fraud ? material : 'Unidentified',
      count,
      isWaste: false,
      confidence: 0.6,
      estimatedWeight,
      fraudDetected: fraud,
      explanation: `Image flagged: ${fraud ? 'potential stock/irrelevant photo' : 'material unidentified'}. ${description}`.slice(0, 300),
      rewardKz: 0,
      co2SavedKg: 0,
      citations: [{ id: fraud ? 'FRAUD-STOCK' : 'PRICE-UNKNOWN', source: KNOWLEDGE_SOURCE }],
      grounded: true,
      provider: 'groq-grounded',
    };
  }

  const rewardKz = Math.round(estimatedWeight * ref.rate * ref.mult);
  return {
    material,
    count,
    isWaste: true,
    confidence: 0.9,
    estimatedWeight,
    fraudDetected: false,
    explanation: `Classified as ${material} (${count} item(s), ~${estimatedWeight} kg). ${description}`.slice(0, 300),
    rewardKz,
    co2SavedKg: parseFloat((estimatedWeight * ref.co2).toFixed(2)),
    citations: [
      { id: ref.classId, source: KNOWLEDGE_SOURCE },
      { id: ref.priceId, source: KNOWLEDGE_SOURCE },
      { id: ref.co2Id, source: KNOWLEDGE_SOURCE },
    ],
    grounded: true,
    provider: 'groq-grounded',
  };
}

// ── Mock fallback ─────────────────────────────────────────────────────────────
function mockScan(): ScanResult {
  const materials = Object.keys(PRICE_TABLE);
  const material = materials[Math.floor(Math.random() * materials.length)];
  const ref = PRICE_TABLE[material];
  const estimatedWeight = parseFloat((Math.random() * 2 + 0.3).toFixed(2));
  const count = Math.floor(Math.random() * 10) + 1;
  const rewardKz = Math.round(estimatedWeight * ref.rate * ref.mult);

  return {
    material,
    count,
    isWaste: true,
    confidence: parseFloat((Math.random() * 0.1 + 0.88).toFixed(2)),
    estimatedWeight,
    fraudDetected: false,
    explanation: `[MOCK] Classified as ${material}. Set GROQ_API_KEY in environment variables to enable live AI scan.`,
    rewardKz,
    co2SavedKg: parseFloat((estimatedWeight * ref.co2).toFixed(2)),
    citations: [
      { id: ref.classId, source: KNOWLEDGE_SOURCE },
      { id: ref.priceId, source: KNOWLEDGE_SOURCE },
      { id: ref.co2Id, source: KNOWLEDGE_SOURCE },
    ],
    grounded: true,
    provider: 'mock',
  };
}

// ── Public entry point ────────────────────────────────────────────────────────
export async function analyzeWaste(base64Image: string): Promise<ScanResult> {
  if (!groqClient) {
    return mockScan();
  }
  const description = await describeImage(base64Image);
  return groundDescription(description);
}
