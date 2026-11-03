#!/usr/bin/env python3
"""Verified local inference for ZYNTHEOR CORE_NATIVE research checkpoints.

This runtime loads only a registered checkpoint beneath training/checkpoints/native_cpu,
uses weights_only loading, verifies lineage and digests, and never downloads a model.
"""
from __future__ import annotations
import argparse, hashlib, json, math, sys
from pathlib import Path
from typing import Any
import torch
from native_cpu_model import ZyntheorNativeCPU, encode_bytes, decode_bytes, count_parameters

ROOT = Path(__file__).resolve().parents[2]
IDENTITY = Path('training/registry/native_model_identity.json')
CONFIG = Path('training/native_cpu/config.json')
CHECKPOINT_ROOT = Path('training/checkpoints/native_cpu')

def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

def parameter_digest(model: torch.nn.Module) -> str:
    digest = hashlib.sha256()
    for parameter in model.parameters():
        digest.update(parameter.detach().cpu().contiguous().numpy().tobytes())
    return digest.hexdigest()

def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding='utf-8'))

def load_verified_model(root: Path = ROOT):
    root = root.resolve()
    identity_path = root / IDENTITY
    config_path = root / CONFIG
    if not identity_path.is_file() or not config_path.is_file():
        raise RuntimeError('NATIVE_REGISTRY_OR_CONFIG_MISSING')
    registry = read_json(identity_path)
    # Accept both the original registry envelope (models[]) and the flat
    # identity record written atomically after a successful governed training run.
    if isinstance(registry.get('models'), list):
        identity = next((item for item in registry['models']
                         if item.get('model_id') == 'zyntheor-native-cpu-001'), None)
        if identity is None:
            raise RuntimeError('NATIVE_CHECKPOINT_NOT_REGISTERED')
    else:
        identity = registry
    if identity.get('identity') != 'CORE_NATIVE' or identity.get('model_id') != 'zyntheor-native-cpu-001':
        raise RuntimeError('NATIVE_IDENTITY_MISMATCH')
    if identity.get('status') not in {'TRAINED_EXPERIMENTAL', 'EVALUATED_EXPERIMENTAL', 'RUNTIME_VERIFIED_EXPERIMENTAL'}:
        raise RuntimeError('NATIVE_MODEL_NOT_TRAINED')
    if identity.get('parent_model_id') is not None or identity.get('initialization') != 'RANDOM_SEED_INITIALIZATION':
        raise RuntimeError('NATIVE_LINEAGE_NOT_VERIFIED')
    relative = identity.get('checkpoint')
    if not isinstance(relative, str) or not relative.strip():
        raise RuntimeError('NATIVE_CHECKPOINT_NOT_REGISTERED')
    candidate = (root / relative).resolve()
    checkpoint_root = (root / CHECKPOINT_ROOT).resolve()
    if checkpoint_root not in candidate.parents or not candidate.is_file():
        raise RuntimeError('NATIVE_CHECKPOINT_PATH_INVALID')
    declared_digest = identity.get('checkpoint_sha256')
    actual_digest = sha256_file(candidate)
    if not isinstance(declared_digest, str) or actual_digest != declared_digest:
        raise RuntimeError('NATIVE_CHECKPOINT_DIGEST_MISMATCH')

    cfg = read_json(config_path)
    architecture = identity.get('architecture')
    if architecture != cfg.get('architecture'):
        raise RuntimeError('NATIVE_ARCHITECTURE_MISMATCH')
    dataset_path = root / 'training/dataset/samples.json'
    manifest_path = root / 'training/dataset/manifest.json'
    if not dataset_path.is_file() or not manifest_path.is_file():
        raise RuntimeError('NATIVE_DATASET_PROVENANCE_FILES_MISSING')
    if sha256_file(dataset_path) != identity.get('dataset_samples_sha256') or sha256_file(manifest_path) != identity.get('dataset_manifest_sha256'):
        raise RuntimeError('NATIVE_DATASET_PROVENANCE_DIGEST_MISMATCH')
    payload = torch.load(candidate, map_location='cpu', weights_only=True)
    if payload.get('dataset', {}).get('samples_sha256') != identity.get('dataset_samples_sha256') or payload.get('dataset', {}).get('manifest_sha256') != identity.get('dataset_manifest_sha256'):
        raise RuntimeError('CHECKPOINT_DATASET_PROVENANCE_MISMATCH')
    if payload.get('identity') != 'CORE_NATIVE' or payload.get('parent_model_id') is not None:
        raise RuntimeError('CHECKPOINT_LINEAGE_INVALID')
    if payload.get('random_initialization') is not True:
        raise RuntimeError('CHECKPOINT_RANDOM_INITIALIZATION_UNPROVEN')
    if payload.get('architecture') != architecture:
        raise RuntimeError('CHECKPOINT_ARCHITECTURE_MISMATCH')
    model = ZyntheorNativeCPU(**architecture).to('cpu')
    model.load_state_dict(payload['model_state_dict'], strict=True)
    actual_parameters = count_parameters(model)
    if actual_parameters != int(identity.get('parameter_count', -1)) or actual_parameters != int(payload.get('parameter_count', -2)):
        raise RuntimeError('NATIVE_PARAMETER_COUNT_MISMATCH')
    digest = parameter_digest(model)
    if digest != payload.get('final_weights_sha256') or digest != identity.get('final_weights_sha256'):
        raise RuntimeError('NATIVE_FINAL_WEIGHTS_DIGEST_MISMATCH')
    if any(not torch.isfinite(parameter).all().item() for parameter in model.parameters()):
        raise RuntimeError('NATIVE_WEIGHTS_NON_FINITE')
    model.eval()
    return model, identity, actual_digest

