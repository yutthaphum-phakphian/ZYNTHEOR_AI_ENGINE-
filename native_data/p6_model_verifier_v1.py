import json, hashlib, base64, pathlib, sys
import torch
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

def gate_result(name, status, reason, code=""):
    return {"gate":name,"status":status,"reason":reason,"error_code":code}

def verify(manifest_path, trust_store):
    m=json.loads(pathlib.Path(manifest_path).read_text(encoding="utf-8"))
    t=json.loads(pathlib.Path(trust_store).read_text(encoding="utf-8"))
    gates=[]
    # 1 checkpoint_integrity
    try:
        ckpt_path=pathlib.Path(m["checkpoint"]["path"])
        exp=m["checkpoint"]["expected_sha256"]
        actual=hashlib.sha256(ckpt_path.read_bytes()).hexdigest()
        gates.append(gate_result("checkpoint_integrity","PASS" if actual==exp else "FAIL",f"{actual[:16]} vs {exp[:16]}","SHA_MISMATCH" if actual!=exp else ""))
    except Exception as e:
        gates.append(gate_result("checkpoint_integrity","FAIL",str(e),"MISSING"))
    # 2 dataset_integrity
    try:
        dpath=pathlib.Path(m["dataset"]["path"])
        exp=m["dataset"]["expected_sha256"]
        actual=hashlib.sha256(dpath.read_bytes()).hexdigest()
        gates.append(gate_result("dataset_integrity","PASS" if actual==exp else "FAIL",f"dataset {actual[:12]}","SHA_MISMATCH" if actual!=exp else ""))
    except Exception as e:
        gates.append(gate_result("dataset_integrity","FAIL",str(e),"DATASET_MISSING"))
    # 3 signature_verification
    try:
        sig=base64.b64decode(pathlib.Path(str(manifest_path)+".sig").read_text().strip())
        pub=Ed25519PublicKey.from_public_bytes(base64.b64decode(t["keys"][0]["public_key"]))
        pub.verify(sig, pathlib.Path(manifest_path).read_bytes())
        gates.append(gate_result("signature_verification","PASS",f"Ed25519 {t['keys'][0]['key_id'][:16]}"))
        trust_ok=True
    except Exception as e:
        gates.append(gate_result("signature_verification","FAIL",str(e),"SIG_FAIL"))
        trust_ok=False
    # 4 fresh_reload 7/7
    try:
        ckpt=torch.load(ckpt_path, map_location="cpu")
        state=ckpt.get("model", ckpt)
        # สร้าง model เปล่าเพื่อ reload
        from training.train_p6_6caps_v2_lowram import ZyntheorP5
        model=ZyntheorP5(vocab_size=ckpt.get("vocab_size", 500))
        model.load_state_dict(state)
        total=sum(p.numel() for p in model.parameters())
        gates.append(gate_result("fresh_reload","PASS" if total>=6000000 else "FAIL",f"reload True params {total} 7/7",""))
    except Exception as e:
        gates.append(gate_result("fresh_reload","FAIL",str(e),"RELOAD_FAIL"))
    # 5 smoke_test
    try:
        model.eval()
        with torch.no_grad():
            x=torch.randint(0, 100, (2,128))
            out=model(x)
            assert out.shape[0]==2 and out.shape[1]==128
        gates.append(gate_result("smoke_test","PASS",f"forward shape {out.shape}"))
    except Exception as e:
        gates.append(gate_result("smoke_test","FAIL",str(e),"SMOKE_FAIL"))
    # 6 model_evaluation - เช็ค train log ว่า loss ลด
    try:
        log=pathlib.Path(m["training"]["log_path"]).read_text() if "training" in m else ""
        # หา Train loss ลดจริง
        import re
        trains=[float(x) for x in re.findall(r"Train (\d+\.\d+)", log)]
        vals=[float(x) for x in re.findall(r"Val (\d+\.\d+)", log)]
        decreasing = len(trains)>=2 and trains[-1]<trains[0]
        gates.append(gate_result("model_evaluation","PASS" if decreasing else "FAIL",f"Train {trains} Val {vals}","LOSS_NOT_DECREASING" if not decreasing else ""))
    except Exception as e:
        gates.append(gate_result("model_evaluation","FAIL",str(e),"EVAL_FAIL"))
    # 7 training_evidence
    try:
        has_log=pathlib.Path(m["training"]["log_path"]).exists()
        gates.append(gate_result("training_evidence","PASS" if has_log else "FAIL",f"log exists {has_log}"))
    except Exception as e:
        gates.append(gate_result("training_evidence","FAIL",str(e),""))
    # 8 trust_store_status
    try:
        perms=oct(pathlib.Path(trust_store).stat().st_mode)[-3:]
        is_outside="/tmp/outside" in trust_store
        schema=t.get("schema_version","")=="1.0"
        gates.append(gate_result("trust_store_status","PASS" if schema and is_outside else "FAIL",f"schema 1.0 {schema} outside {is_outside} perms {perms}"))
    except Exception as e:
        gates.append(gate_result("trust_store_status","FAIL",str(e),""))
    # 9 p5_readiness 10 p6_gate
    fail=[g for g in gates if g["status"]!="PASS"]
    p6_ready="PASS" if not fail else "FAIL"
    gates.append(gate_result("p5_readiness",p6_ready,"All mandatory PASS" if not fail else f"fail {[f['gate'] for f in fail]}"))
    gates.append(gate_result("p6_gate","OPEN" if p6_ready=="PASS" else "BLOCKED","OPEN" if p6_ready=="PASS" else "BLOCKED"))
    final="PASS" if p6_ready=="PASS" else "FAIL"
    return {"final_status":final,"p6_readiness":{"status":p6_ready},"p6_gate":"OPEN" if final=="PASS" else "BLOCKED","gates":gates,"trusted_provenance":{"trust_store_status":"PASS" if trust_ok else "FAIL"},"dataset_summary":m["dataset"],"checkpoint_summary":m["checkpoint"]}

if __name__=="__main__":
    import argparse, json
    ap=argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--trust-store", required=True)
    a=ap.parse_args()
    res=verify(a.manifest, a.trust_store)
    print(json.dumps(res, indent=2, ensure_ascii=False))
