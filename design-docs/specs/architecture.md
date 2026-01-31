# Architecture Design

This document describes system architecture and design decisions.

## Overview

git-xnotes is a tool for AI agents to leave code review comments stored in git notes.
It does NOT manage review state or merge operations - only comments.

## Git Notes Storage

### Ref

```
refs/notes/xnotes/comments
```

Single ref approach for simplicity.

### Storage Format

Each comment is stored as a **single-line JSON** in git notes.
This enables automatic merging using git's `cat_sort_uniq` notes merge strategy.

Multiple comments can exist per note (one JSON per line).

---

## Data Schema

### Comment (Storage)

```typescript
interface Comment {
  id: string;                      // ULID (Universally Unique Lexicographically Sortable Identifier)
  timestamp: string;               // Unix timestamp
  author: string;                  // Agent ID (e.g., "security-reviewer", "style-checker")
  original?: string;               // ID of comment being edited (for edits)
  parent?: string;                 // ID of parent comment (for thread replies)
  location?: Location;             // File/line location (optional for general comments)
  description: string;             // Comment content
  status?: ThreadStatus;           // Sets thread status when present
  category?: Category;             // Comment category
  severity?: Severity;             // Comment severity
  v: number;                       // Schema version (0)
}

type ThreadStatus = "open" | "resolved" | "dismissed";
type Category = "bug" | "security" | "performance" | "style" | "logic" | "suggestion";
type Severity = "error" | "warning" | "info";
```

### Location

```typescript
interface Location {
  commit: string;                  // Commit SHA this comment refers to
  path: string;                    // File path
  range?: Range;                   // Line range (optional)
}

interface Range {
  startLine: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}
```

### Thread (Computed from Comments)

```typescript
interface Thread {
  id: string;                      // Root comment ID
  location?: Location;
  comments: Comment[];             // Ordered by timestamp
  status: ThreadStatus;            // Latest status from comments, default "open"
}
```

---

## Thread Status

| Status | Meaning |
|--------|---------|
| `open` | Default. Discussion ongoing, needs action |
| `resolved` | Issue addressed/fixed |
| `dismissed` | Won't fix, not applicable, or false positive |

Status is updated by adding a comment with `status` field set.
The latest `status` in the thread determines the current thread status.

---

## Response Schema

### Union Type

```typescript
type XNotesResponse =
  | DiffCommentsResponse
  | CommentResponse
  | CommentsResponse
  | ThreadResponse
  | AllCommentsResponse;
```

### DiffCommentsResponse

Returns comments for commits in the diff between base and target.

```typescript
interface DiffCommentsResponse {
  type: "diff_comments";
  base: string;                    // Base branch/commit (e.g., "main", "abc123")
  target: string;                  // Target branch/commit (e.g., "feature/auth", "def456")
  diffRange: string;               // e.g., "main..feature/auth"
  commits: CommitComments[];       // Comments grouped by commit in diff
  threads: Thread[];               // Threaded view
  summary: {
    totalComments: number;
    unresolvedThreads: number;
    bySeverity: Record<Severity, number>;
    byCategory: Record<Category, number>;
  };
}

interface CommitComments {
  commit: string;                  // Commit SHA
  comments: Comment[];
}
```

### CommentResponse

Returns a single comment by ID.

```typescript
interface CommentResponse {
  type: "comment";
  comment: Comment;
  thread?: Thread;                 // Include parent thread if exists
}
```

### CommentsResponse

Returns multiple comments by IDs.

```typescript
interface CommentsResponse {
  type: "comments";
  comments: Comment[];
  notFound: string[];              // IDs that were not found
}
```

### ThreadResponse

Returns a single thread by root comment ID.

```typescript
interface ThreadResponse {
  type: "thread";
  thread: Thread;
}
```

### AllCommentsResponse

Returns all comments without filtering.

```typescript
interface AllCommentsResponse {
  type: "all_comments";
  ref: string;                     // e.g., "refs/notes/xnotes/comments"
  comments: Comment[];
  threads: Thread[];
}
```

---

## Design Decisions

### Why ULID for Comment ID?

- Sortable by creation time (unlike UUID v4)
- Lexicographically sortable (can use string comparison)
- Contains timestamp information
- 128-bit compatible with UUID

### Why Single-Line JSON?

- Enables git's `cat_sort_uniq` merge strategy
- Multiple agents can add comments concurrently
- Git automatically handles merge conflicts by concatenating and deduplicating

### Why Single Ref?

- Simpler implementation
- Only storing comments (no CI, no review requests)
- Can always split later if needed

### Comment Editing via `original` Field

- Immutable data pattern - nothing is deleted
- New comment with `original` pointing to old comment
- Old comment remains in history
- Latest comment in `original` chain is displayed

### Thread via `parent` Field

- Creates tree structure for discussions
- Agents can reply to each other's comments
- Root comment (no `parent`) defines the thread

---

## References

- [git-appraise Analysis](../references/git-appraise-analysis.md) - Design inspiration from Google's git-appraise
