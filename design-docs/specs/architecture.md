# Architecture Design

This document describes system architecture and design decisions.

## Overview

git-xnotes is a tool for AI agents to leave code review comments stored in git notes.
It does NOT manage review state or merge operations - only comments.

## Usage Modes

git-xnotes can be used in three modes:

### 1. CLI Tool

```bash
git-xnotes --repo /path/to/repo query --base main --target feature/auth
```

### 2. Library (TypeScript)

```typescript
import { GitXNotes } from "git-xnotes";

const xnotes = new GitXNotes({
  gitDir: "/path/to/repo",        // Required: path to git repository
});

// Add comment
await xnotes.addComment({
  author: "security-reviewer",
  description: "SQL injection risk",
  location: { commit: "abc123", path: "src/db.ts", range: { startLine: 42 } },
  category: "security",
  severity: "error",
});

// Query comments
const response = await xnotes.queryDiff({
  base: "main",
  target: "feature/auth",
});
```

### 3. MCP Server (for AI Agents)

```bash
# Start MCP server
git-xnotes mcp --repo /path/to/repo
```

MCP configuration (claude_desktop_config.json):
```json
{
  "mcpServers": {
    "git-xnotes": {
      "command": "git-xnotes",
      "args": ["mcp", "--repo", "/path/to/repo"]
    }
  }
}
```

---

## MCP Tools

git-xnotes exposes the following MCP tools for AI agents:

### xnotes_add_comment

Add a new comment to the repository.

```typescript
{
  name: "xnotes_add_comment",
  description: "Add a code review comment to a git repository",
  inputSchema: {
    type: "object",
    properties: {
      author: { type: "string", description: "Agent ID" },
      description: { type: "string", description: "Comment content" },
      commit: { type: "string", description: "Commit SHA" },
      path: { type: "string", description: "File path" },
      startLine: { type: "number", description: "Start line number" },
      endLine: { type: "number", description: "End line number (optional)" },
      category: { type: "string", enum: ["bug", "security", "performance", "style", "logic", "suggestion"] },
      severity: { type: "string", enum: ["error", "warning", "info"] },
      parent: { type: "string", description: "Parent comment ID for thread reply (optional)" },
      status: { type: "string", enum: ["open", "resolved", "dismissed"], description: "Set thread status (optional)" }
    },
    required: ["author", "description", "commit", "path", "startLine"]
  }
}
```

### xnotes_edit_comment

Edit an existing comment.

```typescript
{
  name: "xnotes_edit_comment",
  description: "Edit an existing code review comment",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Comment ID to edit" },
      description: { type: "string", description: "Updated content" },
      category: { type: "string", enum: ["bug", "security", "performance", "style", "logic", "suggestion"] },
      severity: { type: "string", enum: ["error", "warning", "info"] },
      status: { type: "string", enum: ["open", "resolved", "dismissed"] }
    },
    required: ["id"]
  }
}
```

### xnotes_query_diff

Query comments for commits in a diff range.

```typescript
{
  name: "xnotes_query_diff",
  description: "Get all comments for commits between base and target",
  inputSchema: {
    type: "object",
    properties: {
      base: { type: "string", description: "Base branch or commit" },
      target: { type: "string", description: "Target branch or commit (default: HEAD)" }
    },
    required: ["base"]
  }
}
```

### xnotes_get_comment

Get a single comment by ID.

```typescript
{
  name: "xnotes_get_comment",
  description: "Get a comment by its ID",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Comment ID" }
    },
    required: ["id"]
  }
}
```

### xnotes_get_thread

Get a thread by root comment ID.

```typescript
{
  name: "xnotes_get_thread",
  description: "Get a comment thread by root comment ID",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Root comment ID" }
    },
    required: ["id"]
  }
}
```

### xnotes_get_threads_by_commit

Get all threads for a specific commit.

```typescript
{
  name: "xnotes_get_threads_by_commit",
  description: "Get all comment threads for a specific commit",
  inputSchema: {
    type: "object",
    properties: {
      commit: { type: "string", description: "Commit SHA" }
    },
    required: ["commit"]
  }
}
```

Response:
```typescript
interface CommitThreadsResponse {
  type: "commit_threads";
  commit: string;
  threads: Thread[];
}
```

### xnotes_get_threads_by_commits

Get all threads for multiple commits.

```typescript
{
  name: "xnotes_get_threads_by_commits",
  description: "Get all comment threads for multiple commits",
  inputSchema: {
    type: "object",
    properties: {
      commits: {
        type: "array",
        items: { type: "string" },
        description: "Array of commit SHAs"
      }
    },
    required: ["commits"]
  }
}
```

Response:
```typescript
interface CommitsThreadsResponse {
  type: "commits_threads";
  commits: {
    commit: string;
    threads: Thread[];
  }[];
}
```

### xnotes_list_all

List all comments in the repository.

