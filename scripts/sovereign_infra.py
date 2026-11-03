#!/usr/bin/env python3
"""P19 local-first infrastructure preflight, backup creation and restore verification."""
from __future__ import annotations
import argparse, hashlib, json, os, re, shutil, stat, sys, tempfile, zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
ROOT=Path(__file__).resolve().parents[1]
POLICY=ROOT/'infra/sovereign/sovereign-policy.json'
INCLUDE=['training/dataset','training/native_cpu','training/registry','training/checkpoints/native_cpu','infra/sovereign']
DENY_PARTS={'.env','secret','secrets','credential','credentials','private-key','private_key','id_rsa','token','tokens'}
DENY_SUFFIX={'.pem','.key','.p12','.pfx'}

def sha256_file(p:Path)->str:
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()

def safe_name(rel:str)->bool:
    p=PurePosixPath(rel)
    if p.is_absolute() or '..' in p.parts or not p.parts:return False
    low=[part.lower() for part in p.parts]
    if any(part in DENY_PARTS for part in low):return False
    if p.suffix.lower() in DENY_SUFFIX:return False
    return not any(part in {'node_modules','.git','dist','coverage','__pycache__'} for part in low)

def iter_files(include_workspace=False):
    paths=list(INCLUDE)
    if include_workspace: paths.append('workspace_data')
    files=[]
    for rel in paths:
        base=ROOT/rel
        if not base.exists():continue
        if base.is_file(): candidates=[base]
        else:candidates=sorted(base.rglob('*'))
        for p in candidates:
            if not p.is_file() or p.is_symlink():continue
            name=p.relative_to(ROOT).as_posix()
            if safe_name(name):files.append((name,p))
    return files

def preflight():
    policy=json.loads(POLICY.read_text())
    local=os.getenv('ZYNTHEOR_LOCAL_ONLY','').strip().lower() in policy['localOnlyEnabledValues']
    findings=[]
    if not local:findings.append('LOCAL_ONLY_NOT_EXPLICITLY_ENABLED')
    if not (ROOT/'.env').exists():findings.append('ROOT_ENV_FILE_ABSENT')
    return {'phase':'P19','status':'LOCAL_ONLY_CONFIGURED' if local else 'BLOCKED',
            'localOnly':local,'silentCloudFallback':policy['silentCloudFallback'],
            'externalInferenceConsentRequired':policy['externalInferenceConsentRequired'],
            'airGap':'NOT_VERIFIED','containerIsolation':'NOT_VERIFIED',
            'findings':findings,'checkedAt':datetime.now(timezone.utc).isoformat()}

def create_backup(output:Path, include_workspace=False):
    output=output.expanduser().resolve()
    if output==ROOT or ROOT in output.parents:raise ValueError('BACKUP_OUTPUT_MUST_BE_OUTSIDE_PROJECT_ROOT')
    output.parent.mkdir(parents=True,exist_ok=True)
    if output.exists():raise FileExistsError('BACKUP_OUTPUT_ALREADY_EXISTS')
    entries=[]
    with zipfile.ZipFile(output,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for rel,p in iter_files(include_workspace):
            data=p.read_bytes(); entries.append({'path':rel,'sha256':hashlib.sha256(data).hexdigest(),'size':len(data)})
            z.writestr(rel,data)
        manifest={'schemaVersion':'1.0.0','createdAt':datetime.now(timezone.utc).isoformat(),
                  'project':'ZYNTHEOR CORE X','entries':entries,
                  'workspaceDataIncluded':bool(include_workspace),
                  'note':'Integrity-protected backup, not encrypted or digitally signed.'}
        z.writestr('BACKUP_MANIFEST.json',json.dumps(manifest,indent=2)+'\n')
    try:os.chmod(output,0o600)
    except OSError:pass
    return {'phase':'P19','status':'BACKUP_CREATED','path':str(output),'fileCount':len(entries),
            'archiveSha256':sha256_file(output),'workspaceDataIncluded':bool(include_workspace),
            'encrypted':False,'digitallySigned':False}

def verify_backup(archive:Path, extract_to:Path|None=None):
    archive=archive.expanduser().resolve()
    with zipfile.ZipFile(archive,'r') as z:
        names=z.namelist()
        if len(names)!=len(set(names)):raise ValueError('BACKUP_DUPLICATE_ENTRIES')
        for info in z.infolist():
            name=info.filename
            if not safe_name(name) and name!='BACKUP_MANIFEST.json':raise ValueError(f'BACKUP_UNSAFE_PATH:{name}')
            mode=(info.external_attr>>16)&0xFFFF
            if stat.S_ISLNK(mode):raise ValueError(f'BACKUP_SYMLINK_FORBIDDEN:{name}')
        if 'BACKUP_MANIFEST.json' not in names:raise ValueError('BACKUP_MANIFEST_MISSING')
        manifest=json.loads(z.read('BACKUP_MANIFEST.json'))
        expected={item['path']:item for item in manifest.get('entries',[])}
        actual=set(names)-{'BACKUP_MANIFEST.json'}
        if set(expected)!=actual:raise ValueError('BACKUP_MANIFEST_ENTRY_SET_MISMATCH')
        for name,item in expected.items():
            data=z.read(name)
            if len(data)!=item['size'] or hashlib.sha256(data).hexdigest()!=item['sha256']:
                raise ValueError(f'BACKUP_DIGEST_MISMATCH:{name}')
        if extract_to is not None:
            target=extract_to.expanduser().resolve()
            if target.exists() and any(target.iterdir()):raise ValueError('RESTORE_TARGET_MUST_BE_EMPTY')
            target.mkdir(parents=True,exist_ok=True)
            for name in sorted(expected):
                dest=(target/Path(*PurePosixPath(name).parts)).resolve()
                if target not in dest.parents:raise ValueError('RESTORE_PATH_ESCAPE_BLOCKED')
                dest.parent.mkdir(parents=True,exist_ok=True)
                with dest.open('xb') as f:f.write(z.read(name))
        return {'phase':'P19','status':'RESTORE_VERIFIED' if extract_to else 'BACKUP_VERIFIED',
                'entryCount':len(expected),'archiveSha256':sha256_file(archive),
                'extractedTo':str(extract_to.resolve()) if extract_to else None,
                'liveProjectModified':False}

def main():
    p=argparse.ArgumentParser(); sub=p.add_subparsers(dest='cmd',required=True)
    sub.add_parser('preflight')
    b=sub.add_parser('backup');b.add_argument('--output',required=True);b.add_argument('--include-workspace-data',action='store_true')
    v=sub.add_parser('verify-restore');v.add_argument('archive');v.add_argument('--extract-to')
    a=p.parse_args()
    if a.cmd=='preflight':result=preflight()
    elif a.cmd=='backup':result=create_backup(Path(a.output),a.include_workspace_data)
    else:result=verify_backup(Path(a.archive),Path(a.extract_to) if a.extract_to else None)
    print(json.dumps(result,indent=2));return 0
if __name__=='__main__':
    try:raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({'phase':'P19','status':'ERROR','error':f'{type(exc).__name__}: {exc}'}),file=sys.stderr);raise SystemExit(2)
