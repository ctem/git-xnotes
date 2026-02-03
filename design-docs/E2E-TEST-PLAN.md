# git-xnotes E2E Test Plan

This document describes the end-to-end (E2E) integration test plan for git-xnotes using a sandbox git repository.

**Test Type**: E2E Integration Test (not unit test)

## Test Environment

- **Sandbox Location**: `.private/sandbox-git/` (temporary, created during test execution)
- **Test Repository**: A local git repository with multiple branches
- **Runtime**: Bun with TypeScript

## Pre-requisites

1. Bun runtime installed
2. Git configured with user.name and user.email
3. git-xnotes project built and available

## Test Scenarios

### Phase 1: Core Local Operations

#### TEST-001: Initialize Test Repository

**Purpose**: Create a sandbox git repository with branches for testing

**Steps**:
1. Create `.private/sandbox-git/` directory
2. Initialize a new git repository
3. Create initial commit on `main` branch
4. Create a feature branch `feature/test-feature`
5. Add commits to the feature branch

**Expected Result**: A git repository with main and feature branches

---

#### TEST-002: Create Review Request

**Purpose**: Test the `request` command

**Steps**:
1. Checkout `feature/test-feature` branch
2. Run `git-xnotes request -t main -m "Test review request"`
3. Verify the review request is stored in git notes

**Expected Result**: Review request created successfully with proper metadata

---

#### TEST-003: List Reviews

**Purpose**: Test the `list` command

**Steps**:
1. Run `git-xnotes list`
2. Verify the review from TEST-002 is listed
3. Test filtering options: `--all`, `--author`, `--target`, `--format`

**Expected Result**: Review list displayed with correct information

---

#### TEST-004: Show Review Details

**Purpose**: Test the `show` command

**Steps**:
1. Run `git-xnotes show` (for current HEAD)
2. Run `git-xnotes show <commit>`
3. Test options: `--diff`, `--comments`, `--json`

**Expected Result**: Review details displayed correctly

---

#### TEST-005: Add Comments

**Purpose**: Test the `comment` command

**Steps**:
1. Add a general comment: `git-xnotes comment -m "General comment"`
2. Add an inline comment: `git-xnotes comment -m "Inline comment" -f src/test.ts -l 10`
3. Add a reply comment: `git-xnotes comment -m "Reply" --parent <hash>`

**Expected Result**: Comments stored and retrievable

---

### Phase 2: Review Workflow

#### TEST-006: Accept Review

**Purpose**: Test the `accept` command

**Steps**:
1. Run `git-xnotes accept -m "LGTM"`
2. Verify review state changes to "accepted"
3. Run `git-xnotes list` to verify status

**Expected Result**: Review marked as accepted

---

#### TEST-007: Reject Review

**Purpose**: Test the `reject` command

**Precondition**: Create a new review request

**Steps**:
1. Create new feature branch and review request
2. Run `git-xnotes reject -m "Needs changes"`
3. Verify review state changes to "rejected"

**Expected Result**: Review marked as rejected

---

#### TEST-008: Submit Review

**Purpose**: Test the `submit` command

**Precondition**: Have an accepted review

**Steps**:
1. From TEST-006, the review should be accepted
2. Run `git-xnotes submit`
3. Verify feature branch is merged into target
4. Verify review state changes to "submitted"

**Expected Result**: Review merged and marked as submitted

---

#### TEST-009: Abandon Review

**Purpose**: Test the `abandon` command

**Steps**:
1. Create a new feature branch and review request
2. Run `git-xnotes abandon`
3. Verify review state changes to "abandoned"

**Expected Result**: Review marked as abandoned without merge

---

### Phase 3: Notes Synchronization (Local Only)

#### TEST-010: Push Notes

**Purpose**: Test the `push` command (to a local bare repository)

**Steps**:
1. Create a bare repository as "remote"
2. Add it as origin
3. Run `git-xnotes push`
4. Verify notes refs are pushed

**Expected Result**: Notes pushed to remote repository

---

#### TEST-011: Pull Notes

**Purpose**: Test the `pull` command

**Steps**:
1. Make changes in another clone
2. Run `git-xnotes pull`
3. Verify notes are updated

**Expected Result**: Notes pulled from remote

---

### Phase 4: Advanced Features

#### TEST-012: CI Results

**Purpose**: Test the `ci` command

**Steps**:
1. Report CI result: `git-xnotes ci report --status success --agent "test-ci"`
2. List CI results: `git-xnotes ci list`

**Expected Result**: CI results stored and retrievable

---

#### TEST-013: Analysis Results

**Purpose**: Test the `analysis` command

**Steps**:
1. Report analysis: `git-xnotes analysis report --status lgtm --url "http://example.com"`
2. List analysis results: `git-xnotes analysis list`

**Expected Result**: Analysis results stored and retrievable

---

#### TEST-014: Configuration

**Purpose**: Test the `config` command

**Steps**:
1. Get configuration: `git-xnotes config get`
2. Set configuration: `git-xnotes config set <key> <value>`

**Expected Result**: Configuration managed correctly

---

## Test Execution Order

Due to dependencies, tests should be executed in the following order:

