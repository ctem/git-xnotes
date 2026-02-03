# Architecture Design

This document describes system architecture and design decisions for git-xnotes.

## Overview

git-xnotes is a distributed code review annotation system that stores review data as git notes. Inspired by git-appraise, it provides a modern TypeScript/Bun implementation with improved GitHub integration.

### Core Principles

1. **Distributed Storage**: All review data stored in git notes, travels with the repository
2. **No Server Required**: Works with any git hosting provider
3. **Merge-Friendly Format**: Single-line JSON enables automatic merge via `cat_sort_uniq`
4. **GitHub Integration**: First-class support for GitHub PR synchronization

---

## System Architecture

### Layer Overview

```
+--------------------------------------------------+
|                    CLI Layer                      |
|  (Commander.js commands: request, comment, etc.) |
+--------------------------------------------------+
                        |
+--------------------------------------------------+
|                 Service Layer                     |
|   (Business logic, validation, orchestration)    |
+--------------------------------------------------+
          |                     |
+-----------------+    +------------------+
|  Notes Layer    |    |  GitHub Layer    |
| (git notes ops) |    |  (API sync)      |
+-----------------+    +------------------+
          |                     |
+-----------------+    +------------------+
|   Git Layer     |    |   HTTP Layer     |
| (git commands)  |    |  (fetch/Octokit) |
+-----------------+    +------------------+
```

### Layer Responsibilities

| Layer | Responsibility | Dependencies |
|-------|----------------|--------------|
| CLI | Parse arguments, invoke services, format output | Service |
| Service | Business logic, validation, cross-layer coordination | Notes, GitHub |
| Notes | Read/write git notes, JSON serialization | Git |
| GitHub | PR sync, comment mirroring, API operations | HTTP |
| Git | Execute git commands, parse output | Process (Bun) |
| HTTP | HTTP requests, authentication | fetch/Octokit |

---

## Git Notes Schema

### Notes References

| Ref | Purpose | Annotates |
|-----|---------|-----------|
| `refs/notes/xnotes/reviews` | Review requests | First commit in review |
| `refs/notes/xnotes/discuss` | Human comments | First commit in review |
| `refs/notes/xnotes/ci` | CI build results | Tested revision |
| `refs/notes/xnotes/analyses` | Robot/static analysis | Analyzed revision |

### Data Format

Each note entry is a **single line of JSON**. Multiple entries per note are allowed (one per line). This format enables automatic merging using git's `cat_sort_uniq` notes merge strategy.

---

## Core Data Types

### Review Request

```typescript
interface ReviewRequest {
  timestamp: string;        // Unix timestamp
  requester: string;        // Email address
  baseCommit?: string;      // Base commit hash
  reviewRef: string;        // Source branch ref
  targetRef: string;        // Target branch ref (e.g., refs/heads/main)
  reviewers?: string[];     // Reviewer email addresses
  description?: string;     // Review description
  alias?: string;           // Alternate commit hash
  resolved?: boolean;       // Review accepted/rejected
  submitted?: boolean;      // Merged to target
  v: number;                // Schema version (0)
}
```

Required fields: `timestamp`, `requester`, `reviewRef`, `targetRef`, `v`

### Comment

```typescript
interface Comment {
  timestamp: string;        // Unix timestamp
  author: string;           // Email address
  description: string;      // Comment text
  parent?: string;          // SHA1 of parent comment (for replies)
  original?: string;        // SHA1 of original comment (for edits)
  resolved?: boolean;       // Thread resolved status
  location?: CommentLocation;  // Inline comment location
  v: number;                // Schema version (0)
}

interface CommentLocation {
  commit: string;           // Commit hash this comment applies to
  path: string;             // File path
  range?: LineRange;        // Line range
}

interface LineRange {
  startLine: number;
  startColumn?: number;
  endLine: number;
  endColumn?: number;
}
```

Required fields: `timestamp`, `author`, `description`, `v`

### CI Result

```typescript
interface CIResult {
  timestamp: string;        // Unix timestamp
  agent: string;            // CI system identifier
  status: CIStatus;         // Build status
  url?: string;             // Link to CI build
  v: number;                // Schema version (0)
}

type CIStatus = 'success' | 'failure' | 'pending';
```

Required fields: `timestamp`, `agent`, `status`, `v`

### Analysis Result

```typescript
interface AnalysisResult {
  timestamp: string;        // Unix timestamp
  url: string;              // Link to analysis results
  status: AnalysisStatus;   // Analysis verdict
  v: number;                // Schema version (0)
}

type AnalysisStatus = 'lgtm' | 'fyi' | 'nmw';  // "needs more work"
```

Required fields: `timestamp`, `url`, `status`, `v`

---

## Directory Structure

