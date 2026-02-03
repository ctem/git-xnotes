# Command Design

This document describes CLI command interface design specifications for git-xnotes.

## Overview

git-xnotes provides a CLI tool `git-xnotes` (or `xnotes`) for managing code reviews stored as git notes. The command structure mirrors git-appraise for familiarity while adding modern enhancements.

---

## Command Structure

```
git-xnotes <command> [options] [arguments]
```

Alternative invocation (if installed as git subcommand):
```
git xnotes <command> [options] [arguments]
```

---

## Subcommands

### Review Management

| Command | Description | Phase |
|---------|-------------|-------|
| `request` | Create a new review request | 1 |
| `list` | List open reviews | 1 |
| `show` | Show review details | 1 |
| `abandon` | Abandon a review | 2 |

### Comments

| Command | Description | Phase |
|---------|-------------|-------|
| `comment` | Add a comment to a review | 1 |

### Review Actions

| Command | Description | Phase |
|---------|-------------|-------|
| `accept` | Accept/approve a review | 2 |
| `reject` | Reject a review | 2 |
| `submit` | Merge an accepted review | 2 |

### Synchronization

| Command | Description | Phase |
|---------|-------------|-------|
| `push` | Push review notes to remote | 1 |
| `pull` | Pull review notes from remote | 1 |
| `sync` | Bidirectional GitHub sync | 3 |

---

## Command Specifications

### request

Create a new review request for the current branch.

```
git-xnotes request [options]
```

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-t, --target` | string | main | Target branch for merge |
| `-r, --reviewers` | string[] | - | Reviewer email addresses |
| `-m, --message` | string | - | Review description |
| `--base` | string | - | Base commit (auto-detected if omitted) |

#### Behavior

1. Detect current branch as review source
2. Find the first commit that diverged from target branch
3. Create ReviewRequest JSON and attach as git note
4. Print review hash

#### Example

```bash
git-xnotes request -t main -r alice@example.com -m "Add user authentication"
```

---

### list

List open reviews in the repository.

```
git-xnotes list [options]
```

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-a, --all` | boolean | false | Include closed/submitted reviews |
| `--author` | string | - | Filter by author email |
| `--target` | string | - | Filter by target branch |
| `-f, --format` | string | table | Output format: table, json, oneline |

#### Output Columns

- Commit hash (short)
- Author
- Target branch
- Status (open/accepted/rejected/submitted)
- Description (truncated)

---

### show

Show details of a specific review.

```
git-xnotes show [options] [<commit>]
```

#### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `commit` | string | HEAD | Review commit or current branch |

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--diff` | boolean | false | Show diff of changes |
| `--comments` | boolean | true | Include comments |
| `--json` | boolean | false | Output as JSON |

#### Output

- Review metadata (author, target, status)
- Comment threads (nested)
- CI status (if available)
- Diff (if --diff)

---

### comment

Add a comment to a review.

```
git-xnotes comment [options] [<commit>]
```

#### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `commit` | string | HEAD | Review commit to comment on |

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-m, --message` | string | - | Comment text (opens editor if omitted) |
| `-f, --file` | string | - | File path for inline comment |
| `-l, --line` | number | - | Line number for inline comment |
| `--parent` | string | - | Parent comment hash (for replies) |
| `--resolve` | boolean | false | Mark thread as resolved |
| `--author` | string | - | Override author email (defaults to git config user.email) |

#### Example

```bash
# General comment
git-xnotes comment -m "Looks good overall"

# Inline comment
git-xnotes comment -f src/auth.ts -l 42 -m "Consider using bcrypt here"

# Reply to comment
git-xnotes comment --parent abc123 -m "Good point, fixed"
```

---

### accept

Accept/approve a review.

```
git-xnotes accept [options] [<commit>]
```

#### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `commit` | string | HEAD | Review commit to accept |

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-m, --message` | string | - | Approval message |

#### Behavior

1. Create a comment with `resolved: true`
2. This marks the review as accepted

---

### reject

Reject a review.

```
git-xnotes reject [options] [<commit>]
```

#### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `commit` | string | HEAD | Review commit to reject |

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-m, --message` | string | - | Rejection reason (required) |

---

### submit

Merge an accepted review into the target branch.

```
git-xnotes submit [options] [<commit>]
```

#### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `commit` | string | HEAD | Review commit to submit |

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--merge` | boolean | false | Create merge commit (no fast-forward) |
| `--rebase` | boolean | false | Rebase onto target |
| `--ff` | boolean | true | Fast-forward merge (default) |
| `--tbr` | boolean | false | "To be reviewed" - submit without acceptance |

#### Validation

- Review must be accepted (unless --tbr)
- Review must not already be submitted
- Source must be a descendant of target

---

### abandon

Abandon a review.

```
git-xnotes abandon [options] [<commit>]
```

#### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `commit` | string | HEAD | Review commit to abandon |

#### Behavior

- Marks review as abandoned (no merge will occur)
- Does not delete the review data

---

### push

Push review notes to a remote repository.

```
git-xnotes push [options] [<remote>]
```

#### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `remote` | string | origin | Remote name |

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--all` | boolean | true | Push all notes refs |
| `--ref` | string | - | Push specific notes ref only |

#### Notes Refs Pushed

- `refs/notes/xnotes/reviews`
- `refs/notes/xnotes/discuss`
- `refs/notes/xnotes/ci`
- `refs/notes/xnotes/analyses`

---

### pull

Pull review notes from a remote repository.

```
git-xnotes pull [options] [<remote>]
```

#### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `remote` | string | origin | Remote name |

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--all` | boolean | true | Pull all notes refs |
| `--ref` | string | - | Pull specific notes ref only |
| `--strategy` | string | cat_sort_uniq | Merge strategy |

---

### sync (Phase 3)

Synchronize with GitHub PR.

```
git-xnotes sync [options]
```

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--pull` | boolean | false | Import PR data to notes |
| `--push` | boolean | false | Export notes to PR |
| `--bidirectional` | boolean | true | Full two-way sync |
| `--pr` | number | - | Specific PR number |

---

## Global Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-h, --help` | boolean | false | Show help |
| `-v, --version` | boolean | false | Show version |
| `--debug` | boolean | false | Enable debug output |
| `--no-color` | boolean | false | Disable colored output |
| `-C, --directory` | string | . | Run in specified directory |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `XNOTES_USER` | No | git config user.email | User identity |
| `GITHUB_TOKEN` | For sync | - | GitHub API token |
| `XNOTES_DEBUG` | No | false | Enable debug logging |
| `XNOTES_EDITOR` | No | $EDITOR | Editor for comments |
| `NO_COLOR` | No | - | Disable colored output |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Git error |
| 4 | Review not found |
| 5 | Review state error (e.g., already submitted) |
| 6 | Network error (GitHub API) |

---

## Output Formats

### Table (default)

```
COMMIT   AUTHOR              TARGET   STATUS    DESCRIPTION
abc123   alice@example.com   main     open      Add user authentication
def456   bob@example.com     main     accepted  Fix login bug
```

### JSON

```json
{
  "reviews": [
    {
      "commit": "abc123",
      "author": "alice@example.com",
      "target": "main",
      "status": "open",
      "description": "Add user authentication"
    }
  ]
}
```

### Oneline

```
abc123 alice@example.com main open Add user authentication
def456 bob@example.com main accepted Fix login bug
```

---

## CLI Framework

Using [Commander.js](https://github.com/tj/commander.js) for argument parsing:

- Subcommand-based structure
- Automatic help generation
- Option validation
- Variadic arguments support

---

## References

- [Architecture Design](architecture.md)
- [git-appraise CLI](../references/git-appraise-analysis.md#cli-commands)
