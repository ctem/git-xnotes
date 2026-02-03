# Phase 3: GitHub Integration Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/specs/architecture.md#github-integration-phase-2
**Created**: 2026-02-01
**Last Updated**: 2026-02-03

---

## Design Document Reference

**Source**: design-docs/specs/architecture.md

### Summary

Implement GitHub integration for synchronizing reviews and comments between git notes and GitHub PRs.

### Scope

**Included**:
- GitHub API client (Octokit)
- PR discovery and mapping
- Comment synchronization (bidirectional)
- sync CLI command
- Status check integration

**Excluded**:
- CI result integration (Phase 4)
- Analysis result integration (Phase 4)

---

## Modules

### 1. GitHub Client

#### src/github/client.ts

**Status**: COMPLETED

```typescript
interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

class GitHubClient {
  constructor(config: GitHubConfig);

  async getPR(number: number): Promise<PR>;
  async listPRs(state?: 'open' | 'closed' | 'all'): Promise<PR[]>;
  async getPRComments(number: number): Promise<PRComment[]>;
  async createPRComment(number: number, body: string, path?: string, line?: number): Promise<PRComment>;
  async updatePRComment(commentId: number, body: string): Promise<PRComment>;
}

function createClient(config?: Partial<GitHubConfig>): GitHubClient;
function getConfigFromEnv(): GitHubConfig;
function getConfigFromGit(): GitHubConfig;
```

**Checklist**:
- [ ] Implement GitHubClient class
- [ ] Implement getPR
- [ ] Implement listPRs
- [ ] Implement getPRComments
- [ ] Implement createPRComment
- [ ] Implement updatePRComment
- [ ] Implement config resolution (env > git config)
- [ ] Handle rate limiting
- [ ] Unit tests with mocked API

---

### 2. PR Mapping

#### src/github/pr.ts

**Status**: COMPLETED

```typescript
interface PRMapping {
  prNumber: number;
  reviewCommit: string;
  sourceBranch: string;
  targetBranch: string;
}

async function findPRForBranch(branch: string): Promise<PRMapping | null>;
async function findPRForCommit(commit: string): Promise<PRMapping | null>;
async function mapPRToReview(pr: PR): Promise<ReviewRequest>;
```

**Checklist**:
- [ ] Implement findPRForBranch
- [ ] Implement findPRForCommit
- [ ] Implement mapPRToReview
- [ ] Handle multiple PRs for same branch
- [ ] Unit tests

---

### 3. Comment Sync

#### src/github/sync.ts

**Status**: COMPLETED

```typescript
interface SyncResult {
  imported: number;
  exported: number;
  conflicts: SyncConflict[];
}

interface SyncConflict {
  type: 'duplicate' | 'deleted' | 'modified';
  localComment?: Comment;
  remoteComment?: PRComment;
}

async function pullComments(prNumber: number): Promise<SyncResult>;
async function pushComments(prNumber: number): Promise<SyncResult>;
async function syncComments(prNumber: number): Promise<SyncResult>;

function mapPRCommentToComment(prComment: PRComment): Comment;
function mapCommentToPRComment(comment: Comment): Partial<PRComment>;
function detectConflicts(local: Comment[], remote: PRComment[]): SyncConflict[];
```

**Checklist**:
- [ ] Implement pullComments (import from PR)
- [ ] Implement pushComments (export to PR)
- [ ] Implement syncComments (bidirectional)
- [ ] Implement comment mapping functions
- [ ] Implement conflict detection
- [ ] Handle inline comments with file/line
- [ ] Track synced comments (avoid duplicates)
- [ ] Unit tests

---

### 4. Sync Command

#### src/cli/commands/sync.ts

**Status**: COMPLETED

```typescript
function registerSyncCommand(program: Command): void;

// Options:
// --pull                 Import PR data to notes
// --push                 Export notes to PR
// --bidirectional        Full two-way sync (default)
// --pr <number>          Specific PR number
```

**Checklist**:
- [ ] Implement registerSyncCommand
- [ ] Parse options
- [ ] Auto-detect PR if not specified
- [ ] Call appropriate sync function
- [ ] Report sync results
- [ ] Integration tests

---

### 5. GitHub Layer Index

#### src/github/index.ts

**Status**: COMPLETED

Re-export GitHub layer from single entry point.

**Checklist**:
- [ ] Re-export client
- [ ] Re-export pr
- [ ] Re-export sync

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| GitHub Client | `src/github/client.ts` | COMPLETED | - |
| PR Mapping | `src/github/pr.ts` | COMPLETED | - |
| Comment Sync | `src/github/sync.ts` | COMPLETED | - |
| Sync Command | `src/cli/commands/sync.ts` | COMPLETED | - |
| GitHub Index | `src/github/index.ts` | COMPLETED | - |

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Phase 1 & 2 complete | phase1-*, phase2-* | Pending |
| Octokit | npm package | Available |
| GITHUB_TOKEN | Environment | User config |

## Completion Criteria

- [ ] GitHub client working with real API
- [ ] PR comments sync bidirectionally
- [ ] Inline comments preserve file/line
- [ ] Duplicate detection working
- [ ] sync command functional
- [ ] Integration tests with mocked API
- [ ] Type checking passes

## Progress Log

### Session: 2026-02-01 00:00
**Tasks Completed**: None yet
**Tasks In Progress**: Plan created
**Blockers**: Phase 1 & 2 not complete
**Notes**: Initial plan created from design documents

### Session: 2026-02-03 14:00
**Tasks Completed**: All Phase 3 tasks
- TASK-001: GitHub Client (src/github/client.ts)
- TASK-002: PR Mapping (src/github/pr.ts)
- TASK-003: Comment Sync (src/github/sync.ts)
- TASK-004: Sync Command (src/cli/commands/sync.ts)
- TASK-005: GitHub Index (src/github/index.ts)
**Tasks In Progress**: None
**Blockers**: None
**Notes**: Phase 3 implementation complete. All 173 tests pass. Type checking passes.

## Related Plans

- **Previous**: phase2-review-workflow.md
- **Next**: phase4-advanced.md
- **Depends On**: All Phase 1 & 2 plans
