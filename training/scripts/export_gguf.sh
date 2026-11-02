#!/usr/bin/env bash
# ==============================================================================
# ZYNTHEOR CORE 0.1 — GGUF Export & Quantization Pipeline (Q4_K_M)
# Target: Qwen/Qwen2.5-Coder-7B-Instruct + ZYNTHEOR CORE LoRA Adapter
# Runtime: llama.cpp / Ollama Modelfile
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

CHECKPOINT_DIR="${ROOT_DIR}/training/checkpoints/zyntheor-core-0.1-adapter"
EXPORT_DIR="${ROOT_DIR}/models/export"
BASE_MODEL="Qwen/Qwen2.5-Coder-7B-Instruct"
QUANTIZATION="Q4_K_M"
OUTPUT_GGUF="${EXPORT_DIR}/zyntheor-core-0.1-${QUANTIZATION}.gguf"

echo "========================================================================"
echo "ZYNTHEOR CORE 0.1 — GGUF EXPORT PRE-FLIGHT VERIFICATION"
echo "Target Base:    ${BASE_MODEL}"
echo "Adapter Dir:    ${CHECKPOINT_DIR}"
echo "Target Format:  GGUF (${QUANTIZATION})"
echo "Export Path:    ${OUTPUT_GGUF}"
echo "========================================================================"

# FAIL-CLOSED CHECK: Do genuine trained adapter weights exist?
if [ ! -d "${CHECKPOINT_DIR}" ] || [ ! -f "${CHECKPOINT_DIR}/adapter_model.safetensors" -a ! -f "${CHECKPOINT_DIR}/adapter_model.bin" ]; then
    echo "[FAIL-CLOSED GATE TRIGGERED]"
    echo "ERROR: No trained LoRA adapter weights found on disk at:"
    echo "       ${CHECKPOINT_DIR}"
    echo ""
    echo "Strict Zero-Mock Directive:"
    echo "  ZYNTHEOR strictly forbids generating dummy or fake GGUF binary files."
    echo "  Export status: UNTRAINED — NO WEIGHTS TO CONVERT."
    echo "  A real GPU training run must complete before GGUF export can proceed."
    echo "========================================================================"
    exit 1
fi

mkdir -p "${EXPORT_DIR}"

echo "[STEP 1/3] Merging LoRA adapter with base model ${BASE_MODEL}..."
python3 - <<EOF
import os, sys
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

base_name = "${BASE_MODEL}"
adapter_dir = "${CHECKPOINT_DIR}"
merged_dir = "${EXPORT_DIR}/merged-f16"

print(f"Loading base model {base_name}...")
base_model = AutoModelForCausalLM.from_pretrained(base_name, torch_dtype="auto", device_map="cpu")
tokenizer = AutoTokenizer.from_pretrained(base_name)

print(f"Loading adapter from {adapter_dir}...")
model = PeftModel.from_pretrained(base_model, adapter_dir)

print("Merging LoRA weights into base model...")
merged_model = model.merge_and_unload()

print(f"Saving merged model to {merged_dir}...")
merged_model.save_pretrained(merged_dir)
tokenizer.save_pretrained(merged_dir)
print("Merge complete.")
EOF

echo "[STEP 2/3] Converting merged model to GGUF using llama.cpp..."
if command -v convert_hf_to_gguf.py &> /dev/null; then
    convert_hf_to_gguf.py "${EXPORT_DIR}/merged-f16" --outfile "${EXPORT_DIR}/zyntheor-core-0.1-f16.gguf" --outtype f16
else
    echo "llama.cpp convert_hf_to_gguf.py not found in PATH."
    echo "Please install llama.cpp or run via docker: ghcr.io/ggerganov/llama.cpp:full"
    exit 2
fi

echo "[STEP 3/3] Quantizing to ${QUANTIZATION}..."
if command -v llama-quantize &> /dev/null; then
    llama-quantize "${EXPORT_DIR}/zyntheor-core-0.1-f16.gguf" "${OUTPUT_GGUF}" "${QUANTIZATION}"
    sha256sum "${OUTPUT_GGUF}" > "${OUTPUT_GGUF}.sha256"
    echo "========================================================================"
    echo "SUCCESS: GGUF ${QUANTIZATION} exported successfully."
    echo "SHA-256 Digest: $(cat "${OUTPUT_GGUF}.sha256")"
    echo "========================================================================"
else
    echo "llama-quantize binary not found in PATH."
    exit 3
fi
