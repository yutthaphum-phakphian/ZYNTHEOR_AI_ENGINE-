#!/usr/bin/env python3
"""Held-out test evaluation for a registered ZYNTHEOR CORE_NATIVE checkpoint."""
import json, hashlib, sys
from pathlib import Path
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from native_cpu_model import ZyntheorNativeCPU
from train_native_cpu import ROOT, IDENTITY, CONFIG, DATASET, load_json, load_native_identity, sha256, Samples, atomic_json


def main():
    identity=load_native_identity()
    rel=identity.get('checkpoint')
    if not rel or identity.get('identity')!='CORE_NATIVE':
        raise RuntimeError('No registered CORE_NATIVE checkpoint is available.')
    path=(ROOT/rel).resolve(); allowed=(ROOT/'training/checkpoints/native_cpu').resolve()
    if allowed not in path.parents or not path.is_file(): raise RuntimeError('Checkpoint path is invalid.')
    actual=sha256(path)
    if actual != identity.get('checkpoint_sha256'): raise RuntimeError('Checkpoint SHA-256 mismatch.')
    payload=torch.load(path,map_location='cpu',weights_only=True)
    current_samples_sha=sha256(DATASET)
    current_manifest_sha=sha256(ROOT/'training/dataset/manifest.json')
    if payload.get('dataset',{}).get('samples_sha256') != current_samples_sha or payload.get('dataset',{}).get('manifest_sha256') != current_manifest_sha:
        raise RuntimeError('Checkpoint training dataset/manifest digest does not match current dataset files.')
    if payload.get('random_initialization') is not True or payload.get('parent_model_id') is not None:
        raise RuntimeError('Checkpoint does not prove CORE_NATIVE random initialization lineage.')
    cfg=load_json(CONFIG); model=ZyntheorNativeCPU(**cfg['architecture']); model.load_state_dict(payload['model_state_dict']); model.eval()
    rows=load_json(DATASET); ds=Samples(rows,'test',cfg['architecture']['context'])
    if not len(ds): raise RuntimeError('Held-out test split is empty.')
    losses=[]
    with torch.no_grad():
        for x,y in DataLoader(ds,batch_size=1):
            logits=model(x)
            loss=F.cross_entropy(logits.reshape(-1,logits.size(-1)),y.reshape(-1),ignore_index=-100)
            if not torch.isfinite(loss): raise FloatingPointError('Non-finite test loss.')
            losses.append(float(loss.item()))
    report={'phase':'P16','status':'EVALUATED_EXPERIMENTAL','checkpoint':rel,'checkpoint_sha256':actual,
            'dataset_samples_sha256':current_samples_sha,'dataset_manifest_sha256':current_manifest_sha,
            'parameter_count':sum(p.numel() for p in model.parameters() if p.requires_grad),
            'test_samples':len(ds),'mean_test_loss':sum(losses)/len(losses),
            'production_approval':'NOT_GRANTED','note':'Loss-only held-out evaluation; no claim of task competence or production readiness.'}
    atomic_json(ROOT/'docs/audit/P16_NATIVE_MODEL_EVALUATION.json',report)
    print(json.dumps(report,indent=2)); return 0

if __name__=='__main__':
    try: raise SystemExit(main())
    except Exception as exc:
        print(f'P16 EVALUATION BLOCKED/FAILED: {type(exc).__name__}: {exc}',file=sys.stderr); raise SystemExit(2)
