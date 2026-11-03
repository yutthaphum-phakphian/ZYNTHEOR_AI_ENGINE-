#!/usr/bin/env python3
import hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
NATIVE = ROOT / 'native_data'
MANIFEST = NATIVE / 'p5_1_manifest.json'
OLD = NATIVE / 'verify_p5_evidence.py'

def sha_fresh(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for c in iter(lambda: f.read(8192), b''): h.update(c)
    return h.hexdigest()

def check():
    if not MANIFEST.exists():
        return {"status":"BLOCKED_BY_MISSING_MANIFEST","p5_status":"EVIDENCE_PENDING","p6_start_permission":"BLOCKED_BY_P5_EVIDENCE","p6_gate":"BLOCKED","old_verifier_preserved": OLD.exists()}
    manifest=json.loads(MANIFEST.read_text())
    checkpoint=manifest.get('checkpoint', {})
    checkpoint_path=checkpoint.get('path') or manifest.get('checkpoint_path') or manifest.get('checkpoint')
    if not checkpoint_path:
        return {"status":"BLOCKED_BY_MISSING_CHECKPOINT_PATH","p5_status":"EVIDENCE_PENDING","p6_start_permission":"BLOCKED_BY_P5_EVIDENCE","p6_gate":"BLOCKED","old_verifier_preserved": OLD.exists()}
    CKPT=Path(checkpoint_path)
    if not CKPT.is_absolute():
        CKPT=ROOT / CKPT
    if not CKPT.exists():
        return {"status":"BLOCKED_BY_MISSING_CHECKPOINT","p5_status":"EVIDENCE_PENDING","p6_start_permission":"BLOCKED_BY_P5_EVIDENCE","p6_gate":"BLOCKED","checks":{"checkpoint_exists":"MISSING","checkpoint_path":str(CKPT)},"old_verifier_preserved": OLD.exists()}
    size=CKPT.stat().st_size
    sha=sha_fresh(CKPT)
    manifest_sha=checkpoint.get('sha256_after') or checkpoint.get('sha256') or checkpoint.get('expected_sha256') or manifest.get('checkpoint_sha256') or manifest.get('sha256')
    try:
        if CKPT.suffix == '.npz':
            import numpy as np
            data=np.load(CKPT, allow_pickle=False)
            param_real=sum(v.size for v in data.values())
        else:
            import torch
            data=torch.load(CKPT, map_location='cpu', weights_only=True)
            state=data.get('model_state_dict', data.get('model_state', data.get('state_dict', data))) if isinstance(data, dict) else data
            param_real=sum(value.numel() for value in state.values() if isinstance(value, torch.Tensor))
    except Exception as e:
        return {"status":"FAILED_LOAD","error":str(e),"p5_status":"FAILED","p6_start_permission":"BLOCKED_BY_P5_EVIDENCE","p6_gate":"BLOCKED"}
    if manifest_sha and sha!=manifest_sha:
        return {"status":"FAILED_HASH_MISMATCH","sha_fresh":sha,"sha_manifest":manifest_sha,"p5_status":"FAILED","p6_start_permission":"BLOCKED_BY_P5_EVIDENCE","p6_gate":"BLOCKED"}
    p5="VERIFIED_SMOKE_TEST" if param_real>=100000 else "INCONCLUSIVE"
    return {"status":p5,"p5_status":p5,"p6_start_permission":"BLOCKED_BY_P5_EVIDENCE","p6_gate":"BLOCKED","evidence":{"checkpoint_path":str(CKPT.relative_to(ROOT)) if CKPT.is_relative_to(ROOT) else str(CKPT),"size_bytes_real":size,"sha256_fresh":sha,"sha_manifest":manifest_sha,"param_count_real":param_real,"old_verifier_preserved":OLD.exists()},"policy":{"no_auto_git_add_f_npz":True}}
if __name__=='__main__':
    out=check()
    print(json.dumps(out,indent=2))
    (NATIVE/'p5_p6_gate_report_v2.json').write_text(json.dumps(out,indent=2))
