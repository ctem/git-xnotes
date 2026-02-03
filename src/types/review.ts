/**
 * Review request types and utilities
 *
 * @module types/review
 */

/**
 * A review request stored in git notes.
 * Multiple ReviewRequest entries for the same commit represent state transitions.
 * The latest entry (by timestamp) represents the current state.
 */
export interface ReviewRequest {
  /** Unix timestamp in seconds */
  readonly timestamp: string;
  /** Requester email address */
  readonly requester: string;
  /** Source branch ref (e.g., refs/heads/feature) */
  readonly reviewRef: string;
  /** Target branch ref (e.g., refs/heads/main) */
  readonly targetRef: string;
  /** Base commit hash (optional, auto-detected if omitted) */
  readonly baseCommit?: string | undefined;
  /** Reviewer email addresses */
  readonly reviewers?: readonly string[] | undefined;
  /** Review description */
  readonly description?: string | undefined;
  /** Alternate commit reference */
  readonly alias?: string | undefined;
  /** true = accepted, false = rejected, undefined = open */
  readonly resolved?: boolean | undefined;
  /** true = merged to target */
  readonly submitted?: boolean | undefined;
  /** Schema version (currently 0) */
  readonly v: number;
}

/**
 * Review state derived from ReviewRequest entries
 */
export type ReviewState =
  | "open"
  | "accepted"
  | "rejected"
  | "submitted"
  | "abandoned";

/**
 * Required fields for ReviewRequest validation
 */
const REQUIRED_FIELDS = [
  "timestamp",
  "requester",
  "reviewRef",
  "targetRef",
  "v",
] as const;

/**
 * Current schema version
 */
export const REVIEW_SCHEMA_VERSION = 0;

/**
 * Validates that the given data is a valid ReviewRequest.
 * Throws ValidationError if invalid.
 *
 * @param data - Unknown data to validate
 * @returns Validated ReviewRequest
 * @throws ValidationError if validation fails
 */
