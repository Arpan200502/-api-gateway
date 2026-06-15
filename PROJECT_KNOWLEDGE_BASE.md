# PROJECT KNOWLEDGE BASE

## Obsidian API Gateway

---

# Project Overview

## Project Name
**Obsidian Gateway** (branded "Obsidian Gateway")

## Purpose
A custom-built API Gateway SaaS platform that sits between client applications and developer backends, providing centralized traffic control, security, caching, rate limiting, load balancing, and observability.

## Problem Being Solved
Developers managing multiple backend services need a unified ingress point that handles cross-cutting concerns (authentication, rate limiting, caching, load balancing, logging) without implementing them in every service. Obsidian Gateway provides these as a managed service, allowing developers to configure gateway behavior through a dashboard without modifying their backend code.

## Target Users
1. **Developers ("dev" role):** Configure and manage API gateway proxies for their backend services. Monitor traffic, cache responses, rate-limit endpoints, and balance load across instances.
2. **Administrators ("admin" role):** Full platform visibility. Monitor all developer activity, view global logs, drill down into individual user behavior, and manage any user's configurations.

## Core Value Proposition
- Zero-code ingress management: configure routing, caching, rate limiting, and load balancing through a dashboard
- Per-route granularity: different paths on the same API can have independent caching, TTL, and rate limit settings
- Real-time observability: every request is logged with latency, cache status, backend target, and status code
- Admin oversight: platform admins see a "God View" of all traffic across all developers

## Current Development Status
Phases 1-8 are complete. Phase 9 (Deployment) is pending.

| Phase | Feature | Status |
|---|---|---|
| 1 | Core Proxy (forward requests to backend) | Done |
| 2 | Route Config (path-based routing) | Done |
| 3 | API Key Authentication | Done |
| 4 | Rate Limiting (Redis) | Done |
| 5 | Caching (Redis) | Done |
| 6 | Load Balancing | Done |
| 7 | Logging and Analytics | Done |
| 8 | Dashboard | Done |
| 9 | Deployment | Pending |

---

# High Level Architecture

## System Architecture

The system follows a two-tier architecture with a clear separation between the management plane (dashboard + API management) and the data plane (gateway proxy).

```mermaid
graph TD
    subgraph "Client Layer"
        A[Client App] -->|API Request + x-api-key| G[Gateway Proxy :3000]
        B[Browser] -->|SPA + API Calls| F[Frontend Server :8080]
    end

    subgraph "Frontend Server"
        F -->|Static Assets| B
        F -->|Proxy /auth/* /dev/* /logs/*| G
    end

    subgraph "Backend Server (Express 5)"
        G --> MW[Middleware Pipeline]
        MW -->|1. API Key Validation| DB[(MongoDB)]
        MW -->|2. Route Matching| DB
        MW -->|3. Outer Rate Limit| R[(Redis / Upstash)]
        MW -->|4. Inner Rate Limit| R
        MW -->|5. Cache Check| R
        MW -->|6. Load Balance| LB[Load Balancer]
        MW -->|7. Forward Request| DS[Developer Backends]
        MW -->|8. Cache Store| R
        MW -->|9. Publish Log| K[Kafka]
    end

    subgraph "Async Log Pipeline"
        K -->|gateway-logs topic| CONSUMER[Log Consumer]
        CONSUMER -->|Save| DB
    end

    subgraph "Health Monitoring"
        HC[Health Checker] -->|Ping every 15min| DS
        HC -->|Write status| R
    end
```

## Client Flow

1. **Developer** visits the Obsidian Gateway dashboard via browser
2. Browser loads the React SPA from the frontend server
3. Developer signs up / logs in, receives a JWT token
4. Developer creates a gateway configuration: provides backend target URLs and route definitions
5. Developer receives an auto-generated API key for this gateway
6. Developer configures their client app to send requests to `gateway/{path}` with the `x-api-key` header

## Request Flow (Gateway Proxy)

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Redis
    participant MongoDB
    participant LoadBalancer
    participant Backend
    participant Kafka

    Client->>Gateway: Request + x-api-key header
    Gateway->>MongoDB: Lookup ApiConfig by apikey
    MongoDB-->>Gateway: config (targets, routes)

    alt Route not found
        Gateway-->>Client: 404 Route not found
    end

    Gateway->>Redis: OUTER rate limit check (50 req/min per key)
    alt Rate limit exceeded
        Gateway-->>Client: 429 Gateway Rate Limit Exceeded
    end

    Gateway->>Redis: INNER rate limit check (per-route limit)
    alt Rate limit exceeded
        Gateway-->>Client: 429 Custom Devs Rate Limit Exceeded
    end

    alt Cache enabled for route
        Gateway->>Redis: GET cache:{apiKey}:{path}
        alt Cache HIT
            Redis-->>Gateway: cached response
            Gateway-->>Client: 200 (cached)
        end
    end

    Gateway->>LoadBalancer: Select healthy backend
    LoadBalancer->>Redis: GET health:{apiKey}:{target} for each
    Redis-->>LoadBalancer: UP/DOWN statuses
    LoadBalancer-->>Gateway: selected target URL

    alt All backends down
        Gateway-->>Client: 503 All backends are down
    end

    Gateway->>Backend: Forward original request
    Backend-->>Gateway: Response

    alt Cache enabled
        Gateway->>Redis: SET cache:{apiKey}:{path} with TTL
    end

    Gateway->>Kafka: Publish log entry
    Gateway-->>Client: Response from backend
```

## Response Flow
1. Gateway receives response from backend (or cache)
2. If caching is enabled, stores response in Redis with configurable TTL
3. Publishes log entry to Kafka (async, non-blocking from response)
4. Forwards the backend response status and body directly to the client
5. The client receives the response as if it came directly from the backend

## Authentication Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Frontend
    participant Backend
    participant MongoDB
    participant JWT

    Browser->>Frontend: Submit login form
    Frontend->>Backend: POST /auth/signin {email, password}
    Backend->>MongoDB: Find user by email
    MongoDB-->>Backend: user document
    Backend->>Backend: bcrypt.compare(password, hash)
    Backend->>JWT: Sign {userId} with secret, 7d expiry
    JWT-->>Backend: token
    Backend-->>Frontend: {token, userId, role}

    Frontend->>Frontend: Store token + user in localStorage
    Frontend->>Frontend: Update AuthContext

    Note over Browser,JWT: All subsequent requests
    Browser->>Frontend: Navigate to protected page
    Frontend->>Frontend: Check AuthContext for token
    Frontend->>Backend: Request with Authorization: Bearer {token}
    Backend->>Backend: authMiddleware: verify JWT
    Backend->>Backend: Attach userId to req.user
```

## Database Flow

```mermaid
graph LR
    subgraph "Write Path (Async)"
        K[Kafka Consumer] -->|eachMessage| M[Log.create]
        M --> COL[(Log Collection)]
    end

    subgraph "Read Path (Sync)"
        GW[Gateway Route] -->|findOne| AC[(ApiConfig Collection)]
        GW -->|create| AC
        GW -->|findOneAndUpdate| AC
        GW -->|findOneAndDelete| AC
        AUTH[Auth Route] -->|findOne| U[(User Collection)]
        AUTH -->|new User + save| U
        LOGS[Logs Route] -->|find + countDocuments| COL
    end

    subgraph "Redis Data"
        RATE[ratelimit:{key}] 
        CACHE[cache:{key}:{path}]
        HEALTH[health:{key}:{target}]
        LB[lb:{key}]
    end
```

---

# Folder Structure

```
api-gateway/
├── .gitignore
├── README.md
│
├── Backend/
│   ├── .env                              # Environment variables
│   ├── package.json                      # Backend dependencies
│   ├── package-lock.json                 # Dependency lock file
│   └── src/
│       ├── index.js                      # Server entry point
│       ├── dummy.js                      # Test load-balanced servers
│       ├── config/
│       │   ├── db.js                     # Legacy hardcoded data (unused)
│       │   └── mongo.js                  # MongoDB connection helper
│       ├── kafka/
│       │   ├── producer.js               # Log publisher
│       │   └── consumer.js               # Log consumer/saver
│       ├── middleware/
│       │   ├── auth.js                   # JWT authentication
│       │   ├── cache.js                  # Redis cache get/set
│       │   └── rateLimit.js              # Redis rate limiting
│       ├── models/
│       │   ├── ApiConfig.js              # Gateway configuration schema
│       │   ├── Log.js                    # Request log schema
│       │   └── User.js                   # User account schema
│       ├── routes/
│       │   ├── auth.js                   # Signup/signin endpoints
│       │   ├── dev.js                    # Gateway CRUD endpoints
│       │   ├── gateway.js                # Core proxy logic
│       │   └── logs.js                   # Log query endpoints
│       └── utils/
│           ├── healthCheck.js            # Backend health pinger
│           ├── loadBalancer.js           # Round-robin LB
│           └── normalizeConfig.js        # Config sanitizer
│
└── frontend/
    ├── index.html                        # Vite entry HTML
    ├── package.json                      # Frontend dependencies
    ├── package-lock.json                 # Dependency lock file
    ├── server.js                         # Production Express server
    ├── vite.config.js                    # Vite build config
    ├── dist/                             # Production build output
    │   ├── index.html
    │   └── assets/
    │       ├── index-BNWtxGyC.js
    │       ├── index-D25bGCrG.css
    │       ├── cacheing -BGcFPf3q.mp4
    │       └── Load balacning -CiuOjTVx.mp4
    └── src/
        ├── main.jsx                      # React entry point
        ├── App.jsx                       # Route definitions
        ├── context/
        │   └── AuthContext.jsx           # Auth state provider
        ├── services/
        │   ├── apiClient.js              # HTTP request wrapper
        │   ├── auth.js                   # Auth API calls
        │   ├── gateway.js                # Gateway CRUD calls
        │   ├── logs.js                   # Log query calls
        │   ├── navigation.js             # Sidebar nav items
        │   └── storage.js                # localStorage helpers
        ├── pages/
        │   ├── LandingPage.jsx           # Public landing page
        │   ├── LoginPage.jsx             # Login form
        │   ├── SignupPage.jsx            # Signup form
        │   ├── DashboardPage.jsx         # Main dashboard
        │   ├── ApiDetailsPage.jsx        # Per-API analytics
        │   ├── ApiAllLogsPage.jsx        # Full log viewer
        │   ├── AdminOverviewPage.jsx     # Admin global view
        │   ├── AdminLogsPage.jsx         # Admin log viewer
        │   ├── AdminUserPage.jsx         # Admin user drill-down
        │   └── NotFoundPage.jsx          # 404 page
        ├── components/
        │   ├── layout/
        │   │   ├── AppShell.jsx          # Dashboard layout
        │   │   └── AuthShell.jsx         # Auth page layout
        │   ├── gateway/
        │   │   ├── ApiCard.jsx           # Gateway card
        │   │   ├── ApiWizardModal.jsx    # Create/edit wizard
        │   │   ├── EmptyState.jsx        # Empty state placeholder
        │   │   └── RouteSettingsModal.jsx # Route config modal
        │   ├── logs/
        │   │   └── LogsTable.jsx         # Log table component
        │   ├── ui/
        │   │   ├── Button.jsx            # Reusable button
        │   │   ├── InputField.jsx        # Reusable input
        │   │   ├── Modal.jsx             # Reusable modal
        │   │   └── Toggle.jsx            # Toggle switch
        │   ├── charts/
        │   │   └── UsageChart.jsx        # Line chart
        │   └── animations/
        │       └── GatewayFlowAnimations.jsx # SVG animations
        ├── animation videos/
        │   ├── cacheing .mp4             # Caching explainer
        │   └── Load balacning .mp4       # Load balancing explainer
        └── styles/
            ├── app.css                   # Main stylesheet (1327 lines)
            └── gateway-flow-animations.css # Animation CSS (675 lines)
```

