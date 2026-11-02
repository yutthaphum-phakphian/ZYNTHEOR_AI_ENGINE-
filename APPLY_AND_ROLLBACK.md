# ZYNTHEOR simulated-runtime removal patch

Base: zyntheor-ai-fixed__1_.zip (no .git; the original ZIP is the only restore point - keep it untouched).

## Apply (from project root)
    cp -r files/. .
    xargs -a DELETED_FILES.txt rm -f
    sha256sum -c <(sed 's# \./# ./#' PATCH_MANIFEST.sha256)   # run inside files/ to verify the patch itself

## Rollback
Re-extract the original ZIP over the project: `unzip -o zyntheor-ai-fixed__1_.zip`.
This restores every modified file and every deleted file listed in DELETED_FILES.txt.
(Back up workspace_data/ first if the app has been run - it holds runtime data.)

## After applying
    npm install && npm run typecheck && npm run build && npm run test:mock
Real provider check (needs a real Ollama with a pulled model; not run by the patch author):
    ollama serve   # real
    ZYNTHEOR_MODEL_BASE_URL=http://127.0.0.1:11434/v1 npm run dev  -> Models page -> run inference check
