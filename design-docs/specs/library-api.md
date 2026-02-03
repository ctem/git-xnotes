# Library API Specification

This document describes the TypeScript Library API for git-xnotes.

## Overview

git-xnotes exports a comprehensive API for programmatic access to git notes-based code review functionality. All async functions accept an optional `cwd` parameter to specify the target git repository.

## Installation

```bash
# Using bun
bun add git-xnotes

# Using npm
npm install git-xnotes
```

## Quick Start

```typescript
import {
  readReviewRequests,
  getReview,
  createComment,
  appendComment,
  pushAllNotes,
} from 'git-xnotes';

// Read all review requests for a commit
const reviews = await readReviewRequests(commitHash, { cwd: '/path/to/repo' });

// Get full review info including state
const review = await getReview(commitHash);

// Create and append a comment
const comment = createComment({
  author: 'reviewer@example.com',
  description: 'LGTM!',
});
await appendComment(commitHash, comment);

// Push notes to remote
await pushAllNotes({ remote: 'origin' });
```

---

## API Categories

### Git Operations

Low-level git command execution and repository information.

```typescript
import {
  exec,
  execOrThrow,
  getCurrentBranch,
  getHeadCommit,
  getMergeBase,
  getBranchBase,
  getCommitInfo,
  getUserEmail,
  getUserName,
  getRemoteUrl,
  refExists,
  resolveRef,
  isInsideRepo,
  getRepoRoot,
} from 'git-xnotes';
```

#### Types

```typescript
interface GitCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface GitOptions {
  cwd?: string;
}

interface CommitInfo {
  hash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
}
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `exec(args, options?)` | Execute git command | `Promise<GitCommandResult>` |
| `execOrThrow(args, options?)` | Execute git command, throw on error | `Promise<GitCommandResult>` |
| `getCurrentBranch(options?)` | Get current branch name | `Promise<string>` |
| `getHeadCommit(options?)` | Get HEAD commit hash | `Promise<string>` |
| `getMergeBase(ref1, ref2, options?)` | Get merge base commit | `Promise<string>` |
| `getCommitInfo(commit, options?)` | Get commit metadata | `Promise<CommitInfo>` |
| `isInsideRepo(options?)` | Check if in git repo | `Promise<boolean>` |
| `getRepoRoot(options?)` | Get repository root path | `Promise<string>` |

---

### Git Parsing Utilities

Utilities for parsing git command output.

```typescript
import {
  parseRefList,
  parseRefInfo,
  parseDiffStat,
  parseNotesList,
  parseBranchList,
  shortenHash,
  isValidHash,
  isValidEmail,
} from 'git-xnotes';
```

#### Types

```typescript
interface RefInfo {
  hash: string;
  ref: string;
}

interface DiffFileStat {
  path: string;
  additions: number;
  deletions: number;
}

interface DiffStat {
  files: DiffFileStat[];
  totalAdditions: number;
  totalDeletions: number;
}
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `shortenHash(hash, length?)` | Shorten commit hash | `string` |
| `isValidHash(str)` | Validate hex hash format | `boolean` |
| `isValidEmail(str)` | Validate email format | `boolean` |
| `parseNotesList(output)` | Parse `git notes list` output | `Map<string, string>` |

---

### Notes Reference Management

Manage git notes references.

```typescript
import {
  NOTES_REF_PREFIX,
  NOTES_REFS,
  ALL_REF_TYPES,
  getNotesRef,
  getAllNotesRefs,
  getRemoteNotesRef,
  parseNotesRef,
  isNotesRef,
} from 'git-xnotes';
```

#### Constants