## Folder Responsibilities

### `Backend/`
**Purpose:** Server-side gateway logic, API endpoints, authentication, proxying, caching, rate limiting, and load balancing.

**Responsibilities:**
- Accept and process API management requests (CRUD for gateway configs)
- Accept and proxy client API requests through the gateway pipeline
- Authenticate users via JWT
- Rate limit requests per API key and per route
- Cache responses in Redis with configurable TTL
- Load balance across multiple backend targets
- Publish logs to Kafka for async persistence
- Health-check backend targets periodically

**Dependencies:** Express 5, Mongoose, ioredis, kafkajs, axios, bcrypt, jsonwebtoken, dotenv

### `Backend/src/routes/`
**Purpose:** Express route handlers that define all API endpoints.

**Responsibilities:**
- `auth.js`: User registration and login
- `dev.js`: CRUD operations for gateway configurations (JWT-protected)
- `gateway.js`: Core proxy logic that processes every client API request
- `logs.js`: Log retrieval and analytics (JWT-protected)

### `Backend/src/middleware/`
**Purpose:** Reusable middleware functions for cross-cutting concerns.

**Responsibilities:**
- `auth.js`: JWT token verification and user extraction
- `cache.js`: Redis cache read/write operations
- `rateLimit.js`: Redis-based sliding window rate limiting

### `Backend/src/models/`
**Purpose:** Mongoose schema definitions for MongoDB collections.

**Responsibilities:**
- Define document structure and types
- Establish field constraints (unique email, default role)

### `Backend/src/kafka/`
**Purpose:** Apache Kafka integration for async log processing.

**Responsibilities:**
- `producer.js`: Publish log entries to the `gateway-logs` topic
- `consumer.js`: Consume log entries and persist them to MongoDB

### `Backend/src/utils/`
**Purpose:** Utility functions for health checking, load balancing, and config normalization.

**Responsibilities:**
- `healthCheck.js`: Ping all backend targets, store UP/DOWN in Redis
- `loadBalancer.js`: Select healthy backend via round-robin
- `normalizeConfig.js`: Sanitize and default user-submitted configuration

### `frontend/`
**Purpose:** React SPA providing the developer dashboard and admin panel.

**Responsibilities:**
- User authentication (signup/login)
- Gateway configuration management (create, view, edit, delete)
- Real-time usage analytics and charts
- Admin "God View" with per-user drill-down

### `frontend/src/services/`
**Purpose:** HTTP client and API call abstraction layer.

**Responsibilities:**
- `apiClient.js`: Generic fetch wrapper with automatic Bearer token injection
- `auth.js`: Signup/signin API calls
- `gateway.js`: Gateway CRUD API calls
- `logs.js`: Log and stats API calls
- `storage.js`: localStorage operations with user-scoped keys
- `navigation.js`: Sidebar navigation items by role

### `frontend/src/pages/`
**Purpose:** Full page components mapped to routes.

**Responsibilities:**
- Render page-specific layouts and data
- Fetch data via service modules
- Manage local UI state

### `frontend/src/components/`
**Purpose:** Reusable UI components shared across pages.

**Responsibilities:**
- Layout shells (AppShell, AuthShell)
- Gateway-specific components (ApiCard, ApiWizardModal, RouteSettingsModal)
- Generic UI primitives (Button, InputField, Modal, Toggle)
- Data visualization (UsageChart, LogsTable)
- Animated diagrams (GatewayFlowAnimations)

### `frontend/src/context/`
**Purpose:** React Context for global auth state.

**Responsibilities:**
- Provide `token`, `user`, `login()`, `logout()` to all child components
- Persist auth state to localStorage

### `frontend/src/styles/`
**Purpose:** Application-wide CSS stylesheets.

**Responsibilities:**
- `app.css`: Complete dark-theme styling (1327 lines)
- `gateway-flow-animations.css`: CSS-driven animation keyframes (675 lines)

---

# Technology Stack

## Languages
| Language | Usage | Location |
|---|---|---|
| JavaScript (Node.js) | Backend runtime, API logic, proxy | `Backend/` |
| JavaScript (ES Modules) | Frontend SPA, React components | `frontend/src/` |
| JSX | React component templates | `frontend/src/**/*.jsx` |
| CSS | Styling, animations | `frontend/src/styles/` |

## Frameworks
| Framework | Version | Role | Why Chosen |
|---|---|---|---|
| Express | ^5.2.1 | Backend HTTP server | Industry-standard Node.js framework; v5 chosen for modern features (async error handling) |
| React | ^18.3.1 | Frontend UI library | Component-based architecture, large ecosystem, Hooks API |
| Vite | ^5.4.12 | Frontend build tool | Fast dev server, optimized builds, native ESM support |
| React Router | ^6.30.1 | Client-side routing | Declarative route matching, nested routes, hooks API |
| Mongoose | ^9.4.1 | MongoDB ODM | Schema-based modeling, validation, query builder for MongoDB |

## Libraries
| Library | Version | Role | Why Chosen |
|---|---|---|---|
| axios | ^1.14.0 | HTTP client (backend) | Promise-based, request/response interceptors, automatic JSON parsing |
| bcrypt | ^6.0.0 | Password hashing | Industry-standard, salt-rounds based, battle-tested |
| jsonwebtoken | ^9.0.3 | JWT auth | Compact, stateless authentication tokens |
| ioredis | ^5.10.1 | Redis client | Feature-rich, promise-based, supports cluster/sentinel |
| kafkajs | ^2.2.4 | Kafka client | Pure JavaScript Kafka client (no native deps), supports producer/consumer |
| recharts | ^2.15.4 | Charts | Declarative React chart library built on D3 |
| lucide-react | ^0.511.0 | Icons | Lightweight, tree-shakeable, consistent icon set |
| dotenv | ^17.4.0 | Environment variables | Load .env files into process.env |

## Databases
| Database | Provider | Role | Why Chosen |
|---|---|---|---|
| MongoDB (Atlas) | Cloud-hosted replica set | Primary data store | Flexible schema, good for document-oriented data (configs, logs) |
| Redis (Upstash) | Cloud-hosted REST-based | Cache, rate limiting, health status, LB counters | Sub-millisecond reads, TTL support, atomic INCR |

## Message Queue
| System | Role | Why Chosen |
|---|---|---|
| Apache Kafka (via KafkaJS) | Async log ingestion | Decouples log publishing from persistence, high throughput, durable |

## Infrastructure
| Component | Details |
|---|---|
| Backend Port | 3000 (Express server) |
| Frontend Port | 8080 (Express static server) |
| MongoDB | Atlas cluster `gatewayLogs` database |
| Redis | Upstash cloud (TLS, REST-based) |
| Kafka | Expected at `localhost:9092` or `127.0.0.1:9092` |

---

# System Components

## 1. Gateway Proxy (`routes/gateway.js`)
**Purpose:** Core request proxy that processes every client API request through the full pipeline.

**Inputs:**
- HTTP request with `x-api-key` header
- Request path, method, headers, body, query params

**Outputs:**
- Proxied response from backend (or cache)
- Log entry published to Kafka

**Dependencies:** MongoDB (ApiConfig), Redis (cache, rate limit, health, LB), Kafka (log publishing), axios (HTTP forwarding)

**Internal Workflow:**
1. Extract and validate `x-api-key` header
2. Look up `ApiConfig` from MongoDB by apikey
3. Match request path against configured routes
4. Apply outer rate limit (50 req/min global per key)
5. Apply inner rate limit (per-route configurable limit)
6. Check Redis cache (if enabled for route)
7. Select healthy backend via round-robin load balancer
8. Forward request to selected backend via axios
9. Store response in cache (if enabled)
10. Publish log entry to Kafka
11. Return response to client

## 2. Authentication System (`routes/auth.js`, `middleware/auth.js`)
**Purpose:** User registration, login, and JWT-based request authentication.

**Inputs:** Email/password for signup/signin; Bearer token for authenticated requests

**Outputs:** JWT token (7-day expiry); authenticated user context on requests

**Dependencies:** MongoDB (User collection), bcrypt, jsonwebtoken

## 3. Rate Limiter (`middleware/rateLimit.js`)
**Purpose:** Redis-based request throttling at two levels.

**Inputs:** API key, route path, route-specific limit

**Outputs:** Boolean (true = allowed, false = blocked)

**Dependencies:** Redis (Upstash)

**Internal Workflow:**
1. INCR the rate limit counter key
2. If count is 1, set 60-second expiry
3. If count exceeds limit, return false

## 4. Cache Layer (`middleware/cache.js`)
**Purpose:** Redis-based response caching with configurable TTL.

**Inputs:** Cache key (apiKey + path), data, TTL

**Outputs:** Cached data or null (miss)

**Dependencies:** Redis (Upstash)

## 5. Load Balancer (`utils/loadBalancer.js`)
**Purpose:** Round-robin selection of healthy backend targets.

**Inputs:** API key, list of target URLs, LB counter key

**Outputs:** Selected target URL, or null if all down

**Dependencies:** Redis (health status, counter)

## 6. Health Checker (`utils/healthCheck.js`)
**Purpose:** Periodic pinging of all backend targets to determine health.

