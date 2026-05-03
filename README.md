# API Gateway

A custom-built API Gateway SaaS that sits between clients and developer backends, providing traffic control, security, and observability.

## What it does

Client Request → API Gateway (auth, rate limit, cache, load balance) → Developer Backend

## Features (Phased Build)

- [x] Phase 1 - Core Proxy (forward requests to backend)
- [x] Phase 2 - Route Config (path-based routing)
- [x] Phase 3 - API Key Authentication 
- [x] Phase 4 - Rate Limiting (Redis) 
- [x] Phase 5 - Caching (Redis)
- [x] Phase 6 - Load Balancing
- [x] Phase 7 - Logging and Analytics
- [x] Phase 8 - Dashboard
- [ ] Phase 9 - Deployment

## Tech Stack

- Runtime: Node.js
- Framework: Express
- Cache / Rate Limiting: Redis (Upstash)
- Database: MongoDB
- Deployment: Render / AWS

## Project Structure

src/index.js - server setup, route mounting
src/routes/gateway.js - core gateway logic

## Getting Started

npm install
node src/index.js

## Current Status

Phase 3 complete. Gateway validates API keys, matches routes per developer, and forwards requests to target backends.
EOF
