#!/usr/bin/env python3
"""
ZYNTHEOR CORE 0.1 — First-Party AI Model QLoRA Training Pipeline
Target: Qwen/Qwen2.5-Coder-7B-Instruct (Apache-2.0, 7.61B parameters)
Genesis Seed: 849202

ZERO-MOCK & FAIL-CLOSED ENFORCEMENT:
- Validates real hardware before attempting training.
- If GPU is absent or VRAM < 16GB, immediately halts with status:
  DATASET_AND_EVALUATION_CAPABLE, FULL_7B_QLORA_TRAINING_UNAVAILABLE.
- NEVER fabricates weights, fake loss curves, or simulated progress.
"""

import os
import sys
import json
import platform
import hashlib
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_PATH = ROOT_DIR / "training" / "config" / "training_config.json"
BASE_MODEL_PATH = ROOT_DIR / "training" / "registry" / "base_model.json"
DATASET_PATH = ROOT_DIR / "training" / "dataset" / "samples.json"
CHECKPOINT_DIR = ROOT_DIR / "training" / "checkpoints"

MINIMUM_REQUIRED_VRAM_GB = 16.0
GENESIS_SEED = 849202

def audit_hardware():
    """Detect real CPU cores, RAM, and NVIDIA CUDA GPU memory using stdlib with psutil fallback."""
    ram_gb = 0.0
    try:
        # Standard Linux /proc/meminfo
        with open("/proc/meminfo", "r") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    total_kb = float(line.split()[1])
                    ram_gb = round(total_kb / (1024 * 1024), 2)
                    break
    except Exception:
        try:
            import psutil
            ram_gb = round(psutil.virtual_memory().total / (1024**3), 2)
        except Exception:
            ram_gb = 0.0

    cpu_cores = os.cpu_count() or 1

    import shutil
    try:
        usage = shutil.disk_usage("/")
        disk_free_gb = round(usage.free / (1024**3), 2)
    except Exception:
        disk_free_gb = 0.0

    cuda_available = False
    gpu_name = "None (CPU Node)"
    vram_gb = 0.0

    try:
        import torch
        if torch.cuda.is_available():
            cuda_available = True
            props = torch.cuda.get_device_properties(0)
            gpu_name = props.name
            vram_gb = round(props.total_memory / (1024**3), 2)
    except ImportError:
        # Check via nvidia-smi if torch not yet imported
        import subprocess
        try:
            out = subprocess.check_output(
                ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
                text=True, timeout=2
            ).strip()
            if out:
                parts = out.split(",")
                gpu_name = parts[0].strip()
                vram_gb = round(float(parts[1].strip()) / 1024.0, 2)
                cuda_available = True
        except Exception:
            pass

    return {
        "platform": platform.platform(),
        "cpu_cores": cpu_cores,
        "ram_gb": ram_gb,
        "cuda_available": cuda_available,
        "gpu_name": gpu_name,
        "vram_gb": vram_gb,
        "disk_free_gb": disk_free_gb
    }

def enforce_hardware_gate(hw):
    """
    Hardware gate classification:
    - DATASET_AND_EVALUATION_CAPABLE
    - FULL_7B_QLORA_TRAINING_UNAVAILABLE
    """
    print("=" * 70)
    print("ZYNTHEOR CORE 0.1 — HARDWARE AUDIT PRE-FLIGHT")
    print(f"Platform: {hw['platform']}")
    print(f"CPU Cores: {hw['cpu_cores']} | RAM: {hw['ram_gb']} GB | Disk Free: {hw['disk_free_gb']} GB")
    print(f"CUDA Available: {hw['cuda_available']} | GPU: {hw['gpu_name']} | VRAM: {hw['vram_gb']} GB")
    print(f"Minimum Required VRAM: {MINIMUM_REQUIRED_VRAM_GB} GB")
    print("=" * 70)

    if not hw["cuda_available"] or hw["vram_gb"] < MINIMUM_REQUIRED_VRAM_GB:
        print("[FAIL-CLOSED GATE TRIGGERED]")
        print("Hardware Classification:")
        print("  ✓ DATASET_AND_EVALUATION_CAPABLE: True")
        print("  ✗ FULL_7B_QLORA_TRAINING_UNAVAILABLE: True")
        print("\nReason:")
        if not hw["cuda_available"]:
            print("  No NVIDIA GPU with CUDA accelerator was detected on this node.")
        else:
            print(f"  Detected VRAM ({hw['vram_gb']} GB) is insufficient for 7.61B QLoRA (requires >= {MINIMUM_REQUIRED_VRAM_GB} GB).")
        print("\nStrict Zero-Mock Directive:")
        print("  ZYNTHEOR prohibits fabricating weight files or simulating training progress.")
        print("  State remains: SPECIFICATION_LOCKED_PENDING_GPU_RUN.")
        print("  Weights status: UNTRAINED — NO VERIFIED CHECKPOINT.")
        print("=" * 70)
        return False

    return True

def run_qlora_training():
    hw = audit_hardware()
    if not enforce_hardware_gate(hw):
        sys.exit(1)

    # If GPU >= 16GB is available, execute genuine training pipeline:
    print("[INIT] Loading HuggingFace Transformers, PEFT, BitsAndBytes...")
    import torch
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
        TrainingArguments
    )
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from datasets import Dataset

    # Quantization Config (4-bit NF4)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True
    )

    base_model_name = "Qwen/Qwen2.5-Coder-7B-Instruct"
    print(f"[LOADING] Base model {base_model_name} with NF4 quantization...")
    tokenizer = AutoTokenizer.from_pretrained(base_model_name, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )

    model = prepare_model_for_kbit_training(model)

    # LoRA Config
    peft_config = LoraConfig(
        r=32,
        lora_alpha=64,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )

    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # Load dataset
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        raw_samples = json.load(f)

    train_samples = [s for s in raw_samples if s.get("split") == "train"]
    print(f"[DATASET] Loaded {len(train_samples)} training samples for instruction tuning.")

    # Format into ChatML
    formatted_data = []
    for item in train_samples:
        chatml_text = (
            f"<|im_start|>system\nYou are ZYNTHEOR CORE 0.1, an advanced Thai-English software engineering AI.<|im_end|>\n"
            f"<|im_start|>user\n{item['instruction']}<|im_end|>\n"
            f"<|im_start|>assistant\n{item['expected_output']}<|im_end|>"
        )
        formatted_data.append({"text": chatml_text})

    dataset = Dataset.from_list(formatted_data)

    training_args = TrainingArguments(
        output_dir=str(CHECKPOINT_DIR / "zyntheor-core-0.1-run"),
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        learning_rate=2e-5,
        logging_steps=1,
        num_train_epochs=1,
        seed=GENESIS_SEED,
        fp16=False,
        bf16=True,
        save_strategy="epoch",
        report_to="none"
    )

    from trl import SFTTrainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=2048,
        tokenizer=tokenizer,
        args=training_args
    )

    print("[TRAINING] Commencing genuine backpropagation loop...")
    trainer.train()

    # Save final adapter weights
    final_output = CHECKPOINT_DIR / "zyntheor-core-0.1-adapter"
    trainer.model.save_pretrained(str(final_output))
    tokenizer.save_pretrained(str(final_output))
    print(f"[SUCCESS] Checkpoint adapter weights saved to {final_output}")

if __name__ == "__main__":
    run_qlora_training()
