---
name: git-xnotes-review
description: Use when registering, retrieving, or managing code review comments using git-xnotes. Provides complete workflow for creating review requests, adding comments (inline/threaded), accepting/rejecting reviews, and synchronizing review notes.
allowed-tools: Bash, Read, Grep, Glob
---

# git-xnotes Review Comment Skill

This skill enables AI agents to manage code reviews using git-xnotes, a git notes-based review system.

## When to Use

- Creating or managing code review requests
- Adding comments to code reviews (standalone, inline, or threaded)
- Accepting, rejecting, or abandoning reviews
- Listing and inspecting review status
- Synchronizing review notes between repositories

## Prerequisites

- `git-xnotes` CLI must be installed and available in PATH
- Working directory must be a git repository
- Current branch must not be in detached HEAD state for review operations

## Core Commands Reference

### 1. Creating Review Requests

```bash
# Create a review request for current branch
git-xnotes request -t <target-branch> -r <reviewer-email> -m "<description>"

# Options:
#   -t, --target <branch>    Target branch for merge (default: main)
#   -r, --reviewers <emails> Reviewer email addresses (space-separated)
#   -m, --message <text>     Review description
#   --base <commit>          Base commit (auto-detected if omitted)
```

**Example:**
```bash
git-xnotes request -t main -r "alice@example.com" -m "Add user authentication feature"
```

### 2. Adding Comments

```bash
# Add a standalone comment
git-xnotes comment [commit] -m "<message>"

# Add an inline comment on a specific file/line
git-xnotes comment [commit] -m "<message>" -f <file-path> -l <line-number>

# Reply to an existing comment (create thread)
git-xnotes comment [commit] -m "<message>" --parent <comment-hash>

# Mark a comment thread as resolved
git-xnotes comment [commit] -m "<message>" --resolve

# Options:
#   -m, --message <text>   Comment text (required)
#   -f, --file <path>      File path for inline comment
#   -l, --line <number>    Line number for inline comment
#   --parent <hash>        Parent comment hash (for threading)
#   --resolve              Mark thread as resolved
#   --author <email>       Override author email
```

**Examples:**
```bash
# General comment
git-xnotes comment HEAD -m "Overall implementation looks good"

# Inline comment on specific line
git-xnotes comment HEAD -m "This logic could be simplified" -f src/auth.ts -l 42

# Reply to existing comment (use short hash)
git-xnotes comment HEAD -m "I agree with this suggestion" --parent 7f8a9b

# Mark resolved
git-xnotes comment HEAD -m "Fixed in latest commit" --parent 7f8a9b --resolve
```

### 3. Review Actions

```bash
# Accept/approve a review
git-xnotes accept [commit] -m "<approval-message>"

# Reject/request changes (message required)
git-xnotes reject [commit] -m "<rejection-reason>"

# Abandon/close review without merging
git-xnotes abandon [commit]

# Submit/merge an accepted review
git-xnotes submit [commit] [options]
#   --merge    Create merge commit (no fast-forward)
#   --rebase   Rebase onto target
#   --ff       Fast-forward only (default)
#   --tbr      Submit without acceptance ("to be reviewed")
```

**Examples:**
```bash
git-xnotes accept HEAD -m "Approved! Ready to merge."
git-xnotes reject HEAD -m "Needs additional test coverage"
git-xnotes submit HEAD --ff
```

### 4. Listing and Viewing Reviews

```bash
# List open reviews
git-xnotes list

# List all reviews (including closed)
git-xnotes list --all

# Filter by author or target
git-xnotes list --author "alice@example.com" --target main

# Output formats
git-xnotes list --format table    # Human-readable (default)
git-xnotes list --format json     # Machine-readable
git-xnotes list --format oneline  # Compact
```

```bash
# Show review details
git-xnotes show [commit]

# Include code diff
git-xnotes show [commit] --diff

# JSON output
git-xnotes show [commit] --json
```

### 5. Synchronizing Notes

```bash
# Push review notes to remote
git-xnotes push [remote]           # Push all notes refs
git-xnotes push origin --ref reviews  # Push specific ref

# Pull review notes from remote
git-xnotes pull [remote]           # Pull all notes refs
git-xnotes pull origin --ref discuss  # Pull specific ref

# Notes refs: reviews, discuss, ci, analyses
```

## Workflow Patterns

### Standard Review Flow

```
1. Developer creates feature branch and commits
2. Developer: git-xnotes request -t main -r "reviewer@example.com" -m "Feature description"
3. Reviewer: git-xnotes show <commit> --diff
4. Reviewer: git-xnotes comment <commit> -m "Comment" -f file.ts -l 10
5. Developer: git-xnotes comment <commit> -m "Response" --parent <hash>
6. Reviewer: git-xnotes accept <commit> -m "LGTM"
7. Developer: git-xnotes submit <commit>
```

### AI Agent Review Pattern

When performing automated code review:

```bash
# 1. Pull latest review notes
git-xnotes pull origin

# 2. List pending reviews
git-xnotes list --format json

# 3. For each review, examine details
git-xnotes show <commit> --diff --json

# 4. Add review comments
git-xnotes comment <commit> -m "Observation" -f <file> -l <line>

# 5. Make decision
git-xnotes accept <commit> -m "Approved with comments"
# OR
git-xnotes reject <commit> -m "Please address the following..."

# 6. Push notes to share
git-xnotes push origin
```

## Output Formats

The `list` and `show` commands support multiple output formats. Choose the appropriate format based on your use case.

