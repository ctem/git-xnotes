/**
 * Review service - business logic for review workflow
 *
 * @module services/review
 */

import {
  type ReviewRequest,
  type ReviewState,
  type CommentWithHash,
  getReviewState,
  sortRequestsByTimestamp,
  createReviewRequest,
  createComment,
  computeCommentHash,
  NotFoundError,
  StateError,
  GitError,
} from "../types/index.js";
import {
  readReviewRequests,
  readComments,
  appendReviewRequest,
  appendComment,
  type ReadNotesOptions,
  type WriteNotesOptions,
} from "../notes/index.js";
import {
  exec,
  execOrThrow,
  getUserEmail,
  resolveRef,
  type GitOptions,
} from "../git/index.js";

/**
 * Submit options for merging a review
 */
export interface SubmitOptions {
  /** Create merge commit (no fast-forward) */
  readonly merge?: boolean;
  /** Rebase onto target */
  readonly rebase?: boolean;
  /** Fast-forward only (default) */
  readonly ff?: boolean;
  /** Submit without acceptance ("to be reviewed") */
  readonly tbr?: boolean;
}

/**
 * Review information including state and comments
 */
export interface ReviewInfo {
  /** First commit hash in the review branch */
  readonly commit: string;
  /** Most recent review request (determines current state) */
  readonly request: ReviewRequest;
  /** Current review state */
  readonly state: ReviewState;
  /** All review requests (state history) */
  readonly allRequests: readonly ReviewRequest[];
  /** All comments on the review */
  readonly comments: readonly CommentWithHash[];
}

/**
 * Service options
 */
export interface ReviewServiceOptions extends ReadNotesOptions, WriteNotesOptions, GitOptions {}

/**
 * Gets review information for a commit.
 *
 * @param commit - Commit hash or ref (default: HEAD)
 * @param options - Service options
 * @returns Review information
 * @throws NotFoundError if no review exists for the commit
 */
export async function getReview(
  commit?: string,
  options?: ReviewServiceOptions
): Promise<ReviewInfo> {
  const resolvedCommit = commit
    ? await resolveRef(commit, options)
    : await resolveRef("HEAD", options);

  const requests = await readReviewRequests(resolvedCommit, options);

  if (requests.length === 0) {
    throw new NotFoundError(`No review found for commit: ${resolvedCommit.substring(0, 7)}`);
  }

  // Get latest request using stable sort
  const sortedRequests = sortRequestsByTimestamp(requests);
  const latestRequest = sortedRequests[0];
  if (!latestRequest) {
    throw new NotFoundError(`No review found for commit: ${resolvedCommit.substring(0, 7)}`);
  }

  const state = getReviewState(requests);

  // Get comments and compute hashes
  const rawComments = await readComments(resolvedCommit, options);
  const comments: CommentWithHash[] = rawComments.map((c) => ({
    ...c,
    hash: computeCommentHash(c),
  }));

  return {
    commit: resolvedCommit,
    request: latestRequest,
    state,
    allRequests: sortedRequests,
    comments,
  };
}

/**
 * Accepts a review by creating a new ReviewRequest with resolved=true.
 *
 * @param commit - Commit hash or ref (default: HEAD)
 * @param message - Optional approval message
 * @param options - Service options
 * @throws NotFoundError if no review exists
 * @throws StateError if review is not in a state that can be accepted
 */
export async function acceptReview(
  commit?: string,
  message?: string,
  options?: ReviewServiceOptions
): Promise<void> {
  const review = await getReview(commit, options);

  // Check if review can be accepted
  if (review.state === "submitted") {
    throw new StateError("Cannot accept a submitted review", {
      currentState: review.state,
      requiredState: "open or rejected",
    });
  }
  if (review.state === "abandoned") {
    throw new StateError("Cannot accept an abandoned review", {
      currentState: review.state,
      requiredState: "open or rejected",
    });
  }

  // Create acceptance comment if message provided
  if (message) {
    const author = await getUserEmail(options);
    const comment = createComment({
      author,
      description: message,
    });
    await appendComment(review.commit, comment, options);
  }

  // Update review state to accepted (resolved=true)
  const updatedRequest = createReviewRequest({
    requester: review.request.requester,
    reviewRef: review.request.reviewRef,
    targetRef: review.request.targetRef,
    baseCommit: review.request.baseCommit,
    reviewers: review.request.reviewers ? [...review.request.reviewers] : undefined,
    description: review.request.description,
    alias: review.request.alias,
    resolved: true,
  });

  await appendReviewRequest(review.commit, updatedRequest, options);
}

/**
 * Rejects a review by creating a new ReviewRequest with resolved=false.
 *
 * @param commit - Commit hash or ref (default: HEAD)
 * @param message - Required rejection reason
 * @param options - Service options
 * @throws NotFoundError if no review exists
 * @throws StateError if review is not in a state that can be rejected
 */
