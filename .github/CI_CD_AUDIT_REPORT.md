# ZYNTHEOR CI/CD — Repository Evidence Audit

Status: Audit-first, no workflow modifications performed.

## 1. Scope and evidence inspected

Files inspected directly from the repository:

- .github/workflows/deploy.yml
- .github/workflows/pages.yml
- .github/workflows/codeql.yml
- .github/workflows/npm-publish-github-packages.yml
- .github/workflows/audit-1.1.0.yml
- .github/workflows/native-core-1.1.0.yml
- package.json
- tsconfig.json
- vite.config.ts
- server.ts

Repository facts from code inspection:

- The repo has multiple GitHub Actions workflows under `.github/workflows/`.
- `package.json` defines CI commands (`npm run build`, `npm run test`, `npx tsc --noEmit`, `npm run check:env`, `npm run verify`).
- The repository does not expose a readable `package-lock.json` in the accessible repository content listing. The audit therefore marks lockfile status as `NOT_VERIFIED` rather than claiming it exists.
- The repo uses Node 20 in workflow files, while the current repo engine requirement is `>=20`; however, the requested standardization target in the task description is Node.js 22.
- GitHub-hosted workflow execution was not performed during this audit, so runtime verification remains `NOT_EXECUTED`.

## 2. Workflow inventory

### 2.1 .github/workflows/deploy.yml

- Workflow name: `ZYNTHEOR CI/CD Pipeline`
- Triggers: `push` to `main`, `pull_request` to `main`, `workflow_dispatch`
- Branch filters: `main` only for deployment-related jobs
- Jobs: `build-and-test`, `docker-build-push`, `deploy-to-cloud`
- Runner: `ubuntu-latest`
- Node.js: `22` in the current file revision
- Package manager: `npm`
- Permissions: `contents: read` at workflow level; `packages: write` on `docker-build-push`
- Secrets usage: `${{ secrets.GEMINI_API_KEY }}`, `${{ secrets.GITHUB_TOKEN }}`, `${{ secrets.RAILWAY_DEPLOY_WEBHOOK }}`
- Deployment behavior: pushes a Docker image to GHCR and triggers a Railway webhook
- Concurrency: `group: zyntheor-cicd-${{ github.ref }}` with `cancel-in-progress: true`
- Timeout: `timeout-minutes: 15` on `build-and-test`
- Status: `VERIFIED` as repository file inspected; `NOT_EXECUTED` at runtime.

### 2.2 .github/workflows/pages.yml

- Workflow name: `Deploy ZYNTHEOR to Pages`
- Triggers: `push` to `main`, `workflow_dispatch`
- Branch filters: `main`
- Jobs: `build`, `deploy`
- Runner: `ubuntu-latest`
- Node.js: `20`
- Package manager: `npm`
- Permissions: `contents: read`, `pages: write`, `id-token: write`
- Secrets usage: none explicit
- Deployment behavior: GitHub Pages artifact deployment
- Concurrency: `group: "pages"`, `cancel-in-progress: false`
- Timeout: none
- Status: `VERIFIED` as repository file inspected; `NOT_EXECUTED` at runtime.

### 2.3 .github/workflows/codeql.yml

- Workflow name: `CodeQL Advanced`
- Triggers: `push` to `main`, `pull_request` to `main`, scheduled cron `25 14 * * 1`
- Branch filters: `main`
- Jobs: `analyze`
- Runner: `ubuntu-latest` except `swift` matrix uses `macos-latest`
- Node.js: not explicitly set; CodeQL uses repository scanning
- Package manager: `npm` indirectly via repository language set
- Permissions: `security-events: write`, `packages: read`, `actions: read`, `contents: read`
- Secrets usage: none explicit
- Deployment behavior: none
- Concurrency: none
- Timeout: none
- Status: `VERIFIED` as repository file inspected; `NOT_EXECUTED` at runtime.

### 2.4 .github/workflows/npm-publish-github-packages.yml

- Workflow name: `Node.js Package`
- Triggers: `release` type `created`
- Branch filters: release event, no explicit branch guard
- Jobs: `build`, `publish-gpr`
- Runner: `ubuntu-latest`
- Node.js: `20`
- Package manager: `npm`
- Permissions: `contents: read`, `packages: write`
- Secrets usage: `${{secrets.GITHUB_TOKEN}}`
- Deployment behavior: publishes package to GitHub Packages
- Concurrency: none
- Timeout: none
- Status: `VERIFIED` as repository file inspected; `NOT_EXECUTED` at runtime.

### 2.5 .github/workflows/audit-1.1.0.yml

- Workflow name: `Buffalo 1.2.6 Audit`
- Triggers: `push`, `workflow_dispatch`
- Branch filters: none
- Jobs: `audit`
- Runner: `ubuntu-latest`
- Node.js: `20`
- Package manager: `npm`
- Permissions: not set at workflow level or job level
- Secrets usage: none explicit; uses `gh release view` command without a secret injection
- Deployment behavior: audit/report artifact only
- Concurrency: none
- Timeout: none
- Status: `VERIFIED` as repository file inspected; `NOT_EXECUTED` at runtime.

