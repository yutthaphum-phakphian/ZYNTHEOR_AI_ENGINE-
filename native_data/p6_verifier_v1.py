import json, hashlib, base64, pathlib, collections, sys
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.exceptions import InvalidSignature

def load_manifest(p):
    return json.loads(pathlib.Path(p).read_text(encoding="utf-8"))

def verify_p6(manifest_path, trust_store_path):
    m_path = pathlib.Path(manifest_path)
    t_path = pathlib.Path(trust_store_path)
    manifest = load_manifest(m_path)
    dataset_path = pathlib.Path(manifest["dataset"]["path"])
    
    gates = []
    # 1. dataset exists & sha
    try:
        actual_sha = hashlib.sha256(dataset_path.read_bytes()).hexdigest()
        exp_sha = manifest["dataset"]["expected_sha256"]
        gates.append({"gate":"dataset_integrity","status":"PASS" if actual_sha==exp_sha else "FAIL","reason":f"sha {actual_sha[:16]} vs exp {exp_sha[:16]}","error_code":"SHA_MISMATCH" if actual_sha!=exp_sha else ""})
    except Exception as e:
        gates.append({"gate":"dataset_integrity","status":"FAIL","reason":str(e),"error_code":"DATASET_MISSING"})

    # 2. JSONL & counts
    try:
        lines = dataset_path.read_text(encoding="utf-8").splitlines()
        caps = collections.Counter()
        ids = set()
        dup=False
        thai_cnt=0
        for line in lines:
            o=json.loads(line)
            if not all(k in o for k in ("id","capability","input","output","split")):
                raise ValueError("missing field")
            if o["id"] in ids: dup=True
            ids.add(o["id"])
            caps[o["capability"]]+=1
            # thai check
            txt=o["input"]+o["output"]
            if any('\u0e00' <= ch <= '\u0e7f' for ch in txt):
                thai_cnt+=1
        cap_ok = len(caps)==6 and all(v>=50 for v in caps.values())
        gates.append({"gate":"capability_coverage","status":"PASS" if cap_ok else "FAIL","reason":f"{dict(caps)} total {len(lines)}","error_code":"" if cap_ok else "CAP_NOT_6x50"})
        gates.append({"gate":"duplicate_check","status":"FAIL" if dup else "PASS","reason":"dup found" if dup else f"{len(ids)} unique ids","error_code":"DUP_ID" if dup else ""})
        thai_ratio = thai_cnt/len(lines) if lines else 0
        gates.append({"gate":"thai_quality","status":"PASS" if thai_ratio>0.6 else "FAIL","reason":f"thai {thai_cnt}/{len(lines)} {thai_ratio*100:.1f}%","error_code":"" if thai_ratio>0.6 else "THAI_LOW"})
        gates.append({"gate":"format","status":"PASS","reason":f"JSONL {len(lines)} lines OK","error_code":""})
    except Exception as e:
        gates.append({"gate":"format","status":"FAIL","reason":str(e),"error_code":"JSONL_INVALID"})

    # 3. signature
    try:
        sig_path = pathlib.Path(str(m_path)+".sig")
        sig_b64 = sig_path.read_text().strip()
        sig = base64.b64decode(sig_b64)
        trust = json.loads(t_path.read_text())
        pub_b64 = trust["keys"][0]["public_key"]
        pub_raw = base64.b64decode(pub_b64)
        pub = Ed25519PublicKey.from_public_bytes(pub_raw)
        pub.verify(sig, m_path.read_bytes())
        gates.append({"gate":"signature_verification","status":"PASS","reason":f"Ed25519 key {trust['keys'][0]['key_id'][:16]}...","error_code":""})
        trust_ok=True
    except InvalidSignature:
        gates.append({"gate":"signature_verification","status":"FAIL","reason":"InvalidSignature","error_code":"SIG_FAIL"})
        trust_ok=False
    except Exception as e:
        gates.append({"gate":"signature_verification","status":"FAIL","reason":str(e),"error_code":"SIG_BLOCKED"})
        trust_ok=False

    # final
    mandatory = ["dataset_integrity","capability_coverage","duplicate_check","thai_quality","format","signature_verification"]
    fail_gates = [g for g in gates if g["gate"] in mandatory and g["status"]!="PASS"]
    p5_readiness = "PASS" if not fail_gates else "FAIL"
    p6_gate = "OPEN" if p5_readiness=="PASS" else "BLOCKED"
    final = "PASS" if p6_gate=="OPEN" else "FAIL"

    result = {
        "final_status": final,
        "p6_readiness": {"status": p5_readiness, "reason": "All mandatory gates PASS" if not fail_gates else f"fail {fail_gates}"},
        "p6_gate": p6_gate,
        "gates": gates,
        "trusted_provenance": {"trust_store_status": "PASS" if trust_ok else "FAIL", "keys": [k["key_id"] for k in json.loads(t_path.read_text()).get("keys",[])]},
        "dataset_summary": {"total": len(lines) if 'lines' in locals() else 0, "caps": dict(caps) if 'caps' in locals() else {}}
    }
    return result

if __name__=="__main__":
    import argparse
    ap=argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--trust-store", required=True)
    args=ap.parse_args()
    res=verify_p6(args.manifest, args.trust_store)
    print(json.dumps(res, indent=2, ensure_ascii=False))
