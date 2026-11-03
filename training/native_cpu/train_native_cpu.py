#!/usr/bin/env python3
"""Governed native CPU training entry point for ZYNTHEOR CORE X P16."""
from __future__ import annotations
import argparse, hashlib, json, os, platform, random, shutil, sys, tempfile, time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset
from native_cpu_model import ZyntheorNativeCPU, encode_bytes, count_parameters

ROOT = Path(__file__).resolve().parents[2]
DATASET = ROOT / "training/dataset/samples.json"
MANIFEST = ROOT / "training/dataset/manifest.json"
CONFIG = ROOT / "training/native_cpu/config.json"
REGISTRY = ROOT / "training/registry/model_registry.json"
IDENTITY = ROOT / "training/registry/native_model_identity.json"
PROVENANCE = ROOT / "training/dataset/DATASET_PROVENANCE_MANIFEST.json"
OUT = ROOT / "training/checkpoints/native_cpu"
REPORT = ROOT / "docs/audit/P16_TRAINING_REPORT.json"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_native_identity() -> dict[str, Any]:
    registry = load_json(IDENTITY)
    if isinstance(registry.get("models"), list):
        record = next((item for item in registry["models"] if item.get("model_id") == "zyntheor-native-cpu-001"), None)
        if record is None:
            raise ValueError("Native model identity is not registered.")
        return record
    return registry


def save_native_identity(identity: dict[str, Any]) -> None:
    registry = load_json(IDENTITY)
    if isinstance(registry.get("models"), list):
        models = list(registry["models"])
        for index, current in enumerate(models):
            if current.get("model_id") == identity.get("model_id"):
                models[index] = {**current, **identity}
                break
        else:
            models.append(identity)
        updated = {**registry, "updated_at": datetime.now(timezone.utc).isoformat(), "models": models}
        atomic_json(IDENTITY, updated)
    else:
        atomic_json(IDENTITY, identity)


def atomic_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
            f.write("\n")
            f.flush(); os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)


def validate_dataset() -> dict[str, Any]:
    manifest = load_json(MANIFEST)
    rows = load_json(DATASET)
    if not isinstance(rows, list) or not rows:
        raise ValueError("Dataset must be a non-empty JSON array")
    required = set(manifest.get("schema", {}).get("required_fields", []))
    allowed_splits = set(manifest.get("schema", {}).get("allowed_splits", []))
    seen_ids, seen_instructions = set(), {}
    counts = {"train": 0, "validation": 0, "test": 0}
    allowed_languages = set(manifest.get("schema", {}).get("allowed_languages", []))
    for i, row in enumerate(rows):
        missing = required - set(row)
        if missing: raise ValueError(f"row {i} missing fields: {sorted(missing)}")
        if row["id"] in seen_ids: raise ValueError(f"duplicate sample id: {row['id']}")
        seen_ids.add(row["id"])
        if row["split"] not in allowed_splits: raise ValueError(f"invalid split: {row['split']}")
        if allowed_languages and row["language"] not in allowed_languages: raise ValueError(f"invalid language: {row['language']}")
        if not str(row["instruction"]).strip() or not str(row["expected_output"]).strip():
            raise ValueError(f"empty instruction/output: {row['id']}")
        if not row.get("license") or not row.get("source"):
            raise ValueError(f"missing provenance: {row['id']}")
        normalized = " ".join(str(row["instruction"]).lower().split())
        previous = seen_instructions.get(normalized)
        if previous and previous != row["split"]:
            raise ValueError(f"cross-split exact leakage: {row['id']}")
        seen_instructions[normalized] = row["split"]
        counts[row["split"]] += 1
    if not counts["train"] or not counts["validation"] or not counts["test"]:
        raise ValueError(f"all train/validation/test splits are required: {counts}")
    return {"sample_count": len(rows), "split_counts": counts, "samples_sha256": sha256(DATASET),
            "manifest_sha256": sha256(MANIFEST), "licenses": sorted({r['license'] for r in rows}),
            "sources": sorted({r['source'] for r in rows})}