### 2.6 .github/workflows/native-core-1.1.0.yml

- Workflow name: `Native CORE 1.2.6 - Dataset & Eval`
- Triggers: `push` with paths filter; `workflow_dispatch`
- Branch filters: none
- Jobs: `native-core`
- Runner: `ubuntu-latest`
- Node.js: `20`
- Package manager: `npm`
- Permissions: not set at workflow level or job level
- Secrets usage: none explicit
- Deployment behavior: none
- Concurrency: none
- Timeout: none
- Status: `VERIFIED` as repository file inspected; `NOT_EXECUTED` at runtime.

## 3. Security inspection and findings

### 3.1 FINDING — Unpinned GitHub Actions versions

Evidence:

- `.github/workflows/deploy.yml:34`, `.github/workflows/deploy.yml:37`, `.github/workflows/deploy.yml:75`, `.github/workflows/deploy.yml:89`, `.github/workflows/deploy.yml:117`
- `.github/workflows/pages.yml:21`, `.github/workflows/pages.yml:22`, `.github/workflows/pages.yml:28`, `.github/workflows/pages.yml:29`, `.github/workflows/pages.yml:41`
- `.github/workflows/codeql.yml:62`, `.github/workflows/codeql.yml:72`, `.github/workflows/codeql.yml:101`
- `.github/workflows/npm-publish-github-packages.yml:14`, `.github/workflows/npm-publish-github-packages.yml:15`, `.github/workflows/npm-publish-github-packages.yml:28`, `.github/workflows/npm-publish-github-packages.yml:29`, `.github/workflows/npm-publish-github-packages.yml:34`

Assessment:
- The workflows use major-version tags such as `actions/checkout@v4`, `actions/setup-node@v4`, `docker/login-action@v3`, `github/codeql-action/init@v4`, etc.
- This is a supply-chain risk because tags are mutable and not pinned to an immutable full commit SHA.
- Severity: `MEDIUM`
- Status: `FINDING`
- Recommended remediation: pin third-party action references to a full commit SHA where practical and maintain a reviewed allowlist.

### 3.2 FINDING — Manual deploy protection is present but not gated by environment protection

Evidence:

- `.github/workflows/deploy.yml:8-14` (`workflow_dispatch` boolean input)
- `.github/workflows/deploy.yml:63-68` and `.github/workflows/deploy.yml:103-109`

Assessment:
- Manual deployment is protected by a user confirmation input, which is a positive control.
- However, the workflow does not define a GitHub Environment with protection rules or required reviewers.
- There is no explicit `environment:` block for the deployment job, so the repo cannot enforce environment-level controls from YAML alone.
- Severity: `MEDIUM`
- Status: `FINDING`
- Recommended remediation: use a protected environment or explicit required checks / required reviewers as supported by the repo settings.

### 3.3 FINDING — Deployment jobs do not enforce environment-level protection and are not explicitly limited to trusted jobs

Evidence:

- `.github/workflows/deploy.yml:63-68`
- `.github/workflows/deploy.yml:103-109`
- `.github/workflows/deploy.yml:113-120`

Assessment:
- The deployment job uses a secret-containing webhook trigger and runs on GitHub-hosted runners.
- There is no `environment:` and no explicit restriction beyond branch + manual confirmation.
- Deployment secret access is not scoped to a protected environment in the workflow YAML itself.
- Severity: `MEDIUM`
- Status: `FINDING`
- Recommended remediation: gate deployment behind a protected environment and ensure only trusted branch / workflow conditions can access the webhook secret.

### 3.4 FINDING — No explicit job timeout in several workflows

Evidence:

- `.github/workflows/pages.yml:17-41`
- `.github/workflows/codeql.yml:22-103`
- `.github/workflows/npm-publish-github-packages.yml:10-36`
- `.github/workflows/audit-1.1.0.yml:6-59`
- `.github/workflows/native-core-1.1.0.yml:10-59`

Assessment:
- Most workflows omit explicit `timeout-minutes` for jobs.
- This is a reliability problem because sluggish or hung jobs can consume runner time and delay feedback.
- Severity: `LOW`
- Status: `FINDING`
- Recommended remediation: add `timeout-minutes` to all jobs, especially deployment and long-running validation tasks.

### 3.5 FINDING — Branch protection cannot be verified from repository YAML alone

Evidence:

- Repository settings are not visible from repo contents; this audit inspects only the workflow source.

Assessment:
- Branch protection rules and required status checks are GitHub repository settings, not workflow files.
- This must be verified in GitHub settings because YAML alone cannot prove it.
- Severity: `LOW`
- Status: `NOT_VERIFIED`
- Recommended remediation: configure branch protection on `main` with required status checks before merge and before deployment.

### 3.6 FINDING — `npm install` fallback is used in CI when a lockfile is absent or not accessible

Evidence:

- `.github/workflows/deploy.yml:42-48`
- `.github/workflows/audit-1.1.0.yml:19-25`
- `.github/workflows/native-core-1.1.0.yml:26-32`

