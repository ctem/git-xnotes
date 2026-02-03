import { describe, expect, test } from "vitest";
import {
  validateCIResult,
  serializeCIResult,
  parseCIResult,
  createCIResult,
  computeCISummary,
  getLatestCIResult,
  CI_SCHEMA_VERSION,
  type CIResult,
} from "./ci";

describe("validateCIResult", () => {
  const validResult: CIResult = {
    timestamp: "1704067200",
    agent: "github-actions",
    status: "success",
    v: CI_SCHEMA_VERSION,
  };

  test("accepts valid CI result", () => {
    expect(() => validateCIResult(validResult)).not.toThrow();
    expect(validateCIResult(validResult)).toEqual(validResult);
  });

  test("accepts result with optional url", () => {
    const result = {
      ...validResult,
      url: "https://github.com/owner/repo/actions/runs/123",
    };
    expect(() => validateCIResult(result)).not.toThrow();
  });

  test("rejects non-object input", () => {
    expect(() => validateCIResult(null)).toThrow("must be an object");
    expect(() => validateCIResult("string")).toThrow("must be an object");
  });

  test("rejects missing required fields", () => {
    const incomplete = { timestamp: "123" };
    expect(() => validateCIResult(incomplete)).toThrow("Missing required field");
  });

  test("rejects invalid timestamp", () => {
    const invalid = { ...validResult, timestamp: "not-a-number" };
    expect(() => validateCIResult(invalid)).toThrow("timestamp");
  });

  test("rejects empty agent", () => {
    const invalid = { ...validResult, agent: "" };
    expect(() => validateCIResult(invalid)).toThrow("agent");
  });

  test("rejects invalid status", () => {
    const invalid = { ...validResult, status: "unknown" };
    expect(() => validateCIResult(invalid)).toThrow("status must be one of");
  });

  test("rejects invalid version", () => {
    const invalid = { ...validResult, v: 99 };
    expect(() => validateCIResult(invalid)).toThrow("v must be");
  });
});

describe("serializeCIResult", () => {
  test("produces single-line JSON", () => {
    const result: CIResult = {
      timestamp: "1704067200",
      agent: "github-actions",
      status: "success",
      v: 0,
    };
    const serialized = serializeCIResult(result);
    expect(serialized).not.toContain("\n");
    expect(() => JSON.parse(serialized)).not.toThrow();
  });
});

describe("parseCIResult", () => {
  test("parses valid JSON line", () => {
    const json = '{"timestamp":"1704067200","agent":"github-actions","status":"success","v":0}';
    const parsed = parseCIResult(json);
    expect(parsed.agent).toBe("github-actions");
    expect(parsed.status).toBe("success");
  });

  test("throws on empty line", () => {
    expect(() => parseCIResult("")).toThrow("Empty line");
    expect(() => parseCIResult("   ")).toThrow("Empty line");
  });

  test("throws on invalid JSON", () => {
    expect(() => parseCIResult("{invalid}")).toThrow("Invalid JSON");
  });
});

describe("createCIResult", () => {
  test("creates result with current timestamp", () => {
    const before = Math.floor(Date.now() / 1000);
    const result = createCIResult({
      agent: "github-actions",
      status: "success",
    });
    const after = Math.floor(Date.now() / 1000);

    const timestamp = parseInt(result.timestamp, 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
    expect(result.v).toBe(CI_SCHEMA_VERSION);
  });
});

describe("computeCISummary", () => {
  test("returns 'pending' for empty array", () => {
    expect(computeCISummary([])).toBe("pending");
  });

  test("returns 'success' when all success", () => {
    const results: CIResult[] = [
      { timestamp: "1", agent: "a", status: "success", v: 0 },
      { timestamp: "2", agent: "b", status: "success", v: 0 },
    ];
    expect(computeCISummary(results)).toBe("success");
  });

  test("returns 'failure' when any failure without pending", () => {
    const results: CIResult[] = [
      { timestamp: "1", agent: "a", status: "success", v: 0 },
      { timestamp: "2", agent: "b", status: "failure", v: 0 },
    ];
    expect(computeCISummary(results)).toBe("failure");
  });

  test("returns 'mixed' when failure and pending", () => {
    const results: CIResult[] = [
      { timestamp: "1", agent: "a", status: "failure", v: 0 },
      { timestamp: "2", agent: "b", status: "pending", v: 0 },
    ];
    expect(computeCISummary(results)).toBe("mixed");
  });

  test("returns 'pending' when pending without failure", () => {
    const results: CIResult[] = [
      { timestamp: "1", agent: "a", status: "success", v: 0 },
      { timestamp: "2", agent: "b", status: "pending", v: 0 },
    ];
    expect(computeCISummary(results)).toBe("pending");
  });
});

describe("getLatestCIResult", () => {
  const results: CIResult[] = [
    { timestamp: "1000", agent: "github-actions", status: "success", v: 0 },
    { timestamp: "2000", agent: "jenkins", status: "failure", v: 0 },
    { timestamp: "3000", agent: "github-actions", status: "pending", v: 0 },
  ];

  test("returns latest result overall", () => {
    const latest = getLatestCIResult(results);
    expect(latest?.timestamp).toBe("3000");
    expect(latest?.agent).toBe("github-actions");
  });

  test("returns latest result for specific agent", () => {
    const latest = getLatestCIResult(results, "jenkins");
    expect(latest?.timestamp).toBe("2000");
    expect(latest?.agent).toBe("jenkins");
  });

  test("returns null when no results", () => {
    expect(getLatestCIResult([])).toBeNull();
  });

  test("returns null when agent not found", () => {
    expect(getLatestCIResult(results, "nonexistent")).toBeNull();
  });
});