```typescript
const NOTES_REF_PREFIX = 'refs/notes/xnotes';

const NOTES_REFS = {
  reviews: 'refs/notes/xnotes/reviews',
  discuss: 'refs/notes/xnotes/discuss',
  ci: 'refs/notes/xnotes/ci',
  analyses: 'refs/notes/xnotes/analyses',
};

type NotesRefType = 'reviews' | 'discuss' | 'ci' | 'analyses';
const ALL_REF_TYPES: NotesRefType[] = ['reviews', 'discuss', 'ci', 'analyses'];
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `getNotesRef(type)` | Get full ref for type | `string` |
| `getAllNotesRefs()` | Get all notes refs | `string[]` |
| `isNotesRef(ref)` | Check if ref is xnotes ref | `boolean` |

---

### Reading Notes

Read data from git notes.

```typescript
import {
  readNoteRaw,
  readNote,
  listNotesCommits,
  readReviewRequests,
  readComments,
  readCIResults,
  readAnalysisResults,
  readAllReviewRequests,
  notesRefExists,
} from 'git-xnotes';
```

#### Types

```typescript
interface ReadNotesOptions {
  cwd?: string;
}
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `readNoteRaw(ref, commit, options?)` | Read raw note content | `Promise<string \| null>` |
| `readNote(ref, commit, parser, options?)` | Read and parse notes | `Promise<T[]>` |
| `listNotesCommits(ref, options?)` | List commits with notes | `Promise<Map<string, string>>` |
| `readReviewRequests(commit, options?)` | Read review requests | `Promise<ReviewRequest[]>` |
| `readComments(commit, options?)` | Read comments | `Promise<Comment[]>` |
| `readCIResults(commit, options?)` | Read CI results | `Promise<CIResult[]>` |
| `readAnalysisResults(commit, options?)` | Read analysis results | `Promise<AnalysisResult[]>` |
| `readAllReviewRequests(options?)` | Read all reviews in repo | `Promise<Map<string, ReviewRequest[]>>` |
| `notesRefExists(ref, options?)` | Check if notes ref exists | `Promise<boolean>` |

---

### Writing Notes

Write data to git notes.

```typescript
import {
  appendNoteRaw,
  appendNote,
  replaceNote,
  removeNote,
  appendReviewRequest,
  appendComment,
  appendCIResult,
  appendAnalysisResult,
} from 'git-xnotes';
```

#### Types

```typescript
interface WriteNotesOptions {
  cwd?: string;
}
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `appendNoteRaw(ref, commit, content, options?)` | Append raw content | `Promise<void>` |
| `appendNote(ref, commit, data, serializer, options?)` | Append typed data | `Promise<void>` |
| `replaceNote(ref, commit, items, serializer, options?)` | Replace all notes | `Promise<void>` |
| `removeNote(ref, commit, options?)` | Remove note | `Promise<void>` |
| `appendReviewRequest(commit, request, options?)` | Append review request | `Promise<void>` |
| `appendComment(commit, comment, options?)` | Append comment | `Promise<void>` |
| `appendCIResult(commit, result, options?)` | Append CI result | `Promise<void>` |
| `appendAnalysisResult(commit, result, options?)` | Append analysis result | `Promise<void>` |

---

### Notes Synchronization

Sync notes with remote repositories.

```typescript
import {
  pushNotes,
  fetchNotes,
  pullNotes,
  pushAllNotes,
  fetchAllNotes,
} from 'git-xnotes';
```

#### Types

```typescript
interface SyncNotesOptions {
  cwd?: string;
  remote?: string;  // Default: 'origin'
}

interface SyncResult {
  success: boolean;
  ref: string;
  message?: string;
}
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `pushNotes(ref, options?)` | Push single notes ref | `Promise<SyncResult>` |
| `fetchNotes(ref, options?)` | Fetch single notes ref | `Promise<SyncResult>` |
| `pullNotes(ref, options?)` | Fetch and merge notes ref | `Promise<SyncResult>` |
| `pushAllNotes(options?)` | Push all xnotes refs | `Promise<SyncResult[]>` |
| `fetchAllNotes(options?)` | Fetch all xnotes refs | `Promise<SyncResult[]>` |

---

### Notes Merging

Configure and execute notes merge strategies.

