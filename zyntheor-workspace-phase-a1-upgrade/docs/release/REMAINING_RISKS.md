# ZYNTHEOR Remaining Risks & Limitations Document

## 1. Documented Limitations & Risks

1. **Hardware Capacity for On-Device Training**: Native model fine-tuning requires dedicated GPU nodes (e.g. NVIDIA A10G/A100). On CPU-only environments, model status reports `SPECIFICATION_LOCKED_PENDING_GPU_RUN`.
2. **Payment Provider Sandbox Mode**: Live credit card transactions remain disabled until production payment provider credentials are configured in `.env`.
3. **Manual Bank Reconciliation**: Bank transfers require operator review via `/api/billing/reconcile` when automated bank feeds are unavailable.