**Inputs:** All ApiConfig documents from MongoDB

**Outputs:** Redis entries `health:{apiKey}:{target}` = "UP" or "DOWN"

**Dependencies:** MongoDB (ApiConfig), Redis, axios

## 7. Kafka Producer (`kafka/producer.js`)
**Purpose:** Publish log entries to the `gateway-logs` Kafka topic.

**Inputs:** Log data object

**Outputs:** Kafka message

## 8. Kafka Consumer (`kafka/consumer.js`)
**Purpose:** Consume log entries from Kafka and persist to MongoDB.

**Inputs:** Kafka messages from `gateway-logs` topic

**Outputs:** MongoDB Log documents

## 9. Config Normalizer (`utils/normalizeConfig.js`)
**Purpose:** Sanitize and apply defaults to user-submitted gateway configurations.

**Inputs:** Raw config object

**Outputs:** Clean config with defaults applied

## 10. Frontend Production Server (`frontend/server.js`)
**Purpose:** Serve the built React SPA and proxy API requests to the backend.

**Inputs:** Browser requests

**Outputs:** Static files for SPA routes; proxied API responses

---

# API Documentation

## Backend API (Port 3000)

### Authentication Routes

#### POST `/auth/signup`
**Description:** Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Success Response (200):**
```json
{
  "message": "Signup successful"
}
```

**Error Responses:**
| Status | Body | Condition |
|---|---|---|
| 400 | `{"error": "Missing fields"}` | email or password not provided |
| 400 | `{"error": "User already exists"}` | email already registered |

**Notes:**
- Password is bcrypt-hashed with 10 salt rounds
- If email matches `ADMIN_EMAIL` env var, role is set to `"admin"`, otherwise `"dev"`

---

