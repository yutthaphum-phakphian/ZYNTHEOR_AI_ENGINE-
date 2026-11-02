# Intelligence Core Improvement Report

## Implemented

- `/api/intelligence/run` returns configured-provider inference rather than a hard-coded answer.
- Simple questions use a single inference step; workspace-oriented requests include inspection and inference.
- Provider failures and empty responses are surfaced as failures, not successful fallback text.
- Model output remains `UNVERIFIED`; evidence digests do not imply the model's claims were independently checked.
- Cache lookup follows local-only/consent validation, and contextual/tool-oriented requests bypass the response cache.

## Evidence

- Provider-spy test confirms one provider call and a one-step plan for a simple question.
- Runtime integration test confirms retrieved source excerpts reach the provider prompt and no diff is fabricated.
- Full suite passed 312/312 tests; production build passed.

## Limitations

The provider stub tests integration behavior only. There is no independent reasoning-quality benchmark or live native-model inference evidence.