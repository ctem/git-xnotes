import { describe, expect, test, beforeEach } from "vitest";
import {
  validateReviewRequest,
  getReviewState,
  serializeReviewRequest,
  parseReviewRequest,
  createReviewRequest,
  resetTimestampCounter,
  REVIEW_SCHEMA_VERSION,
  type ReviewRequest,
} from "./review";

describe("validateReviewRequest", () => {
  const validRequest: ReviewRequest = {
    timestamp: "1704067200",
    requester: "alice@example.com",
    reviewRef: "refs/heads/feature",
    targetRef: "refs/heads/main",
    v: REVIEW_SCHEMA_VERSION,
  };

  test("accepts valid review request", () => {
    expect(() => validateReviewRequest(validRequest)).not.toThrow();
    expect(validateReviewRequest(validRequest)).toEqual(validRequest);
  });

  test("accepts request with optional fields", () => {
    const request = {
      ...validRequest,
      baseCommit: "abc123",
      reviewers: ["bob@example.com"],
      description: "Add new feature",
    };
    expect(() => validateReviewRequest(request)).not.toThrow();
  });

  test("rejects non-object input", () => {
    expect(() => validateReviewRequest(null)).toThrow("must be an object");
    expect(() => validateReviewRequest("string")).toThrow("must be an object");
  });

  test("rejects missing required fields", () => {
    const incomplete = { timestamp: "123" };
    expect(() => validateReviewRequest(incomplete)).toThrow("Missing required field");
  });

  test("rejects invalid timestamp", () => {
    const invalid = { ...validRequest, timestamp: "not-a-number" };
    expect(() => validateReviewRequest(invalid)).toThrow("timestamp");
  });

  test("rejects invalid reviewRef", () => {
    const invalid = { ...validRequest, reviewRef: "feature" };
    expect(() => validateReviewRequest(invalid)).toThrow("refs/heads/");
  });

  test("rejects invalid version", () => {
    const invalid = { ...validRequest, v: 99 };
    expect(() => validateReviewRequest(invalid)).toThrow("v must be");
  });
});

describe("getReviewState", () => {
  const baseRequest: ReviewRequest = {
    timestamp: "1000",
    requester: "alice@example.com",
    reviewRef: "refs/heads/feature",
    targetRef: "refs/heads/main",
    v: 0,
  };

  test("returns 'open' for empty array", () => {
    expect(getReviewState([])).toBe("open");
  });

  test("returns 'open' for request without resolved/submitted", () => {
    expect(getReviewState([baseRequest])).toBe("open");
  });

  test("returns 'accepted' when resolved is true", () => {
    const accepted = { ...baseRequest, resolved: true };
    expect(getReviewState([accepted])).toBe("accepted");
  });

  test("returns 'rejected' when resolved is false", () => {
    const rejected = { ...baseRequest, resolved: false };
    expect(getReviewState([rejected])).toBe("rejected");
  });

  test("returns 'submitted' when submitted and resolved are true", () => {
    const submitted = { ...baseRequest, resolved: true, submitted: true };
    expect(getReviewState([submitted])).toBe("submitted");
  });

  test("returns 'abandoned' when submitted is true but resolved is false", () => {
    const abandoned = { ...baseRequest, resolved: false, submitted: true };
    expect(getReviewState([abandoned])).toBe("abandoned");
  });

  test("uses latest request by timestamp", () => {
    const older = { ...baseRequest, timestamp: "1000", resolved: true };
    const newer = { ...baseRequest, timestamp: "2000", resolved: false };
    expect(getReviewState([older, newer])).toBe("rejected");
    expect(getReviewState([newer, older])).toBe("rejected"); // Order shouldn't matter
  });
});

describe("serializeReviewRequest", () => {
  test("produces single-line JSON", () => {
    const request: ReviewRequest = {
      timestamp: "1704067200",
      requester: "alice@example.com",
      reviewRef: "refs/heads/feature",
      targetRef: "refs/heads/main",
      v: 0,
    };
    const serialized = serializeReviewRequest(request);
    expect(serialized).not.toContain("\n");
    expect(() => JSON.parse(serialized)).not.toThrow();
  });
});

describe("parseReviewRequest", () => {
  test("parses valid JSON line", () => {
    const json = '{"timestamp":"1704067200","requester":"alice@example.com","reviewRef":"refs/heads/feature","targetRef":"refs/heads/main","v":0}';
    const parsed = parseReviewRequest(json);
    expect(parsed.timestamp).toBe("1704067200");
    expect(parsed.requester).toBe("alice@example.com");
  });

  test("throws on empty line", () => {
    expect(() => parseReviewRequest("")).toThrow("Empty line");
    expect(() => parseReviewRequest("   ")).toThrow("Empty line");
  });

  test("throws on invalid JSON", () => {
    expect(() => parseReviewRequest("{invalid}")).toThrow("Invalid JSON");
  });
});

describe("createReviewRequest", () => {
  beforeEach(() => {
    resetTimestampCounter();
  });

  test("creates request with current timestamp", () => {
    const before = Math.floor(Date.now() / 1000);
    const request = createReviewRequest({
      requester: "alice@example.com",
      reviewRef: "refs/heads/feature",
      targetRef: "refs/heads/main",
    });
    const after = Math.floor(Date.now() / 1000);

    const timestamp = parseInt(request.timestamp, 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after + 1); // Allow 1 second tolerance for monotonic increments
    expect(request.v).toBe(REVIEW_SCHEMA_VERSION);
  });
});
