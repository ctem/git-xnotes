/**
 * Analysis result types and utilities
 *
 * @module types/analysis
 */

/**
 * Analysis verdict status
 * - lgtm: Looks good to me (approved)
 * - fyi: For your information (informational)
 * - nmw: Needs more work (requires changes)
 */
export type AnalysisStatus = "lgtm" | "fyi" | "nmw";

/**
 * An analysis result stored in git notes.
 * Analysis results annotate the specific commit that was analyzed.
 */
export interface AnalysisResult {
  /** Unix timestamp in seconds */
  readonly timestamp: string;
  /** Link to analysis results */
  readonly url: string;
  /** Analysis verdict */
  readonly status: AnalysisStatus;
  /** Schema version (currently 0) */
  readonly v: number;
}

/**
 * Aggregated analysis status for a commit
 */
export interface AnalysisStatusSummary {
  /** Commit hash */
  readonly commit: string;
  /** All analysis results for this commit */
  readonly results: readonly AnalysisResult[];
  /** Aggregated status */
  readonly summary: AnalysisStatus;
}

/**
 * Required fields for AnalysisResult validation
 */
const REQUIRED_FIELDS = ["timestamp", "url", "status", "v"] as const;

/**
 * Valid analysis status values
 */
const VALID_STATUSES: readonly AnalysisStatus[] = ["lgtm", "fyi", "nmw"];

/**
 * Current schema version
 */
export const ANALYSIS_SCHEMA_VERSION = 0;

/**
 * Validates that the given data is a valid AnalysisResult.
 *
 * @param data - Unknown data to validate
 * @returns Validated AnalysisResult
 * @throws Error if validation fails
 */
export function validateAnalysisResult(data: unknown): AnalysisResult {
  if (typeof data !== "object" || data === null) {
    throw new Error("AnalysisResult must be an object");
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in obj)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate timestamp
  if (typeof obj["timestamp"] !== "string") {
    throw new Error("timestamp must be a string");
  }
  const timestamp = parseInt(obj["timestamp"], 10);
  if (isNaN(timestamp) || timestamp < 0) {
    throw new Error("timestamp must be a valid Unix timestamp");
  }

  // Validate url
  if (typeof obj["url"] !== "string" || obj["url"].length === 0) {
    throw new Error("url must be a non-empty string");
  }

  // Validate status
  if (typeof obj["status"] !== "string") {
    throw new Error("status must be a string");
  }
  if (!VALID_STATUSES.includes(obj["status"] as AnalysisStatus)) {
    throw new Error(`status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  // Validate version
  if (typeof obj["v"] !== "number" || obj["v"] !== ANALYSIS_SCHEMA_VERSION) {
    throw new Error(`v must be ${ANALYSIS_SCHEMA_VERSION}`);
  }

  return obj as unknown as AnalysisResult;
}

/**
 * Serializes an AnalysisResult to a single-line JSON string.
 *
 * @param result - AnalysisResult to serialize
 * @returns Single-line JSON string
 */
export function serializeAnalysisResult(result: AnalysisResult): string {
  return JSON.stringify(result);
}

/**
 * Parses a single-line JSON string into an AnalysisResult.
 *
 * @param line - JSON string to parse
 * @returns Validated AnalysisResult
 * @throws Error if parsing or validation fails
 */
export function parseAnalysisResult(line: string): AnalysisResult {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    throw new Error("Empty line cannot be parsed as AnalysisResult");
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    throw new Error(`Invalid JSON: ${trimmed.substring(0, 50)}...`);
  }

  return validateAnalysisResult(data);
}

/**
 * Creates a new AnalysisResult with the current timestamp.
 *
 * @param params - AnalysisResult parameters (without timestamp and v)
 * @returns New AnalysisResult
 */
export function createAnalysisResult(
  params: Omit<AnalysisResult, "timestamp" | "v">
): AnalysisResult {
  return {
    ...params,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    v: ANALYSIS_SCHEMA_VERSION,
  };
}

/**
 * Computes an aggregated analysis status from multiple results.
 * Priority: nmw > fyi > lgtm
 *
 * @param results - Array of analysis results
 * @returns Aggregated status
 */
export function computeAnalysisSummary(
  results: readonly AnalysisResult[]
): AnalysisStatus {
  if (results.length === 0) {
    return "lgtm";
  }

  const hasNmw = results.some((r) => r.status === "nmw");
  if (hasNmw) {
    return "nmw";
  }

  const hasFyi = results.some((r) => r.status === "fyi");
  if (hasFyi) {
    return "fyi";
  }

  return "lgtm";
}
