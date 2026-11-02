# ZYNTHEOR Performance Baseline Report

## 1. System Benchmarks

- **Health Probe Latency (`/health/live`)**: < 5 ms.
- **Static Asset Delivery (`/dist`)**: < 15 ms.
- **Local Intelligence Analysis Latency**: ~ 250–800 ms (depending on hardware).
- **Billing Checkout Creation**: < 20 ms.
- **Database Query Latency**: < 10 ms (Drizzle ORM / In-Memory cache).

## 2. Memory & Capacity Profile
- **Node.js Memory Footprint**: ~ 85 MB RSS.
- **Concurrent Request Capacity**: Rate-limited at 30 req/min for diagnostic endpoints, 20 req/min for chat streaming.
