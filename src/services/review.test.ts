/**
 * Tests for Review Service
 *
 * @module services/review.test
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";

import {
  getReview,
  acceptReview,
  rejectReview,
  abandonReview,
} from "./review.js";
import {
  NotFoundError,
  StateError,
  createReviewRequest,
  createComment,
  resetTimestampCounter,
  resetCommentTimestampCounter,
} from "../types/index.js";
import {
  appendReviewRequest,
  appendComment,
} from "../notes/index.js";
import {
  exec,
  execOrThrow,
} from "../git/index.js";

/**
 * Creates a temporary git repository for testing.
 * Returns the path and a cleanup function.
 */
async function createTestRepo(): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const path = await mkdtemp(join(tmpdir(), "xnotes-test-"));

  // Initialize git repo
  await execOrThrow(["init"], { cwd: path });
  await execOrThrow(["config", "user.email", "test@example.com"], { cwd: path });
  await execOrThrow(["config", "user.name", "Test User"], { cwd: path });

  // Create initial commit on main
  await Bun.write(join(path, "README.md"), "# Test Repo\n");
  await execOrThrow(["add", "."], { cwd: path });
  await execOrThrow(["commit", "-m", "Initial commit"], { cwd: path });

  return {
    path,
    cleanup: async () => {
      await rm(path, { recursive: true, force: true });
    },
  };
}

/**
 * Creates a feature branch with a commit.
 * Returns the first commit hash of the branch.
 */
async function createFeatureBranch(
  repoPath: string,
  branchName: string
): Promise<string> {
  // Create and checkout feature branch
  await execOrThrow(["checkout", "-b", branchName], { cwd: repoPath });

  // Create a commit
  await Bun.write(join(repoPath, "feature.txt"), "Feature content\n");
  await execOrThrow(["add", "."], { cwd: repoPath });
  await execOrThrow(["commit", "-m", "Add feature"], { cwd: repoPath });

  // Get the commit hash
  const result = await exec(["rev-parse", "HEAD"], { cwd: repoPath });
  return result.stdout.trim();
}

/**
 * Creates a review request for the current branch.
 */
async function createReview(
  repoPath: string,
  commit: string,
  targetBranch = "main"
): Promise<void> {
  const currentBranchResult = await exec(["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: repoPath,
  });
  const currentBranch = currentBranchResult.stdout.trim();

  const request = createReviewRequest({
    requester: "test@example.com",
    reviewRef: `refs/heads/${currentBranch}`,
    targetRef: `refs/heads/${targetBranch}`,
    baseCommit: commit,
  });

  await appendReviewRequest(commit, request, { cwd: repoPath });
}

