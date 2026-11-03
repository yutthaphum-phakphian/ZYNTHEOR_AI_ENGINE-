# ZYNTHEOR AI ENGINE — Commercial & Tiered Pricing Architecture

**Document Version**: 1.0.0  
**Status**: Specification Phase (Zero fabricated transactions or revenue claims)  

---

## 1. Target Customer Segments & Core Problems

### Segment A: Sovereign AI Engineers & Local Developers
- **Problem**: Dependent on cloud LLMs with latency, data leak risks, and recurring subscription fees for basic coding tasks.
- **Solution**: Local-first ZYNTHEOR ENGINE running on local loopback (`127.0.0.1:11434`) with zero data egress.

### Segment B: Individual Professional Engineers & Tech Consultants
- **Problem**: Need cloud-grade intelligence for complex architectural reasoning without exposing proprietary codebases or losing auditability.
- **Solution**: ZYNTHEOR Pro with server-side proxy encryption, explicit online consent controls, and SHA-256 Audit Ledger.

### Segment C: Engineering Workgroups & Product Teams (2–20 Engineers)
- **Problem**: Inconsistent prompt quality, lack of team knowledge persistence, and fragmented code modification tracking.
- **Solution**: ZYNTHEOR Team with shared workspace knowledge bases, central task memory, and role-based access controls (`admin`, `engineer`, `viewer`).

### Segment D: Enterprise, Defense & Regulated Industry
- **Problem**: Strict regulatory compliance (GDPR, HIPAA, ISO27001, Defense Air-Gap) prohibiting external SaaS AI APIs.
- **Solution**: ZYNTHEOR Enterprise with air-gapped container deployment, fine-tuned native ZYNTHEOR CORE LoRA weights, and custom SLA.

---

## 2. Commercial Plan Structure Matrix

| Dimension | Free (Sovereign Local) | Pro (Individual Engineer) | Team (Workgroup Sovereign) | Enterprise (Air-Gapped Sovereign) |
| :--- | :--- | :--- | :--- | :--- |
| **Target User** | Hobbyists & Local Devs | Professional Engineers | Tech Teams (up to 15 seats) | Financial/Regulated Enterprises |
| **Included Capabilities** | Unlimited Local Chat, Task Memory, Project Workspace, Local Audit Log | Prompt Forge Bench, Forensic Diff Viewer, GPU LoRA Pre-flight | Shared Workspace Projects, Team Knowledge Base, Custom Prompt Library | Air-Gapped Deployment, Custom ZYNTHEOR CORE LoRA Fine-Tuning |
| **Usage Limits** | Unlimited Local CPU/GPU | 10,000 Cloud Tokens/Day | 100,000 Cloud Tokens/Day per Team | Custom Dedicated Quotas |
| **Model Access** | Local Ollama Models | ZYNTHEOR CORE + Gemini / OpenAI / Anthropic Proxies | All Models + Team Fallback Routing | Dedicated Native ZYNTHEOR CORE Nodes |
| **Tool Permissions** | Read-Only Workspace & Human-Approved Diffs | Full Tool Gateway with Human Approval Gate | Full Tool Gateway + Role Management (`admin`/`engineer`/`viewer`) | Custom Granular Tool Policies |
| **Support** | Community / Documentation | Priority Email Support | 8x5 Dedicated Support Channel | 24/7 SLA + Dedicated Account Engineer |
| **Cost Drivers** | $0 (User Infrastructure) | $0.002 / 1K Tokens Cloud Cost | $0.002 / 1K Tokens + Storage | Dedicated Cloud SQL & On-Prem Nodes |

---

## 3. Financial Infrastructure Cost Model (Assumptions)

1. **Local Loopback Usage**: $0 marginal cost to platform host.
2. **Cloud Model API Proxies**: Estimated average cost of $0.0015–$0.0030 per 1,000 tokens processed via external provider APIs.
3. **Storage & Database**: File-based workspace JSON storage at $0.02 / GB / month or Cloud SQL PostgreSQL tier at ~$15–$50 / month base host.
4. **Safety & Abuse Prevention**: Server-side sliding-window rate limiters (`rateLimit`) cap request spikes to prevent runaway API spend.
