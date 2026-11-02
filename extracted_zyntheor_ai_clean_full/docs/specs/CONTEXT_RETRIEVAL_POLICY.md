# ZYNTHEOR CONTEXT RETRIEVAL POLICY — Specification

**Document Version**: 1.0.0 (Phase P2 Security & Retrieval)  

---

## 1. Principles of Context Retrieval

1. **Relevance over Completeness**: Never dump the entire codebase into LLM prompt context.
2. **Context Budget Enforcement**: Enforce strict upper bound character and token limits (max 4,000 tokens / 16,000 chars).
3. **Data Sovereignty & Zero Secret Leakage**: Never retrieve or include sensitive environment files, API keys, credentials, or private SSH keys.
4. **Input Sanitization**: Treat repository file contents as untrusted inputs and neutralize potential prompt injection instructions.

---

## 2. Enforced Exclusion Rules

The following file patterns are strictly excluded from all retrieval results:
- `.env*` files (`.env`, `.env.local`, `.env.production`)
- Private key files (`*.pem`, `id_rsa`, `*.key`)
- Database proxy credentials (`cloud_sql_proxy`, `secrets.json`)
- Binary assets and `node_modules/` or `.git/` directories
