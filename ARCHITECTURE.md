# Prox-Recycle — Architecture & DynamoDB Schema

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                           VERCEL PLATFORM                               │
│                                                                          │
│  ┌────────────────────────────┐   ┌──────────────────────────────────┐  │
│  │      React + Vite SPA      │   │    Serverless API Functions      │  │
│  │     (Static CDN edge)      │   │    (Node.js, Edge-compatible)    │  │
│  │                            │   │                                  │  │
│  │  ┌─────────────────────┐   │   │  POST /api/scan                  │  │
│  │  │ MapView             │   │   │  GET  /api/bounties              │  │
│  │  │ ScannerView         ├───┼──►│  POST /api/bounties (seed)       │  │
│  │  │ WalletView          │   │   │  GET  /api/leaderboard          │  │
│  │  │ LeaderboardView     │   │   │  GET  /api/users/[userId]        │  │
│  │  │ SettingsView        │   │   │  PUT  /api/users/[userId]        │  │
│  │  └─────────────────────┘   │   │  POST /api/claims               │  │
│  │                            │   └─────────────┬────────────────────┘  │
│  │  localStorage              │                 │                       │
│  │  ┌──────────────────────┐  │                 │ AWS SDK v3            │
│  │  │ userId (UUID)        │  │                 │                       │
│  │  │ displayName          │  │                 ▼                       │
│  │  └──────────────────────┘  │   ┌──────────────────────────────────┐  │
│  └────────────────────────────┘   │        Amazon DynamoDB           │  │
│                                   │        (us-east-1)               │  │
│                                   │                                  │  │
│                                   │  prox-recycle-users              │  │
│                                   │  prox-recycle-bounties           │  │
│                                   │  prox-recycle-claims             │  │
│                                   └──────────────────────────────────┘  │
│                                                                          │
│                          AI Scan Pipeline                                │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      /api/scan handler                            │   │
│  │                                                                   │   │
│  │  base64 image                                                     │   │
│  │       │                                                           │   │
│  │       ▼                                                           │   │
│  │  ┌──────────────────┐    vision description                       │   │
│  │  │  Groq llama-4    │──────────────────────────┐                 │   │
│  │  │  (optional)      │                          │                 │   │
│  │  └──────────────────┘                          ▼                 │   │
│  │        (fallback: skip)           ┌───────────────────────────┐  │   │
│  │                                   │   Local Grounding Engine  │  │   │
│  │                                   │   recycling-knowledge.md  │  │   │
│  │                                   │   ─────────────────────   │  │   │
│  │                                   │   classify material       │  │   │
│  │                                   │   compute rewardKz        │  │   │
│  │                                   │   compute co2SavedKg      │  │   │
│  │                                   │   check fraud rules       │  │   │
│  │                                   │   emit citation ids       │  │   │
│  │                                   └───────────────────────────┘  │   │
│  │                                              │                    │   │
│  │                                              ▼                    │   │
│  │                                     ScanResult JSON               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## DynamoDB Data Model

### Why DynamoDB?

| Factor | Justification |
|---|---|
| **Serverless alignment** | Vercel functions are stateless — DynamoDB needs no persistent connection pool |
| **Pay-per-request** | Scales from 0 to millions without pre-provisioning |
| **JSON-native** | Scan results with variable citation arrays store naturally as DynamoDB maps/lists |
| **Single-digit ms latency** | Keeps the live bounty map and leaderboard snappy |
| **GSI flexibility** | Global Secondary Indexes support leaderboard queries and status filters without full-table scans |

---

### Table 1: `prox-recycle-users`

Stores user profiles, balances, and recycling stats.

| Attribute | Type | Key | Description |
|---|---|---|---|
| `userId` | String | **PK** | UUID (generated client-side, stored in localStorage) |
| `displayName` | String | | Agent display name |
| `balance` | Number | | Kz balance |
| `recycledWeight` | Number | | Total kg recycled (drives leaderboard) |
| `lastClaim` | Map | | Last scan result snapshot |
| `notificationsEnabled` | Boolean | | Push notification preference |
| `createdAt` | String | | ISO 8601 timestamp |
| `updatedAt` | String | | ISO 8601 timestamp |

**Access patterns:**
- `GetItem` by `userId` — load profile on app start
- `PutItem` / `UpdateItem` by `userId` — update balance + stats after claim
- `Scan` with limit — leaderboard (small user base); migrates to GSI at scale

