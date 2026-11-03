import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { saveTaskMemory, getTaskMemories, clearTaskMemory } from '../src/services/taskMemory.ts';

const root=process.cwd();
const taskDir=path.join(root,'workspace_data','tasks');

 test('P12 anonymous reads cannot reveal user-owned records and anonymous clear preserves them',()=>{
  const workspace='p12-owner-boundary';
  const record=saveTaskMemory({workspaceId:workspace,goal:'owned memory',userId:'principal-1'});
  assert.equal(getTaskMemories(workspace).some(item=>item.id===record.id),false);
  assert.equal(getTaskMemories(workspace,{id:'principal-1',role:'user'}).some(item=>item.id===record.id),true);
  assert.equal(clearTaskMemory(workspace).cleared,0);
  assert.equal(getTaskMemories(workspace,{id:'principal-1',role:'user'}).some(item=>item.id===record.id),true);
  clearTaskMemory(workspace,{id:'test-admin',role:'admin'});
 });

test('P12 normalized workspace IDs use collision-resistant file keys',()=>{
  const a='p12/tenant'; const b='p12?tenant';
  saveTaskMemory({workspaceId:a,goal:'A'});saveTaskMemory({workspaceId:b,goal:'B'});
  assert.equal(getTaskMemories(a).length,1);assert.equal(getTaskMemories(b).length,1);
  clearTaskMemory(a);clearTaskMemory(b);
});

test('P12 corrupt memory fails closed instead of returning an empty list',()=>{
  fs.mkdirSync(taskDir,{recursive:true});
  const file=path.join(taskDir,'workspace_p12-corrupt.tasks.json');
  fs.writeFileSync(file,'{broken json');
  try { assert.throws(()=>getTaskMemories('p12-corrupt'),/TASK_MEMORY_READ_FAILED/); }
  finally { fs.rmSync(file,{force:true}); }
});

test('P12 concurrent writer lock rejects a second writer rather than overwriting',()=>{
  fs.mkdirSync(taskDir,{recursive:true});
  const lock=path.join(taskDir,'workspace_p12-locked.lock');
  fs.writeFileSync(lock,'held by concurrent writer');
  try { assert.throws(()=>saveTaskMemory({workspaceId:'p12-locked',goal:'must not overwrite'}),/TASK_MEMORY_WRITE_LOCKED_FAIL_CLOSED/); }
  finally { fs.rmSync(lock,{force:true}); }
});


test('P12 non-admin cannot create memory on behalf of another user',()=>{
  assert.throws(()=>saveTaskMemory({workspaceId:'p12-impersonation',goal:'forged',userId:'victim'}, {id:'attacker',role:'user'}),/another user/);
});

test('P12 safely reads legacy normalized workspace memory only when embedded workspace IDs match',()=>{
  fs.mkdirSync(taskDir,{recursive:true});
  const workspace='p12/legacy';
  const legacy=path.join(taskDir,'workspace_p12_legacy.tasks.json');
  const record={id:'legacy-1',workspaceId:workspace,userId:'owner-legacy',taskId:'legacy-1',goal:'preserve legacy memory',category:'general',stagesCompleted:[],findings:[],evidenceDigests:[],dryRunSimulations:[],status:'COMPLETED',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  fs.writeFileSync(legacy,JSON.stringify([record]));
  try { assert.equal(getTaskMemories(workspace,{id:'owner-legacy',role:'user'})[0].id,'legacy-1'); }
  finally { fs.rmSync(legacy,{force:true}); }
});

test('P12 fails closed when a legacy normalized memory file contains another workspace ID',()=>{
  fs.mkdirSync(taskDir,{recursive:true});
  const legacy=path.join(taskDir,'workspace_p12_legacy_collision.tasks.json');
  const workspace='p12/legacy/collision';
  const record={id:'wrong-workspace',workspaceId:'p12/legacy/collision-other',goal:'must not leak'};
  fs.writeFileSync(legacy,JSON.stringify([record]));
  try { assert.throws(()=>getTaskMemories(workspace),/TASK_MEMORY_LEGACY_PATH_COLLISION_FAIL_CLOSED/); }
  finally { fs.rmSync(legacy,{force:true}); }
});
