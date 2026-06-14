/**
 * DynamoDB client + CRUD helpers for Prox-Recycle.
 * Uses AWS SDK v3 with the Document client for clean JS object access.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey) {
  throw new Error(
    'Missing required AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY ' +
      'in your environment variables (Vercel dashboard or .env.local for local dev).'
  );
}

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: { accessKeyId, secretAccessKey },
});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLES = {
  users: process.env.DYNAMO_USERS_TABLE || 'prox-recycle-users',
  bounties: process.env.DYNAMO_BOUNTIES_TABLE || 'prox-recycle-bounties',
  claims: process.env.DYNAMO_CLAIMS_TABLE || 'prox-recycle-claims',
};

// ── User helpers ─────────────────────────────────────────────────────────────

export interface LastClaimSnapshot {
  amount: number;
  material: string;
  weight: number;
  co2SavedKg: number;
  citations: Array<{ id: string; source: string }>;
  provider: string;
  date: string;
}

export interface UserRecord {
  userId: string;
  displayName: string;
  balance: number;
  recycledWeight: number;
  notificationsEnabled: boolean;
  lastClaim?: LastClaimSnapshot;
  createdAt: string;
  updatedAt: string;
}

export async function getUser(userId: string): Promise<UserRecord | null> {
  const result = await ddb.send(
    new GetCommand({ TableName: TABLES.users, Key: { userId } })
  );
  return (result.Item as UserRecord) ?? null;
}

export async function upsertUser(userId: string, updates: Partial<UserRecord>): Promise<UserRecord> {
  const now = new Date().toISOString();
  const existing = await getUser(userId);

  if (!existing) {
    const newUser: UserRecord = {
      userId,
      displayName: updates.displayName ?? `Agent-${userId.slice(0, 6)}`,
      balance: updates.balance ?? 0,
      recycledWeight: updates.recycledWeight ?? 0,
      notificationsEnabled: updates.notificationsEnabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await ddb.send(new PutCommand({ TableName: TABLES.users, Item: newUser }));
    return newUser;
  }

  const updated: UserRecord = { ...existing, ...updates, updatedAt: now };
  await ddb.send(new PutCommand({ TableName: TABLES.users, Item: updated }));
  return updated;
}

export async function addToUserBalance(
  userId: string,
  rewardKz: number,
  weight: number,
  lastClaim: LastClaimSnapshot
): Promise<void> {
  const now = new Date().toISOString();
  await ddb.send(
    new UpdateCommand({
      TableName: TABLES.users,
      Key: { userId },
      UpdateExpression:
        'SET balance = if_not_exists(balance, :zero) + :reward, ' +
        'recycledWeight = if_not_exists(recycledWeight, :zero) + :weight, ' +
        'lastClaim = :lastClaim, updatedAt = :now',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':reward': rewardKz,
        ':weight': weight,
        ':lastClaim': lastClaim,
        ':now': now,
      },
    })
  );
}

// ── Bounty helpers ────────────────────────────────────────────────────────────

export interface BountyRecord {
  bountyId: string;
  material: string;
  value: number;
  lat: number;
  lng: number;
  status: 'available' | 'claimed' | 'completed';
  type: 'regular' | 'surge';
  claimedBy?: string;
  createdAt: string;
}

export async function getAvailableBounties(): Promise<BountyRecord[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLES.bounties,
      IndexName: 'status-index',
      KeyConditionExpression: '#s = :available',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':available': 'available' },
      Limit: 30,
    })
  );
  return (result.Items as BountyRecord[]) ?? [];
}

export async function claimBounty(bountyId: string, userId: string): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLES.bounties,
      Key: { bountyId },
      UpdateExpression: 'SET #s = :claimed, claimedBy = :userId',
      ConditionExpression: '#s = :available',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':claimed': 'claimed',
        ':available': 'available',
        ':userId': userId,
      },
    })
  );
}

export async function completeBounty(bountyId: string): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLES.bounties,
      Key: { bountyId },
      UpdateExpression: 'SET #s = :completed',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':completed': 'completed' },
    })
  );
}

export async function seedBounties(bounties: BountyRecord[]): Promise<void> {
  await Promise.all(
    bounties.map((b) =>
      ddb.send(new PutCommand({ TableName: TABLES.bounties, Item: b }))
    )
  );
}

// ── Claim helpers ─────────────────────────────────────────────────────────────

export interface ClaimRecord {
  claimId: string;
  userId: string;
  bountyId: string;
  status: 'pending' | 'completed';
  materialValidated: string;
  weightValidated: number;
  rewardKz: number;
  co2SavedKg: number;
  citations: Array<{ id: string; source: string }>;
  provider: string;
  createdAt: string;
  completedAt?: string;
}

export async function createClaim(claim: ClaimRecord): Promise<void> {
  await ddb.send(new PutCommand({ TableName: TABLES.claims, Item: claim }));
}

export async function getUserClaims(userId: string, limit = 5): Promise<ClaimRecord[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLES.claims,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return (result.Items as ClaimRecord[]) ?? [];
}

// ── Leaderboard helper ────────────────────────────────────────────────────────

export async function getLeaderboard(limit = 10): Promise<UserRecord[]> {
  const result = await ddb.send(
    new ScanCommand({
      TableName: TABLES.users,
      ProjectionExpression: 'userId, displayName, recycledWeight, balance',
      Limit: 200,
    })
  );
  const users = (result.Items as UserRecord[]) ?? [];
  return users
    .sort((a, b) => (b.recycledWeight ?? 0) - (a.recycledWeight ?? 0))
    .slice(0, limit);
}