### List Command Formats

**Available formats:** `--format table` (default), `--format json`, `--format oneline`

#### table (default)

Human-readable columnar format with headers. Columns are auto-sized based on content.

```
COMMIT   AUTHOR                TARGET  STATUS     DESCRIPTION
a1b2c3d  alice@example.com     main    pending    Add user authentication feature
d4e5f6g  bob@example.com       main    accepted   Fix performance issue
7890abc  carol@example.com     develop rejected   Refactor database layer
```

- Commit hash is truncated to 7 characters
- Author is truncated to 20 characters
- Target branch name has `refs/heads/` prefix removed
- Description is truncated to 40 characters

#### oneline

Compact single-line format, space-separated fields. Useful for scripting with `awk`, `cut`, etc.

```
a1b2c3d alice@example.com main pending Add user authentication feature
d4e5f6g bob@example.com main accepted Fix performance issue
7890abc carol@example.com develop rejected Refactor database layer
```

Field order: `<commit> <author> <target> <status> <description>`

#### json

Machine-readable JSON format. Best for programmatic parsing.

```json
{
  "reviews": [
    {
      "commit": "a1b2c3d",
      "author": "alice@example.com",
      "target": "refs/heads/main",
      "status": "pending",
      "description": "Add user authentication feature"
    },
    {
      "commit": "d4e5f6g",
      "author": "bob@example.com",
      "target": "refs/heads/main",
      "status": "accepted",
      "description": "Fix performance issue"
    }
  ]
}
```

### Show Command Formats

**Available formats:** default (table-like), `--json`

#### default (table-like)

Human-readable key-value format with hierarchical comment display.

```
Review: a1b2c3d
Author: alice@example.com
Source: feature/auth
Target: main
Status: pending

Add user authentication feature

--- Comments ---
[2025-01-15] bob@example.com:
  This logic could be simplified
  @ src/auth.ts:42-45
  [2025-01-16] alice@example.com:
    Good point, I'll refactor this
    [2025-01-16] bob@example.com:
      Thanks!
[2025-01-15] carol@example.com:
  Consider adding error handling here
  @ src/auth.ts:78
```

- Comments are displayed as a tree structure with indentation showing parent-child relationships
- Each comment shows: `[date] author:` followed by the comment text
- Inline comments show location as `@ <file>:<line-range>`
- Reply depth is indicated by indentation (2 spaces per level)

#### json

Machine-readable JSON format with full comment tree structure.

```json
{
  "review": {
    "commit": "a1b2c3d4e5f6...",
    "author": "alice@example.com",
    "source": "refs/heads/feature/auth",
    "target": "refs/heads/main",
    "status": "pending",
    "description": "Add user authentication feature"
  },
  "comments": [
    {
      "comment": {
        "author": "bob@example.com",
        "description": "This logic could be simplified",
        "timestamp": "1705312800",
        "location": {
          "path": "src/auth.ts",
          "range": { "startLine": 42, "endLine": 45 }
        },
        "parent": null,
        "resolved": false
      },
      "replies": [
        {
          "comment": {
            "author": "alice@example.com",
            "description": "Good point, I'll refactor this",
            "timestamp": "1705399200",
            "location": null,
            "parent": "7f8a9b0...",
            "resolved": false
          },
          "replies": []
        }
      ]
    }
  ]
}
```

### Format Selection Guide

| Use Case | Recommended Format |
|----------|-------------------|
| Human review in terminal | `table` (default) |
| Quick status check | `oneline` |
| AI agent parsing | `json` |
| Shell script processing | `oneline` + `awk`/`cut` |
| Programmatic integration | `json` |
| Debugging/inspection | `table` or default |

## Error Handling

Common errors and resolutions:

| Error | Cause | Resolution |
|-------|-------|------------|
| "Not in a git repository" | CWD is not a git repo | Change to repository root |
| "Detached HEAD state" | Not on a branch | Checkout a branch first |
| "Branch not found" | Target branch missing | Verify branch name |
| "Review not found" | No review for commit | Check commit hash |
| "Ambiguous hash prefix" | Multiple comments match | Use longer hash prefix |

## Best Practices for AI Agents

1. **Always pull before reviewing** - Ensure you have latest review notes
2. **Use JSON format for parsing** - Easier to process programmatically
3. **Use inline comments for specific issues** - Reference exact file and line
4. **Thread related comments** - Use `--parent` for discussions
5. **Mark resolved when addressed** - Use `--resolve` flag
6. **Push after changes** - Share your review notes immediately
7. **Provide clear rejection reasons** - Required for `reject` command

## Quick Command Reference

| Action | Command |
|--------|---------|
| Create review | `git-xnotes request -t <branch> -r <email> -m "<msg>"` |
| List reviews | `git-xnotes list [--all] [--format json]` |
| Show review | `git-xnotes show <commit> [--diff] [--json]` |
| Add comment | `git-xnotes comment <commit> -m "<msg>" [-f file -l line]` |
| Reply | `git-xnotes comment <commit> -m "<msg>" --parent <hash>` |
| Accept | `git-xnotes accept <commit> -m "<msg>"` |
| Reject | `git-xnotes reject <commit> -m "<reason>"` |
| Submit | `git-xnotes submit <commit> [--ff\|--merge\|--rebase]` |
| Abandon | `git-xnotes abandon <commit>` |
| Push notes | `git-xnotes push [remote]` |
| Pull notes | `git-xnotes pull [remote]` |