#### POST `/auth/signin`
**Description:** Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "role": "dev"
}
```

**Error Responses:**
| Status | Body | Condition |
|---|---|---|
| 400 | `{"error": "Invalid credentials"}` | wrong email or password |

---

### Gateway Management Routes (JWT-Protected)
**Required Header:** `Authorization: Bearer <token>`

#### GET `/dev/apis`
**Description:** List all gateway configurations for the authenticated user.

**Success Response (200):**
```json
[
  {
    "apikey": "a1b2c3d4e5",
    "targets": ["https://backend1.example.com"],
    "routes": [
      {
        "path": "/users",
        "cache": true,
        "cacheTTL": 60,
        "rateLimit": 100
      }
    ]
  }
]
```

---

#### GET `/dev/apis/all`
**Description:** List all gateway configurations across all users (admin only).

**Success Response (200):**
```json
[
  {
    "apikey": "a1b2c3d4e5",
    "targets": ["https://backend1.example.com"],
    "routes": [...],
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1"
  }
]
```

**Error Responses:**
| Status | Body | Condition |
|---|---|---|
| 403 | `{"error": "Admin only"}` | requester is not admin |

---

#### POST `/dev/api`
**Description:** Create a new gateway configuration.

**Request Body:**
```json
{
  "targets": ["https://backend1.example.com", "https://backend2.example.com"],
  "routes": [
    {
      "path": "/users",
      "cache": true,
      "cacheTTL": 60,
      "rateLimit": 100
    },
    {
      "path": "/posts",
      "cache": false,
      "cacheTTL": 60,
      "rateLimit": 50
    }
  ]
}
```

**Success Response (200):**
```json
{
  "message": "API created",
  "apikey": "x7k9m2p4q8"
}
```

**Notes:**
- API key is auto-generated via `Math.random().toString(36).substring(2)`
- Config is normalized via `normalizeConfig()` before saving
- Defaults: `cache: false`, `cacheTTL: 60`, `rateLimit: 100`

---

#### GET `/dev/api/:apikey`
**Description:** Get a single gateway configuration by API key.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| apikey | string | The gateway's API key |

**Success Response (200):** Full ApiConfig document

**Error Responses:**
| Status | Body | Condition |
|---|---|---|
| 400 | `{"error": "Missing API key or userId"}` | missing params |
| 404 | `{"error": "API not found or not yours"}` | not found or no ownership |

---

#### PUT `/dev/api/:apikey`
**Description:** Update an existing gateway configuration.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| apikey | string | The gateway's API key |

**Request Body:** Same structure as POST `/dev/api`

**Success Response (200):**
```json
{
  "message": "API updated"
}
```

---

#### DELETE `/dev/api/:apikey`
**Description:** Delete a gateway configuration.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| apikey | string | The gateway's API key |

**Success Response (200):**
```json
{
  "message": "API deleted"
}
```

**Error Responses:**
| Status | Body | Condition |
|---|---|---|
| 404 | `{"error": "API not found or not yours"}` | not found or no ownership |

---

### Log Routes (JWT-Protected)

#### GET `/logs`
**Description:** Get recent log entries (last 50). Dev users see only their own logs; admin sees all.

**Query Parameters:** None

**Success Response (200):**
```json
[
  {
    "apiKey": "a1b2c3d4e5",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "path": "/users",
    "method": "GET",
    "status": 200,
    "cache": "HIT",
    "backend": "https://backend1.example.com",
    "responseTime": 42,
    "ip": "192.168.1.1",
    "error": null,
    "timestamp": "2026-06-15T10:30:00.000Z"
  }
]
```

---

#### GET `/logs/stats`
**Description:** Get aggregate statistics for the authenticated user's logs (or all logs for admin).

**Success Response (200):**
```json
{
  "total": 1520,
  "errors": 45,
  "cacheHits": 890,
  "cacheMiss": 630
}
```

---

#### GET `/logs/users`
**Description:** Get a directory of all users (admin only).

**Success Response (200):**
```json
[
  {
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "dev@example.com"
  }
]
```

**Error Responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `{"error": "Unauthorized"}` | no valid token |
| 403 | `{"error": "Admin only"}` | requester is not admin |

---

### Gateway Proxy Route

#### ALL `/gateway/*`
**Description:** Core proxy endpoint. All HTTP methods accepted.

**Required Header:** `x-api-key: <api_key>`

**Request Flow:**
1. Validate API key exists in header
2. Look up ApiConfig in MongoDB
3. Match request path against configured routes
4. Apply rate limits (outer + inner)
5. Check cache (if enabled)
6. Load balance across healthy backends
7. Forward request and return response

**Error Responses:**
| Status | Body | Condition |
|---|---|---|
| 400 | `{"error": "not api key"}` | missing x-api-key header |
| 401 | `{"error": "not dev found"}` | invalid API key |
| 404 | `{"error": "not found"}` | path not in configured routes |
| 429 | `{"error": "Gateway Rate Limit Exceeded"}` | global rate limit hit |
| 429 | `{"error": "Custom Devs Rate Limit Exceeded"}` | per-route rate limit hit |
| 503 | `{"error": "All backends are down"}` | no healthy backends |
| 500 | `{"error": "Error forwarding request", "detail": "..."}` | backend error |

---

## Frontend Production Server (Port 8080)

### Proxy Routes
All requests matching `/auth/*`, `/dev/*`, `/logs`, `/logs/*` are proxied to the backend server at `BACKEND_URL`.

### Static File Serving
All other routes serve the React SPA from `dist/index.html`.

---

## Frontend Routes (React Router)

| Path | Component | Access | Description |
|---|---|---|---|
| `/` | LandingPage | Public | Marketing page |
| `/login` | LoginPage | Public | Login form |
| `/signup` | SignupPage | Public | Registration form |
| `/dashboard` | DashboardPage | Authenticated | Gateway management |
| `/dashboard/api/:apiKey` | ApiDetailsPage | Authenticated | Per-API analytics |
| `/dashboard/api/:apiKey/logs` | ApiAllLogsPage | Authenticated | Full log viewer |
| `/admin/overview` | AdminOverviewPage | Admin only | Global stats dashboard |
| `/admin/logs` | AdminLogsPage | Admin only | Global log viewer |
| `/admin/user/:userId` | AdminUserPage | Admin only | Per-user drill-down |
| `*` | NotFoundPage | Public | 404 page |

---

# Middleware Analysis

## 1. JWT Authentication Middleware (`middleware/auth.js`)

**Purpose:** Validates JWT tokens and attaches user identity to requests.

**Execution Order:** Applied to `/dev/*` and `/logs*` routes (before route handlers)

**Inputs:** `Authorization: Bearer <token>` header

**Outputs:** `req.user.userId` set on success; 401 error on failure

**Side Effects:** None (stateless)

**Code Flow:**
1. Extract `Authorization` header
2. Split to get token after "Bearer "
3. Verify token with `jwt.verify()`
4. Extract `userId` from decoded payload
5. Set `req.user = { userId }`
6. Call `next()`

## 2. Cache Middleware (`middleware/cache.js`)

**Purpose:** Redis-based get/set operations for response caching.

**Execution Order:** Called inline within gateway route handler (not Express middleware)

**Inputs:** Cache key (string), data (object), TTL (number, seconds)

**Outputs:** `getCache()` returns parsed JSON or null; `setCache()` stores data

**Side Effects:** Redis write operations

**Key Format:** `cache:{apiKey}:{path}`

## 3. Rate Limit Middleware (`middleware/rateLimit.js`)

**Purpose:** Redis-based sliding window rate limiting at two levels.

**Execution Order:** Called inline within gateway route handler (not Express middleware)

**Inputs:** API key, route path, route limit

**Outputs:** Boolean (true = allowed, false = blocked)

**Side Effects:** Redis INCR + EXPIRE operations

**Key Patterns:**
- Outer: `ratelimit:{apiKey}` (50 req/min, hardcoded)
- Inner: `ratelimit:{apiKey}:{path}` (configurable per route)

**Algorithm:**
1. INCR the counter key
2. If count === 1, set EXPIRE 60s
3. If count > limit, return false

## 4. JSON Body Parser

**Purpose:** Parse JSON request bodies.

**Execution Order:** Global middleware (`app.use(express.json())`)

**Inputs:** Request with `Content-Type: application/json`

**Outputs:** Parsed `req.body`

---

# Authentication & Authorization

## Authentication Approach
- **Mechanism:** JWT (JSON Web Tokens)
- **Token Location:** `Authorization: Bearer <token>` header
- **Token Lifetime:** 7 days
- **Signing Algorithm:** HMAC (HS256, default for `jsonwebtoken`)
- **Secret Key:** Stored in `JWT_SECRET` environment variable

## Authorization Model
- **Role-Based Access Control (RBAC):** Two roles - `dev` and `admin`
- **Role Assignment:** Determined at signup by email match against `ADMIN_EMAIL`
- **Ownership Enforcement:** Dev users can only access their own resources (ApiConfig, Logs)
- **Admin Bypass:** Admin users can access/modify any user's resources

## Security Mechanisms
1. **Password Hashing:** bcrypt with 10 salt rounds
2. **JWT Verification:** Token signature and expiry checked on every protected request
3. **Ownership Checks:** Dev routes verify `req.user.userId === config.userId`
4. **Admin Checks:** Admin-only routes query MongoDB for requester's role

## Weaknesses
1. **Weak JWT Secret:** `dekusecretkey` is trivially guessable - should be a cryptographically random string
2. **No Token Revocation:** Compromised tokens remain valid for 7 days
3. **No CORS Configuration:** Backend has no CORS headers, may cause issues in production
4. **API Key Generation:** `Math.random().toString(36).substring(2)` is not cryptographically secure
5. **No Input Validation:** Beyond `normalizeConfig()`, there is minimal input sanitization
6. **Admin Role by Email:** Single email match is fragile; should support multiple admins
7. **No Rate Limiting on Auth Routes:** `/auth/signup` and `/auth/signin` have no rate limiting
8. **No HTTPS Enforcement:** Backend does not redirect HTTP to HTTPS

## Future Improvements
- Use cryptographically secure API key generation (e.g., `crypto.randomUUID()`)
- Implement token refresh/revocation (e.g., Redis-based blocklist)
- Add CORS configuration
- Add rate limiting on auth endpoints
- Add input validation library (e.g., Joi, Zod)
- Support multiple admin users via database
- Enforce HTTPS in production

---

# Database Design

## MongoDB Collections

### 1. `users` Collection

**Schema:** `User.js`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Primary key |
| `email` | String | `unique: true` | User email address |
| `password` | String | | bcrypt-hashed password |
| `role` | String | `default: "dev"` | User role: "dev" or "admin" |
| `__v` | Number | Auto-generated | Mongoose version key |

**Indexes:**
- Unique index on `email` (automatic from `unique: true`)

**Relationships:** Referenced by `ApiConfig.userId` and `Log.userId`

---

### 2. `apiconfigs` Collection

**Schema:** `ApiConfig.js`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Primary key |
| `apikey` | String | | Randomly generated gateway API key |
| `userId` | String | | Owner's MongoDB `_id` (reference to User) |
| `targets` | [String] | | Array of backend target URLs |
| `routes` | [routeSchema] | | Embedded array of route configurations |
| `__v` | Number | Auto-generated | Mongoose version key |

**Embedded `routeSchema`:**

| Field | Type | Description |
|---|---|---|
| `path` | String | Route path (e.g., "/users") |
| `cache` | Boolean | Whether caching is enabled |
| `cacheTTL` | Number | Cache time-to-live in seconds |
| `rateLimit` | Number | Max requests per minute for this route |

**Indexes:** None explicit (queries by `apikey` and `userId`)

**Relationships:** `userId` references `users._id`

---

### 3. `logs` Collection

**Schema:** `Log.js`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Primary key |
| `apiKey` | String | | API key used in the request |
| `userId` | String | | Owner of the API key |
| `path` | String | | Request path |
| `method` | String | | HTTP method |
| `status` | Number | | Response status code |
| `cache` | String | | "HIT" or "MISS" |
| `backend` | String | | Selected backend server URL |
| `responseTime` | Number | | Latency in milliseconds |
| `ip` | String | | Client IP address |
| `error` | String | | Error message (if any) |
| `timestamp` | Date | | When the request occurred |
| `__v` | Number | Auto-generated | Mongoose version key |

**Indexes:** None explicit (queries filter by `userId`, sort by `timestamp`)

**Relationships:** `userId` references `users._id`; `apiKey` references `apiconfigs.apikey`

## Entity Relationship Diagram

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        String email UK
        String password
        String role
    }

    APICONFIG {
        ObjectId _id PK
        String apikey
        String userId FK
        String[] targets
        Route[] routes
    }

    ROUTE {
        String path
        Boolean cache
        Number cacheTTL
        Number rateLimit
    }

    LOG {
        ObjectId _id PK
        String apiKey FK
        String userId FK
        String path
        String method
        Number status
        String cache
        String backend
        Number responseTime
        String ip
        String error
        Date timestamp
    }

    USER ||--o{ APICONFIG : "owns"
    USER ||--o{ LOG : "generates"
    APICONFIG ||--o{ LOG : "tracked_by"
    APICONFIG ||--o{ ROUTE : "contains"
```

---

# Caching Strategy

## Redis Usage
- **Provider:** Upstash (cloud-hosted, REST-based, TLS-encrypted)
- **Connection:** ioredis via `rediss://` protocol
- **Client Instances:** 3 separate Redis clients instantiated (cache.js, rateLimit.js, loadBalancer.js, healthCheck.js) - all connecting to the same Upstash instance

## Cache Implementation

### Response Caching
- **Key Format:** `cache:{apiKey}:{path}`
- **Storage:** `SET key JSON.stringify(data) EX ttl`
- **Retrieval:** `GET key` then `JSON.parse`
- **TTL:** Configurable per route (default: 60 seconds)
- **Scope:** Per API key + path combination
- **Enabled:** Only when `route.cache === true`

### Cache Flow
1. **Cache HIT:** Response served directly from Redis, no backend call
2. **Cache MISS:** Backend called, response stored in Redis before returning
3. **Cache Invalidation:** Automatic via TTL expiry (no manual invalidation)

## In-Memory Caching
- **Not implemented.** All caching is via Redis.

## Cache Keys
| Key Pattern | Purpose | TTL |
|---|---|---|
| `cache:{apiKey}:{path}` | Response cache | Per-route configurable (default 60s) |
| `ratelimit:{apiKey}` | Outer rate limit counter | 60s |
| `ratelimit:{apiKey}:{path}` | Inner rate limit counter | 60s |
| `health:{apiKey}:{target}` | Backend health status | No expiry (persisted) |
| `lb:{apiKey}` | Load balancer counter | 60s |

## TTL Policies
- Response cache: Per-route, user-configurable (default 60s)
- Rate limit counters: 60 seconds (hardcoded)
- Health status: Persistent (no TTL, overwritten every 15 minutes)
- LB counter: 60 seconds

---

# Rate Limiting

## Current Implementation
Two-tier rate limiting using Redis atomic INCR + EXPIRE pattern.

### Outer Rate Limit (Global)
- **Key:** `ratelimit:{apiKey}`
- **Limit:** 50 requests per 60-second window (hardcoded)
- **Scope:** Applies to ALL requests for a given API key regardless of route
- **Algorithm:** Fixed window counter

### Inner Rate Limit (Per-Route)
- **Key:** `ratelimit:{apiKey}:{path}`
- **Limit:** Configurable per route (default: 100, set by developer)
- **Scope:** Applies to requests on a specific route path
- **Algorithm:** Fixed window counter

## Algorithm Details
```
1. INCR key
2. If count === 1: EXPIRE key 60
3. If count > limit: return false (blocked)
4. Else: return true (allowed)
```

## Configuration
- Outer limit: Hardcoded at 50 req/min
- Inner limit: Configurable per route via `rateLimit` field in route schema (default 100)
- Window: 60 seconds (hardcoded for both)

## Limitations
1. **Fixed window:** Burst traffic at window boundaries can exceed the intended rate
2. **No sliding window:** Counter resets completely at window boundary
3. **No per-IP limiting:** Only per-API-key and per-route limiting
4. **Hardcoded outer limit:** Cannot be configured without code changes
5. **No rate limit headers:** Response does not include `X-RateLimit-*` headers
6. **No retry-after header:** Blocked responses do not include when to retry

---

# Load Balancing

## Current Implementation
Health-aware round-robin load balancer using Redis for state management.

## Routing Strategy
- **Algorithm:** Round-robin across healthy targets
- **Health Filtering:** Only targets with `health:{apiKey}:{target}` = "UP" in Redis are considered
- **Counter:** Redis INCR at `lb:{apiKey}` with 60s expiry
- **Selection:** `healthyTargets[counter % healthyTargets.length]`

## Service Discovery
- **Static configuration:** Backend targets are defined at gateway creation time
- **No dynamic discovery:** Targets are stored in MongoDB and managed via the dashboard

## Health Check
- **Interval:** Every 15 minutes via `setInterval(healthChk, 15 * 60 * 1000)`
- **Also runs on:** Server startup
- **Method:** HTTP GET to each target URL
- **Status:** "UP" if status 200, "DOWN" otherwise
- **Storage:** Redis key `health:{apiKey}:{target}`

## Failover Mechanisms
1. Health checker marks backends as DOWN if they fail to respond with 200
2. Load balancer filters out DOWN targets before selection
3. If all backends are DOWN, returns 503 error to client
4. Health status is rechecked every 15 minutes

---

# Logging & Monitoring

## Logging Architecture

### Request Logging (Async via Kafka)
Every gateway request generates a log entry that is:
1. Published to Kafka topic `gateway-logs` (producer)
2. Consumed by the log consumer
3. Persisted to MongoDB `logs` collection

### Log Entry Fields
```javascript
{
  apiKey: String,      // API key used
  userId: String,      // Owner of the API key
  path: String,        // Request path
  method: String,      // HTTP method
  status: Number,      // Response status code
  cache: String,       // "HIT" or "MISS"
  backend: String,     // Selected backend URL
  responseTime: Number, // Latency in ms
  ip: String,          // Client IP
  error: String,       // Error message (if any)
  timestamp: Date      // When the request occurred
}
```

### Log Levels
- **Console logs:** Used for operational messages (Kafka connection, health check completion, errors)
- **No structured logging library** (e.g., Winston, Pino) is used
- **No log levels** (info, warn, error) are implemented

## Monitoring
- **No monitoring integrations** (e.g., Prometheus, Grafana, Datadog)
- **No metrics collection** beyond the stats endpoint (total, errors, cacheHits, cacheMiss)
- **No alerting mechanisms**
- **No health check endpoint** for the gateway itself

---

# Error Handling

## Error Architecture

### Backend
- **Route-level try/catch:** The gateway route handler wraps the entire pipeline in a try/catch
- **Error responses:** JSON `{ error: "message" }` format
- **Kafka error logging:** Errors are published to Kafka with the error message
- **Console logging:** Errors are logged to console for debugging

### Frontend
- **Service-level try/catch:** `apiClient.js` throws errors for non-2xx responses
- **Page-level try/catch:** Each page component catches errors and sets `error` state
- **Error display:** Error messages rendered in the UI with `error-text` CSS class

## Custom Error Classes
- **None implemented.** All errors are standard JavaScript Error objects or string messages.

## Global Handlers
- **Uncaught exceptions:** Not handled (no `process.on('uncaughtException')`)
- **Unhandled promise rejections:** Not handled (no `process.on('unhandledRejection')`)
- **Express error middleware:** Not implemented (no `(err, req, res, next)` handler)

## Retry Strategies
- **None implemented.** Failed requests are not retried.

---

# Environment Variables

## Backend

| Variable | Required | Purpose | Example Value |
|---|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis connection URL | `https://valid-frog-74056.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis auth token | `gQAAAAAAASFIA...` |
| `MONGO_URI` | Yes | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/gatewayLogs?...` |
| `ADMIN_EMAIL` | Yes | Email that gets admin role on signup | `admin@example.com` |
| `JWT_SECRET` | Yes | Secret key for JWT signing/verification | `dekusecretkey` |

## Frontend

| Variable | Required | Purpose | Example Value |
|---|---|---|---|
| `PORT` | No | Frontend server port (default: 8080) | `8080` |
| `BACKEND_URL` | No | Backend API URL to proxy to (default: http://localhost:3000) | `http://localhost:3000` |

---

# Configuration Files

## `Backend/package.json`
**Purpose:** Defines backend Node.js package with Express 5, MongoDB, Redis, Kafka dependencies.
**Notable:** Uses Express 5 (major version), Mongoose 9, dotenv 17. No devDependencies or test framework configured.

## `frontend/package.json`
**Purpose:** Defines frontend React + Vite package with production Express server.
**Notable:** Express is a production dependency (used for `server.js`). No test framework configured.

## `frontend/vite.config.js`
**Purpose:** Vite build configuration with React plugin.
**Notable:** Uses CommonJS `require()` syntax.

## `.gitignore`
**Purpose:** Ignores `node_modules/` and all `.env` files across the repository.
**Patterns:** `**/node_modules/`, `**/.env`, `**/.env.*`

## `Backend/.env`
**Purpose:** Environment variables for Redis, MongoDB, JWT, and admin email.
**Note:** This file contains actual credentials and should not be committed to version control.

## `frontend/server.js`
**Purpose:** Production Express server that serves the built React SPA and proxies API requests to the backend.
**Configuration:** Port from `PORT` env (default 8080), backend URL from `BACKEND_URL` env.

---

# Infrastructure & Deployment

## Deployment Process
- **Current Status:** Phase 9 (Deployment) is pending
- **Intended Provider:** Render or AWS (per README)
- **No CI/CD configuration** exists (no GitHub Actions, Dockerfile, etc.)

## Build Process

### Frontend
```bash
cd frontend
npm install
npx vite build    # Outputs to frontend/dist/
```

### Backend
```bash
cd Backend
npm install
node src/index.js  # Starts on port 3000
```

## Runtime Architecture

```mermaid
graph TD
    subgraph "Production Environment"
        BROWSER[Browser] -->|HTTPS| FE[Frontend Server :8080]
        FE -->|Static Files| BROWSER
        FE -->|Proxy API| BE[Backend Server :3000]
        BE -->|Proxy Client Request| DB_BE[Developer Backends]
        BE -->|Read/Write| MONGO[(MongoDB Atlas)]
        BE -->|Read/Write| REDIS[(Redis / Upstash)]
        BE -->|Publish| KAFKA[Kafka Broker]
        KAFKA -->|Consume| CONSUMER[Log Consumer]
        CONSUMER -->|Write| MONGO
        HC[Health Checker] -->|Ping every 15min| DB_BE
        HC -->|Write| REDIS
    end