```
src/
├── cli/                    # CLI commands
│   ├── index.ts            # Main CLI entry point
│   ├── commands/           # Individual command handlers
│   │   ├── request.ts      # Create review request
│   │   ├── list.ts         # List reviews
│   │   ├── show.ts         # Show review details
│   │   ├── comment.ts      # Add comment
│   │   ├── accept.ts       # Accept review
│   │   ├── reject.ts       # Reject review
│   │   ├── submit.ts       # Merge review
│   │   ├── abandon.ts      # Abandon review
│   │   ├── push.ts         # Push notes
│   │   └── pull.ts         # Pull notes
│   └── formatters/         # Output formatting
├── services/               # Business logic
│   ├── review.ts           # Review management
│   ├── comment.ts          # Comment management
│   └── sync.ts             # GitHub sync
├── notes/                  # Git notes operations
│   ├── reader.ts           # Read notes
│   ├── writer.ts           # Write notes
│   ├── merger.ts           # Merge strategies
│   └── refs.ts             # Reference management
├── github/                 # GitHub integration
│   ├── client.ts           # API client
│   ├── pr.ts               # PR operations
│   └── sync.ts             # Bidirectional sync
├── git/                    # Git command execution
│   ├── commands.ts         # Git command wrappers
│   └── parser.ts           # Output parsing
├── types/                  # Shared type definitions
│   ├── review.ts           # Review types
│   ├── comment.ts          # Comment types
│   ├── ci.ts               # CI types
│   └── analysis.ts         # Analysis types
└── utils/                  # Utilities
    ├── json.ts             # JSON serialization
    ├── sha.ts              # SHA1 computation
    └── timestamp.ts        # Timestamp handling
```

---

## Key Design Decisions

### Single-Line JSON Format

**Decision**: Store each data entry as a single line of JSON.

**Rationale**:
- Enables `cat_sort_uniq` merge strategy for concurrent edits
- Git automatically handles conflicts by concatenating and deduplicating
- Simple parsing: split by newline, parse each line

### Comment Threading via SHA1 References

**Decision**: Use SHA1 hash of comment content for `parent` references.

**Rationale**:
- Creates tree structure for threaded discussions
- SHA1 is deterministic and content-addressable
- No central ID generation required

### Comment Editing via Original Field

**Decision**: Edits create new comments with `original` pointing to the edited comment.

**Rationale**:
- Preserves edit history
- Immutable data model
- Latest comment in `original` chain is displayed

### Separate Notes Refs per Data Type

**Decision**: Use separate git notes refs for reviews, comments, CI, and analyses.

**Rationale**:
- Clear separation of concerns
- Selective sync (can pull only reviews, not all data)
- Simpler querying per data type

---

## GitHub Integration (Phase 2)

### Synchronization Strategy

```
GitHub PR <---> git-xnotes
   |               |
   |-- Comments -->|  (mirror PR comments to notes)
   |<-- Comments --|  (mirror notes comments to PR)
   |-- Status ---->|  (sync PR approval state)
   |<-- Submit ----|  (trigger PR merge)
```

### Sync Modes

| Mode | Description |
|------|-------------|
| `pull` | Import PR data to git notes |
| `push` | Export git notes to PR comments |
| `bidirectional` | Full two-way sync |

---

## Error Handling

### Error Categories

| Category | HTTP-like Code | Example |
|----------|---------------|---------|
| ValidationError | 400 | Invalid review request format |
| NotFoundError | 404 | Review not found |
| ConflictError | 409 | Review already submitted |
| GitError | 500 | Git command failed |
| NetworkError | 503 | GitHub API unavailable |

### Error Response Format

```typescript
interface XNotesError {
  code: string;           // Machine-readable error code
  message: string;        // Human-readable message
  details?: unknown;      // Additional context
}
```

---

## Configuration

### Git Config

```ini
[xnotes]
  user = user@example.com
  github-token = ghp_xxx  # Optional, for GitHub sync
  notes-ref-prefix = refs/notes/xnotes
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `XNOTES_USER` | Override git config user |
| `GITHUB_TOKEN` | GitHub API token |
| `XNOTES_DEBUG` | Enable debug logging |

---

## Implementation Phases

### Phase 1: Core Local Operations

- Git notes read/write operations
- Data type schemas and validation
- Basic CLI commands (request, list, show, comment)
- Notes push/pull

### Phase 2: Review Workflow

- Accept/reject commands
- Submit (merge) command
- Review state machine
- Comment threading and resolution

### Phase 3: GitHub Integration

- GitHub API client
- PR comment sync
- Bidirectional synchronization
- Status checks integration

### Phase 4: Advanced Features

- Analysis results integration
- CI status tracking
- Web UI (optional)
- IDE plugins (optional)

---

## References

- [git-appraise Analysis](../references/git-appraise-analysis.md)
- [Git Notes Documentation](https://git-scm.com/docs/git-notes)