def check_governance() -> None:
    manifest = load_json(MANIFEST)
    prov = manifest.get("provenance", {})
    if prov.get("human_review_status") != "APPROVED":
        raise PermissionError("Training blocked: dataset human_review_status must be APPROVED by its authorized owner.")
    if prov.get("training_license_claim") != "APPROVED_FOR_TRAINING":
        raise PermissionError("Training blocked: provenance training_license_claim must be APPROVED_FOR_TRAINING.")
    sample_provenance = load_json(PROVENANCE)
    rows = load_json(DATASET)
    if sample_provenance.get("samplesSha256") != sha256(DATASET):
        raise PermissionError("Training blocked: provenance manifest dataset SHA-256 does not match samples.json.")
    provenance_rows = sample_provenance.get("samples", [])
    by_id = {sample.get("id"): sample for sample in provenance_rows}
    dataset_by_id = {row.get("id"): row for row in rows}
    if len(by_id) != len(provenance_rows) or set(by_id) != set(dataset_by_id):
        raise PermissionError("Training blocked: sample-level provenance IDs do not exactly match dataset IDs.")
    for sid, row in dataset_by_id.items():
        sample = by_id[sid]
        sample_digest = hashlib.sha256(json.dumps(row, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest()
        if sample.get("sampleSha256") != sample_digest:
            raise PermissionError(f"Training blocked: sample content digest mismatch for {sid}.")
        if sample.get("split") != row.get("split"):
            raise PermissionError(f"Training blocked: split provenance mismatch for {sid}.")
        if sample.get("source", {}).get("claim") != row.get("source"):
            raise PermissionError(f"Training blocked: source claim mismatch for {sid}.")
        if sample.get("license", {}).get("claim") != row.get("license"):
            raise PermissionError(f"Training blocked: license claim mismatch for {sid}.")
        classification = str(sample.get("dataClassification", "")).lower()
        if classification in {"private_memory", "workspace_private", "personal_data"} and sample.get("explicitTrainingConsent") is not True:
            raise PermissionError(f"Training blocked: private data lacks explicit training consent for {sid}.")
        if sample.get("source", {}).get("verificationStatus") != "VERIFIED":
            raise PermissionError(f"Training blocked: source provenance is not verified for {sid}.")
        if sample.get("license", {}).get("verificationStatus") != "VERIFIED":
            raise PermissionError(f"Training blocked: license is not verified for {sid}.")
        review = sample.get("humanReview", {})
        if review.get("status") != "APPROVED" or not review.get("reviewer") or not review.get("reviewedAt"):
            raise PermissionError(f"Training blocked: human review with reviewer/time is not recorded for {sid}.")


def hardware() -> dict[str, Any]:
    try:
        import psutil
        ram = round(psutil.virtual_memory().total / 1024**3, 2)
        disk = round(shutil.disk_usage(ROOT).free / 1024**3, 2)
    except Exception:
        ram, disk = None, None
    return {"platform": platform.platform(), "cpu_count": os.cpu_count(), "ram_gb": ram,
            "cuda_available": torch.cuda.is_available(), "cuda_device_count": torch.cuda.device_count(),
            "disk_free_gb": disk, "torch_version": torch.__version__}


class Samples(Dataset):
    def __init__(self, rows: list[dict[str, Any]], split: str, context: int):
        self.items = []
        for row in rows:
            if row["split"] != split: continue
            text = "<instruction>\n" + row["instruction"] + "\n<context>\n" + str(row.get("context", "")) + "\n<answer>\n" + row["expected_output"]
            ids = encode_bytes(text)
            ids = ids[:context + 1]
            if len(ids) >= 2: self.items.append(torch.tensor(ids, dtype=torch.long))
        self.context = context
    def __len__(self): return len(self.items)
    def __getitem__(self, idx):
        seq = self.items[idx]
        x = torch.full((self.context,), 256, dtype=torch.long)
        y = torch.full((self.context,), -100, dtype=torch.long)
        n = min(len(seq) - 1, self.context)
        x[:n] = seq[:n]
        y[:n] = seq[1:n+1]
        return x, y


def evaluate(model, loader, device) -> float:
    model.eval(); losses=[]
    with torch.no_grad():
        for x,y in loader:
            x,y=x.to(device),y.to(device)
            logits=model(x)
            loss=F.cross_entropy(logits.reshape(-1, logits.size(-1)), y.reshape(-1), ignore_index=-100)
            if not torch.isfinite(loss): raise FloatingPointError("non-finite validation loss")
            losses.append(float(loss.item()))
    return sum(losses)/len(losses) if losses else float("nan")


def train(args) -> dict[str, Any]:
    check_governance()
    validation = validate_dataset()
    cfg = load_json(CONFIG)
    seed = int(cfg["seed"])
    random.seed(seed); torch.manual_seed(seed)
    if torch.cuda.is_available(): torch.cuda.manual_seed_all(seed)
    device = torch.device("cpu")
    model = ZyntheorNativeCPU(**cfg["architecture"]).to(device)
    params = count_parameters(model)
    if not (cfg["parameter_range"][0] <= params <= cfg["parameter_range"][1]):
        raise ValueError(f"parameter count {params} outside configured range {cfg['parameter_range']}")
    rows=load_json(DATASET); context=int(cfg["architecture"]["context"])
    train_ds=Samples(rows,"train",context); val_ds=Samples(rows,"validation",context)
    if not len(train_ds) or not len(val_ds): raise ValueError("train and validation datasets must be non-empty")
    batch=int(cfg["batch_size"])
    train_loader=DataLoader(train_ds,batch_size=batch,shuffle=True,generator=torch.Generator().manual_seed(seed))
    val_loader=DataLoader(val_ds,batch_size=batch,shuffle=False)
    optimizer=torch.optim.AdamW(model.parameters(),lr=float(cfg["learning_rate"]),weight_decay=float(cfg["weight_decay"]))
    resumed_from = None
    resume_payload = None
    if args.resume:
        resume_path = Path(args.resume).resolve()
        allowed_root = (ROOT / "training/checkpoints/native_cpu").resolve()
        if allowed_root not in resume_path.parents or not resume_path.is_file():
            raise ValueError("resume checkpoint must be an existing file inside training/checkpoints/native_cpu")
        identity = load_native_identity()
        if identity.get("checkpoint") != str(resume_path.relative_to(ROOT)) or identity.get("checkpoint_sha256") != sha256(resume_path):
            raise ValueError("resume checkpoint does not match the registered SHA-256 identity")
        resume_payload = torch.load(resume_path, map_location="cpu", weights_only=True)
        if resume_payload.get("identity") != "CORE_NATIVE" or resume_payload.get("parent_model_id") is not None:
            raise ValueError("resume checkpoint is not a verified CORE_NATIVE lineage")
        model.load_state_dict(resume_payload["model_state_dict"])
        optimizer.load_state_dict(resume_payload["optimizer_state_dict"])
        resumed_from = str(resume_path.relative_to(ROOT))
        initial_digest = resume_payload["initial_weights_sha256"]
    else:
        initial_digest=hashlib.sha256(b"".join(p.detach().cpu().numpy().tobytes() for p in model.parameters())).hexdigest()
    started=time.time(); steps=0; last_loss=None
    for epoch in range(int(args.epochs or cfg["epochs"])):
        model.train()
        for x,y in train_loader:
            x,y=x.to(device),y.to(device)
            optimizer.zero_grad(set_to_none=True)
            logits=model(x)
            loss=F.cross_entropy(logits.reshape(-1,logits.size(-1)),y.reshape(-1),ignore_index=-100)
            if not torch.isfinite(loss): raise FloatingPointError("non-finite training loss")
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(),float(cfg["max_grad_norm"]))
            optimizer.step(); steps += 1; last_loss=float(loss.item())
        val_loss=evaluate(model,val_loader,device)
    final_digest=hashlib.sha256(b"".join(p.detach().cpu().numpy().tobytes() for p in model.parameters())).hexdigest()
    if initial_digest == final_digest: raise RuntimeError("optimizer did not change model weights")
    OUT.mkdir(parents=True,exist_ok=True)
    ckpt=OUT / f"zyntheor-native-cpu-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.pt"
    payload={"format_version":1,"model_id":"zyntheor-native-cpu-001","identity":"CORE_NATIVE",
             "parent_model_id":None,"random_initialization":True,"seed":seed,
             "architecture":cfg["architecture"],"parameter_count":params,
             "model_state_dict":model.state_dict(),"optimizer_state_dict":optimizer.state_dict(),
             "resumed_from":resumed_from,
             "training":{"steps":steps,"last_train_loss":last_loss,"validation_loss":val_loss},
             "dataset":validation,"initial_weights_sha256":initial_digest,"final_weights_sha256":final_digest}
    fd,tmp=tempfile.mkstemp(prefix=".native-checkpoint.",dir=OUT); os.close(fd)
    try: torch.save(payload,tmp); os.replace(tmp,ckpt)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)
    digest=sha256(ckpt)
    identity={"model_id":"zyntheor-native-cpu-001","identity":"CORE_NATIVE","status":"TRAINED_EXPERIMENTAL",
              "parent_model_id":None,"initialization":"RANDOM_SEED_INITIALIZATION","seed":seed,
              "architecture":cfg["architecture"],"parameter_count":params,"checkpoint":str(ckpt.relative_to(ROOT)),
              "checkpoint_sha256":digest,"initial_weights_sha256":initial_digest,"final_weights_sha256":final_digest,
              "dataset_manifest_sha256":validation["manifest_sha256"],"dataset_samples_sha256":validation["samples_sha256"],
              "resumed_from":resumed_from,"trained_at":datetime.now(timezone.utc).isoformat(),"inference_ready":False,
              "qualification_note":"Experimental checkpoint only; not production-approved or benchmark-qualified."}
    identity.update({"trained_weights_exist": True, "inference_ready": False, "production_approved": False})
    save_native_identity(identity)
    report={"phase":"P16","status":"TRAINED_EXPERIMENTAL","training_executed":True,"hardware":hardware(),
            "dataset":validation,"parameter_count":params,"initial_weights_sha256":initial_digest,
            "final_weights_sha256":final_digest,"checkpoint":identity["checkpoint"],"checkpoint_sha256":digest,
            "steps":steps,"last_train_loss":last_loss,"validation_loss":val_loss,"resumed_from":resumed_from,
            "elapsed_seconds":round(time.time()-started,2),"production_approval":"NOT_GRANTED"}
    atomic_json(REPORT,report)
    return report


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("command",choices=["hardware","validate","train","evaluate"])
    parser.add_argument("--epochs",type=int,default=None)
    parser.add_argument("--resume",default=None,help="Resume from a registered, SHA-256-verified native checkpoint")
    args=parser.parse_args()
    if args.command=="hardware": print(json.dumps(hardware(),indent=2)); return 0
    if args.command=="validate": print(json.dumps(validate_dataset(),indent=2)); return 0
    if args.command=="evaluate":
        import subprocess
        script = ROOT / "training/native_cpu/evaluate_native_cpu.py"
        completed = subprocess.run([sys.executable, str(script)], cwd=ROOT, check=False)
        return completed.returncode
    print(json.dumps(train(args),indent=2)); return 0

if __name__=="__main__":
    try: raise SystemExit(main())
    except Exception as exc:
        print(f"P16 BLOCKED/FAILED: {type(exc).__name__}: {exc}",file=sys.stderr)
        raise SystemExit(2)