```

## Networking Flow
1. **Client to Frontend:** Browser sends requests to frontend server (port 8080)
2. **Frontend to Backend:** Frontend server proxies `/auth/*`, `/dev/*`, `/logs/*` to backend (port 3000)
3. **Backend to MongoDB:** Direct connection to MongoDB Atlas cluster
4. **Backend to Redis:** TLS connection to Upstash Redis
5. **Backend to Kafka:** Local connection to Kafka broker (localhost:9092)
6. **Backend to Developer Backends:** HTTP requests to configured target URLs
7. **Health Checker to Developer Backends:** HTTP GET requests every 15 minutes

---

# Security Review

## Security Features Implemented
1. **bcrypt password hashing** (10 salt rounds)
2. **JWT authentication** with 7-day expiry
3. **Ownership checks** on dev routes (userId verification)
4. **Role-based access control** (dev vs admin)
5. **Rate limiting** (prevents abuse)
6. **IP logging** on all requests

## Vulnerabilities Identified

### Critical
1. **Hardcoded JWT secret** (`dekusecretkey`) - trivially guessable, allows token forgery
2. **Credentials committed to repo** - `.env` file contains actual database passwords and tokens

### High
3. **No CORS configuration** - backend accepts requests from any origin
4. **Insecure API key generation** - `Math.random()` is not cryptographically secure
5. **No rate limiting on auth endpoints** - brute force attacks possible on login/signup

### Medium
6. **No HTTPS enforcement** - traffic can be intercepted
7. **No input validation** - minimal sanitization beyond normalizeConfig
8. **No token revocation** - compromised tokens valid for 7 days
9. **Error details exposed** - backend error messages returned to client (`error.message`)

### Low
10. **No security headers** - no helmet.js or equivalent
11. **No request size limits** - Express JSON parser has no limit configured on backend
12. **No Content Security Policy** - frontend vulnerable to XSS

## Missing Protections
- Helmet.js for security headers
- CORS configuration
- CSRF protection
- Input validation library (Joi, Zod, express-validator)
- Request timeout middleware
- API key rotation mechanism
- Audit logging for admin actions

---

# Feature Inventory

## 1. User Authentication
- **Description:** Email/password signup and login with JWT tokens
- **Status:** Implemented
- **Related Files:** `Backend/src/routes/auth.js`, `Backend/src/middleware/auth.js`, `frontend/src/services/auth.js`, `frontend/src/context/AuthContext.jsx`, `frontend/src/pages/LoginPage.jsx`, `frontend/src/pages/SignupPage.jsx`
- **Dependencies:** bcrypt, jsonwebtoken, MongoDB User model

## 2. Gateway Configuration Management
- **Description:** CRUD operations for API gateway configurations (targets + routes)
- **Status:** Implemented
- **Related Files:** `Backend/src/routes/dev.js`, `Backend/src/models/ApiConfig.js`, `frontend/src/services/gateway.js`, `frontend/src/pages/DashboardPage.jsx`, `frontend/src/components/gateway/ApiWizardModal.jsx`
- **Dependencies:** MongoDB ApiConfig model, normalizeConfig utility

## 3. API Key Authentication
- **Description:** Auto-generated API keys for gateway proxy authentication
- **Status:** Implemented
- **Related Files:** `Backend/src/routes/gateway.js`, `Backend/src/routes/dev.js`
- **Dependencies:** MongoDB ApiConfig model

## 4. Rate Limiting
- **Description:** Two-tier Redis-based rate limiting (global + per-route)
- **Status:** Implemented
- **Related Files:** `Backend/src/middleware/rateLimit.js`, `Backend/src/routes/gateway.js`
- **Dependencies:** Redis (Upstash)

## 5. Response Caching
- **Description:** Redis-based response caching with configurable TTL per route
- **Status:** Implemented
- **Related Files:** `Backend/src/middleware/cache.js`, `Backend/src/routes/gateway.js`
- **Dependencies:** Redis (Upstash)

## 6. Load Balancing
- **Description:** Health-aware round-robin load balancing across multiple backend targets
- **Status:** Implemented
- **Related Files:** `Backend/src/utils/loadBalancer.js`, `Backend/src/routes/gateway.js`
- **Dependencies:** Redis (Upstash), health check system

## 7. Health Checking
- **Description:** Periodic pinging of backend targets to determine health status
- **Status:** Implemented
- **Related Files:** `Backend/src/utils/healthCheck.js`, `Backend/src/index.js`
- **Dependencies:** MongoDB ApiConfig model, Redis, axios

## 8. Async Log Pipeline
- **Description:** Kafka-based async log ingestion with MongoDB persistence
- **Status:** Implemented
- **Related Files:** `Backend/src/kafka/producer.js`, `Backend/src/kafka/consumer.js`, `Backend/src/models/Log.js`
- **Dependencies:** KafkaJS, MongoDB

## 9. Request Logging
- **Description:** Every gateway request is logged with latency, cache status, backend, and status code
- **Status:** Implemented
- **Related Files:** `Backend/src/routes/gateway.js`, `Backend/src/models/Log.js`
- **Dependencies:** Kafka producer, MongoDB Log model

## 10. Dashboard
- **Description:** React SPA with gateway management, analytics charts, and log viewing
- **Status:** Implemented
- **Related Files:** `frontend/src/pages/*`, `frontend/src/components/*`
- **Dependencies:** React, Recharts, React Router

## 11. Admin Panel
- **Description:** Global stats, user directory, per-user drill-down, global log viewer
- **Status:** Implemented
- **Related Files:** `frontend/src/pages/AdminOverviewPage.jsx`, `frontend/src/pages/AdminLogsPage.jsx`, `frontend/src/pages/AdminUserPage.jsx`
- **Dependencies:** Backend admin-only endpoints

## 12. Usage Analytics
- **Description:** Line chart showing requests per minute over the last 60 minutes
- **Status:** Implemented
- **Related Files:** `frontend/src/components/charts/UsageChart.jsx`, `frontend/src/pages/ApiDetailsPage.jsx`
- **Dependencies:** Recharts

## 13. Multi-Step Wizard
- **Description:** 4-step modal for creating/editing gateway configurations with educational explainers
- **Status:** Implemented
- **Related Files:** `frontend/src/components/gateway/ApiWizardModal.jsx`
- **Dependencies:** Modal, InputField, Toggle, Button components

## 14. Frontend Production Server
- **Description:** Express server that serves the built SPA and proxies API requests
- **Status:** Implemented
- **Related Files:** `frontend/server.js`
- **Dependencies:** Express, Node.js fetch

---

# Business Logic Deep Dive

## User Journey

### Developer Flow
1. **Landing Page** (`/`) - Learn about the product, features, and capabilities
2. **Sign Up** (`/signup`) - Create account with email/password
3. **Dashboard** (`/dashboard`) - View summary stats (total gateways, routes, backends)
4. **Create Gateway** (ApiWizardModal) - 4-step wizard:
   - Step 1: Enter backend target URLs
   - Step 2: Define routes (path, cache toggle, TTL, rate limit)
   - Step 3: Review rate limiting explainer
   - Step 4: Review and submit
5. **Get API Key** - Auto-generated key displayed on dashboard
6. **Configure Client** - Point client requests to `gateway/{path}` with `x-api-key` header
7. **Monitor** - View logs, charts, cache hit/miss rates per gateway

### Admin Flow
1. **Admin Overview** (`/admin/overview`) - Global stats, traffic chart, user directory
2. **User Drill-Down** (`/admin/user/:userId`) - Per-user API activity, logs, stats
3. **Global Logs** (`/admin/logs`) - All logs across all users
4. **Manage Users** - Delete any user's gateway configurations

## Internal Processing

### Gateway Request Processing
1. Extract `x-api-key` header
2. MongoDB lookup: `ApiConfig.findOne({ apikey })`
3. Route matching: `config.routes.find(r => r.path === req.path)`
4. Outer rate limit: `Redis.INCR(ratelimit:{apiKey})`
5. Inner rate limit: `Redis.INCR(ratelimit:{apiKey}:{path})`
6. Cache check: `Redis.GET(cache:{apiKey}:{path})`
7. Health filtering: Check `Redis.GET(health:{apiKey}:{target})` for each target
8. Round-robin: `healthyTargets[counter % length]`
9. Forward: `axios({ method, url, headers, data, params })`
10. Cache store: `Redis.SET(cache:{apiKey}:{path}, data, EX, ttl)`
11. Log publish: Kafka producer sends to `gateway-logs` topic

### Data Transformations
1. **Config normalization:** Raw user input → sanitized with defaults (cache: false, cacheTTL: 60, rateLimit: 100)
2. **Log bucketing (frontend):** Raw logs → grouped into 1-minute time buckets for charting
3. **API summarization (admin):** Raw logs → grouped by apiKey with request/error/route counts
4. **User grouping (admin):** Raw logs → grouped by userId with activity summaries

---

# Technical Debt

## Code Smells
1. **Multiple Redis client instances:** 3-4 separate Redis clients created in different files, all connecting to the same Upstash instance. Should be a single shared client.
2. **Hardcoded values:** Outer rate limit (50), health check interval (15 min), log limit (50) are all hardcoded.
3. **Duplicated route display logic:** Route display in `RouteSettingsModal.jsx` and `ApiDetailsPage.jsx` is nearly identical.
4. **Duplicated stats computation:** Stats (total/errors/cacheHits/cacheMiss) computed in `ApiDetailsPage`, `AdminUserPage`, and `AdminOverviewPage`.
5. **No error boundaries:** React error boundaries are not implemented.
6. **Brute-force refresh:** `navigate(0)` causes full page remount instead of data re-fetch.

## Duplication
- Route display JSX duplicated across 2 files
- Stats computation duplicated across 3 files
- Auth shell layout duplicated conceptually (consistent but not extracted)
- `getRequester()` in logs.js and `isAdminRequester()` in dev.js do similar user lookup

## Tight Coupling
- Gateway route handler directly depends on MongoDB, Redis, Kafka, and axios - no abstraction layer
- Frontend services directly call `apiClient.request()` - no caching or deduplication layer
- Admin role check is tightly coupled to email string comparison

## Scalability Concerns
1. **No pagination:** Log queries return up to 50 entries; admin queries may return thousands
2. **Client-side stats:** All stats are computed from fetched logs in memory - won't scale
3. **Polling:** Dashboard polls every 15 seconds - inefficient at scale
4. **Single Kafka partition assumed:** No partitioning strategy for log topics
5. **No connection pooling:** MongoDB connections not explicitly pooled (Mongoose default helps)

## Performance Bottlenecks
1. **Sequential Redis calls:** Health check and load balancer make N sequential Redis calls per request
2. **Synchronous MongoDB lookups:** ApiConfig lookup on every gateway request (no caching)
3. **No query optimization:** Log queries have no indexes for common filter patterns

---

# Scalability Analysis

## Current Scalability Limits
- **Single server:** Backend runs as a single Node.js process
- **Single MongoDB instance:** Atlas free tier with replica set
- **Redis limits:** Upstash REST-based Redis with per-command latency
- **Kafka:** Single broker at localhost
- **No horizontal scaling:** No load balancer in front of the gateway itself

## Horizontal Scaling Readiness
- **Stateful components:** JWT is stateless (good), but Redis keys are global (good for shared state)
- **Gateway servers:** Could be horizontally scaled behind a load balancer since all state is in Redis/MongoDB
- **Log consumer:** Kafka consumer group allows multiple consumers for parallel processing
- **Frontend:** Stateless static files, trivially scalable

## Vertical Scaling Readiness
- **Node.js single-threaded:** CPU-intensive operations would block the event loop
- **MongoDB Atlas:** Can be scaled up (more RAM, CPU, storage)
- **Redis (Upstash):** Can be scaled via Upstash dashboard

## Recommended Improvements
1. Add a load balancer (nginx, HAProxy) in front of multiple gateway instances
2. Implement MongoDB indexes for log queries
3. Add Redis connection pooling
4. Implement request queuing for backend calls
5. Add caching for ApiConfig lookups (short TTL in Redis)
6. Implement cursor-based pagination for log queries
7. Use WebSocket or SSE for real-time dashboard updates instead of polling

---

# Future Roadmap

## Immediate Improvements (1-2 weeks)
1. Fix JWT secret - use cryptographically random string
2. Add CORS configuration
3. Add rate limiting on auth endpoints
4. Add input validation (Joi/Zod)
5. Add error boundaries in React
6. Fix video file path typos in ApiWizardModal
7. Add MongoDB indexes for log queries
8. Share single Redis client instance across modules

## Medium-Term Improvements (1-3 months)
1. Implement token refresh and revocation
2. Add pagination and cursor-based log queries
3. Implement WebSocket for real-time dashboard updates
4. Add structured logging (Winston/Pino)
5. Add API key rotation mechanism
6. Implement request timeout middleware
7. Add health check endpoint for the gateway itself
8. Implement admin audit logging
9. Add Helm chart or Docker Compose for deployment
10. Set up CI/CD pipeline

## Long-Term Architecture Evolution (3-6 months)
1. Microservices decomposition (auth service, gateway service, analytics service)
2. Kubernetes deployment with auto-scaling
3. Distributed tracing (OpenTelemetry)
4. Circuit breaker pattern for backend calls
5. GraphQL API for dashboard queries
6. Multi-tenant isolation
7. Plugin system for custom middleware
8. Webhook support for event notifications
9. Admin role management UI
10. API documentation portal for gateway users

---

# Resume Worthy Highlights

## 1. End-to-End API Gateway Implementation
Built a complete API gateway from scratch handling the full request lifecycle: authentication, rate limiting, caching, load balancing, and logging. This demonstrates deep understanding of distributed systems and network programming.

**Interview Talking Point:** "I designed a middleware pipeline that processes every request through 8 stages - API key validation, route matching, two-tier rate limiting, cache lookup, health-aware load balancing, request forwarding, and async logging via Kafka."

## 2. Event-Driven Log Pipeline
Implemented a Kafka-based async log pipeline that decouples request processing from log persistence. The producer publishes logs non-blocking while the consumer persists them independently.

**Interview Talking Point:** "I used Kafka to decouple the critical request path from log persistence, ensuring that logging failures never impact request latency."

## 3. Health-Aware Load Balancing
Designed a load balancer that filters unhealthy backends using Redis-stored health status and distributes traffic via round-robin with automatic failover.

**Interview Talking Point:** "The load balancer uses Redis-backed health checks running every 15 minutes to filter out unhealthy backends before applying round-robin selection, with automatic failover returning 503 when all backends are down."

## 4. Multi-Tenant Dashboard with Admin Oversight
Built a React dashboard with role-based access: developers manage their own gateways while admins get a "God View" of all platform activity with per-user drill-down.

**Interview Talking Point:** "I implemented a multi-tenant system with two distinct views - developers see only their own resources with ownership enforcement, while admins get platform-wide visibility with user drill-down capabilities."

## 5. Full-Stack Monorepo Architecture
Delivered a complete full-stack application with React frontend, Express backend, MongoDB, Redis, and Kafka - demonstrating proficiency across the entire stack.

**Interview Talking Point:** "I architected a full-stack system with a React SPA frontend, Express 5 backend, MongoDB for persistence, Redis for caching and rate limiting, and Kafka for async log processing."

## 6. Per-Route Granular Configuration
Enabled developers to configure caching, TTL, and rate limits on a per-route basis rather than per-API, providing fine-grained control over traffic management.

**Interview Talking Point:** "The system supports per-route configuration granularity - each path on the same API gateway can have independent caching, TTL, and rate limit settings."

## 7. Production-Ready Frontend Serving
Implemented a production Express server that serves the built React SPA and transparently proxies API requests to the backend, enabling single-port deployment.

**Interview Talking Point:** "I built a production server that serves static SPA assets and proxies API routes to the backend, enabling single-port deployment for production environments."

---

# File-by-File Analysis

## Backend Files

### `Backend/src/index.js` (35 lines)
- **Purpose:** Server entry point. Mounts routes, starts health checks, connects Kafka producer.
- **Key Functions:** None (main script)
- **Dependencies:** dotenv, express, routes/auth, routes/dev, routes/logs, routes/gateway, middleware/auth, kafka/producer, kafka/consumer, utils/healthCheck
- **Notes:** Binds to `0.0.0.0:3000`. Health checks run every 15 minutes via setInterval.

### `Backend/src/dummy.js` (15 lines)
- **Purpose:** Test utility that starts 3 Express servers on ports 5001-5003 for load balancing testing.
- **Key Functions:** None (main script)
- **Dependencies:** express
- **Notes:** Not used in production. Each server responds with a different message.

### `Backend/src/config/db.js` (34 lines)
- **Purpose:** Legacy hardcoded database with 3 test API configurations.
- **Key Functions:** Exports `db` array
- **Dependencies:** None
- **Notes:** Dead code - not imported or used at runtime. Contains test data with jsonplaceholder.typicode.com and localhost backends.

### `Backend/src/config/mongo.js` (8 lines)
- **Purpose:** MongoDB connection helper using Mongoose.
- **Key Functions:** `connectDB()` - connects to MongoDB using `MONGO_URI` env var
- **Dependencies:** mongoose
- **Notes:** Used by the Kafka consumer to establish MongoDB connection.

### `Backend/src/kafka/producer.js` (29 lines)
- **Purpose:** Kafka producer that publishes log entries to the `gateway-logs` topic.
- **Key Functions:** `connectProducer()` - connects the producer; `publishLog(logData)` - sends a log message
- **Dependencies:** kafkajs
- **Notes:** Client ID: `api-gateway`. Broker: `localhost:9092`. Errors are caught and logged to console.

### `Backend/src/kafka/consumer.js` (33 lines)
- **Purpose:** Kafka consumer that reads log entries and persists them to MongoDB.
- **Key Functions:** `startConsumer()` - connects to Kafka, subscribes, and processes messages
- **Dependencies:** kafkajs, config/mongo, models/Log
- **Notes:** Client ID: `log-consumer`. Group ID: `gateway-log-group`. Subscribes from latest offset. Self-executing on import.

### `Backend/src/middleware/auth.js` (27 lines)
- **Purpose:** JWT authentication middleware that verifies Bearer tokens.
- **Key Functions:** `authMiddleware(req, res, next)` - extracts and verifies JWT
- **Dependencies:** jsonwebtoken
- **Notes:** Sets `req.user.userId` on success. Returns 401 on missing/invalid token.

### `Backend/src/middleware/cache.js` (19 lines)
- **Purpose:** Redis-based cache get/set operations.
- **Key Functions:** `getCache(key)` - retrieves and JSON-parses cached data; `setCache(key, data, ttl)` - stores data with TTL
- **Dependencies:** ioredis
- **Notes:** Creates its own Redis client instance. JSON.parse wrapped in try/catch for non-JSON values.

### `Backend/src/middleware/rateLimit.js` (34 lines)
- **Purpose:** Redis-based rate limiting at two levels (outer + inner).
- **Key Functions:** `OuterRateLimit(api)` - global limit (50/min); `InnerRateLimit(api, path, limit)` - per-route limit
- **Dependencies:** ioredis
- **Notes:** Creates its own Redis client instance. Uses INCR + EXPIRE pattern with 60s window.

### `Backend/src/models/ApiConfig.js` (17 lines)
- **Purpose:** Mongoose schema for gateway configurations.
- **Key Exports:** `ApiConfig` model
- **Fields:** apikey, userId, targets[], routes[] (embedded routeSchema)
- **Notes:** No indexes defined. No validation beyond type.

### `Backend/src/models/Log.js` (17 lines)
- **Purpose:** Mongoose schema for request log entries.
- **Key Exports:** `Log` model
- **Fields:** apiKey, userId, path, method, status, cache, backend, responseTime, ip, error, timestamp
- **Notes:** No indexes defined. Timestamp is user-provided (from Date.now()).

### `Backend/src/models/User.js` (9 lines)
- **Purpose:** Mongoose schema for user accounts.
- **Key Exports:** `User` model
- **Fields:** email (unique), password, role (default: "dev")
- **Notes:** Unique index on email. No additional validation.

### `Backend/src/routes/auth.js` (73 lines)
- **Purpose:** User registration and login endpoints.
- **Key Functions:** POST `/signup` - creates user with bcrypt hash; POST `/signin` - authenticates and returns JWT
- **Dependencies:** bcrypt, jsonwebtoken, models/User
- **Notes:** Admin role assigned by email match. JWT expires in 7 days. No input validation beyond presence check.

### `Backend/src/routes/dev.js` (160 lines)
- **Purpose:** CRUD operations for gateway configurations (JWT-protected).
- **Key Functions:** `isAdminRequester(req)` - checks admin role; GET `/apis` - list user's APIs; GET `/apis/all` - admin list all; POST `/api` - create; GET `/api/:apikey` - get one; PUT `/api/:apikey` - update; DELETE `/api/:apikey` - delete
- **Dependencies:** models/ApiConfig, models/User, utils/normalizeConfig
- **Notes:** Ownership checks enforce dev users can only access their own resources. Admin can access all.

### `Backend/src/routes/gateway.js` (206 lines)
- **Purpose:** Core gateway proxy logic - processes every client API request.
- **Key Functions:** Single route handler for ALL `/gateway/*` requests
- **Dependencies:** middleware/rateLimit, middleware/cache, utils/loadBalancer, kafka/producer, models/ApiConfig, axios
- **Notes:** The most critical file in the system. Handles the full request pipeline (10 steps).

### `Backend/src/routes/logs.js` (104 lines)
- **Purpose:** Log retrieval and statistics endpoints (JWT-protected).
- **Key Functions:** `getRequester(req)` - fetches user with role; GET `/` - recent logs (50 limit); GET `/stats` - aggregate stats; GET `/users` - user directory (admin only)
- **Dependencies:** models/Log, models/User
- **Notes:** Dev users see only their logs; admin sees all. Stats computed via countDocuments queries.

### `Backend/src/utils/healthCheck.js` (31 lines)
- **Purpose:** Periodic health checking of all backend targets.
- **Key Functions:** `healthChk()` - pings all targets, stores UP/DOWN in Redis
- **Dependencies:** models/ApiConfig, axios, ioredis
- **Notes:** Creates its own Redis client instance. HTTP GET to each target. Status stored at `health:{apiKey}:{target}`.

### `Backend/src/utils/loadBalancer.js` (26 lines)
- **Purpose:** Round-robin load balancer with health-aware filtering.
- **Key Functions:** `getServer(apiKey, targets, lbKey)` - selects healthy backend via round-robin
- **Dependencies:** ioredis
- **Notes:** Creates its own Redis client instance. Uses INCR + EXPIRE for counter with 60s window.

### `Backend/src/utils/normalizeConfig.js` (37 lines)
- **Purpose:** Sanitizes and applies defaults to user-submitted gateway configurations.
- **Key Functions:** `normalizeConfig(raw)` - returns clean config with defaults
- **Dependencies:** None
- **Defaults:** `cache: false`, `cacheTTL: 60`, `rateLimit: 100`. Coerces targets and routes to arrays.

## Frontend Files

### `frontend/server.js` (64 lines)
- **Purpose:** Production Express server serving built SPA and proxying API requests.
- **Key Functions:** `proxyRequest(req, res)` - forwards API requests to backend
- **Dependencies:** express, node-fetch (global)
- **Notes:** Port from `PORT` env (default 8080). Proxies `/auth/*`, `/dev/*`, `/logs*` routes.

### `frontend/vite.config.js` (6 lines)
- **Purpose:** Vite build configuration.
- **Notes:** Uses CommonJS require. Registers React plugin.

### `frontend/src/main.jsx` (16 lines)
- **Purpose:** React entry point. Renders App with BrowserRouter and AuthProvider.
- **Dependencies:** react, react-dom, react-router-dom, AuthContext, App, app.css

### `frontend/src/App.jsx` (90 lines)
- **Purpose:** Route definitions with PrivateRoute and AdminRoute guards.
- **Key Components:** `PrivateRoute` - redirects unauthenticated users; `AdminRoute` - redirects non-admins
- **Dependencies:** All page components, AuthContext

### `frontend/src/context/AuthContext.jsx` (66 lines)
- **Purpose:** React Context for global authentication state.
- **Key Exports:** `AuthProvider`, `useAuth` hook
- **Key State:** `token`, `user` (userId, role, email)
- **Key Functions:** `login(token, payload)` - stores token + user; `logout()` - clears everything
- **Dependencies:** services/storage

### `frontend/src/services/apiClient.js` (54 lines)
- **Purpose:** Generic HTTP request wrapper with automatic Bearer token injection.
- **Key Functions:** `request(path, {method, body, auth})` - makes fetch call with auth headers
- **Dependencies:** services/storage (getToken)
- **Notes:** Throws errors for non-2xx responses. Handles JSON parsing errors gracefully.

### `frontend/src/services/auth.js` (21 lines)
- **Purpose:** Auth API calls (signup, signin).
- **Key Functions:** `signup(email, password)`, `signin(email, password)`, `extractToken(payload)`
- **Dependencies:** apiClient

### `frontend/src/services/gateway.js` (30 lines)
- **Purpose:** Gateway CRUD API calls.
- **Key Functions:** `fetchApis()`, `fetchApiByKey(apiKey)`, `createApi(payload)`, `updateApi(apiKey, payload)`, `deleteApi(apiKey)`
- **Dependencies:** apiClient

### `frontend/src/services/logs.js` (15 lines)
- **Purpose:** Log and stats API calls.
- **Key Functions:** `fetchLogs()`, `fetchStats()`, `fetchUsersDirectory()`
- **Dependencies:** apiClient

### `frontend/src/services/storage.js` (152 lines)
- **Purpose:** localStorage helpers with user-scoped keys.
- **Key Functions:** `getToken/setToken/clearToken`, `setAuthUser/getAuthUser/clearAuthUser`, `getUserFromToken`, `getStoredApiKeys/setStoredApiKeys`, `getSelectedApiKey/setSelectedApiKey`, `getApiNameMap/setApiNameForKey/removeApiNameForKey`
- **Notes:** User-scoped keys prevent data leakage between accounts. JWT payload decoded client-side for userId.

### `frontend/src/services/navigation.js` (20 lines)
- **Purpose:** Sidebar navigation items by user role.
- **Key Functions:** `getNavigationItems(role)` - returns nav items array
- **Notes:** Admin users get additional "God View" and "Global Logs" links.

### `frontend/src/pages/LandingPage.jsx` (55 lines)
- **Purpose:** Public marketing/landing page.
- **Notes:** No state, purely presentational. Uses lucide-react icons.

### `frontend/src/pages/LoginPage.jsx` (78 lines)
- **Purpose:** User login form.
- **Key State:** email, password, error, loading
- **Notes:** Extracts token from response, stores in AuthContext, navigates to /dashboard.

### `frontend/src/pages/SignupPage.jsx` (71 lines)
- **Purpose:** User registration form.
- **Key State:** email, password, message, error, loading
- **Notes:** Shows success message after signup. No password confirmation.

### `frontend/src/pages/DashboardPage.jsx` (194 lines)
- **Purpose:** Main dashboard with gateway management.
- **Key State:** apis, loading, error, wizardMode, editApi, activeRouteApi
- **Key Functions:** loadApis, hydrateApis, openCreate, openEdit, handleCreate, handleUpdate, handleDelete
- **Notes:** Polls every 15 seconds. Merges backend data with localStorage display names.

### `frontend/src/pages/ApiDetailsPage.jsx` (148 lines)
- **Purpose:** Per-API analytics page.
- **Key State:** apiDetails, logs, loading, error
- **Key Functions:** loadData (parallel fetch), stats (computed from logs)
- **Notes:** Uses Promise.all for parallel data fetching. Stats computed client-side.

### `frontend/src/pages/ApiAllLogsPage.jsx` (70 lines)
- **Purpose:** Full log viewer for a specific API.
- **Key State:** logs, loading, error
- **Notes:** Uses navigate(0) for refresh (brute-force page reload). No pagination.

### `frontend/src/pages/AdminOverviewPage.jsx` (175 lines)
- **Purpose:** Admin "God View" with global stats and user directory.
- **Key State:** logs, stats, usersDirectory, loading, error
- **Key Functions:** toUserGroups (groups logs by userId)
- **Notes:** Fetches 3 data sources in parallel via Promise.all. Uses Map for efficient email lookup.

### `frontend/src/pages/AdminLogsPage.jsx` (53 lines)
- **Purpose:** Global admin log viewer.
- **Key State:** logs, loading, error
- **Notes:** Shows all logs across all users. Uses navigate(0) for refresh.

### `frontend/src/pages/AdminUserPage.jsx` (223 lines)
- **Purpose:** Admin per-user drill-down page.
- **Key State:** logs, usersDirectory, loading, error
- **Key Functions:** summarizeApis (derives API summaries from logs)
- **Notes:** Constructs API objects from log data rather than API config endpoint. Allows deletion of user APIs.

### `frontend/src/pages/NotFoundPage.jsx` (13 lines)
- **Purpose:** 404 page with link back to landing.
- **Notes:** Minimal, no layout shell.

### `frontend/src/components/layout/AppShell.jsx` (61 lines)
- **Purpose:** Dashboard layout with sidebar, topbar, and content area.
- **Key Props:** title, subtitle, onRefresh, onLogout, children, navItems
- **Notes:** Uses NavLink with isActive for active styling. Falls back to default sidebar items.

### `frontend/src/components/layout/AuthShell.jsx` (25 lines)
- **Purpose:** Auth page layout with brand sidebar and form panel.
- **Key Props:** title, subtitle, children, switchText, switchLink, switchCta

### `frontend/src/components/ui/Button.jsx` (19 lines)
- **Purpose:** Reusable button with variant support (primary/ghost/danger).
- **Key Props:** children, type, variant, onClick, disabled, className

### `frontend/src/components/ui/InputField.jsx` (25 lines)
- **Purpose:** Reusable labeled input field.
- **Key Props:** id, label, value, onChange, type, placeholder, required, disabled

### `frontend/src/components/ui/Modal.jsx` (15 lines)
- **Purpose:** Generic modal dialog with backdrop.
- **Key Props:** title, children, onClose, className
- **Notes:** Has role="dialog" and aria-modal="true". No focus trapping or escape key handling.

### `frontend/src/components/ui/Toggle.jsx` (15 lines)
- **Purpose:** Toggle switch component.
- **Key Props:** checked, onChange, label
- **Notes:** Uses aria-pressed for accessibility.

### `frontend/src/components/gateway/ApiCard.jsx` (45 lines)
- **Purpose:** Card component for a single gateway configuration.
- **Key Props:** api, onOpenDetails, onViewRoutes, onEdit, onDelete
- **Notes:** Shows API key, target count, route count. Uses lucide-react icons.

### `frontend/src/components/gateway/ApiWizardModal.jsx` (337 lines)
- **Purpose:** Multi-step wizard for creating/editing gateway configurations.
- **Key State:** step (0-3), form, pending, error
- **Key Props:** mode, initialData, onClose, onSubmit
- **Notes:** 4 steps: Basics, Routes, Rate Limiting, Review. Includes educational explainer content with embedded videos. Video filenames have typos.

### `frontend/src/components/gateway/EmptyState.jsx` (14 lines)
- **Purpose:** Empty state placeholder when no APIs exist.
- **Key Props:** onCreate
- **Notes:** Uses raw button instead of Button component.

### `frontend/src/components/gateway/RouteSettingsModal.jsx` (23 lines)
- **Purpose:** Read-only modal showing route configuration.
- **Key Props:** api, onClose
- **Notes:** Route display logic duplicated in ApiDetailsPage.

### `frontend/src/components/logs/LogsTable.jsx` (40 lines)
- **Purpose:** Tabular display of log entries.
- **Key Props:** logs, limit, showUser, showApi
- **Notes:** No sorting, filtering, or pagination. Simple truncation via limit prop.

### `frontend/src/components/charts/UsageChart.jsx` (71 lines)
- **Purpose:** Line chart for request traffic over time.
- **Key Props:** logs
- **Key Functions:** toBucket(logs) - groups logs into 1-minute time buckets
- **Dependencies:** recharts
- **Notes:** Shows last 60 minutes of data. Fixed height 260px.

### `frontend/src/components/animations/GatewayFlowAnimations.jsx` (306 lines)
- **Purpose:** Animated SVG diagrams illustrating load balancing, caching, and rate limiting concepts.
- **Key Exports:** LoadBalancingAnimation, CachingAnimation, RateLimitingAnimation
- **Notes:** Purely presentational. CSS-driven animations. InternetIcon defined but unused. Largest component file.

### `frontend/src/styles/app.css` (1327 lines)
- **Purpose:** Complete application stylesheet.
- **Theme:** Dark navy/slate color scheme
- **Fonts:** Manrope (headings), IBM Plex Sans (body)
- **Notes:** Full responsive design with breakpoints at 1280px, 980px, 768px, 560px.

### `frontend/src/styles/gateway-flow-animations.css` (675 lines)
- **Purpose:** CSS keyframes and styles for animated diagrams.
- **Notes:** Defines animation classes (gfa-pulse, gfa-line, gfa-dot, etc.).

---

# Architecture Decision Record

## Decision 1: Express 5 over Express 4
**Tradeoffs:** Express 5 provides async error handling (no need for try/catch wrappers in routes) and other improvements, but is a newer major version with potential breaking changes and smaller community support.
**Benefits:** Native async error handling, modern API.
**Drawbacks:** Smaller ecosystem, fewer Stack Overflow answers, potential bugs.

## Decision 2: MongoDB over PostgreSQL
**Tradeoffs:** MongoDB's flexible schema is ideal for the varied ApiConfig documents (embedded routes), but lacks ACID transactions and JOIN capabilities for complex queries.
**Benefits:** Schema flexibility, easy embedding of route configurations, natural document model.
**Drawbacks:** No referential integrity, limited aggregation capabilities, no transactions.

## Decision 3: Redis (Upstash) for Rate Limiting and Caching
**Tradeoffs:** Redis provides sub-millisecond operations essential for rate limiting, but Upstash's REST-based approach adds latency compared to direct TCP connections.
**Benefits:** Atomic operations (INCR), TTL support, managed service.
**Drawbacks:** REST-based latency, no persistent data beyond TTL.

## Decision 4: Kafka for Log Pipeline
**Tradeoffs:** Kafka provides durable, high-throughput log ingestion but adds significant operational complexity (broker management, topic configuration, consumer groups).
**Benefits:** Decoupled processing, durable messages, consumer groups for parallel processing.
**Drawbacks:** Operational complexity, local broker dependency, overhead for small-scale use.

## Decision 5: JWT over Session-based Authentication
**Tradeoffs:** JWTs are stateless and scalable but cannot be revoked without additional infrastructure (Redis blocklist).
**Benefits:** Stateless, scalable, no server-side session store.
**Drawbacks:** No revocation, 7-day validity window, secret management.

## Decision 6: Frontend Production Server with Proxy
**Tradeoffs:** Serving the SPA via Express with API proxying simplifies deployment (single port) but couples frontend and backend deployment.
**Benefits:** Single deployment unit, no CORS issues in production, simplified networking.
**Drawbacks:** Coupled deployment, frontend server does proxy work, no CDN caching for API routes.

## Decision 7: Per-Route Configuration Granularity
**Tradeoffs:** Allowing per-route cache/TTL/rate-limit settings provides flexibility but increases configuration complexity and storage size.
**Benefits:** Fine-grained control, different policies for different endpoints.
**Drawbacks:** More complex UI, more data per ApiConfig document.

## Decision 8: Kafka Consumer as Self-Executing Module
**Tradeoffs:** The consumer runs as a side effect of `require()` in index.js, which is unconventional but simplifies startup. Testing becomes harder.
**Benefits:** Simple startup, no additional process management.
**Drawbacks:** Hard to test, tightly coupled to main process, no independent scaling.

---

# Project Summary

## For Recruiters
Obsidian Gateway is a full-stack API Gateway SaaS platform built with Node.js, Express, React, MongoDB, Redis, and Apache Kafka. The project demonstrates end-to-end system design including a React dashboard for gateway management, a high-performance proxy server with rate limiting/caching/load balancing, and an async log processing pipeline. This is a production-grade system architecture suitable for discussing distributed systems, API design, and full-stack development.

## For Hiring Managers
This project showcases a complete understanding of backend infrastructure engineering. The candidate built a system that handles the full request lifecycle (authentication → rate limiting → caching → load balancing → logging) with two-tier rate limiting, per-route cache configuration, health-aware load balancing, and Kafka-based async log ingestion. The React dashboard provides both developer and admin perspectives with real-time analytics. This demonstrates systems thinking, API design, database modeling, and DevOps awareness.

## For Senior Engineers
The codebase demonstrates solid architectural decisions: separating the management plane (dashboard) from the data plane (gateway proxy), using Redis for ephemeral state (rate limits, health, counters), Kafka for async log pipeline, and MongoDB for document storage. The system is horizontally scalable (stateless gateway servers with shared Redis state) and includes operational features like health checking and per-user analytics. Notable areas for improvement include: adding indexes, implementing cursor-based pagination, sharing Redis client instances, and adding circuit breakers for backend calls.

## For Startup Founders
This project is a working prototype of an API Gateway product that could be commercialized. The core value proposition is clear: developers configure gateways through a dashboard, clients send traffic through the gateway, and the platform provides caching, rate limiting, load balancing, and analytics out of the box. The admin panel enables platform operators to monitor all activity. The tech stack (Node.js, MongoDB, Redis, Kafka) is cloud-native and deployable on Render, AWS, or similar platforms. Key next steps for production: deployment pipeline, multi-tenant isolation, billing integration, and API documentation portal.
