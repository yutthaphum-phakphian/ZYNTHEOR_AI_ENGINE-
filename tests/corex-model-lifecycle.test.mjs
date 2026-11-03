import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifyLifecycleLedger, inspectLifecycle, registerCandidate } from '../lib/model-lifecycle.mjs';

test('P18 verifies an empty append-only lifecycle genesis state', () => {
  const ledger={schemaVersion:'1.0.0',sequence:0,headHash:'0'.repeat(64),events:[]};
  assert.equal(verifyLifecycleLedger(ledger).valid,true);
});

test('P18 detects lifecycle ledger tampering', () => {
  const ledger={schemaVersion:'1.0.0',sequence:1,headHash:'a'.repeat(64),events:[{sequence:1,type:'PROMOTED',modelId:'m',actor:'human',metadata:{},previousHash:'0'.repeat(64),hash:'a'.repeat(64)}]};
  assert.equal(verifyLifecycleLedger(ledger).valid,false);
});

test('P18 does not invent a current active model when no promotions exist', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zyntheor-lifecycle-'));
  try { const result=inspectLifecycle(root); assert.equal(result.activeModelId,null); assert.equal(result.eventCount,0); }
  finally { fs.rmSync(root,{recursive:true,force:true}); }
});

test('P18 reads the existing models[] identity registry and blocks registration without a checkpoint', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zyntheor-lifecycle-registry-'));
  try {
    const dir=path.join(root,'training','registry');fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'native_model_identity.json'),JSON.stringify({registry_version:'1.0.0',models:[{model_id:'zyntheor-native-cpu-001',identity:'CORE_NATIVE',status:'NOT_TRAINED',parent_model_id:null,checkpoint:null,checkpoint_sha256:null}]}));
    assert.throws(()=>registerCandidate(root),/NATIVE_CHECKPOINT_NOT_AVAILABLE/);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