export async function rejectReview(
  commit: string | undefined,
  message: string,
  options?: ReviewServiceOptions
): Promise<void> {
  const review = await getReview(commit, options);

  // Check if review can be rejected
  if (review.state === "submitted") {
    throw new StateError("Cannot reject a submitted review", {
      currentState: review.state,
      requiredState: "open or accepted",
    });
  }
  if (review.state === "abandoned") {
    throw new StateError("Cannot reject an abandoned review", {
      currentState: review.state,
      requiredState: "open or accepted",
    });
  }

  // Create rejection comment with the message
  const author = await getUserEmail(options);
  const comment = createComment({
    author,
    description: message,
  });
  await appendComment(review.commit, comment, options);

  // Update review state to rejected (resolved=false)
  const updatedRequest = createReviewRequest({
    requester: review.request.requester,
    reviewRef: review.request.reviewRef,
    targetRef: review.request.targetRef,
    baseCommit: review.request.baseCommit,
    reviewers: review.request.reviewers ? [...review.request.reviewers] : undefined,
    description: review.request.description,
    alias: review.request.alias,
    resolved: false,
  });

  await appendReviewRequest(review.commit, updatedRequest, options);
}

/**
 * Submits (merges) an accepted review.
 *
 * @param commit - Commit hash or ref (default: HEAD)
 * @param submitOptions - Merge options
 * @param options - Service options
 * @throws NotFoundError if no review exists
 * @throws StateError if review is not accepted (unless --tbr)
 * @throws GitError if merge fails
 */
export async function submitReview(
  commit?: string,
  submitOptions?: SubmitOptions,
  options?: ReviewServiceOptions
): Promise<void> {
  const review = await getReview(commit, options);

  // Check if review can be submitted
  if (review.state === "submitted") {
    throw new StateError("Review has already been submitted", {
      currentState: review.state,
    });
  }
  if (review.state === "abandoned") {
    throw new StateError("Cannot submit an abandoned review", {
      currentState: review.state,
      requiredState: "accepted",
    });
  }

  // Unless --tbr, require review to be accepted
  if (!submitOptions?.tbr && review.state !== "accepted") {
    throw new StateError("Review must be accepted before submitting", {
      currentState: review.state,
      requiredState: "accepted",
    });
  }

  // Extract branch names from refs
  const sourceBranch = review.request.reviewRef.replace("refs/heads/", "");
  const targetBranch = review.request.targetRef.replace("refs/heads/", "");

  // Determine merge strategy
  const mergeArgs: string[] = [];

  if (submitOptions?.rebase) {
    // Rebase strategy: checkout source, rebase onto target, checkout target, merge
    await execOrThrow(["checkout", sourceBranch], options);
    await execOrThrow(["rebase", targetBranch], options);
    await execOrThrow(["checkout", targetBranch], options);
    await execOrThrow(["merge", "--ff-only", sourceBranch], options);
  } else if (submitOptions?.merge) {
    // Merge commit strategy
    await execOrThrow(["checkout", targetBranch], options);
    mergeArgs.push("merge", "--no-ff", sourceBranch);
    await execOrThrow(mergeArgs, options);
  } else {
    // Fast-forward only (default)
    await execOrThrow(["checkout", targetBranch], options);
    mergeArgs.push("merge", "--ff-only", sourceBranch);
    const result = await exec(mergeArgs, options);
    if (result.exitCode !== 0) {
      throw new GitError("Fast-forward merge failed. Use --merge or --rebase instead.", {
        command: `git ${mergeArgs.join(" ")}`,
        exitCode: result.exitCode,
        stderr: result.stderr,
      });
    }
  }

  // Update review state to submitted
  const updatedRequest = createReviewRequest({
    requester: review.request.requester,
    reviewRef: review.request.reviewRef,
    targetRef: review.request.targetRef,
    baseCommit: review.request.baseCommit,
    reviewers: review.request.reviewers ? [...review.request.reviewers] : undefined,
    description: review.request.description,
    alias: review.request.alias,
    resolved: true,
    submitted: true,
  });

  await appendReviewRequest(review.commit, updatedRequest, options);
}

/**
 * Abandons a review (closes without merge).
 *
 * @param commit - Commit hash or ref (default: HEAD)
 * @param options - Service options
 * @throws NotFoundError if no review exists
 * @throws StateError if review cannot be abandoned
 */
export async function abandonReview(
  commit?: string,
  options?: ReviewServiceOptions
): Promise<void> {
  const review = await getReview(commit, options);

  // Check if review can be abandoned
  if (review.state === "submitted") {
    throw new StateError("Cannot abandon a submitted review", {
      currentState: review.state,
    });
  }
  if (review.state === "abandoned") {
    throw new StateError("Review has already been abandoned", {
      currentState: review.state,
    });
  }

  // Update review state to abandoned (resolved=false, submitted=true)
  const updatedRequest = createReviewRequest({
    requester: review.request.requester,
    reviewRef: review.request.reviewRef,
    targetRef: review.request.targetRef,
    baseCommit: review.request.baseCommit,
    reviewers: review.request.reviewers ? [...review.request.reviewers] : undefined,
    description: review.request.description,
    alias: review.request.alias,
    resolved: false,
    submitted: true,
  });

  await appendReviewRequest(review.commit, updatedRequest, options);
}