def probe(root: Path = ROOT) -> dict[str, Any]:
    try:
        model, identity, digest = load_verified_model(root)
        with torch.inference_mode():
            token = torch.tensor([[257, 90, 89, 78]], dtype=torch.long)
            logits = model(token)
            if not torch.isfinite(logits).all().item():
                raise RuntimeError('NATIVE_FORWARD_PROBE_NON_FINITE')
            next_id = int(torch.argmax(logits[0, -1]).item())
        return {'phase':'P17','status':'RUNTIME_VERIFIED_EXPERIMENTAL','ready':True,
                'model_id':identity['model_id'],'identity':'CORE_NATIVE',
                'checkpoint':identity['checkpoint'],'checkpoint_sha256':digest,
                'parameter_count':count_parameters(model),'forward_probe':'PASS',
                'next_token_probe':next_id,'generation_probe':'PASS','inference_ready':True,
                'production_approved':False,'note':'Local checkpoint load, forward pass, and one-token greedy inference probe passed. Production quality and deployment approval remain separate gates.'}
    except Exception as exc:
        status = 'MODEL_NOT_FOUND' if 'NOT_FOUND' in str(exc) or 'NOT_TRAINED' in str(exc) or 'NOT_REGISTERED' in str(exc) else 'RUNTIME_UNAVAILABLE'
        return {'phase':'P17','status':status,'ready':False,'reason':str(exc),
                'inference_ready':False,'production_approved':False}

def generate(prompt: str, max_new_tokens: int = 64, root: Path = ROOT) -> dict[str, Any]:
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError('PROMPT_REQUIRED')
    if not 1 <= int(max_new_tokens) <= 128:
        raise ValueError('MAX_NEW_TOKENS_OUT_OF_RANGE')
    model, identity, digest = load_verified_model(root)
    context = int(identity['architecture']['context'])
    tokens = encode_bytes(prompt, add_bos=True, add_eos=False)
    generated = []
    with torch.inference_mode():
        for _ in range(int(max_new_tokens)):
            window = tokens[-context:]
            input_ids = torch.tensor([window], dtype=torch.long)
            logits = model(input_ids)[0, -1]
            if not torch.isfinite(logits).all().item():
                raise RuntimeError('NATIVE_GENERATION_NON_FINITE')
            token = int(torch.argmax(logits).item())
            if token == 258:
                break
            generated.append(token)
            tokens.append(token)
    return {'phase':'P17','status':'GENERATED_EXPERIMENTAL','model_id':identity['model_id'],
            'identity':'CORE_NATIVE','checkpoint_sha256':digest,
            'generated_tokens':len(generated),'text':decode_bytes(generated),
            'production_approved':False}

def main() -> int:
    parser=argparse.ArgumentParser()
    parser.add_argument('command',choices=['probe','generate'])
    parser.add_argument('--max-new-tokens',type=int,default=64)
    parser.add_argument('--stdin',action='store_true')
    parser.add_argument('--prompt',default=None)
    args=parser.parse_args()
    try:
        if args.command=='probe':
            result=probe(); print(json.dumps(result,ensure_ascii=False)); return 0
        prompt=sys.stdin.read() if args.stdin else args.prompt
        result=generate(prompt or '',args.max_new_tokens); print(json.dumps(result,ensure_ascii=False)); return 0
    except Exception as exc:
        print(json.dumps({'phase':'P17','status':'RUNTIME_ERROR','error':f'{type(exc).__name__}: {exc}'}),file=sys.stderr)
        return 2

if __name__=='__main__': raise SystemExit(main())
