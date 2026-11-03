# ZYNTHEOR Deployment Architecture Specification

## 1. Topographic Architecture

```
                                  [ Internet / Ingress ]
                                            |
                                            v
                                +-----------------------+
                                |  TLS / Port 3000      |
                                |  Express Web Server   |
                                +-----------------------+
                                            |
                     +----------------------+----------------------+
                     |                      |                      |
                     v                      v                      v
           +-------------------+  +-------------------+  +-------------------+
           | React SPA Bundle  |  | API & Auth Routes |  | Health Probes     |
           | (/dist static)    |  | (/api/*)          |  | /health/live      |
           +-------------------+  +-------------------+  | /health/ready     |
                                            |            +-------------------+
                                            v
                                +-----------------------+
                                | Local-First Storage   |
                                | (workspace_data/ ORM) |
                                +-----------------------+
```

## 2. Port & Network Binding
- **Port**: 3000 (standard AI Studio preview & production port).
- **Host**: `0.0.0.0` (accessible via container preview interface).
- **Loopback Default**: Host binds to `0.0.0.0` with warning logged if `ZYNTHEOR_ACCESS_TOKEN` is empty.

## 3. Environment Configuration
- `.env.example` defines all required runtime keys (`GEMINI_MODEL`, `HOST`, `PORT`, `ZYNTHEOR_ACCESS_TOKEN`, `ZYNTHEOR_LOCAL_ONLY`, `STRIPE_WEBHOOK_SECRET`, `PROMPTPAY_WEBHOOK_SECRET`).