```typescript
{
  name: "xnotes_list_all",
  description: "List all comments in the repository",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

### xnotes_push

Push notes to remote.

```typescript
{
  name: "xnotes_push",
  description: "Push xnotes to remote repository",
  inputSchema: {
    type: "object",
    properties: {
      remote: { type: "string", description: "Remote name (default: origin)" }
    }
  }
}
```

### xnotes_pull

Pull notes from remote.

```typescript
{
  name: "xnotes_pull",
  description: "Pull xnotes from remote repository",
  inputSchema: {
    type: "object",
    properties: {
      remote: { type: "string", description: "Remote name (default: origin)" }
    }
  }
}
```

---

## Library API

### Constructor

```typescript
interface GitXNotesOptions {
  gitDir: string;                  // Path to git repository (required)
  notesRef?: string;               // Custom notes ref (default: "refs/notes/xnotes/comments")
}

class GitXNotes {
  constructor(options: GitXNotesOptions);
}
```

### Methods

```typescript
class GitXNotes {
  // Write operations
  addComment(params: AddCommentParams): Promise<Comment>;
  editComment(id: string, params: EditCommentParams): Promise<Comment>;

  // Read operations
  getComment(id: string): Promise<CommentResponse>;
  getComments(ids: string[]): Promise<CommentsResponse>;
  getThread(id: string): Promise<ThreadResponse>;
  getThreadsByCommit(commit: string): Promise<CommitThreadsResponse>;
  getThreadsByCommits(commits: string[]): Promise<CommitsThreadsResponse>;
  queryDiff(params: DiffQueryParams): Promise<DiffCommentsResponse>;
  listAll(): Promise<AllCommentsResponse>;

  // Sync operations
  push(remote?: string): Promise<void>;
  pull(remote?: string): Promise<void>;
}
```

### Parameters

```typescript
interface AddCommentParams {
  author: string;
  description: string;
  location?: Location;
  parent?: string;                 // For thread replies
  status?: ThreadStatus;
  category?: Category;
  severity?: Severity;
}

interface EditCommentParams {
  description?: string;
  status?: ThreadStatus;
  category?: Category;
  severity?: Severity;
}

interface DiffQueryParams {
  base: string;                    // Base branch/commit
  target?: string;                 // Target branch/commit (default: HEAD)
}
```

---

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
  createdAt: string;               // Unix timestamp - original creation time
  updatedAt: string;               // Unix timestamp - last edit time (same as createdAt if no edits)
  author: string;                  // Agent ID (e.g., "security-reviewer", "style-checker")
  original?: string;               // ID of comment being edited (for edits)
  parent?: string;                 // ID of parent comment (for thread replies)
  location?: Location;             // File/line location (optional for general comments)
  description: string;             // Comment content
  status?: ThreadStatus;           // Sets thread status when present
  category?: Category;             // Comment category
  severity?: Severity;             // Comment severity
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
  comments: Comment[];             // Ordered by createdAt
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
  | CommitThreadsResponse
  | CommitsThreadsResponse
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

### CommitThreadsResponse

Returns all threads for a specific commit.

```typescript
interface CommitThreadsResponse {
  type: "commit_threads";
  commit: string;                  // Commit SHA
  threads: Thread[];
}
```

### CommitsThreadsResponse

Returns all threads for multiple commits.

```typescript
interface CommitsThreadsResponse {
  type: "commits_threads";
  commits: {
    commit: string;
    threads: Thread[];
  }[];
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

#### Edit Timestamp Behavior

| Field | Original Comment | Edited Comment |
|-------|------------------|----------------|
| `createdAt` | Creation time | **Inherited from original** |
| `updatedAt` | Same as createdAt | Edit time |

When resolving edits for display:
- Use `createdAt` from **root** of edit chain (original comment)
- Use `updatedAt` from **latest** edit
- Use `location`/`parent` from **root**
- Use `description`/`category`/`severity`/`status` from **latest**

#### Example

```json
// Original comment
{
  "id": "01HXK001...",
  "createdAt": "1706745600",
  "updatedAt": "1706745600",
  "author": "security-reviewer",
  "description": "Potential SQL injection",
  "severity": "warning",
  "location": { "commit": "abc123", "path": "src/db.ts", "range": { "startLine": 42 } }
}

// Edited comment (stored separately)
{
  "id": "01HXK002...",
  "createdAt": "1706745600",
  "updatedAt": "1706746000",
  "author": "security-reviewer",
  "original": "01HXK001...",
  "description": "Confirmed SQL injection - user input not sanitized",
  "severity": "error"
}
```

Note: Edited comment omits `location` - inherited from original.

### Thread via `parent` Field

- Creates tree structure for discussions
- Agents can reply to each other's comments
- Root comment (no `parent`) defines the thread

---

## References

- [git-appraise Analysis](../references/git-appraise-analysis.md) - Design inspiration from Google's git-appraise
