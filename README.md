<div align="center">

# Obsidian Gateway

### The API Gateway that runs itself.

**Stop building auth, rate limits, caching, and load balancers into every service.
Configure once. Deploy everywhere. Observe everything.**

---

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](#)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](#)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](#)
[![Kafka](https://img.shields.io/badge/Apache_Kafka-231F20?style=for-the-badge&logo=apachekafka&logoColor=white)](#)

</div>

---

## The Problem

You have 5 backend services. Each one needs:
- Authentication? Implement it 5 times.
- Rate limiting? Implement it 5 times.
- Caching? Implement it 5 times.
- Load balancing? Implement it 5 times.
- Logging? Implement it 5 times.

**Obsidian Gateway eliminates all of that.** One dashboard. One API key. Every cross-cutting concern, handled.

```
Client Request  ──>  OBSIDIAN GATEWAY  ──>  Your Backend
                     │
                     ├─ API Key Auth
                     ├─ Two-Tier Rate Limiting
                     ├─ Response Caching (Redis)
                     ├─ Health-Aware Load Balancing
                     ├─ Async Log Pipeline (Kafka)
                     └─ Real-Time Analytics
```

---

## How It Works

One header. That's it.

```bash
curl -H "x-api-key: YOUR_API_KEY" https://gateway.prod/users
```

The gateway handles everything else:

```
Request ─> Validate API Key ─> Match Route ─> Rate Limit (Global)
       ─> Rate Limit (Per-Route) ─> Cache Check ─> Load Balance
       ─> Forward to Backend ─> Cache Response ─> Log to Kafka
```

**9 stages. Zero code in your backend.**

---

## Features

### Per-Route Granular Control
Different paths, different rules. `/users` gets cached for 60s with a 100 req/min limit. `/payments` gets no cache and a 10 req/min limit. Same API key, completely different policies.

### Two-Tier Rate Limiting
A global safety net (50 req/min per key) plus per-route limits you define. Redis-backed, atomic, sub-millisecond.

### Health-Aware Load Balancing
Round-robin across your backends with automatic failover. Health checks every 15 minutes mark backends UP/DOWN in Redis. If all backends go down, you get a clean 503 -- not a timeout.

### Response Caching
Toggle caching per route. Set your own TTL. Cache keys are scoped per API key + path. Cache hits skip your backend entirely.

### Async Log Pipeline
Every request is logged to Kafka, consumed asynchronously, and persisted to MongoDB. The critical request path is never blocked by logging.

### Admin "God View"
Platform admins see everything: global stats, per-user drill-down, all logs across all developers. Full observability without touching a terminal.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | Node.js | Event-driven, non-blocking I/O |
| **Backend** | Express 5 | Async error handling, modern API |
| **Frontend** | React 18 + Vite | Component-based UI, instant HMR |
| **Database** | MongoDB (Atlas) | Flexible document schema |
| **Cache** | Redis (Upstash) | Sub-ms reads, atomic ops, TTL |
| **Message Queue** | Apache Kafka | Durable, high-throughput log pipeline |
| **Auth** | JWT (7-day expiry) | Stateless, scalable |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                         │
│  Browser (React SPA)          Client Apps (API calls)   │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────┐      ┌──────────────────────────────┐
│  Frontend :8080  │──────│     Gateway Proxy :3000       │
│  (Static + Proxy)│      │                              │
└──────────────────┘      │  ┌────────────────────────┐  │
                          │  │  Middleware Pipeline    │  │
                          │  │                        │  │
                          │  │  1. API Key Validation │──│── MongoDB
                          │  │  2. Route Matching     │  │
                          │  │  3. Outer Rate Limit   │──│── Redis
                          │  │  4. Inner Rate Limit   │──│── Redis
                          │  │  5. Cache Lookup       │──│── Redis
                          │  │  6. Load Balance       │──│── Redis
                          │  │  7. Forward Request    │──│── Backend
                          │  │  8. Cache Store        │──│── Redis
                          │  │  9. Publish Log        │──│── Kafka
                          │  └────────────────────────┘  │
                          └──────────────────────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │  Kafka Consumer    │
                          │  (Async Pipeline)  │
                          └─────────┬─────────┘
                                    ▼
                              ┌──────────┐
                              │ MongoDB  │
                              │ (Logs)   │
                              └──────────┘
```

---

## Dashboard

The React SPA gives you everything you need to manage your gateways:

- **Dashboard** -- overview stats, gateway cards, create/edit/delete
- **API Details** -- per-gateway analytics with request traffic charts
- **Logs** -- full request log viewer with cache status, latency, backend target
- **Admin Overview** -- global stats, user directory, per-user drill-down
- **Admin Logs** -- all traffic across all developers in one view
- **Multi-Step Wizard** -- 4-step gateway creation with educational explainers

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local instance)
- Upstash Redis account (or local Redis)
- Kafka broker (local or cloud)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd api-gateway

# Backend
cd Backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Backend/.env
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
MONGO_URI=your_mongodb_uri
ADMIN_EMAIL=your_admin_email
JWT_SECRET=your_jwt_secret
```

### 3. Run

```bash
# Terminal 1 - Backend
cd Backend
node src/index.js

# Terminal 2 - Frontend
cd frontend
npx vite
```

Dashboard at `http://localhost:5173` (dev) or `http://localhost:8080` (production).

---

## Project Structure

```
api-gateway/
├── Backend/
│   └── src/
│       ├── index.js                 # Server entry point
│       ├── routes/
│       │   ├── auth.js              # Signup/signin
│       │   ├── dev.js               # Gateway CRUD
│       │   ├── gateway.js           # Core proxy (THE pipeline)
│       │   └── logs.js              # Log queries + stats
│       ├── middleware/
│       │   ├── auth.js              # JWT verification
│       │   ├── cache.js             # Redis cache get/set
│       │   └── rateLimit.js         # Two-tier rate limiting
│       ├── models/
│       │   ├── ApiConfig.js         # Gateway config schema
│       │   ├── Log.js               # Request log schema
│       │   └── User.js              # User account schema
│       ├── kafka/
│       │   ├── producer.js          # Log publisher
│       │   └── consumer.js          # Log persister
│       └── utils/
│           ├── healthCheck.js       # Backend health pinger
│           ├── loadBalancer.js      # Round-robin LB
│           └── normalizeConfig.js   # Config sanitizer
│
└── frontend/
    └── src/
        ├── pages/                   # Full page components
        ├── components/              # Reusable UI pieces
        ├── services/                # API call layer
        ├── context/                 # Auth state
        └── styles/                  # Dark theme CSS
```

---

## API Reference

### Proxy a Request
```http
ALL /gateway/*
x-api-key: YOUR_KEY
```

### Create a Gateway
```http
POST /dev/api
Authorization: Bearer <token>

{
  "targets": ["https://api.example.com"],
  "routes": [
    { "path": "/users", "cache": true, "cacheTTL": 60, "rateLimit": 100 }
  ]
}
```

### Get Stats
```http
GET /logs/stats
Authorization: Bearer <token>

→ { "total": 1520, "errors": 45, "cacheHits": 890, "cacheMiss": 630 }
```

---

## What's Next

- [ ] Production deployment (Render / AWS)
- [ ] Token refresh & revocation
- [ ] WebSocket real-time dashboard
- [ ] API key rotation
- [ ] Circuit breaker pattern
- [ ] Multi-tenant isolation
- [ ] Plugin system for custom middleware

---

<div align="center">

**Built from scratch. Every stage of the pipeline. Every byte of the flow.**

</div>
