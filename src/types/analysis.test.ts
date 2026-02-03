import { describe, expect, test } from "vitest";
import {
  validateAnalysisResult,
  serializeAnalysisResult,
  parseAnalysisResult,
  createAnalysisResult,
  computeAnalysisSummary,
  ANALYSIS_SCHEMA_VERSION,
  type AnalysisResult,
} from "./analysis";

describe("validateAnalysisResult", () => {
  const validResult: AnalysisResult = {
    timestamp: "1704067200",
    url: "https://example.com/analysis/123",
    status: "lgtm",
    v: ANALYSIS_SCHEMA_VERSION,
  };

  test("accepts valid analysis result", () => {
    expect(() => validateAnalysisResult(validResult)).not.toThrow();
    expect(validateAnalysisResult(validResult)).toEqual(validResult);
  });

  test("accepts all valid status values", () => {
    for (const status of ["lgtm", "fyi", "nmw"] as const) {
      const result = { ...validResult, status };
      expect(() => validateAnalysisResult(result)).not.toThrow();
    }
  });

  test("rejects non-object input", () => {
    expect(() => validateAnalysisResult(null)).toThrow("must be an object");
    expect(() => validateAnalysisResult("string")).toThrow("must be an object");
  });

  test("rejects missing required fields", () => {
    const incomplete = { timestamp: "123" };
    expect(() => validateAnalysisResult(incomplete)).toThrow("Missing required field");
  });

  test("rejects invalid timestamp", () => {
    const invalid = { ...validResult, timestamp: "not-a-number" };
    expect(() => validateAnalysisResult(invalid)).toThrow("timestamp");
  });

  test("rejects empty url", () => {
    const invalid = { ...validResult, url: "" };
    expect(() => validateAnalysisResult(invalid)).toThrow("url");
  });

  test("rejects invalid status", () => {
    const invalid = { ...validResult, status: "unknown" };
    expect(() => validateAnalysisResult(invalid)).toThrow("status must be one of");
  });

  test("rejects invalid version", () => {
    const invalid = { ...validResult, v: 99 };
    expect(() => validateAnalysisResult(invalid)).toThrow("v must be");
  });
});

describe("serializeAnalysisResult", () => {
  test("produces single-line JSON", () => {
    const result: AnalysisResult = {
      timestamp: "1704067200",
      url: "https://example.com/analysis/123",
      status: "lgtm",
      v: 0,
    };
    const serialized = serializeAnalysisResult(result);
    expect(serialized).not.toContain("\n");
    expect(() => JSON.parse(serialized)).not.toThrow();
  });
});

describe("parseAnalysisResult", () => {
  test("parses valid JSON line", () => {
    const json = '{"timestamp":"1704067200","url":"https://example.com/analysis/123","status":"lgtm","v":0}';
    const parsed = parseAnalysisResult(json);
    expect(parsed.url).toBe("https://example.com/analysis/123");
    expect(parsed.status).toBe("lgtm");
  });

  test("throws on empty line", () => {
    expect(() => parseAnalysisResult("")).toThrow("Empty line");
    expect(() => parseAnalysisResult("   ")).toThrow("Empty line");
  });

  test("throws on invalid JSON", () => {
    expect(() => parseAnalysisResult("{invalid}")).toThrow("Invalid JSON");
  });
});

describe("createAnalysisResult", () => {
  test("creates result with current timestamp", () => {
    const before = Math.floor(Date.now() / 1000);
    const result = createAnalysisResult({
      url: "https://example.com/analysis/123",
      status: "lgtm",
    });
    const after = Math.floor(Date.now() / 1000);

    const timestamp = parseInt(result.timestamp, 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
    expect(result.v).toBe(ANALYSIS_SCHEMA_VERSION);
  });
});

describe("computeAnalysisSummary", () => {
  test("returns 'lgtm' for empty array", () => {
    expect(computeAnalysisSummary([])).toBe("lgtm");
  });

  test("returns 'lgtm' when all lgtm", () => {
    const results: AnalysisResult[] = [
      { timestamp: "1", url: "a", status: "lgtm", v: 0 },
      { timestamp: "2", url: "b", status: "lgtm", v: 0 },
    ];
    expect(computeAnalysisSummary(results)).toBe("lgtm");
  });

  test("returns 'nmw' when any nmw", () => {
    const results: AnalysisResult[] = [
      { timestamp: "1", url: "a", status: "lgtm", v: 0 },
      { timestamp: "2", url: "b", status: "nmw", v: 0 },
    ];
    expect(computeAnalysisSummary(results)).toBe("nmw");
  });

  test("returns 'fyi' when fyi without nmw", () => {
    const results: AnalysisResult[] = [
      { timestamp: "1", url: "a", status: "lgtm", v: 0 },
      { timestamp: "2", url: "b", status: "fyi", v: 0 },
    ];
    expect(computeAnalysisSummary(results)).toBe("fyi");
  });

  test("nmw takes priority over fyi", () => {
    const results: AnalysisResult[] = [
      { timestamp: "1", url: "a", status: "fyi", v: 0 },
      { timestamp: "2", url: "b", status: "nmw", v: 0 },
    ];
    expect(computeAnalysisSummary(results)).toBe("nmw");
  });
});
