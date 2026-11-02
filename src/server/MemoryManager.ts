import fs from 'fs/promises';
import path from 'path';
const MEMORY_DIR = path.resolve(process.cwd(), 'memory');
export class MemoryManager {
  static async saveState(sessionId: string, state: any) {
    await fs.mkdir(MEMORY_DIR, { recursive: true });
    await fs.writeFile(path.join(MEMORY_DIR, `${sessionId}.json`), JSON.stringify(state, null, 2));
  }
  static async loadState(sessionId: string) {
    try {
      const data = await fs.readFile(path.join(MEMORY_DIR, `${sessionId}.json`), 'utf-8');
      return JSON.parse(data);
    } catch { return null; }
  }
}
