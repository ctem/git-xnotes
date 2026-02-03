/**
 * CI result types and utilities
 *
 * @module types/ci
 */

/**
 * CI build status
 */
export type CIStatus = "success" | "failure" | "pending";

/**
 * A CI result stored in git notes.
 * CI results annotate the specific commit that was tested.
 */
export interface CIResult {
  /** Unix timestamp in seconds */
  readonly timestamp: string;
  /** CI system identifier (e.g., "github-actions", "jenkins") */
  readonly agent: string;
  /** Build status */
  readonly status: CIStatus;
  /** Link to CI build (optional) */
  readonly url?: string;
  /** Schema version (currently 0) */
  readonly v: number;
}

/**
 * Aggregated CI status for a commit
 */
export interface CIStatusSummary {
  /** Commit hash */
  readonly commit: string;
  /** All CI results for this commit */
  readonly results: readonly CIResult[];
  /** Aggregated status */
  readonly summary: CIStatus | "mixed";
}

/**
 * Required fields for CIResult validation
 */
const REQUIRED_FIELDS = ["timestamp", "agent", "status", "v"] as const;

/**
 * Valid CI status values
 */
const VALID_STATUSES: readonly CIStatus[] = ["success", "failure", "pending"];

/**
 * Current schema version
 */
export const CI_SCHEMA_VERSION = 0;

/**
 * Validates that the given data is a valid CIResult.
 *
 * @param data - Unknown data to validate
 * @returns Validated CIResult
 * @throws Error if validation fails
 */
export function validateCIResult(data: unknown): CIResult {
  if (typeof data !== "object" || data === null) {
    throw new Error("CIResult must be an object");
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

  // Validate agent
  if (typeof obj["agent"] !== "string" || obj["agent"].length === 0) {
    throw new Error("agent must be a non-empty string");
  }

  // Validate status
  if (typeof obj["status"] !== "string") {
    throw new Error("status must be a string");
  }
  if (!VALID_STATUSES.includes(obj["status"] as CIStatus)) {
    throw new Error(`status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  // Validate version
  if (typeof obj["v"] !== "number" || obj["v"] !== CI_SCHEMA_VERSION) {
    throw new Error(`v must be ${CI_SCHEMA_VERSION}`);
  }

  // Validate optional fields
  if ("url" in obj && typeof obj["url"] !== "string") {
    throw new Error("url must be a string");
  }

  return obj as unknown as CIResult;
}

/**
 * Serializes a CIResult to a single-line JSON string.
 *
 * @param result - CIResult to serialize
 * @returns Single-line JSON string
 */
export function serializeCIResult(result: CIResult): string {
  return JSON.stringify(result);
}

/**
 * Parses a single-line JSON string into a CIResult.
 *
 * @param line - JSON string to parse
 * @returns Validated CIResult
 * @throws Error if parsing or validation fails
 */
export function parseCIResult(line: string): CIResult {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    throw new Error("Empty line cannot be parsed as CIResult");
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    throw new Error(`Invalid JSON: ${trimmed.substring(0, 50)}...`);
  }

  return validateCIResult(data);
}

/**
 * Creates a new CIResult with the current timestamp.
 *
 * @param params - CIResult parameters (without timestamp and v)
 * @returns New CIResult
 */
export function createCIResult(
  params: Omit<CIResult, "timestamp" | "v">
): CIResult {
  return {
    ...params,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    v: CI_SCHEMA_VERSION,
  };
}

/**
 * Computes an aggregated CI status from multiple results.
 *
 * @param results - Array of CI results
 * @returns Aggregated status
 */
export function computeCISummary(
  results: readonly CIResult[]
): CIStatus | "mixed" {
  if (results.length === 0) {
    return "pending";
  }

  const hasFailure = results.some((r) => r.status === "failure");
  const hasPending = results.some((r) => r.status === "pending");
  const allSuccess = results.every((r) => r.status === "success");

  if (hasFailure) {
    return hasPending ? "mixed" : "failure";
  }
  if (allSuccess) {
    return "success";
  }
  return "pending";
}

/**
 * Gets the latest CI result for a specific agent.
 *
 * @param results - All CI results
 * @param agent - Agent identifier (optional, returns latest overall if not specified)
 * @returns Latest CIResult or null if none found
 */
export function getLatestCIResult(
  results: readonly CIResult[],
  agent?: string
): CIResult | null {
  const filtered = agent
    ? results.filter((r) => r.agent === agent)
    : results;

  if (filtered.length === 0) {
    return null;
  }

  const sorted = [...filtered].sort(
    (a, b) => parseInt(b.timestamp, 10) - parseInt(a.timestamp, 10)
  );

  return sorted[0] ?? null;
}
