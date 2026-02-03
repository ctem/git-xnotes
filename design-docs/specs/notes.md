# Git Notes Specification

This document describes git notes storage format, operations, and merge strategies for git-xnotes.

## Overview

git-xnotes uses git notes as the underlying storage mechanism for all review data. Git notes allow attaching metadata to commits without modifying the commits themselves.

---

## Notes References

### Reference Namespace

All git-xnotes data is stored under the `refs/notes/xnotes/` namespace:

| Ref | Purpose | Annotates |
|-----|---------|-----------|
| `refs/notes/xnotes/reviews` | Review requests | First commit in review branch |
| `refs/notes/xnotes/discuss` | Human comments | First commit in review branch |
| `refs/notes/xnotes/ci` | CI build results | Tested commit |
| `refs/notes/xnotes/analyses` | Static analysis results | Analyzed commit |

### Reference Configuration

```ini
[notes "xnotes/reviews"]
  mergeStrategy = cat_sort_uniq

[notes "xnotes/discuss"]
  mergeStrategy = cat_sort_uniq

[notes "xnotes/ci"]
  mergeStrategy = cat_sort_uniq

[notes "xnotes/analyses"]
  mergeStrategy = cat_sort_uniq
```

---

## Data Format

### Single-Line JSON

Each data entry is stored as a **single line of JSON**. This format is critical for enabling automatic merge resolution.

**Why single-line?**
1. Multiple entries can exist per note (one per line)
2. Git's `cat_sort_uniq` merge strategy concatenates, sorts, and deduplicates lines
3. Concurrent edits from multiple developers merge automatically

### Example Note Content

```
{"timestamp":"1704067200","requester":"alice@example.com","reviewRef":"refs/heads/feature","targetRef":"refs/heads/main","v":0}
{"timestamp":"1704067500","requester":"alice@example.com","reviewRef":"refs/heads/feature","targetRef":"refs/heads/main","resolved":true,"v":0}
```

---

## Schema Definitions

### Review Request

```typescript
interface ReviewRequest {
  timestamp: string;        // Unix timestamp (seconds)
  requester: string;        // Email address
  reviewRef: string;        // Source branch ref
  targetRef: string;        // Target branch ref
  baseCommit?: string;      // Base commit hash
  reviewers?: string[];     // Reviewer email addresses
  description?: string;     // Review description
  alias?: string;           // Alternate commit reference
  resolved?: boolean;       // true = accepted, false = rejected
  submitted?: boolean;      // true = merged to target
  v: number;                // Schema version (currently 0)
}
```

**Required fields**: `timestamp`, `requester`, `reviewRef`, `targetRef`, `v`

**Note**: Multiple ReviewRequest entries for the same review commit represent state transitions. The latest entry (by timestamp) represents current state.

### Comment

```typescript
interface Comment {
  timestamp: string;        // Unix timestamp (seconds)
  author: string;           // Email address
  description: string;      // Comment text
  parent?: string;          // SHA1 hash of parent comment (for replies)
  original?: string;        // SHA1 hash of original comment (for edits)
  resolved?: boolean;       // true = thread resolved
  location?: CommentLocation;
  v: number;                // Schema version (currently 0)
}

interface CommentLocation {
  commit: string;           // Commit this comment refers to
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

**Required fields**: `timestamp`, `author`, `description`, `v`

### Comment Identity

Comments are identified by their SHA1 hash computed from the JSON content. This hash is used for:
- `parent` field (reply threading)
- `original` field (edit chains)

```typescript
function computeCommentHash(comment: Comment): string {
  const json = JSON.stringify(comment);
  return sha1(json);  // Returns 40-character hex string
}
```

### CI Result

```typescript
interface CIResult {
  timestamp: string;        // Unix timestamp (seconds)
  agent: string;            // CI system identifier
  status: 'success' | 'failure' | 'pending';
  url?: string;             // Link to CI build
  v: number;                // Schema version (currently 0)
}
```

**Required fields**: `timestamp`, `agent`, `status`, `v`

### Analysis Result

```typescript
interface AnalysisResult {
  timestamp: string;        // Unix timestamp (seconds)
  url: string;              // Link to analysis results
  status: 'lgtm' | 'fyi' | 'nmw';  // lgtm=ok, fyi=info, nmw=needs work
  v: number;                // Schema version (currently 0)
}
```

**Required fields**: `timestamp`, `url`, `status`, `v`

---

## Git Notes Operations

### Reading Notes

```bash
# Read all notes for a commit
git notes --ref=refs/notes/xnotes/reviews show <commit>

# List all annotated commits
git notes --ref=refs/notes/xnotes/reviews list
```

### Writing Notes

```bash
# Add a note (appends if note exists)
git notes --ref=refs/notes/xnotes/reviews append -m '{"json":"data"}' <commit>

# Replace entire note content
git notes --ref=refs/notes/xnotes/reviews add -f -m '{"json":"data"}' <commit>
```

### Pushing Notes

```bash
# Push specific notes ref
git push origin refs/notes/xnotes/reviews:refs/notes/xnotes/reviews

# Push all xnotes refs
git push origin 'refs/notes/xnotes/*:refs/notes/xnotes/*'
```

### Pulling Notes

```bash
# Fetch notes ref
git fetch origin refs/notes/xnotes/reviews:refs/notes/xnotes/reviews

