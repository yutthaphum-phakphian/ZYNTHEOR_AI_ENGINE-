import test from 'node:test';
import assert from 'node:assert/strict';
import { probeNativeRuntime, generateNativeText } from '../lib/native-model-gateway.mjs';

test('P17 Node gateway returns the honest not-ready state when no checkpoint exists', async()=>{
  const result=await probeNativeRuntime();
  assert.equal(result.ready,false);
  assert.ok(['MODEL_NOT_FOUND','RUNTIME_UNAVAILABLE'].includes(result.status));
});

test('P17 Node gateway refuses generation when native weights are absent', async()=>{
  await assert.rejects(()=>generateNativeText('hello',{maxNewTokens:2}),/NATIVE_MODEL_NOT_TRAINED|NATIVE_CHECKPOINT_NOT_REGISTERED|NATIVE_RUNTIME_EXIT/);
});