```typescript
import {
  MERGE_STRATEGY,
  configureMergeStrategy,
  configureAllMergeStrategies,
  mergeNotes,
  isMergeStrategyConfigured,
  ensureMergeStrategiesConfigured,
} from 'git-xnotes';
```

#### Constants

```typescript
const MERGE_STRATEGY = 'cat_sort_uniq';
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `configureMergeStrategy(ref, options?)` | Configure merge for ref | `Promise<void>` |
| `configureAllMergeStrategies(options?)` | Configure all refs | `Promise<void>` |
| `isMergeStrategyConfigured(ref, options?)` | Check if configured | `Promise<boolean>` |
| `ensureMergeStrategiesConfigured(options?)` | Ensure all configured | `Promise<void>` |

---

### Review Service

High-level review workflow operations.

```typescript
import {
  getReview,
  acceptReview,
  rejectReview,
  submitReview,
  abandonReview,
} from 'git-xnotes';
```

#### Types

```typescript
interface ReviewServiceOptions {
  cwd?: string;
}

interface ReviewInfo {
  commit: string;
  requests: ReviewRequest[];
  state: ReviewState;
  latest: ReviewRequest | undefined;
}

interface SubmitOptions extends ReviewServiceOptions {
  noMerge?: boolean;  // Skip actual merge
}

type ReviewState = 'open' | 'accepted' | 'rejected' | 'submitted' | 'abandoned';
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `getReview(commit, options?)` | Get review info | `Promise<ReviewInfo>` |
| `acceptReview(commit, reviewer, options?)` | Accept review | `Promise<void>` |
| `rejectReview(commit, reviewer, reason?, options?)` | Reject review | `Promise<void>` |
| `submitReview(commit, submitter, options?)` | Submit (merge) review | `Promise<void>` |
| `abandonReview(commit, user, reason?, options?)` | Abandon review | `Promise<void>` |

---

### CI Service

CI status tracking operations.

```typescript
import {
  getCIStatus,
  recordCIResult,
  isCIPassing,
  getCIResultsByAgent,
} from 'git-xnotes';
```

#### Types

```typescript
interface CIServiceOptions {
  cwd?: string;
}

interface CIStatusSummary {
  overall: CIStatus;
  results: CIResult[];
  byAgent: Map<string, CIResult>;
}

type CIStatus = 'success' | 'failure' | 'pending';
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `getCIStatus(commit, options?)` | Get CI status summary | `Promise<CIStatusSummary>` |
| `recordCIResult(commit, result, options?)` | Record CI result | `Promise<void>` |
| `isCIPassing(commit, options?)` | Check if CI passes | `Promise<boolean>` |
| `getCIResultsByAgent(commit, options?)` | Get results by agent | `Promise<Map<string, CIResult>>` |

---

### Analysis Service

Static analysis tracking operations.

```typescript
import {
  getAnalysisStatus,
  recordAnalysisResult,
  getLatestAnalysisResult,
  needsAttention,
  isAnalysisPassing,
} from 'git-xnotes';
```

#### Types

```typescript
interface AnalysisServiceOptions {
  cwd?: string;
}

interface AnalysisStatusSummary {
  overall: AnalysisStatus;
  results: AnalysisResult[];
}

type AnalysisStatus = 'lgtm' | 'fyi' | 'nmw';  // "needs more work"
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `getAnalysisStatus(commit, options?)` | Get analysis summary | `Promise<AnalysisStatusSummary>` |
| `recordAnalysisResult(commit, result, options?)` | Record analysis | `Promise<void>` |
| `isAnalysisPassing(commit, options?)` | Check if analysis passes | `Promise<boolean>` |
| `needsAttention(commit, options?)` | Check if needs attention | `Promise<boolean>` |

---

### Type Utilities

Factory functions and validators for data types.

