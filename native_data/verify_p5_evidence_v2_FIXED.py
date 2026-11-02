#!/usr/bin/env python3
import hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
NATIVE = ROOT / 'native_data'
CKPT = NATIVE / 'p5_2_checkpoint_full.npz'
MANIFEST = NATIVE / 'p5_1_manifest.json'
OLD = NATIVE / 'verify_p5_evidence.py'

def sha_fresh(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for c in iter(lambda: f.read(8192), b''): h.update(c)
    return h.hexdigest()

def check():
    if not CKPT.exists():
        return {"status":"BLOCKED_BY_MISSING_CHECKPOINT","p5_status":"EVIDENCE_PENDING","p6_start_permission":"BLOCKED_BY_P5_EVIDENCE","p6_gate":"BLOCKED","checks":{"checkpoint_exists":"MISSING","last_known_sha":"25781542f18591134d4d83618c8a8f3d2cdf958c07b0f89ece0c6c0991047c67","last_known_size":50168},"old_verifier_preserved": OLD.exists()}
    size=CKPT.stat().st_size
    sha=sha_fresh(CKPT)
    manifest_sha=None
    if MANIFEST.exists():
        try: manifest_sha=json.loads(MANIFEST.read_text()).get('checkpoint',{}).get('expected_sha256')
        except: pass
    try:
        import numpy as np
        data=np.load(CKPT)
        param_real=sum(v.size for v in data.values())
    except Exception as e:
        return {"status":"FAILED_LOAD","error":str(e),"p5_status":"FAILED","p6_start_permission":"BLOCKED_BY_P5_EVIDENCE","p6_gate":"BLOCKED"}
    if manifest_sha and sha!=manifest_sha:
        return {"status":"FAILED_HASH_MISMATCH","sha_fresh":sha,"sha_manifest":manifest_sha,"p5_status":"FAILED","p6_start_permission":"BLOCKED_BY_P5_EVIDENCE","p6_gate":"BLOCKED"}
    p5="VERIFIED_SMOKE_TEST" if param_real>=100000 else "INCONCLUSIVE"
    return {"p5_status":p5,"p6_start_permission":"BLOCKED_BY_P5_EVIDENCE","p6_gate":"BLOCKED","evidence":{"size_bytes_real":size,"sha256_fresh":sha,"sha_manifest":manifest_sha,"param_count_real":param_real,"old_verifier_preserved":OLD.exists()},"policy":{"no_auto_git_add_f_npz":True}}
if __name__=='__main__':
    out=check()
    print(json.dumps(out,indent=2))
    (NATIVE/'p5_p6_gate_report_v2.json').write_text(json.dumps(out,indent=2))
