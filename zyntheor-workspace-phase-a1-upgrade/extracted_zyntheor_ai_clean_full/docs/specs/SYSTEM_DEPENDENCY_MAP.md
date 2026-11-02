# ZYNTHEOR AI ENGINE — System Dependency Map

**Document Version**: 1.0.0  
**Runtime Environment**: Node.js 22, Express 5, React 19, Vite 6  

---

## 1. Top-Level Architectural Graph

```
                               ┌─────────────────────────┐
                               │ React 19 SPA Frontend   │
                               │  (src/App.tsx)          │
                               └───────────┬─────────────┘
                                           │ HTTP / SSE / Bearer
                               ┌───────────▼─────────────┐
                               │ Express 5 HTTP Server   │
                               │  (server.ts)            │
                               └───────────┬─────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         │                                 │                                 │
┌────────▼────────┐               ┌────────▼────────┐               ┌────────▼────────┐
│ Security & Auth │               │ Intelligence &  │               │ Workspace &     │
│ Middleware      │               │ Model Gateway   │               │ Data Storage    │
├─────────────────┤               ├─────────────────┤               ├─────────────────┤
│authService.ts   │               │intelligence-    │               │workspaceRoute   │
│access.mjs       │               │  core.ts        │               │workspaceManager │
│Local-Only Policy│               │providers.ts     │               │workspace_data/  │
└─────────────────┘               └────────┬────────┘               └─────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        │                                     │
               ┌────────▼────────┐                   ┌────────▼────────┐
               │ Local Runtime   │                   │ Cloud Proxies   │
               ├─────────────────┤                   ├─────────────────┤
               │local-ollama-    │                   │Google Gemini    │
               │  bridge.ts      │                   │OpenAI API       │
               │Ollama 11434     │                   │Anthropic API    │
               └─────────────────┘                   └─────────────────┘
```

---

## 2. API Endpoint Dependency Matrix

| Route Endpoint | Method | Handling Service / Core Module | Auth / Security Requirement | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| `/api/settings` | GET/POST | `server.ts` | Bearer Access Token (on POST) | `IntelligenceCore`, `AgentOrchestrator`, `auditLedger` |
| `/api/auth/session` | GET | `authService.ts` | Session Cookie / Token Header | `resolveRequestUser`, `serverSessionMiddleware` |
| `/api/health` | GET | `server.ts` | Public Loopback | Hardware Probe, `publicConfig()` |
| `/api/models` | GET | `providers.ts` | Bearer Access Token | `ModelProvider`, `remoteAllowed()` |
| `/api/chat` | POST | `providers.ts` | Bearer Access Token | `buildChatMessages`, `rateLimit`, `remoteAllowed()` |
| `/api/chat/stream` | POST | `providers.ts` | Bearer Access Token | Server-Sent Events (SSE), `remoteAllowed()` |
| `/api/intelligence/run` | POST | `intelligence-core.ts` | Bearer Access Token | `IntelligenceCore`, `ToolGateway` |
| `/api/intelligence/agent/execute` | POST | `agent-orchestrator.ts` | Bearer Access Token | `AgentOrchestrator`, `VerificationEngine` |
| `/api/workspace/projects` | GET/POST | `workspaceRoute.ts` | Workspace Auth (`requireWorkspaceAuth`) | `workspaceManager.ts`, `workspace_data/` |
| `/api/diagnostics/smart` | GET | `server.ts` | Bearer Access Token | `probeNativeModelRuntime`, Endpoint Probe |
| `/api/diagnostics/errors` | GET/POST | `errorLogger.ts` | Session Role (`admin`/`engineer`) | Persistent Error File (`system_errors.json`) |
| `/api/audit/verify` | GET/POST | `auditLedger.ts` | Public / Verified Session | `verifyAuditHashChain` |
| `/api/training/status` | GET | `server.ts` | Public Loopback | Hardware Telemetry, `model_registry.json` |
| `/api/training/gates` | GET | `trainingGateStateMachine.ts` | Bearer Access Token | 10-Flag State Machine, Remote GPU Connector |

---

## 3. Storage & File System Dependencies

1. **Local Settings**: `localStorage` key `zyntheor.settings` (Client) + `/api/settings` state (Server).
2. **Access Token**: `sessionStorage` key `zyntheor.access.v1`.
3. **Workspace Data**: Directory `/workspace_data/` containing `projects.json`, `deployments.json`, and `/tasks/`.
4. **Error Logs**: `/workspace_data/system_errors.json`.
5. **Training Registry**: `/training/registry/model_registry.json` and `latest_training_log.json`.
