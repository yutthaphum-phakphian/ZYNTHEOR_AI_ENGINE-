import fs from 'fs';
import path from 'path';

export interface GitHubActivity {
  id: string;
  type: 'issue_received' | 'branch_created' | 'pr_created' | 'issue_comment' | 'workflow_dispatched' | 'webhook_received';
  repo: string;
  issueNumber?: number;
  prNumber?: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'unverified';
  branch?: string;
  url?: string;
  detail?: string;
  timestamp: string;
}

const STORAGE_PATH = path.join(process.cwd(), 'workspace_data', 'github_activities.json');

function ensureFile(): void {
  const dir = path.dirname(STORAGE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORAGE_PATH)) {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify([], null, 2), 'utf-8');
  }
}

export class GitHubActivityStore {
  static getActivities(limit = 50): GitHubActivity[] {
    ensureFile();
    try {
      const raw = fs.readFileSync(STORAGE_PATH, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list.slice(0, limit);
      }
      return [];
    } catch {
      return [];
    }
  }

  static addActivity(activity: Omit<GitHubActivity, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): GitHubActivity {
    ensureFile();
    const fullActivity: GitHubActivity = {
      id: activity.id || `gh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: activity.timestamp || new Date().toISOString(),
      ...activity,
    };

    try {
      const current = this.getActivities(200);
      const updated = [fullActivity, ...current.filter((a) => a.id !== fullActivity.id)].slice(0, 100);
      fs.writeFileSync(STORAGE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (e) {
      console.error('[GitHubActivityStore] Failed to save activity:', e);
    }

    return fullActivity;
  }

  static updateActivityStatus(id: string, status: GitHubActivity['status'], detail?: string): void {
    ensureFile();
    try {
      const current = this.getActivities(200);
      const item = current.find((a) => a.id === id);
      if (item) {
        item.status = status;
        if (detail) item.detail = detail;
        fs.writeFileSync(STORAGE_PATH, JSON.stringify(current, null, 2), 'utf-8');
      }
    } catch (e) {
      console.error('[GitHubActivityStore] Failed to update activity status:', e);
    }
  }

  static countActivities(): number {
    return this.getActivities(100).length;
  }
}
