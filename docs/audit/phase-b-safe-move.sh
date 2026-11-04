#!/bin/bash
set -e
echo "=== Phase B Safe Move - Keep 3, Move 9 ==="
git stash push -m "pre-phase-b-move-12files" || true
rm -rf archive/legacy-snapshots/
echo "archive/legacy-snapshots/" >> .gitignore
mkdir -p src/assets/branding src/assets/native src/assets/docs src/assets/ui src/assets/generated
cp public/zyntheor-logo.svg src/assets/branding/ 2>/dev/null || true
cp public/zyntheor-header.svg src/assets/branding/ 2>/dev/null || true
cp public/zyntheor-footer.svg src/assets/branding/ 2>/dev/null || true
cp public/zyntheor-architecture.svg src/assets/docs/ 2>/dev/null || true
cp public/zyntheor-features.svg src/assets/branding/ 2>/dev/null || true
cp public/divider.svg src/assets/ui/ 2>/dev/null || true
cp public/native-core-mark.svg src/assets/native/ 2>/dev/null || true
cp public/native-status-badge.svg src/assets/native/ 2>/dev/null || true
cp public/status-cards.svg src/assets/generated/ 2>/dev/null || true
ls -lh public/ src/assets/branding/ src/assets/native/
npm run build
echo "If PASS, run: rm public/zyntheor-*.svg public/divider.svg public/native-*.svg public/status-cards.svg"