Assessment:
- These workflows fall back to `npm install` if `package-lock.json` is missing.
- This is less reproducible than `npm ci` and should only be used if lockfile generation is intentionally allowed.
- Severity: `LOW`
- Status: `FINDING`
- Recommended remediation: confirm whether a lockfile is intentionally absent or add a lockfile and use `npm ci` consistently in CI.

### 3.7 VERIFIED — Workflow discovery and inventory are present

Evidence:

- `.github/workflows/deploy.yml`
- `.github/workflows/pages.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/npm-publish-github-packages.yml`
- `.github/workflows/audit-1.1.0.yml`
- `.github/workflows/native-core-1.1.0.yml`

Assessment:
- The repo does contain multiple GitHub Actions workflows covering CI, deployment, pages, audit, code scanning, and package publishing.
- Status: `VERIFIED`

### 3.8 NOT_VERIFIED — Actual runtime execution on GitHub-hosted runners

Evidence:

- No workflow run logs or GitHub-hosted execution artifacts were provided during this audit.

Assessment:
- A workflow file can be syntactically valid without proving real runtime correctness.
- Status: `NOT_EXECUTED`

## 4. Deployment analysis: deploy.yml

### 4.1 What is present

Evidence: `.github/workflows/deploy.yml:3-21`, `.github/workflows/deploy.yml:27-61`, `.github/workflows/deploy.yml:63-120`

- `push` to `main` triggers the workflow.
- `pull_request` to `main` is also configured.
- Manual deployment is gated by a boolean input.
- The workflow includes `concurrency` to cancel in-progress runs for the same ref.
- The workflow uses `needs: build-and-test` before Docker push and deployment.
- Secrets are only used inside required deployment jobs.

### 4.2 What is missing or not proven

- No GitHub environment is defined (`environment:` block is absent).
- No status check / required review enforcement is visible from YAML.
- No `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` protection is enforced in the workflow settings; only the workflow logic itself is visible.
- The file does not prove actual deployment access control in GitHub repo settings.
- Runtime execution is not present in this audit, so production deployment success is not verified.

Status: `NOT_VERIFIED` for repo settings and GitHub-hosted execution; `VERIFIED` for repository YAML presence.

## 5. CI validation from package.json

Supported commands visible in `package.json`:

- `npm ci` — supported only if `package-lock.json` is present and available in the checked-out branch.
- `npm run test` — present as part of the `test` script definition.
- `npm run build` — present.
- `npx tsc --noEmit` — present via `build` and `typecheck` scripts, and directly supported by the TypeScript toolchain.

Important note:
- The repository code inspection shows `package-lock.json` is not available in the accessible repo content listing, so the claim that `npm ci` is guaranteed in CI is `NOT_VERIFIED` at the repository snapshot level.
- The workflows guard this with a conditional `if [ -f package-lock.json ]` pattern.

## 6. Existing protections and missing protections

### Existing protections

- `deploy.yml` has `concurrency` (`cancel-in-progress: true`).
- `deploy.yml` includes `needs: build-and-test` before deployment jobs.
- `deploy.yml` includes a boolean manual confirmation input for `workflow_dispatch`.
- `deploy.yml` restricts deployment to the main branch via `if` conditions.
- `pages.yml` has `permissions` restricted to `pages` and `id-token` write for deployment.
- `codeql.yml` has explicit permissions for security scanning.

### Missing protections

- No protected GitHub Environment configuration in YAML.
- No required reviewers / protected branch enforcement visible here.
- No SHA pinning for third-party actions.
- No explicit `timeout-minutes` on many jobs.
- No guarantee that branch protection settings exist in GitHub repo settings.
- No runtime execution evidence that any workflow passed.

## 7. Validation limitations

This audit is based on repository inspection only. It does not confirm:

- actual GitHub-hosted workflow execution,
- repo settings outside the YAML source,
- protected branch configuration,
- environment approval rules,
- deployment platform health,
- secret availability in repository settings.

Therefore, every runtime claim remains `NOT_EXECUTED` unless a GitHub Actions run is observed and recorded.

## 8. Final status summary

- Workflow inventory: `VERIFIED`
- Workflow syntax inspection: `VERIFIED`
- Security findings: `FINDING`
- Branch protection check: `NOT_VERIFIED`
- Deployment protection: `FINDING`
- Hardening recommendations: `VERIFIED` (policy guidance)
- Runtime execution: `NOT_EXECUTED`
- Production-ready claim: `NOT_APPLICABLE` until real workflow execution and repo settings are verified

## 9. Recommended next step

1. Review and pin GitHub Actions to full SHAs.
2. Add protected GitHub Environments for deployment.
3. Enforce required checks on `main` branch protection.
4. Standardize Node.js to 22 across workflows.
5. Confirm lockfile presence or intentionally standardize on `npm install` with a documented reason.
6. Run the workflows on GitHub and record the execution results before calling the infrastructure production-ready.

This audit file intentionally does not modify workflow files and therefore does not claim the CI/CD system is hardened or production-ready.