**At scale:** Add a GSI on `recycledWeight` (descending) using a fixed partition key for efficient leaderboard queries.

---

### Table 2: `prox-recycle-bounties`

Stores recycling bounty locations and their lifecycle state.

| Attribute | Type | Key | Description |
|---|---|---|---|
| `bountyId` | String | **PK** | UUID |
| `status` | String | GSI PK | `available` \| `claimed` \| `completed` |
| `material` | String | | `PET` \| `Aluminum` \| `Cardboard` \| `Glass` |
| `value` | Number | | Base reward in Kz |
| `lat` | Number | | Map position (0–100 normalized) |
| `lng` | Number | | Map position (0–100 normalized) |
| `type` | String | | `regular` \| `surge` |
| `claimedBy` | String | | `userId` of claiming agent |
| `createdAt` | String | | ISO 8601 timestamp |

**GSI: `status-index`**
- Partition key: `status`
- Enables efficient `Query` for all `available` bounties without scanning the whole table

**Access patterns:**
- `Query` on `status-index` WHERE `status = "available"` — load map pins
- `UpdateItem` by `bountyId` — transition `available → claimed → completed`

---

### Table 3: `prox-recycle-claims`

Records every scan/claim event with full AI result details.

| Attribute | Type | Key | Description |
|---|---|---|---|
| `claimId` | String | **PK** | UUID |
| `userId` | String | GSI PK | Links to user |
| `bountyId` | String | | Links to bounty |
| `status` | String | | `pending` \| `completed` |
| `materialValidated` | String | | AI-classified material |
| `weightValidated` | Number | | Estimated weight (kg) |
| `rewardKz` | Number | | Final payout |
| `co2SavedKg` | Number | | Environmental impact |
| `citations` | List | | Knowledge-base citation IDs |
| `provider` | String | | `groq-grounded` \| `mock` |
| `createdAt` | String | | ISO 8601 |
| `completedAt` | String | | ISO 8601 |

**GSI: `userId-index`**
- Partition key: `userId`
- Enables `Query` for all claims by a specific user (transaction history)

**Access patterns:**
- `PutItem` — create claim record on scan completion
- `UpdateItem` by `claimId` — mark `pending → completed`
- `Query` on `userId-index` — fetch user's claim history

---

## Authentication Strategy

This contest version uses **UUID-based anonymous sessions** to minimize friction for judges and testers:

1. On first visit, a UUID is generated and stored in `localStorage` as `proxRecycleUserId`
2. This ID is sent in the `X-User-Id` header with every API request
3. The API creates a user record in DynamoDB on first encounter (`PutItem` with condition)
4. No passwords, no email — instant access

**Production upgrade path:** Replace with Amazon Cognito for full OAuth/email auth while keeping the same DynamoDB user records.

---

## Scan Pipeline Detail

```
1. Client captures photo → base64 JPEG

2. POST /api/scan { image: base64 }

3. Server:
   a. If GROQ_API_KEY set:
      - Send image to Groq llama-4-scout → text description
      - Pass description to local grounding engine
   b. If no GROQ_API_KEY:
      - Use mock description → local grounding engine

4. Local grounding engine (recycling-knowledge.md):
   - Classify material (keyword matching on description)
   - Look up PRICE-* entry → compute rewardKz
   - Look up CO2-* entry → compute co2SavedKg
   - Check FRAUD-* rules
   - Emit citation IDs for auditability

5. Return ScanResult JSON to client

6. Client calls POST /api/claims to:
   - Create claim record in DynamoDB
   - Update user balance + recycledWeight atomically
   - Mark bounty as completed
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | ✅ | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | ✅ | IAM secret key |
| `AWS_REGION` | ✅ | e.g. `us-east-1` |
| `DYNAMO_USERS_TABLE` | ✅ | Table name (default: `prox-recycle-users`) |
| `DYNAMO_BOUNTIES_TABLE` | ✅ | Table name (default: `prox-recycle-bounties`) |
| `DYNAMO_CLAIMS_TABLE` | ✅ | Table name (default: `prox-recycle-claims`) |
| `GROQ_API_KEY` | ⬜ | Enables live AI vision (optional) |
| `GROQ_MODEL` | ⬜ | Default: `meta-llama/llama-4-scout-17b-16e-instruct` |

---

## IAM Minimum Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/prox-recycle-*",
        "arn:aws:dynamodb:*:*:table/prox-recycle-*/index/*"
      ]
    }
  ]
}
```