export function validateReviewRequest(data: unknown): ReviewRequest {
  if (typeof data !== "object" || data === null) {
    throw new Error("ReviewRequest must be an object");
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

  // Validate requester (email format)
  if (typeof obj["requester"] !== "string" || obj["requester"].length === 0) {
    throw new Error("requester must be a non-empty string");
  }

  // Validate reviewRef
  if (typeof obj["reviewRef"] !== "string") {
    throw new Error("reviewRef must be a string");
  }
  if (!obj["reviewRef"].startsWith("refs/heads/")) {
    throw new Error("reviewRef must start with refs/heads/");
  }

  // Validate targetRef
  if (typeof obj["targetRef"] !== "string") {
    throw new Error("targetRef must be a string");
  }
  if (!obj["targetRef"].startsWith("refs/heads/")) {
    throw new Error("targetRef must start with refs/heads/");
  }

  // Validate version
  if (typeof obj["v"] !== "number" || obj["v"] !== REVIEW_SCHEMA_VERSION) {
    throw new Error(`v must be ${REVIEW_SCHEMA_VERSION}`);
  }

  // Validate optional fields (allow undefined values)
  if ("baseCommit" in obj && obj["baseCommit"] !== undefined && typeof obj["baseCommit"] !== "string") {
    throw new Error("baseCommit must be a string");
  }

  if ("reviewers" in obj && obj["reviewers"] !== undefined) {
    if (!Array.isArray(obj["reviewers"])) {
      throw new Error("reviewers must be an array");
    }
    for (const r of obj["reviewers"]) {
      if (typeof r !== "string") {
        throw new Error("reviewers must be an array of strings");
      }
    }
  }

  if ("description" in obj && obj["description"] !== undefined && typeof obj["description"] !== "string") {
    throw new Error("description must be a string");
  }

  if ("alias" in obj && obj["alias"] !== undefined && typeof obj["alias"] !== "string") {
    throw new Error("alias must be a string");
  }

  if ("resolved" in obj && obj["resolved"] !== undefined && typeof obj["resolved"] !== "boolean") {
    throw new Error("resolved must be a boolean");
  }

  if ("submitted" in obj && obj["submitted"] !== undefined && typeof obj["submitted"] !== "boolean") {
    throw new Error("submitted must be a boolean");
  }

  return obj as unknown as ReviewRequest;
}

/**
 * Sorts review requests by timestamp descending (newest first).
 * Uses array index as tiebreaker for stability when timestamps are equal.
 * Git notes append new entries at the end, so later index = newer entry.
 *
 * @param requests - Array of ReviewRequest entries
 * @returns Sorted array (newest first)
 */
export function sortRequestsByTimestamp(requests: readonly ReviewRequest[]): ReviewRequest[] {
  return [...requests]
    .map((r, index) => ({ r, index }))
    .sort((a, b) => {
      const timeDiff = parseInt(b.r.timestamp, 10) - parseInt(a.r.timestamp, 10);
      if (timeDiff !== 0) return timeDiff;
      return b.index - a.index; // Later index = newer
    })
    .map(({ r }) => r);
}

/**
 * Gets the latest (most recent) ReviewRequest from a list.
 *
 * @param requests - Array of ReviewRequest entries
 * @returns Latest request or undefined if empty
 */
export function getLatestRequest(requests: readonly ReviewRequest[]): ReviewRequest | undefined {
  if (requests.length === 0) return undefined;
  return sortRequestsByTimestamp(requests)[0];
}

/**
 * Determines the current review state from a list of ReviewRequest entries.
 * The latest entry (by timestamp) determines the state.
 * When timestamps are equal, uses array index as tiebreaker (later index = newer).
 * This ensures stable sorting since git notes append new entries at the end.
 *
 * @param requests - Array of ReviewRequest entries for a review
 * @returns Current ReviewState
 */
export function getReviewState(requests: readonly ReviewRequest[]): ReviewState {
  const latest = getLatestRequest(requests);
  if (latest === undefined) {
    return "open";
  }

  if (latest.submitted === true) {
    return latest.resolved === true ? "submitted" : "abandoned";
  }
  if (latest.resolved === true) {
    return "accepted";
  }
  if (latest.resolved === false) {
    return "rejected";
  }
  return "open";
}

/**
 * Serializes a ReviewRequest to a single-line JSON string.
 * This format is required for git notes merge compatibility.
 *
 * @param request - ReviewRequest to serialize
 * @returns Single-line JSON string
 */
export function serializeReviewRequest(request: ReviewRequest): string {
  return JSON.stringify(request);
}

/**
 * Parses a single-line JSON string into a ReviewRequest.
 *
 * @param line - JSON string to parse
 * @returns Validated ReviewRequest
 * @throws Error if parsing or validation fails
 */
export function parseReviewRequest(line: string): ReviewRequest {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    throw new Error("Empty line cannot be parsed as ReviewRequest");
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    throw new Error(`Invalid JSON: ${trimmed.substring(0, 50)}...`);
  }

  return validateReviewRequest(data);
}

/**
 * Last generated timestamp, used to ensure monotonically increasing values.
 */
let lastTimestamp = 0;

/**
 * Resets the monotonic timestamp counter.
 * Used for testing purposes only.
 */
export function resetTimestampCounter(): void {
  lastTimestamp = 0;
}

/**
 * Gets a monotonically increasing timestamp.
 * Ensures that each call returns a timestamp greater than the previous one.
 *
 * @returns Unix timestamp in seconds as string
 */
export function getMonotonicTimestamp(): string {
  const now = Math.floor(Date.now() / 1000);
  if (now <= lastTimestamp) {
    lastTimestamp = lastTimestamp + 1;
  } else {
    lastTimestamp = now;
  }
  return lastTimestamp.toString();
}

/**
 * Creates a new ReviewRequest with the current timestamp.
 *
 * @param params - ReviewRequest parameters (without timestamp and v)
 * @returns New ReviewRequest
 */
export function createReviewRequest(
  params: Omit<ReviewRequest, "timestamp" | "v">
): ReviewRequest {
  return {
    ...params,
    timestamp: getMonotonicTimestamp(),
    v: REVIEW_SCHEMA_VERSION,
  };
}
