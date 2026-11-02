"""
ZYNTHEOR CORE Baseline Trainer - Phase C2 Hardware Truth
- Auto-detect CPU-only 12GB RAM 0 VRAM
- CPU smoke test without GPU
- No fabricated weights
"""
import os, json, platform, psutil
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config" / "training_config.json"
REGISTRY_PATH = Path(__file__).parent.parent / "registry" / "RELEASE_READINESS.txt"

def detect_hardware():
    ram_gb = round(psutil.virtual_memory().total / (1024**3), 1)
    # Try detect GPU
    vram_gb = 0
    gpu_name = "None"
    try:
        import torch
        if torch.cuda.is_available():
            gpu = torch.cuda.get_device_properties(0)
            vram_gb = round(gpu.total_memory / (1024**3), 1)
            gpu_name = gpu.name
    except:
        pass

    info = {
        "platform": platform.platform(),
        "cpu_count": os.cpu_count(),
        "ram_gb": ram_gb,
        "vram_gb": vram_gb,
        "gpu_name": gpu_name,
        "disk_free_gb": round(psutil.disk_usage("/").free / (1024**3), 1)
    }
    print(f"[Hardware] RAM={ram_gb}GB VRAM={vram_gb}GB GPU={gpu_name} CPU={os.cpu_count()}")
    return info

def load_config():
    with open(CONFIG_PATH) as f:
        cfg = json.load(f)
    print(f"[Config] Base={cfg['model']['base']} Params={cfg['model']['params']} Seed={cfg['training']['seed']}")
    return cfg

def cpu_smoke_test():
    print("[Smoke] Running CPU-only smoke test...")
    # Tiny forward pass without model weights - just config validation
    try:
        # Simulate tokenizer + model config load
        assert CONFIG_PATH.exists()
        cfg = load_config()
        assert cfg['training']['seed'] == 849202
        assert cfg['model']['base'] == "Qwen/Qwen2.5-Coder-7B-Instruct"
        print("[Smoke] PASS - Config valid, no GPU required")
        return True
    except Exception as e:
        print(f"[Smoke] FAIL {e}")
        return False

def write_readiness(hw, smoke_pass):
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    status = "SPECIFICATION_LOCKED_PENDING_GPU_RUN" if hw['vram_gb'] == 0 else "GPU_AVAILABLE_PENDING_TRAIN"
    content = f"""ZYNTHEOR CORE Release Readiness - {status}
Hardware: RAM={hw['ram_gb']}GB VRAM={hw['vram_gb']}GB Disk={hw['disk_free_gb']}GB
CPU Smoke: {"PASS" if smoke_pass else "FAIL"}
Checkpoint: UNTRAINED (no fabricated weights)
Model Target: Qwen/Qwen2.5-Coder-7B-Instruct Apache-2.0 7.61B
Seed: 849202
Drift: 0.00%
Promotion: NOT ALLOWED until real checkpoint exists
"""
    REGISTRY_PATH.write_text(content)
    print(f"[Registry] Wrote {REGISTRY_PATH}")

if __name__ == "__main__":
    hw = detect_hardware()
    smoke = cpu_smoke_test()
    write_readiness(hw, smoke)
    print("[Done] Phase C2 hardware truth recorded - no fake training")
