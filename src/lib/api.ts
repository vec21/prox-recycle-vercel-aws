/**
 * Frontend API client for Prox-Recycle (Vercel + DynamoDB edition).
 * All calls hit Vercel serverless functions — no AWS credentials in the browser.
 */

export interface LastClaim {
  amount: number;
  material: string;
  weight: number;
  co2SavedKg: number;
  citations: Array<{ id: string; source: string }>;
  provider: string;
  date: string;
}

export interface UserData {
  userId: string;
  displayName: string;
  balance: number;
  recycledWeight: number;
  notificationsEnabled: boolean;
  lastClaim?: LastClaim;
  createdAt: string;
  updatedAt: string;
}

export interface Bounty {
  bountyId: string;
  material: string;
  value: number;
  lat: number;
  lng: number;
  status: 'available' | 'claimed' | 'completed';
  type: 'regular' | 'surge';
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
  citations: Array<{ id: string; source: string }>;
  grounded: boolean;
  provider: string;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── User ──────────────────────────────────────────────────────────────────────

export async function fetchUser(userId: string): Promise<UserData> {
  return apiFetch<UserData>(`/api/users/${userId}`);
}

export async function updateUser(
  userId: string,
  updates: Partial<Pick<UserData, 'displayName' | 'notificationsEnabled'>>
): Promise<UserData> {
  return apiFetch<UserData>(`/api/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

// ── Bounties ──────────────────────────────────────────────────────────────────

export async function fetchBounties(): Promise<Bounty[]> {
  return apiFetch<Bounty[]>('/api/bounties');
}

export async function claimBounty(bountyId: string, userId: string): Promise<void> {
  await apiFetch('/api/bounties', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bountyId, userId }),
  });
}

// ── Scan ──────────────────────────────────────────────────────────────────────

export async function analyzeWaste(base64Image: string): Promise<ScanResult> {
  return apiFetch<ScanResult>('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
  });
}

// ── Claims ────────────────────────────────────────────────────────────────────

export async function finalizeClaim(
  userId: string,
  bountyId: string,
  scanResult: ScanResult
): Promise<{ claimId: string; rewardKz: number }> {
  return apiFetch('/api/claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, bountyId, scanResult }),
  });
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderEntry {
  userId: string;
  displayName: string;
  recycledWeight: number;
  balance: number;
}

export async function fetchLeaderboard(): Promise<LeaderEntry[]> {
  return apiFetch<LeaderEntry[]>('/api/leaderboard');
}
