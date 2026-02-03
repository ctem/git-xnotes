# git-xnotes

A distributed code review annotation system that stores review data as git notes. Inspired by [git-appraise](https://github.com/google/git-appraise), it provides a modern TypeScript/Bun implementation with improved GitHub integration.

## Features

- **Distributed Storage**: All review data stored in git notes, travels with the repository
- **No Server Required**: Works with any git hosting provider
- **Merge-Friendly Format**: Single-line JSON enables automatic merge via `cat_sort_uniq`
- **Dual Interface**: Use as CLI tool or TypeScript library
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
# Using bun
bun add git-xnotes

# Using npm
npm install git-xnotes

# Global CLI installation
bun add -g git-xnotes
```

## Quick Start

### CLI Usage

```bash
# Create a review request
git-xnotes request --target main

# List all reviews
git-xnotes list

# Show review details
git-xnotes show <commit>

# Add a comment
git-xnotes comment <commit> -m "Looks good!"

# Accept a review
git-xnotes accept <commit>

# Push notes to remote
git-xnotes push
```

### Library Usage

```typescript
import {
  readReviewRequests,
  getReview,
  createComment,
  appendComment,
  acceptReview,
  pushAllNotes,
} from 'git-xnotes';

// Read reviews for a commit
const reviews = await readReviewRequests(commitHash);

// Get full review info with state
const review = await getReview(commitHash);
console.log(`Review state: ${review.state}`);  // 'open', 'accepted', etc.

// Add a comment
const comment = createComment({
  author: 'reviewer@example.com',
  description: 'LGTM! Nice refactoring.',
});
await appendComment(commitHash, comment);

// Accept the review
await acceptReview(commitHash, 'reviewer@example.com');

// Push notes to remote
await pushAllNotes({ remote: 'origin' });
```

### Working with Different Repositories

All async functions accept a `cwd` option:

```typescript
// Work with a specific repository
const reviews = await readAllReviewRequests({ cwd: '/path/to/repo' });

// Process multiple repositories
const repos = ['/repo1', '/repo2'];
const allReviews = await Promise.all(
  repos.map(cwd => readAllReviewRequests({ cwd }))
);
```

## API Overview

### Notes Operations

```typescript
// Reading
readReviewRequests(commit, options?)    // Get review requests
readComments(commit, options?)          // Get comments
readCIResults(commit, options?)         // Get CI results
readAllReviewRequests(options?)         // Get all reviews in repo

// Writing
appendReviewRequest(commit, request, options?)
appendComment(commit, comment, options?)
appendCIResult(commit, result, options?)

// Syncing
pushNotes(ref, options?)                // Push single ref
pushAllNotes(options?)                  // Push all xnotes refs
fetchAllNotes(options?)                 // Fetch all xnotes refs
pullNotes(ref, options?)                // Fetch and merge
```

### Review Workflow

```typescript
// Get review information
const review = await getReview(commit);
// review.state: 'open' | 'accepted' | 'rejected' | 'submitted' | 'abandoned'

// Review actions
await acceptReview(commit, 'reviewer@example.com');
await rejectReview(commit, 'reviewer@example.com', 'Needs changes');
await submitReview(commit, 'submitter@example.com');
await abandonReview(commit, 'author@example.com', 'Superseded');
```

### Type Factories

```typescript
// Create typed objects with validation
const request = createReviewRequest({
  requester: 'author@example.com',
  reviewRef: 'refs/heads/feature',
  targetRef: 'refs/heads/main',
});

const comment = createComment({
  author: 'reviewer@example.com',
  description: 'Consider using const here',
  location: {
    commit: 'abc123',
    path: 'src/main.ts',
    range: { startLine: 42, endLine: 42 },
  },
});

const ciResult = createCIResult({
  agent: 'github-actions',
  status: 'success',
  url: 'https://github.com/owner/repo/actions/runs/123',
});
```

### Error Handling

```typescript
import {
  getReview,
  NotFoundError,
  StateError,
  ValidationError,
} from 'git-xnotes';

try {
  await submitReview(commit, 'user@example.com');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('Review not found');
  } else if (error instanceof StateError) {
    console.error('Invalid state transition:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  }
}
```

## Git Notes Schema

git-xnotes stores data in separate git notes references:

| Reference | Purpose |
|-----------|---------|
| `refs/notes/xnotes/reviews` | Review requests and state |
| `refs/notes/xnotes/discuss` | Comments and discussions |
| `refs/notes/xnotes/ci` | CI build results |
| `refs/notes/xnotes/analyses` | Static analysis results |

Each entry is stored as a single line of JSON, enabling automatic merge conflict resolution using git's `cat_sort_uniq` strategy.

## Development

```bash
# Enter development environment
nix develop  # or use direnv

# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build

# Run CLI in development
bun run src/main.ts <command>
```

## Documentation

- [Architecture](./design-docs/specs/architecture.md) - System design overview
- [Library API](./design-docs/specs/library-api.md) - Complete API reference
- [Commands](./design-docs/specs/command.md) - CLI command reference
- [Notes Schema](./design-docs/specs/notes.md) - Data format specification

## License

MIT
