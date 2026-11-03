import test from 'node:test';
import assert from 'node:assert/strict';
import { MultiAgentCoordinator, validateAgentDag } from '../lib/multi-agent-coordinator.mjs';

const task=(id,extra={})=>({id,workerId:'local',idempotencyKey:`idempotency-${id}`,input:{value:id},dependsOn:[],...extra});

test('P13 DAG rejects cycles and unknown dependencies',()=>{
  assert.throws(()=>validateAgentDag([task('a',{dependsOn:['b']}),task('b',{dependsOn:['a']})]),/CYCLE/);
  assert.throws(()=>validateAgentDag([task('a',{dependsOn:['missing']})]),/DEPENDENCY_NOT_FOUND/);
});

test('P13 coordinator respects dependency order and completes bounded work',async()=>{
  const order=[];
  const coordinator=new MultiAgentCoordinator({workers:{local:async input=>{order.push(input.value);return input.value;}},maxParallel:2});
  const result=await coordinator.run([task('a'),task('b'),task('c',{dependsOn:['a','b']})]);
  assert.equal(result.status,'COMPLETED');
  assert.deepEqual(order,['a','b','c']);
});

test('P13 mutating tasks fail closed without a human approval',async()=>{
  const coordinator=new MultiAgentCoordinator({workers:{local:async()=>({ok:true})}});
  const result=await coordinator.run([task('mutate',{mutates:true})]);
  assert.equal(result.tasks[0].status,'BLOCKED');
  assert.equal(result.tasks[0].reason,'HUMAN_APPROVAL_REQUIRED');
});

test('P13 rejects self-approval and accepts external owner approval',async()=>{
  const coordinator=new MultiAgentCoordinator({workers:{local:async()=>({ok:true})}});
  const proposed=task('mutate',{mutates:true,proposedBy:'agent-1'});
  const denied=await coordinator.run([proposed],{approvals:{mutate:{taskId:'mutate',actorType:'human',role:'owner',actorId:'agent-1',approvalId:'approval-1'}}});
  assert.equal(denied.tasks[0].status,'BLOCKED');
  const allowed=await coordinator.run([proposed],{approvals:{mutate:{taskId:'mutate',actorType:'human',role:'owner',actorId:'owner-1',approvalId:'approval-2'}}});
  assert.equal(allowed.tasks[0].status,'COMPLETED');
});

test('P13 replays idempotent work without invoking worker again',async()=>{
  let calls=0;
  const coordinator=new MultiAgentCoordinator({workers:{local:async()=>{calls++;return 'done';}}});
  await coordinator.run([task('once')]);
  const replay=await coordinator.run([task('once')]);
  assert.equal(calls,1);assert.equal(replay.tasks[0].idempotentReplay,true);
});


test('P13 rejects duplicate idempotency keys in a single DAG',()=>{
  assert.throws(()=>validateAgentDag([task('one',{idempotencyKey:'same-key-0001'}),task('two',{idempotencyKey:'same-key-0001'})]),/DUPLICATE_IDEMPOTENCY_KEY/);
});

test('P13 blocks reuse of an idempotency key with changed nested payload',async()=>{
  const coordinator=new MultiAgentCoordinator({workers:{local:async input=>input.value}});
  await coordinator.run([task('first',{idempotencyKey:'shared-key-00001',input:{nested:{value:'A'}}})]);
  const changed=await coordinator.run([task('second',{idempotencyKey:'shared-key-00001',input:{nested:{value:'B'}}})]);
  assert.equal(changed.tasks[0].status,'BLOCKED');
  assert.equal(changed.tasks[0].reason,'IDEMPOTENCY_KEY_COLLISION');
});