# Merge remote notes with local
git notes --ref=refs/notes/xnotes/reviews merge origin/refs/notes/xnotes/reviews
```

---

## Merge Strategy

### cat_sort_uniq

The `cat_sort_uniq` merge strategy is used for all notes refs:

1. **Concatenate**: Combine all lines from both versions
2. **Sort**: Sort lines lexicographically
3. **Unique**: Remove duplicate lines

This strategy ensures:
- No data loss during concurrent edits
- Deterministic merge results
- Automatic conflict resolution

### Configuration

```bash
# Configure merge strategy for all xnotes refs
git config notes.xnotes/reviews.mergeStrategy cat_sort_uniq
git config notes.xnotes/discuss.mergeStrategy cat_sort_uniq
git config notes.xnotes/ci.mergeStrategy cat_sort_uniq
git config notes.xnotes/analyses.mergeStrategy cat_sort_uniq
```

---

## Annotation Strategy

### Review Requests

Review requests annotate the **first commit** in the review branch (the commit that diverges from the target branch).

```
main:     A---B---C
                   \
feature:            D---E---F  <-- ReviewRequest attached to D
```

### Comments

Comments also annotate the **first commit** in the review branch, but the `location.commit` field specifies which commit the comment actually refers to:

```typescript
{
  "timestamp": "1704067200",
  "author": "bob@example.com",
  "description": "This line looks wrong",
  "location": {
    "commit": "F",  // Comment refers to code in commit F
    "path": "src/auth.ts",
    "range": { "startLine": 42, "endLine": 42 }
  },
  "v": 0
}
// This note is attached to commit D, but comments on commit F
```

### CI Results

CI results annotate the **specific commit** that was tested:

```
main:     A---B---C
                   \
feature:            D---E---F
                            ^-- CI result attached to F
```

### Analysis Results

Analysis results annotate the **specific commit** that was analyzed (same as CI).

---

## Comment Threading

### Reply Structure

Comments form a tree structure via the `parent` field:

```
Comment A (parent: null)
├── Comment B (parent: hash(A))
│   └── Comment C (parent: hash(B))
└── Comment D (parent: hash(A))
```

### Finding Replies

```typescript
function findReplies(comments: Comment[], parentHash: string): Comment[] {
  return comments.filter(c => c.parent === parentHash);
}

function buildThread(comments: Comment[], rootHash: string): CommentTree {
  const root = comments.find(c => computeHash(c) === rootHash);
  const replies = findReplies(comments, rootHash);
  return {
    comment: root,
    replies: replies.map(r => buildThread(comments, computeHash(r)))
  };
}
```

### Edit Chains

When a comment is edited, a new comment is created with `original` pointing to the edited comment:

```
Original Comment A
└── Edit A' (original: hash(A))
    └── Edit A'' (original: hash(A'))
```

The latest comment in the chain (A'') should be displayed. Earlier versions are kept for history.

```typescript
function getLatestVersion(comments: Comment[], hash: string): Comment {
  const edits = comments.filter(c => c.original === hash);
  if (edits.length === 0) {
    return comments.find(c => computeHash(c) === hash);
  }
  // Recursively find latest in chain
  return getLatestVersion(comments, computeHash(edits[0]));
}
```

---

## Review State Machine

### States

| State | resolved | submitted | Description |
|-------|----------|-----------|-------------|
| Open | undefined | undefined | Active review |
| Accepted | true | undefined | Approved, ready to merge |
| Rejected | false | undefined | Changes requested |
| Submitted | true | true | Merged to target |
| Abandoned | false | true | Closed without merge |

### Transitions

```
Open ──accept──> Accepted ──submit──> Submitted
  │                  │
  │                  └──update──> Open (if changes pushed)
  │
  └──reject──> Rejected ──update──> Open (if issues addressed)
  │
  └──abandon──> Abandoned
```

### State Determination

The current state is determined by the **latest** ReviewRequest entry (by timestamp):

```typescript
function getReviewState(requests: ReviewRequest[]): ReviewState {
  const latest = requests.sort((a, b) =>
    parseInt(b.timestamp) - parseInt(a.timestamp)
  )[0];

  if (latest.submitted) {
    return latest.resolved ? 'submitted' : 'abandoned';
  }
  if (latest.resolved === true) return 'accepted';
  if (latest.resolved === false) return 'rejected';
  return 'open';
}
```

---

## Validation Rules

### Review Request

1. `timestamp` must be valid Unix timestamp
2. `requester` must be valid email format
3. `reviewRef` must start with `refs/heads/`
4. `targetRef` must start with `refs/heads/`
5. `v` must be `0` (current version)

### Comment

1. `timestamp` must be valid Unix timestamp
2. `author` must be valid email format
3. `description` must be non-empty
4. `v` must be `0` (current version)
5. If `parent` is set, referenced comment must exist
6. If `original` is set, referenced comment must exist
7. If `location` is set:
   - `commit` must be valid commit hash
   - `path` must be non-empty
   - `range.startLine` <= `range.endLine`

---

## Error Handling

### Note Read Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| Note not found | No note attached to commit | Return empty array |
| Parse error | Invalid JSON in note | Skip invalid lines, log warning |
| Schema error | Missing required fields | Skip invalid entries, log warning |

### Note Write Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| Git error | Notes ref locked | Retry with backoff |
| Permission error | No write access | Report error to user |

---

## References

- [Architecture Design](architecture.md)
- [git-appraise Analysis](../references/git-appraise-analysis.md)
- [Git Notes Documentation](https://git-scm.com/docs/git-notes)
