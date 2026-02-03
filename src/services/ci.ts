/**
 * CI status service
 *
 * @module services/ci
 */

import {
  type CIResult,
  type CIStatus,
  type CIStatusSummary,
  createCIResult,
  computeCISummary,
  getLatestCIResult as getLatest,
} from "../types/index.js";
import {
  readCIResults,
  appendCIResult,
  type ReadNotesOptions,
  type WriteNotesOptions,
} from "../notes/index.js";
import { resolveRef } from "../git/commands.js";

/**
 * Service options
 */
export interface CIServiceOptions extends ReadNotesOptions, WriteNotesOptions {
  /** Working directory */
  readonly cwd?: string | undefined;
}

/**
 * Gets the CI status for a commit.
 *
 * @param commit - Commit hash or ref (default: HEAD)
 * @param options - Service options
 * @returns CI status summary
 */
export async function getCIStatus(
  commit?: string,
  options?: CIServiceOptions
): Promise<CIStatusSummary> {
  // Resolve commit if needed
  const resolvedCommit = await resolveRef(commit ?? "HEAD", options);

  // Read all CI results for this commit
  const results = await readCIResults(resolvedCommit, options);

  // Compute summary
  const summary = computeCISummary(results);

  return {
    commit: resolvedCommit,
    results,
    summary,
  };
}

/**
 * Records a CI result for a commit.
 *
 * @param commit - Commit hash or ref
 * @param agent - CI system identifier
 * @param status - Build status
 * @param url - Optional link to build
 * @param options - Service options
 */
export async function recordCIResult(
  commit: string,
  agent: string,
  status: CIStatus,
  url?: string,
  options?: CIServiceOptions
): Promise<void> {
  // Resolve commit if needed
  const resolvedCommit = await resolveRef(commit, options);

  // Create CI result
  const result = createCIResult({
    agent,
    status,
    ...(url ? { url } : {}),
  });

  // Append to notes
  await appendCIResult(resolvedCommit, result, options);
}

/**
 * Gets the latest CI result for a commit.
 *
 * @param commit - Commit hash or ref (default: HEAD)
 * @param agent - Optional agent to filter by
 * @param options - Service options
 * @returns Latest CI result or null
 */
export async function getLatestCIResult(
  commit?: string,
  agent?: string,
  options?: CIServiceOptions
): Promise<CIResult | null> {
  // Resolve commit if needed
  const resolvedCommit = await resolveRef(commit ?? "HEAD", options);

  // Read all CI results for this commit
  const results = await readCIResults(resolvedCommit, options);

  // Get latest
  return getLatest(results, agent);
}

/**
 * Checks if a commit has passing CI.
 *
 * @param commit - Commit hash or ref (default: HEAD)
 * @param options - Service options
 * @returns True if CI is passing
 */
export async function isCIPassing(
  commit?: string,
  options?: CIServiceOptions
): Promise<boolean> {
  const status = await getCIStatus(commit, options);
  return status.summary === "success";
}

/**
 * Gets all CI results grouped by agent.
 *
 * @param commit - Commit hash or ref (default: HEAD)
 * @param options - Service options
 * @returns Map of agent to results
 */
export async function getCIResultsByAgent(
  commit?: string,
  options?: CIServiceOptions
): Promise<Map<string, CIResult[]>> {
  // Resolve commit if needed
  const resolvedCommit = await resolveRef(commit ?? "HEAD", options);

  // Read all CI results for this commit
  const results = await readCIResults(resolvedCommit, options);

  // Group by agent
  const byAgent = new Map<string, CIResult[]>();
  for (const result of results) {
    const existing = byAgent.get(result.agent) ?? [];
    existing.push(result);
    byAgent.set(result.agent, existing);
  }

  return byAgent;
}
