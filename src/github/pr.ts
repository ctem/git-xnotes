/**
 * PR mapping utilities
 *
 * @module github/pr
 */

import { type GitHubClient, type PR } from "./client.js";
import { type ReviewRequest, createReviewRequest } from "../types/index.js";
import { getCurrentBranch, resolveRef } from "../git/commands.js";

/**
 * Mapping between a GitHub PR and a local review
 */
export interface PRMapping {
  /** GitHub PR number */
  readonly prNumber: number;
  /** First commit in the review branch (review annotation target) */
  readonly reviewCommit: string;
  /** Source branch name */
  readonly sourceBranch: string;
  /** Target branch name */
  readonly targetBranch: string;
  /** PR head SHA */
  readonly headSha: string;
  /** PR base SHA */
  readonly baseSha: string;
}

/**
 * Options for PR mapping operations
 */
export interface PRMappingOptions {
  /** Working directory */
  readonly cwd?: string | undefined;
}

/**
 * Finds a PR for the current branch.
 *
 * @param client - GitHub client
 * @param options - Mapping options
 * @returns PR mapping or null if no PR found
 */
export async function findPRForCurrentBranch(
  client: GitHubClient,
  options?: PRMappingOptions
): Promise<PRMapping | null> {
  const branch = await getCurrentBranch(options);
  return findPRForBranch(client, branch, options);
}

/**
 * Finds a PR for a specific branch.
 *
 * @param client - GitHub client
 * @param branch - Branch name
 * @param options - Mapping options
 * @returns PR mapping or null if no PR found
 */
export async function findPRForBranch(
  client: GitHubClient,
  branch: string,
  options?: PRMappingOptions
): Promise<PRMapping | null> {
  const pr = await client.findPRByBranch(branch);
  if (!pr) {
    return null;
  }

  return mapPRToMapping(pr, options);
}

/**
 * Finds a PR by its number.
 *
 * @param client - GitHub client
 * @param prNumber - PR number
 * @param options - Mapping options
 * @returns PR mapping
 */
export async function findPRByNumber(
  client: GitHubClient,
  prNumber: number,
  options?: PRMappingOptions
): Promise<PRMapping> {
  const pr = await client.getPR(prNumber);
  return mapPRToMapping(pr, options);
}

/**
 * Maps a GitHub PR to a PRMapping.
 *
 * @param pr - GitHub PR
 * @param options - Mapping options
 * @returns PR mapping
 */
async function mapPRToMapping(
  pr: PR,
  options?: PRMappingOptions
): Promise<PRMapping> {
  // Try to resolve the head SHA locally, fall back to PR head SHA
  let reviewCommit: string;
  try {
    reviewCommit = await resolveRef(pr.head.sha, options);
  } catch {
    // If we can't resolve locally, use the PR head SHA
    reviewCommit = pr.head.sha;
  }

  return {
    prNumber: pr.number,
    reviewCommit,
    sourceBranch: pr.head.ref,
    targetBranch: pr.base.ref,
    headSha: pr.head.sha,
    baseSha: pr.base.sha,
  };
}

/**
 * Creates a ReviewRequest from a PR.
 *
 * @param pr - GitHub PR
 * @param userEmail - User email for the requester field
 * @returns ReviewRequest
 */
export function mapPRToReviewRequest(
  pr: PR,
  userEmail: string
): ReviewRequest {
  return createReviewRequest({
    requester: userEmail,
    reviewRef: `refs/heads/${pr.head.ref}`,
    targetRef: `refs/heads/${pr.base.ref}`,
    baseCommit: pr.base.sha,
    description: pr.title + (pr.body ? `\n\n${pr.body}` : ""),
  });
}

/**
 * Gets the PR state as a review state.
 *
 * @param pr - GitHub PR
 * @returns Review-compatible state info
 */
export function getPRState(pr: PR): {
  isOpen: boolean;
  isMerged: boolean;
  state: "open" | "accepted" | "submitted" | "abandoned";
} {
  if (pr.merged) {
    return { isOpen: false, isMerged: true, state: "submitted" };
  }
  if (pr.state === "closed") {
    return { isOpen: false, isMerged: false, state: "abandoned" };
  }
  return { isOpen: true, isMerged: false, state: "open" };
}

/**
 * Lists all PRs with their mappings.
 *
 * @param client - GitHub client
 * @param state - PR state filter
 * @param options - Mapping options
 * @returns Array of PR mappings
 */
export async function listPRMappings(
  client: GitHubClient,
  state: "open" | "closed" | "all" = "open",
  options?: PRMappingOptions
): Promise<PRMapping[]> {
  const prs = await client.listPRs(state);
  const mappings: PRMapping[] = [];

  for (const pr of prs) {
    const mapping = await mapPRToMapping(pr, options);
    mappings.push(mapping);
  }

  return mappings;
}
