import { describe, it, expect } from 'vitest';
import { getAgentVisualStatus } from '../components/AgentStatusIndicator';

describe('AgentStatusIndicator visual categories', () => {
  it('maps RUNNING and ASSIGNED to Working status with sky color and pulse', () => {
    const running = getAgentVisualStatus('RUNNING');
    expect(running.status).toBe('Working');
    expect(running.dotClass).toContain('bg-sky-400');
    expect(running.dotClass).toContain('animate-pulse');

    const assigned = getAgentVisualStatus('ASSIGNED');
    expect(assigned.status).toBe('Working');
  });

  it('maps WAITING_FOR_APPROVAL, BLOCKED, and PAUSED to Blocked status with amber color', () => {
    const waiting = getAgentVisualStatus('WAITING_FOR_APPROVAL');
    expect(waiting.status).toBe('Blocked');
    expect(waiting.dotClass).toContain('bg-amber-400');

    const blocked = getAgentVisualStatus('BLOCKED');
    expect(blocked.status).toBe('Blocked');

    const paused = getAgentVisualStatus('PAUSED');
    expect(paused.status).toBe('Blocked');
    expect(paused.labelEn).toBe('Paused');
  });

  it('maps FAILED and ERROR to Error status with red/rose color', () => {
    const failed = getAgentVisualStatus('FAILED');
    expect(failed.status).toBe('Error');
    expect(failed.dotClass).toContain('bg-rose-500');

    const error = getAgentVisualStatus('ERROR');
    expect(error.status).toBe('Error');
  });

  it('maps IDLE, COMPLETED (without active run), and unknown to Idle status with slate color', () => {
    const idle = getAgentVisualStatus('IDLE');
    expect(idle.status).toBe('Idle');
    expect(idle.dotClass).toContain('bg-zinc-400');

    const completed = getAgentVisualStatus('COMPLETED');
    expect(completed.status).toBe('Idle');

    const fallback = getAgentVisualStatus(undefined);
    expect(fallback.status).toBe('Idle');
  });
});