1. TEST-001 (Setup)
2. TEST-002 (Create first review)
3. TEST-003 (List reviews)
4. TEST-004 (Show review)
5. TEST-005 (Add comments)
6. TEST-006 (Accept review)
7. TEST-008 (Submit accepted review)
8. TEST-007 (Reject - needs new review)
9. TEST-009 (Abandon - needs new review)
10. TEST-010, TEST-011 (Push/Pull)
11. TEST-012, TEST-013, TEST-014 (Advanced)

## Cleanup

After tests, the sandbox directory can be deleted:
```bash
rm -rf .private/sandbox-git/
```

## Test Results (2026-02-03 - Re-run after fixes)

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| TEST-001 | Initialize Test Repository | PASS | Created main with initial commit, feature/test-feature with 2 additional commits |
| TEST-002 | Create Review Request | PASS | Review created successfully |
| TEST-003 | List Reviews | PASS | All formats (table, json, oneline) work correctly |
| TEST-004 | Show Review Details | PASS | Works with --diff, --comments, --json options |
| TEST-005 | Add Comments | PASS | General, inline, and reply comments with full hash parent references |
| TEST-006 | Accept Review | PASS | Review state changed to "accepted" |
| TEST-007 | Reject Review | PASS | Review state changed to "rejected" |
| TEST-008 | Submit Review | PASS | Fast-forward merge successful, state changed to "submitted" |
| TEST-009 | Abandon Review | PASS | Timestamp collision fixed - state correctly shows "abandoned" |
| TEST-010 | Push Notes | PASS | Notes refs pushed to remote bare repository |
| TEST-011 | Pull Notes | PASS | Notes refs pulled to clone, reviews accessible |
| TEST-012 | CI Results | PASS | CI record and status commands work correctly |
| TEST-013 | Analysis Results | PASS | Analysis record and status commands work correctly |
| TEST-014 | Configuration | PASS | Config set, get, and list commands work correctly |

## Resolved Issues

### ISSUE-001: Timestamp Collision in Same-Second Operations (FIXED)

**Fix Applied**: Added stable sort with array index as tiebreaker in `src/types/review.ts`.

When timestamps are equal, the sort now uses array index as secondary sort key. Git notes append new entries at the end of the file, so later index = newer entry.

**Files Modified**:
- `src/types/review.ts` - Added `sortRequestsByTimestamp()` and `getLatestRequest()`
- `src/cli/commands/show.ts`, `src/cli/commands/list.ts`, `src/services/review.ts` - Use new helpers

### ISSUE-002: Reply Comments Not Displayed in Tree (FIXED)

**Fix Applied**: Store full hash in parent field instead of short hash in `src/cli/commands/comment.ts`.

When user specifies `--parent <short-hash>`, the command now resolves it to the full 40-character hash before storing. This ensures the `findReplies()` function can match parent references correctly.

**Files Modified**:
- `src/cli/commands/comment.ts` - Added `findCommentByShortHash()` function to resolve short hashes

## Execution Commands

To reproduce these tests:

```bash
# Navigate to project root
cd /g/gits/tacogips/git-xnotes

# Run the main.ts with bun
alias xnotes="bun run src/main.ts"

# TEST-001: Initialize
mkdir -p .private/sandbox-git && cd .private/sandbox-git
git init && git config user.name "Test User" && git config user.email "test@example.com"
echo "# Test" > README.md && git add . && git commit -m "Initial commit"
mkdir src && echo 'export function hello() { return "Hello"; }' > src/test.ts
git add . && git commit -m "Add test.ts"

# Create feature branch
git checkout -b feature/test-feature
echo 'export function world() { return "World"; }' >> src/test.ts
git add . && git commit -m "Add world function"

# TEST-002: Request
xnotes request -t main -m "Test review"

# TEST-003: List
xnotes list
xnotes list --format json
xnotes list --format oneline

# TEST-004: Show
xnotes show
xnotes show --json
xnotes show --diff

# TEST-005: Comment
xnotes comment -m "General comment"
xnotes comment -m "Inline comment" -f src/test.ts -l 2
xnotes comment -m "Reply" --parent <hash>

# TEST-006: Accept
xnotes accept -m "LGTM"

# TEST-008: Submit
xnotes submit

# TEST-007: Reject (create new branch first)
git checkout main && git checkout -b feature/needs-work
echo 'function broken() {}' >> src/test.ts
git add . && git commit -m "Add broken"
xnotes request -t main -m "Broken feature"
xnotes reject -m "Needs work"

# TEST-009: Abandon (create new branch first)
git checkout main && git checkout -b feature/to-abandon
echo 'function deprecated() {}' >> src/test.ts
git add . && git commit -m "Add deprecated"
xnotes request -t main -m "Deprecated"
sleep 1  # Wait to avoid timestamp collision
xnotes abandon

# TEST-010: Push
git clone --bare . ../sandbox-bare/repo.git
git remote add origin ../sandbox-bare/repo.git
xnotes push

# TEST-011: Pull
git clone ../sandbox-bare/repo.git ../sandbox-clone
cd ../sandbox-clone
xnotes pull
xnotes list --all

# TEST-012: CI
xnotes ci record <commit> --agent "github-actions" --status success --url "https://example.com"
xnotes ci status <commit>

# TEST-013: Analysis
xnotes analysis record <commit> --status lgtm --url "https://example.com"
xnotes analysis status <commit>

# TEST-014: Config
xnotes config set debug true
xnotes config get debug
xnotes config list
```
