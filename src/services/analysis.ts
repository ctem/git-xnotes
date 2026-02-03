/**
 * Analysis service
 *
 * @module services/analysis
 */

import {
  type AnalysisResult,
  type AnalysisStatus,
  type AnalysisStatusSummary,
  createAnalysisResult,
  computeAnalysisSummary,
} from "../types/index.js";
import {
  readAnalysisResults,
  appendAnalysisResult,
  type ReadNotesOptions,
  type WriteNotesOptions,
} from "../notes/index.js";
import { resolveRef } from "../git/commands.js";

/**
 * Service options
 */
export interface AnalysisServiceOptions extends ReadNotesOptions, WriteNotesOptions {
  /** Working directory */
  readonly cwd?: string | undefined;
}

/**
 * Gets the analysis status for a commit.
 *
 * @param commit - Commit hash or ref (default: HEAD)
 * @param options - Service options
 * @returns Analysis status summary
 */
export async function getAnalysisStatus(
  commit?: string,
  options?: AnalysisServiceOptions
): Promise<AnalysisStatusSummary> {
  // Resolve commit if needed
  const resolvedCommit = await resolveRef(commit ?? "HEAD", options);

  // Read all analysis results for this commit
  const results = await readAnalysisResults(resolvedCommit, options);

  // Compute summary
  const summary = computeAnalysisSummary(results);

  return {
    commit: resolvedCommit,
    results,
    summary,
  };
}

/**
 * Records an analysis result for a commit.
 *
 * @param commit - Commit hash or ref
 * @param url - Link to analysis results
 * @param status - Analysis verdict
 * @param options - Service options
 */
export async function recordAnalysisResult(
  commit: string,
  url: string,
  status: AnalysisStatus,
  options?: AnalysisServiceOptions
): Promise<void> {
  // Resolve commit if needed
  const resolvedCommit = await resolveRef(commit, options);

  // Create analysis result
  const result = createAnalysisResult({
    url,
    status,
  });

  // Append to notes
  await appendAnalysisResult(resolvedCommit, result, options);
}

/**
 * Gets the latest analysis result for a commit.
 *
 * @param commit - Commit hash or ref (default: HEAD)
 * @param options - Service options
 * @returns Latest analysis result or null
 */
export async function getLatestAnalysisResult(
  commit?: string,
  options?: AnalysisServiceOptions
): Promise<AnalysisResult | null> {
  // Resolve commit if needed
  const resolvedCommit = await resolveRef(commit ?? "HEAD", options);

  // Read all analysis results for this commit
  const results = await readAnalysisResults(resolvedCommit, options);

  if (results.length === 0) {
    return null;
  }

  // Sort by timestamp descending and return latest
  const sorted = [...results].sort(
    (a, b) => parseInt(b.timestamp, 10) - parseInt(a.timestamp, 10)
  );

  return sorted[0] ?? null;
}

/**
 * Checks if analysis for a commit needs attention.
 *
 * @param commit - Commit hash or ref (default: HEAD)
 * @param options - Service options
 * @returns True if analysis indicates issues (nmw or fyi)
 */
export async function needsAttention(
  commit?: string,
  options?: AnalysisServiceOptions
): Promise<boolean> {
  const status = await getAnalysisStatus(commit, options);
  return status.summary === "nmw" || status.summary === "fyi";
}

/**
 * Checks if analysis for a commit passed.
 *
 * @param commit - Commit hash or ref (default: HEAD)
 * @param options - Service options
 * @returns True if analysis status is lgtm
 */
export async function isAnalysisPassing(
  commit?: string,
  options?: AnalysisServiceOptions
): Promise<boolean> {
  const status = await getAnalysisStatus(commit, options);
  return status.summary === "lgtm";
}