describe("Review Service", () => {
  let testRepo: { path: string; cleanup: () => Promise<void> };

  beforeEach(async () => {
    // Reset timestamp counters to ensure monotonically increasing timestamps per test
    resetTimestampCounter();
    resetCommentTimestampCounter();
    testRepo = await createTestRepo();
  });

  afterEach(async () => {
    await testRepo.cleanup();
  });

  describe("getReview", () => {
    it("should return review info for a valid review", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-1");
      await createReview(testRepo.path, commit);

      const review = await getReview(commit, { cwd: testRepo.path });

      expect(review.commit).toBe(commit);
      expect(review.state).toBe("open");
      expect(review.request.requester).toBe("test@example.com");
      expect(review.request.reviewRef).toBe("refs/heads/feature-1");
      expect(review.request.targetRef).toBe("refs/heads/main");
    });

    it("should throw NotFoundError for non-existent review", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-no-review");

      await expect(
        getReview(commit, { cwd: testRepo.path })
      ).rejects.toThrow(NotFoundError);
    });

    it("should include comments in review info", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-with-comments");
      await createReview(testRepo.path, commit);

      // Add a comment
      const comment = createComment({
        author: "reviewer@example.com",
        description: "Looks good!",
      });
      await appendComment(commit, comment, { cwd: testRepo.path });

      const review = await getReview(commit, { cwd: testRepo.path });

      expect(review.comments.length).toBe(1);
      expect(review.comments[0]?.description).toBe("Looks good!");
    });
  });

  describe("acceptReview", () => {
    it("should accept an open review", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-accept");
      await createReview(testRepo.path, commit);

      await acceptReview(commit, "LGTM", { cwd: testRepo.path });

      const review = await getReview(commit, { cwd: testRepo.path });
      expect(review.state).toBe("accepted");
    });

    it("should accept a rejected review", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-accept-after-reject");
      await createReview(testRepo.path, commit);

      // First reject
      await rejectReview(commit, "Needs changes", { cwd: testRepo.path });
      let review = await getReview(commit, { cwd: testRepo.path });
      expect(review.state).toBe("rejected");

      // Then accept
      await acceptReview(commit, "Changes look good now", { cwd: testRepo.path });
      review = await getReview(commit, { cwd: testRepo.path });
      expect(review.state).toBe("accepted");
    });

    it("should throw StateError for submitted review", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-submitted");
      await createReview(testRepo.path, commit);

      // Accept first
      await acceptReview(commit, "LGTM", { cwd: testRepo.path });

      // Mark as submitted
      const request = createReviewRequest({
        requester: "test@example.com",
        reviewRef: "refs/heads/feature-submitted",
        targetRef: "refs/heads/main",
        baseCommit: commit,
        resolved: true,
        submitted: true,
      });
      await appendReviewRequest(commit, request, { cwd: testRepo.path });

      await expect(
        acceptReview(commit, "Accept again", { cwd: testRepo.path })
      ).rejects.toThrow(StateError);
    });

    it("should throw StateError for abandoned review", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-abandoned");
      await createReview(testRepo.path, commit);

      await abandonReview(commit, { cwd: testRepo.path });

      await expect(
        acceptReview(commit, "Try to accept", { cwd: testRepo.path })
      ).rejects.toThrow(StateError);
    });
  });

  describe("rejectReview", () => {
    it("should reject an open review", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-reject");
      await createReview(testRepo.path, commit);

      await rejectReview(commit, "Needs refactoring", { cwd: testRepo.path });

      const review = await getReview(commit, { cwd: testRepo.path });
      expect(review.state).toBe("rejected");
    });

    it("should reject an accepted review", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-reject-after-accept");
      await createReview(testRepo.path, commit);

      // First accept
      await acceptReview(commit, "LGTM", { cwd: testRepo.path });

      // Then reject
      await rejectReview(commit, "Wait, found an issue", { cwd: testRepo.path });

      const review = await getReview(commit, { cwd: testRepo.path });
      expect(review.state).toBe("rejected");
    });

    it("should throw StateError for submitted review", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-submitted-reject");
      await createReview(testRepo.path, commit);

      // Mark as submitted
      const request = createReviewRequest({
        requester: "test@example.com",
        reviewRef: "refs/heads/feature-submitted-reject",
        targetRef: "refs/heads/main",
        baseCommit: commit,
        resolved: true,
        submitted: true,
      });
      await appendReviewRequest(commit, request, { cwd: testRepo.path });

      await expect(
        rejectReview(commit, "Try to reject", { cwd: testRepo.path })
      ).rejects.toThrow(StateError);
    });
  });

  describe("abandonReview", () => {
    it("should abandon an open review", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-abandon");
      await createReview(testRepo.path, commit);

      await abandonReview(commit, { cwd: testRepo.path });

      const review = await getReview(commit, { cwd: testRepo.path });
      expect(review.state).toBe("abandoned");
    });

    it("should abandon an accepted review", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-abandon-accepted");
      await createReview(testRepo.path, commit);

      await acceptReview(commit, "LGTM", { cwd: testRepo.path });
      await abandonReview(commit, { cwd: testRepo.path });

      const review = await getReview(commit, { cwd: testRepo.path });
      expect(review.state).toBe("abandoned");
    });

    it("should throw StateError for submitted review", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-submitted-abandon");
      await createReview(testRepo.path, commit);

      // Mark as submitted
      const request = createReviewRequest({
        requester: "test@example.com",
        reviewRef: "refs/heads/feature-submitted-abandon",
        targetRef: "refs/heads/main",
        baseCommit: commit,
        resolved: true,
        submitted: true,
      });
      await appendReviewRequest(commit, request, { cwd: testRepo.path });

      await expect(
        abandonReview(commit, { cwd: testRepo.path })
      ).rejects.toThrow(StateError);
    });

    it("should throw StateError for already abandoned review", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-double-abandon");
      await createReview(testRepo.path, commit);

      await abandonReview(commit, { cwd: testRepo.path });

      await expect(
        abandonReview(commit, { cwd: testRepo.path })
      ).rejects.toThrow(StateError);
    });
  });

  describe("State transitions", () => {
    it("should correctly track state through multiple transitions", async () => {
      const commit = await createFeatureBranch(testRepo.path, "feature-transitions");
      await createReview(testRepo.path, commit);

      // Open -> Rejected
      let review = await getReview(commit, { cwd: testRepo.path });
      expect(review.state).toBe("open");

      await rejectReview(commit, "Needs work", { cwd: testRepo.path });
      review = await getReview(commit, { cwd: testRepo.path });
      expect(review.state).toBe("rejected");

      // Rejected -> Accepted
      await acceptReview(commit, "Fixed", { cwd: testRepo.path });
      review = await getReview(commit, { cwd: testRepo.path });
      expect(review.state).toBe("accepted");

      // Accepted -> Rejected
      await rejectReview(commit, "Found another issue", { cwd: testRepo.path });
      review = await getReview(commit, { cwd: testRepo.path });
      expect(review.state).toBe("rejected");

      // Rejected -> Accepted again
      await acceptReview(commit, "All fixed", { cwd: testRepo.path });
      review = await getReview(commit, { cwd: testRepo.path });
      expect(review.state).toBe("accepted");
    });
  });
});
