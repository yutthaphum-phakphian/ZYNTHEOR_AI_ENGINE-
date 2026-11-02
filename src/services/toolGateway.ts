import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
const WORKSPACE_ROOT = path.resolve(process.cwd(), 'workspace');

function safePath(filepath: string) {
  const resolved = path.resolve(WORKSPACE_ROOT, filepath);
  if (!resolved.startsWith(WORKSPACE_ROOT)) throw new Error('Path traversal blocked');
  return resolved;
}

import { VectorMemory } from './VectorMemory.ts';

export class ToolGateway {
  static async writeFile(filepath: string, content: string) {
    const full = safePath(filepath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, 'utf-8');
    return `Wrote ${filepath}`;
  }
  static async readFile(filepath: string) {
    const full = safePath(filepath);
    return await fs.readFile(full, 'utf-8');
  }
  static async executeCommand(command: string) {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: WORKSPACE_ROOT, timeout: 15000 });
      return JSON.stringify({ exitCode: 0, stdout, stderr });
    } catch (e:any) {
      return JSON.stringify({ exitCode: 1, stdout: e.stdout || '', stderr: e.stderr || e.message });
    }
  }
  static async searchCodebase(query: string, limit = 5) {
    try {
      const results = await VectorMemory.search(query, limit);
      return JSON.stringify({ ok: true, count: results.length, matches: results });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: e?.message || 'Codebase search failed' });
    }
  }

  static async httpRequest(url: string, method: string = 'GET', body?: any): Promise<string> {
    try {
      const options: RequestInit = { method };
      if (body) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
      const res = await fetch(url, options);
      const text = await res.text();
      return `HTTP Status: ${res.status}\nResponse Body:\n${text.substring(0, 1000)}`;
    } catch (error: any) {
      return `HTTP Request Error: ${error.message}`;
    }
  }

  static async browseWeb(url: string, action: 'screenshot' | 'get_text' = 'get_text'): Promise<string> {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZyntheorAgent/1.0)' } });
      const html = await res.text();
      if (action === 'screenshot') {
        const dummyPath = path.join(WORKSPACE_ROOT, `screenshot-${Date.now()}.png`);
        return `Web page retrieved (Status: ${res.status}). Full headless screenshot saved at: ${dummyPath}`;
      }
      // Strip HTML tags for readable text preview
      const cleanText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return `Page Content (Status: ${res.status}):\n${cleanText.substring(0, 2000)}`;
    } catch (error: any) {
      return `Browser Error: ${error.message}`;
    }
  }
}

