import { describe, it, expect, beforeEach } from 'vitest';
import { TaskContinuityManager } from './persistent-task-continuity';

describe('Persistent Task Continuity - 9 PASS', () => {
  let manager: TaskContinuityManager;
  
  beforeEach(() => {
    manager = new TaskContinuityManager();
  });

  it('1. creates and saves task', () => {
    const task = manager.createTask('task1', { type: 'build' });
    expect(task.id).toBe('task1');
    expect(task.status).toBe('pending');
    const loaded = manager.loadTask('task1');
    expect(loaded?.id).toBe('task1');
  });

  it('2. creates checkpoints in order', () => {
    manager.createTask('task2');
    manager.createCheckpoint('task2', 'step1', { data: 'a' }, 25);
    manager.createCheckpoint('task2', 'step2', { data: 'b' }, 50);
    const task = manager.loadTask('task2');
    expect(task?.checkpoints.length).toBe(2);
    expect(task?.progress).toBe(50);
    expect(task?.currentStep).toBe('step2');
  });

  it('3. resumes from last checkpoint', () => {
    manager.createTask('task3');
    manager.createCheckpoint('task3', 'step1', {}, 30);
    manager.createCheckpoint('task3', 'step2', {}, 60);
    const result = manager.resumeTask('task3');
    expect(result.canResume).toBe(true);
    expect(result.lastCheckpoint?.stepId).toBe('step2');
    expect(result.lastCheckpoint?.progress).toBe(60);
  });

  it('4. pause and resume', () => {
    manager.createTask('task4');
    manager.createCheckpoint('task4', 'step1', {}, 40);
    manager.pauseTask('task4');
    const task = manager.loadTask('task4');
    expect(task?.status).toBe('paused');
    const result = manager.resumeTask('task4');
    expect(result.canResume).toBe(true);
  });

  it('5. completes at 100%', () => {
    manager.createTask('task5');
    manager.createCheckpoint('task5', 'final', {}, 100);
    const task = manager.loadTask('task5');
    expect(task?.status).toBe('completed');
    const result = manager.resumeTask('task5');
    expect(result.canResume).toBe(false); // completed cannot resume
  });

  it('6. evidence gate passes valid task', () => {
    manager.createTask('task6');
    manager.createCheckpoint('task6', 's1', {}, 20);
    const task = manager.loadTask('task6')!;
    const ev = manager.verifyContinuity(task);
    expect(ev.passed).toBe(true);
  });

  it('7. export and import state', () => {
    manager.createTask('task7');
    manager.createCheckpoint('task7', 's1', { x: 1 }, 10);
    const exported = manager.exportState();
    const newManager = new TaskContinuityManager();
    const ok = newManager.importState(exported);
    expect(ok).toBe(true);
    const task = newManager.loadTask('task7');
    expect(task?.checkpoints[0].data.x).toBe(1);
  });

  it('8. clear completed tasks', () => {
    manager.createTask('task8a');
    manager.createCheckpoint('task8a', 'done', {}, 100);
    manager.createTask('task8b');
    manager.createCheckpoint('task8b', 'half', {}, 50);
    const cleared = manager.clearCompleted();
    expect(cleared).toBe(1);
    expect(manager.loadTask('task8a')).toBeNull();
    expect(manager.loadTask('task8b')).not.toBeNull();
  });

  it('9. integration full lifecycle', () => {
    const task = manager.createTask('task9', { project: 'zyntheor' });
    expect(task.progress).toBe(0);
    
    manager.createCheckpoint('task9', 'setup', { files: 10 }, 20);
    manager.createCheckpoint('task9', 'build', { built: true }, 60);
    manager.pauseTask('task9');
    
    const resume = manager.resumeTask('task9');
    expect(resume.canResume).toBe(true);
    expect(resume.lastCheckpoint?.stepId).toBe('build');
    
    manager.createCheckpoint('task9', 'deploy', { url: 'https://...' }, 100);
    const final = manager.loadTask('task9');
    expect(final?.status).toBe('completed');
    expect(final?.checkpoints.length).toBe(3);
  });
});