```typescript
import {
  // Review
  createReviewRequest,
  parseReviewRequest,
  serializeReviewRequest,
  validateReviewRequest,
  getReviewState,

  // Comment
  createComment,
  parseComment,
  serializeComment,
  validateComment,
  computeCommentHash,
  buildCommentTree,

  // CI
  createCIResult,
  parseCIResult,
  serializeCIResult,
  validateCIResult,

  // Analysis
  createAnalysisResult,
  parseAnalysisResult,
  serializeAnalysisResult,
  validateAnalysisResult,
} from 'git-xnotes';
```

---

### Error Types

Typed error classes for error handling.

```typescript
import {
  XNotesError,
  ValidationError,
  NotFoundError,
  ConflictError,
  GitError,
  NetworkError,
  StateError,
  isXNotesError,
  isXNotesErrorWithCode,
  wrapError,
} from 'git-xnotes';
```

#### Error Hierarchy

| Error Class | HTTP-like Code | Description |
|-------------|---------------|-------------|
| `XNotesError` | - | Base error class |
| `ValidationError` | 400 | Invalid input data |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | State conflict |
| `GitError` | 500 | Git command failed |
| `NetworkError` | 503 | Network/remote error |
| `StateError` | 409 | Invalid state transition |

#### Example

```typescript
import { getReview, NotFoundError, StateError } from 'git-xnotes';

try {
  const review = await getReview(commit);
  await submitReview(commit, 'user@example.com');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('Review not found');
  } else if (error instanceof StateError) {
    console.error('Cannot submit:', error.message);
  }
}
```

---

## Data Types Reference

### ReviewRequest

```typescript
interface ReviewRequest {
  timestamp: string;        // Unix timestamp in seconds
  requester: string;        // Email address
  reviewRef: string;        // Source branch (refs/heads/...)
  targetRef: string;        // Target branch (refs/heads/...)
  baseCommit?: string;      // Base commit hash
  reviewers?: string[];     // Reviewer emails
  description?: string;     // Review description
  alias?: string;           // Alternate commit reference
  resolved?: boolean;       // true=accepted, false=rejected
  submitted?: boolean;      // true=merged
  v: number;                // Schema version (0)
}
```

### Comment

```typescript
interface Comment {
  timestamp: string;        // Unix timestamp
  author: string;           // Email address
  description: string;      // Comment text
  parent?: string;          // Parent comment hash (for replies)
  original?: string;        // Original comment hash (for edits)
  resolved?: boolean;       // Thread resolved status
  location?: CommentLocation;
  v: number;                // Schema version (0)
}

interface CommentLocation {
  commit: string;           // Commit this comment applies to
  path: string;             // File path
  range?: LineRange;
}

interface LineRange {
  startLine: number;
  startColumn?: number;
  endLine: number;
  endColumn?: number;
}
```

### CIResult

```typescript
interface CIResult {
  timestamp: string;        // Unix timestamp
  agent: string;            // CI system identifier
  status: CIStatus;         // 'success' | 'failure' | 'pending'
  url?: string;             // Link to CI build
  v: number;                // Schema version (0)
}
```

### AnalysisResult

```typescript
interface AnalysisResult {
  timestamp: string;        // Unix timestamp
  url: string;              // Link to analysis results
  status: AnalysisStatus;   // 'lgtm' | 'fyi' | 'nmw'
  v: number;                // Schema version (0)
}
```

---

## Working with Multiple Repositories

All async functions accept a `cwd` option to specify the target repository:

```typescript
// Work with a specific repository
const reviews = await readAllReviewRequests({ cwd: '/path/to/repo' });

// Work with current directory (default)
const reviews = await readAllReviewRequests();

// Multiple repositories
const repos = ['/repo1', '/repo2', '/repo3'];
const allReviews = await Promise.all(
  repos.map(cwd => readAllReviewRequests({ cwd }))
);
```

---

## See Also

- [Architecture](./architecture.md) - System architecture overview
- [Notes Schema](./notes.md) - Git notes data format
- [Command Reference](./command.md) - CLI commands
