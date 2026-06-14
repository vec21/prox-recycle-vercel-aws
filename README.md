# ♻️ Prox-Recycle — H0 Contest Edition

> **H0: Hack the Zero Stack with Vercel v0 and AWS Databases**
> Track: **Monetizable B2C App**

A gamified recycling platform for emerging markets (initial focus: Angola) — rebuilt for the H0 Devpost challenge with **Vercel** frontend deployment and **Amazon DynamoDB** as the primary data store.

Citizens become *Eco-Agents* who scan waste with an AI camera, earn **Kwanza (Kz)** rewards, and compete on a leaderboard. Every payout is AI-grounded, auditable, and stored in DynamoDB.

---

> ⚠️ **This is the contest-adapted variant** of [`vec21/Prox-Recycle`](https://github.com/vec21/Prox-Recycle).
> Firebase has been fully replaced with DynamoDB. The backend runs as Vercel serverless functions.

---

## 🎯 H0 Challenge Requirements Met

| Requirement | Implementation |
|---|---|
| Frontend on **Vercel** | React + Vite deployed as static SPA on Vercel |
| **AWS Database** (DynamoDB) | All persistence: users, bounties, claims, leaderboard |
| Vercel Team ID | Set in submission form |
| Architecture diagram | See [ARCHITECTURE.md](ARCHITECTURE.md) |
| Demo video | `< 3 min` walkthrough (see submission) |

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        VERCEL                                  │
│                                                                │
│  ┌─────────────────────┐    ┌─────────────────────────────┐  │
│  │   React + Vite SPA  │    │   Serverless API Routes     │  │
│  │   (Static Build)    │◄───│   /api/scan                 │  │
│  │                     │    │   /api/bounties              │  │
│  │   MapView           │    │   /api/leaderboard          │  │
│  │   ScannerView       │    │   /api/users/[userId]       │  │
│  │   WalletView        │    │   /api/claims               │  │
│  │   LeaderboardView   │    └──────────────┬──────────────┘  │
│  └─────────────────────┘                   │                  │
└───────────────────────────────────────────│──────────────────┘
                                            │
              ┌─────────────────────────────┼──────────────┐
              │                             ▼              │
              │              ┌──────────────────────────┐  │
              │   AWS        │       DynamoDB            │  │
              │              │                           │  │
              │              │  prox-recycle-users       │  │
              │              │  prox-recycle-bounties    │  │
              │              │  prox-recycle-claims      │  │
              │              └──────────────────────────┘  │
              └────────────────────────────────────────────┘
                                            │
                         ┌──────────────────┼──────────────────┐
                         │    AI Pipeline   │                   │
                         │                 ▼                   │
                         │   ┌─────────────────────────────┐   │
                         │   │  Groq (llama-4-scout)       │   │
                         │   │  Vision: describes photo    │   │
                         │   └──────────────┬──────────────┘   │
                         │                 │                   │
                         │                 ▼                   │
                         │   ┌─────────────────────────────┐   │
                         │   │  Local Grounding Engine     │   │
                         │   │  Knowledge-base citations   │   │
                         │   │  Reward + CO2 computation   │   │
                         │   └─────────────────────────────┘   │
                         └────────────────────────────────────┘
```

Full schema and design decisions in **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## ✨ Features

- 🗺️ **Tactical Bounty Map** — live recycling targets with surge pricing
- 📸 **AI-Grounded Scanner** — material classification, fraud detection, CO₂ tracking
- 💸 **Wallet Hub** — Kz balance, daily goal, simulated Unitel Money cashout
- 🏆 **Leaderboard** — global ranking stored in DynamoDB, sorted by total mass recycled
- ⚙️ **Settings** — display name + profile persisted in DynamoDB
- 🔒 **No auth friction** — UUID-based sessions (no signup required for judges/demo)

---

## 🚀 Local Development

**Prerequisites:** Node.js 18+, Vercel CLI (`npm i -g vercel`)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your AWS credentials and (optionally) Groq key:

```env
# AWS DynamoDB (required for data persistence)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Groq vision (optional — leave blank for mock mode)
GROQ_API_KEY=
GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

### 3. Run locally with Vercel Dev
```bash
vercel dev
```
This starts the Vite frontend **and** the Vercel serverless functions together on `http://localhost:3000`.

The app runs in **mock mode** when no `GROQ_API_KEY` is set — great for zero-config review.

---

## 🔑 Setting Up AWS DynamoDB

### Option A — AWS Console (GUI)
1. Sign in at https://console.aws.amazon.com
2. Go to **DynamoDB → Tables → Create table**
3. Create these three tables (see [ARCHITECTURE.md](ARCHITECTURE.md) for full schema):

| Table name | Partition key | Sort key |
|---|---|---|
| `prox-recycle-users` | `userId` (String) | — |
| `prox-recycle-bounties` | `bountyId` (String) | — |
| `prox-recycle-claims` | `claimId` (String) | — |

4. On `prox-recycle-bounties`, add a **Global Secondary Index** named `status-index` with PK `status`.
5. On `prox-recycle-claims`, add a **Global Secondary Index** named `userId-index` with PK `userId`.

### Option B — AWS CLI
```bash
# Users table
aws dynamodb create-table \
  --table-name prox-recycle-users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Bounties table with status GSI
aws dynamodb create-table \
  --table-name prox-recycle-bounties \
  --attribute-definitions \
    AttributeName=bountyId,AttributeType=S \
    AttributeName=status,AttributeType=S \
  --key-schema AttributeName=bountyId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName":"status-index",
    "KeySchema":[{"AttributeName":"status","KeyType":"HASH"}],
    "Projection":{"ProjectionType":"ALL"}
  }]' \
  --billing-mode PAY_PER_REQUEST

# Claims table with userId GSI
aws dynamodb create-table \
  --table-name prox-recycle-claims \
  --attribute-definitions \
    AttributeName=claimId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=claimId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName":"userId-index",
    "KeySchema":[{"AttributeName":"userId","KeyType":"HASH"}],
    "Projection":{"ProjectionType":"ALL"}
  }]' \
  --billing-mode PAY_PER_REQUEST
```

---

## 🌐 Deploying to Vercel

### 1. Push to GitHub (already done)

### 2. Import to Vercel
1. Go to https://vercel.com/new
2. Import this repository
3. Framework preset: **Vite**
4. Root directory: `.`

### 3. Add Environment Variables in Vercel Dashboard
Under **Settings → Environment Variables**, add:

| Variable | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `AWS_REGION` | e.g. `us-east-1` |
| `DYNAMO_USERS_TABLE` | `prox-recycle-users` |
| `DYNAMO_BOUNTIES_TABLE` | `prox-recycle-bounties` |
| `DYNAMO_CLAIMS_TABLE` | `prox-recycle-claims` |
| `GROQ_API_KEY` | (optional) enables live AI scan |
| `GROQ_MODEL` | `meta-llama/llama-4-scout-17b-16e-instruct` |

### 4. Deploy
```bash
vercel --prod
```

---

## 📂 Project Structure

```
api/                            # Vercel serverless functions (Node.js)
  _lib/
    dynamo.ts                   # DynamoDB client + CRUD helpers
    scan-engine.ts              # Groq vision → grounded reward pipeline
    knowledge/
      recycling-knowledge.md   # Knowledge base (prices, CO2, fraud rules)
  scan.ts                       # POST /api/scan
  bounties.ts                   # GET /api/bounties
  leaderboard.ts                # GET /api/leaderboard
  users/
    [userId].ts                 # GET /api/users/:id, PUT /api/users/:id
  claims.ts                     # POST /api/claims

src/                            # React frontend (Vite)
  App.tsx                       # UUID-based auth, no Firebase
  components/
    MapView.tsx                 # Bounty map
    ScannerView.tsx             # Camera + AI scan
    WalletView.tsx              # Balance & history
    LeaderboardView.tsx         # DynamoDB-backed ranking
    SettingsView.tsx            # Profile settings
  lib/
    api.ts                      # REST API client (all fetch calls)
    foundry.ts                  # Scan client (calls /api/scan)
```

---

## 🧩 Why DynamoDB?

| Factor | Fit |
|---|---|
| **Schema flexibility** | Each scan result can include variable citation arrays without schema migrations |
| **Scalability** | PAY_PER_REQUEST billing scales from 0 to millions of users |
| **Leaderboard patterns** | Sparse GSI on `recycledWeight` suits simple ranking queries |
| **Low latency** | Single-digit ms reads — ideal for live bounty map updates |
| **Serverless alignment** | Stateless connections fit perfectly with Vercel functions (no connection pool) |

See full schema in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 🔒 Security

- No secrets committed — `.env.local` and `.env` are git-ignored
- All AI credentials are server-side only (Vercel functions)
- IAM policy: grant only `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `Query`, `Scan` on the three tables

---

## 🎬 Demo Flow (for judges)

1. Open app → auto-assigned UUID session (no signup needed)
2. **Map tab** — see live recycling bounty pins
3. Tap a bounty → claim it
4. **Scan tab** → point camera at any recyclable (or use the test image)
5. AI classifies material, computes reward in Kz, shows CO₂ saved
6. Tap **COMMIT TO WALLET** → balance updates (persisted in DynamoDB)
7. **Leaderboard tab** → see rankings (fetched from DynamoDB)
8. **Wallet tab** → simulate Unitel Money cashout

---

## 📋 H0 Contest Checklist

- [x] Frontend deployed on **Vercel**
- [x] **Amazon DynamoDB** as primary database
- [x] Architecture diagram
- [x] Local dev instructions
- [x] Vercel deployment instructions
- [x] AWS DynamoDB setup instructions
- [x] No secrets committed
- [ ] Demo video (< 3 min)
- [ ] Vercel Team ID in submission
- [ ] Screenshot of DynamoDB in use
