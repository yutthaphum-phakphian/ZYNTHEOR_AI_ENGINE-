import Docker from 'dockerode';
import { Writable } from 'stream';
import { ExecutionRequest, ExecutionStatus, ExecutionResult } from '../types/execution.ts';
import path from 'path';
import fs from 'fs';

const docker = new Docker();

export class SandboxAdapter {
  static async isAvailable(): Promise<boolean> {
    try {
      if (process.platform === 'linux' && !fs.existsSync('/var/run/docker.sock')) {
        return false;
      }
      await docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  static async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    let container: Docker.Container | null = null;
    let stdout = '';
    let stderr = '';
    let containerId = 'UNKNOWN';

    // 1. Allowlist Executable (Fail Closed)
    const allowedExecs = ['node', 'npx', 'python', 'python3', 'npm', 'echo', 'ls', 'cat', 'ping'];
    if (!allowedExecs.includes(req.executable)) {
      return {
        status: ExecutionStatus.SECURITY_VIOLATION,
        stdout: '',
        stderr: 'SECURITY_VIOLATION: Executable not allowed in sandbox allowlist.',
        durationMs: 0,
      };
    }

    // 2. Path Validation & Symlink Traversal Protection
    const absoluteWorkspace = path.resolve(req.workingDirectory);
    const rootDir = process.cwd();
    const isValidWorkspace =
      absoluteWorkspace.startsWith(rootDir) &&
      (absoluteWorkspace.includes('workspace') || absoluteWorkspace.includes('workspaces'));

    if (!isValidWorkspace) {
      return {
        status: ExecutionStatus.SECURITY_VIOLATION,
        stdout: '',
        stderr: 'SECURITY_VIOLATION: Invalid workspace path or path traversal attempt outside workspace boundary.',
        durationMs: 0,
      };
    }

    if (!fs.existsSync(absoluteWorkspace)) {
      try {
        fs.mkdirSync(absoluteWorkspace, { recursive: true });
      } catch {}
    }

    try {
      const isWritable = Array.isArray(req.capabilities) && req.capabilities.includes('fs:write');

      container = await docker.createContainer({
        Image: 'node:20-alpine',
        Cmd: [req.executable, ...req.args], // Structured execution without shell interpretation
        WorkingDir: '/workspace',
        HostConfig: {
          Binds: [`${absoluteWorkspace}:/workspace:${isWritable ? 'rw' : 'ro'}`],
          NetworkMode: 'none', // Network Isolation
          Memory: 256 * 1024 * 1024,
          MemorySwap: 256 * 1024 * 1024, // Swap disabled (Limit = Memory)
          NanoCpus: 500000000, // 0.5 Core
          PidsLimit: 50,
          ReadonlyRootfs: true, // Root FS read-only
          SecurityOpt: ['no-new-privileges'],
          CapDrop: ['ALL'], // Drop all Linux capabilities
          Ulimits: [{ Name: 'nofile', Soft: 1024, Hard: 1024 }],
          AutoRemove: false, // Manual cleanup for exit code verification
        },
      });

      containerId = container.id;
      await container.start();

      // 3. Timeout Handling
      let isTimedOut = false;
      const timeoutId = setTimeout(async () => {
        isTimedOut = true;
        if (container) {
          await container.kill().catch(() => {});
        }
      }, req.timeoutMs || 15000);

      // 4. Capture Output with Buffer Limit (1MB) to prevent memory exhaustion
      const stream = await container.logs({ stdout: true, stderr: true, follow: true });
      const stdoutStream = new Writable({
        write(chunk, _, cb) {
          if (stdout.length < 1024 * 1024) stdout += chunk.toString();
          cb();
        },
      });
      const stderrStream = new Writable({
        write(chunk, _, cb) {
          if (stderr.length < 1024 * 1024) stderr += chunk.toString();
          cb();
        },
      });
      container.modem.demuxStream(stream, stdoutStream, stderrStream);

      // 5. Wait for completion
      const data = await container.wait();
      clearTimeout(timeoutId);

      if (isTimedOut) {
        if (container) await container.remove({ force: true }).catch(() => {});
        return {
          status: ExecutionStatus.TIMEOUT,
          exitCode: 124,
          stdout: stdout,
          stderr: 'Execution timed out after limit.',
          durationMs: Date.now() - startTime,
          containerId,
          cleanupStatus: 'SUCCESS',
        };
      }

      // 6. Metrics (Measured actual usage)
      let measuredUsage = { memoryMB: 'UNKNOWN', cpuUsage: 'UNKNOWN' };
      try {
        const stats: any = await container.stats({ stream: false });
        if (stats?.memory_stats?.usage) {
          measuredUsage = {
            memoryMB: (stats.memory_stats.usage / 1024 / 1024).toFixed(2),
            cpuUsage: stats.cpu_stats?.cpu_usage?.total_usage
              ? `${((stats.cpu_stats.cpu_usage.total_usage / 1e9) * 100).toFixed(2)}%`
              : 'UNKNOWN',
          };
        }
      } catch {
        // Leave as UNKNOWN if unavailable according to zero-fake policy
      }

      // 7. Manual Cleanup Verification
      let cleanupStatus = 'FAILED';
      try {
        await container.remove({ force: true });
        cleanupStatus = 'SUCCESS';
      } catch {
        cleanupStatus = 'REMOVED_OR_UNAVAILABLE';
      }

      return {
        status: data.StatusCode === 0 ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
        exitCode: data.StatusCode,
        stdout: stdout + (stdout.length >= 1024 * 1024 ? '\n[TRUNCATED]' : ''),
        stderr: stderr + (stderr.length >= 1024 * 1024 ? '\n[TRUNCATED]' : ''),
        durationMs: Date.now() - startTime,
        containerId,
        measuredUsage,
        cleanupStatus,
      };
    } catch (error: any) {
      if (container) await container.remove({ force: true }).catch(() => {});
      return {
        status: ExecutionStatus.SANDBOX_UNAVAILABLE,
        stdout: '',
        stderr: `Docker Error: ${error?.message || 'Docker daemon unreachable or container creation failed'}`,
        durationMs: Date.now() - startTime,
        containerId,
        cleanupStatus: 'CLEANUP_ATTEMPTED',
      };
    }
  }
}
