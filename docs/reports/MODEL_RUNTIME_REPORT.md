# Model Runtime Report

## Verified

- Intelligence, chat, and analysis routes call the configured provider when policy allows it.
- Local-only and explicit-consent checks are enforced before external inference; tests verify blocked providers receive no call.
- Provider failure does not become a fabricated success. `/api/intelligence/run` client disconnects propagate to provider inference; timeout is reported separately.
- Contextual requests bypass the cache; context-free cache keys include workspace label, provider, model, query, and language.

## Native Model Status

This work did not train or promote a model. No verified fine-tuned weights or native-checkpoint inference were produced. The provider stub used in cancellation integration is test infrastructure, not a native model.

## Phase 3 Verification Evidence

- **Full verification:** `npm run verify` passed preflight, typecheck, Node tests (418 passed, 1 opt-in live test skipped), Vitest (207 passed), and production build.
- **Unit tests:** provider policy, fallback labeling, cancellation, and benchmark behavior run as part of the regular Node/Vitest suites.
- **Integration tests:** `tests/model-gateway-integration.test.mjs` sends requests through the backend to a loopback mock provider. It verifies local inference while Local-only is enabled and uses a network guard to confirm blocked Gemini routes make no external fetch attempt. This does not prove that Ollama or Gemini is installed or reachable.
- **Benchmark failures:** `runModelBenchmark` no longer substitutes reference answers after an inference error. A denied remote provider is reported as `baseline_fixture_comparison`, with no inference claim and zero synthetic latency.
- **Live inference:** `tests/model-gateway-live.test.mjs` is opt-in and skipped in the regular test suite. It starts the production-mode backend, grants online consent through `/api/settings`, verifies the Gemini inference marker, and checks synthetic English and Thai root-cause/patch analyses. A Gemini key was not configured in the environment for this verification run, so no live request or model-quality result is claimed.

To run the live check in an environment authorized for Gemini egress, provide `GEMINI_API_KEY` or `GOOGLE_API_KEY` through the process environment and run:

```bash
ZYNTHEOR_LIVE_INFERENCE=1 node --test tests/model-gateway-live.test.mjs
```

The test uses synthetic code only; it does not upload this repository. A passing live smoke/rubric check is not an independent benchmark, proof of general software-engineering competence, or evidence that ZYNTHEOR CORE was trained.