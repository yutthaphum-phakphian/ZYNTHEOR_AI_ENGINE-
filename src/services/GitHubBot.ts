import crypto from 'crypto';
import { GitHubActivityStore, GitHubActivity } from './gitHubActivityStore.ts';

// Embedded lightweight GitHub REST client (no external @octokit/rest dependency needed)
class Octokit {
  private auth?: string;
  constructor(options?: { auth?: string }) {
    this.auth = options?.auth;
  }
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Zyntheor-Bot',
        ...(this.auth ? { Authorization: `Bearer ${this.auth}` } : {}),
        ...options.headers,
      },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${errText}`);
    }
    return { data: await res.json() };
  }
  users = {
    getAuthenticated: () => this.request('/user'),
  };
  issues = {
    createComment: ({ owner, repo, issue_number, body }: { owner: string; repo: string; issue_number: number; body: string }) =>
      this.request(`/repos/${owner}/${repo}/issues/${issue_number}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      }),
  };
  repos = {
    get: ({ owner, repo }: { owner: string; repo: string }) => this.request(`/repos/${owner}/${repo}`),
  };
  git = {
    getRef: ({ owner, repo, ref }: { owner: string; repo: string; ref: string }) =>
      this.request(`/repos/${owner}/${repo}/git/ref/${ref}`),
    createRef: ({ owner, repo, ref, sha }: { owner: string; repo: string; ref: string; sha: string }) =>
      this.request(`/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: ref.startsWith('refs/') ? ref : `refs/${ref}`, sha }),
      }),
  };
}

export interface GitHubBotStatus {
  configured: boolean;
  status: 'READY' | 'UNCONFIGURED' | 'ERROR';
  authenticatedUser?: string;
  hasWebhookSecret: boolean;
  message?: string;
}

export interface HandleIssueOptions {
  owner: string;
  repo: string;
  issueNumber: number;
  title: string;
  body?: string;
  autoBranch?: boolean;
}

export class GitHubBot {
  private static octokitInstance: Octokit | null = null;

  private static getToken(): string | null {
    return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
  }

  private static getWebhookSecret(): string | null {
    return process.env.GITHUB_WEBHOOK_SECRET || null;
  }

  private static getClient(): Octokit {
    const token = this.getToken();
    if (!token) {
      throw new Error('GITHUB_TOKEN is not configured in environment variables');
    }
    if (!this.octokitInstance) {
      this.octokitInstance = new Octokit({ auth: token });
    }
    return this.octokitInstance;
  }

  static async getStatus(): Promise<GitHubBotStatus> {
    const token = this.getToken();
    const hasWebhookSecret = Boolean(this.getWebhookSecret());

    if (!token) {
      return {
        configured: false,
        status: 'UNCONFIGURED',
        hasWebhookSecret,
        message: 'GITHUB_TOKEN environment variable is not configured.',
      };
    }

    try {
      const client = this.getClient();
      const user = await client.users.getAuthenticated();
      return {
        configured: true,
        status: 'READY',
        authenticatedUser: user.data.login,
        hasWebhookSecret,
      };
    } catch (err: any) {
      return {
        configured: false,
        status: 'ERROR',
        hasWebhookSecret,
        message: err?.message || 'Authentication error with GitHub API',
      };
    }
  }

  static verifyWebhookSignature(payloadRaw: string, signatureHeader?: string): boolean {
    const secret = this.getWebhookSecret();
    if (!secret) {
      // If no webhook secret is configured on the server, skip HMAC check but note unverified
      return true;
    }
    if (!signatureHeader) return false;

    try {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = 'sha256=' + hmac.update(payloadRaw).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(digest));
    } catch {
      return false;
    }
  }

  static async handleNewIssue(options: HandleIssueOptions): Promise<{
    success: boolean;
    commentUrl?: string;
    branchName?: string;
    error?: string;
  }> {
    const { owner, repo, issueNumber, title, body = '', autoBranch = true } = options;
    const activity = GitHubActivityStore.addActivity({
      type: 'issue_received',
      repo: `${owner}/${repo}`,
      issueNumber,
      title,
      status: 'in_progress',
      detail: `Received issue #${issueNumber}: ${title}`,
    });

    const token = this.getToken();
    if (!token) {
      GitHubActivityStore.updateActivityStatus(
        activity.id,
        'failed',
        'GITHUB_TOKEN is not configured on the server.'
      );
      return {
        success: false,
        error: 'GITHUB_TOKEN_UNCONFIGURED: Cannot interact with GitHub repository without a configured token.',
      };
    }

    try {
      const client = this.getClient();

      // 1. Post acknowledging comment
      const comment = await client.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: `🤖 **ZYNTHEOR AI Engine** has received this issue: *${title}*.\n\nAnalyzing problem scope and formulating resolution strategy...`,
      });

      let branchName: string | undefined;

      // 2. Create feature branch if requested
      if (autoBranch) {
        try {
          const repoData = await client.repos.get({ owner, repo });
          const defaultBranch = repoData.data.default_branch || 'main';
          const refData = await client.git.getRef({
            owner,
            repo,
            ref: `heads/${defaultBranch}`,
          });
          const baseSha = refData.data.object.sha;

          branchName = `zyntheor/issue-${issueNumber}`;
          await client.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${branchName}`,
            sha: baseSha,
          });

          GitHubActivityStore.addActivity({
            type: 'branch_created',
            repo: `${owner}/${repo}`,
            issueNumber,
            title: `Branch ${branchName}`,
            branch: branchName,
            status: 'completed',
            detail: `Created branch ${branchName} from ${defaultBranch} (sha: ${baseSha.slice(0, 7)})`,
          });
        } catch (branchErr: any) {
          console.warn('[GitHubBot] Could not create feature branch:', branchErr?.message || branchErr);
        }
      }

      GitHubActivityStore.updateActivityStatus(
        activity.id,
        'completed',
        `Acknowledged issue #${issueNumber} on ${owner}/${repo}${branchName ? ` and created branch ${branchName}` : ''}`
      );

      return {
        success: true,
        commentUrl: comment.data.html_url,
        branchName,
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      GitHubActivityStore.updateActivityStatus(activity.id, 'failed', errMsg);
      return {
        success: false,
        error: errMsg,
      };
    }
  }

  static async handleWebhook(event: string, payload: any): Promise<{ handled: boolean; message: string }> {
    if (event === 'ping') {
      GitHubActivityStore.addActivity({
        type: 'webhook_received',
        repo: payload?.repository?.full_name || 'unknown',
        title: 'Webhook Ping Received',
        status: 'completed',
        detail: `Zen: ${payload?.zen || 'pong'}`,
      });
      return { handled: true, message: 'Ping acknowledged' };
    }

    if (event === 'issues') {
      const action = payload?.action;
      const issue = payload?.issue;
      const repository = payload?.repository;

      if (action === 'opened' && issue && repository) {
        const [owner, repo] = repository.full_name.split('/');
        await this.handleNewIssue({
          owner,
          repo,
          issueNumber: issue.number,
          title: issue.title,
          body: issue.body,
        });
        return { handled: true, message: `Issue #${issue.number} processed` };
      }

      GitHubActivityStore.addActivity({
        type: 'webhook_received',
        repo: repository?.full_name || 'unknown',
        issueNumber: issue?.number,
        title: `Issue event: ${action}`,
        status: 'completed',
        detail: `Action: ${action}`,
      });
      return { handled: true, message: `Issue action ${action} recorded` };
    }

    if (event === 'pull_request') {
      const action = payload?.action;
      const pr = payload?.pull_request;
      const repository = payload?.repository;

      GitHubActivityStore.addActivity({
        type: 'pr_created',
        repo: repository?.full_name || 'unknown',
        prNumber: pr?.number,
        title: `PR #${pr?.number}: ${pr?.title || action}`,
        status: 'completed',
        detail: `Pull request ${action} by ${pr?.user?.login || 'unknown'}`,
      });
      return { handled: true, message: `PR #${pr?.number} event recorded` };
    }

    return { handled: false, message: `Event ${event} ignored` };
  }
}
