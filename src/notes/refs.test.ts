import { describe, expect, test } from "vitest";
import {
  NOTES_REF_PREFIX,
  NOTES_REFS,
  ALL_REF_TYPES,
  getNotesRef,
  getAllNotesRefs,
  getRemoteNotesRef,
  parseNotesRef,
  isNotesRef,
} from "./refs";

describe("NOTES_REF_PREFIX", () => {
  test("has correct prefix", () => {
    expect(NOTES_REF_PREFIX).toBe("refs/notes/xnotes");
  });
});

describe("NOTES_REFS", () => {
  test("has all expected refs", () => {
    expect(NOTES_REFS.reviews).toBe("refs/notes/xnotes/reviews");
    expect(NOTES_REFS.discuss).toBe("refs/notes/xnotes/discuss");
    expect(NOTES_REFS.ci).toBe("refs/notes/xnotes/ci");
    expect(NOTES_REFS.analyses).toBe("refs/notes/xnotes/analyses");
  });
});

describe("ALL_REF_TYPES", () => {
  test("contains all ref types", () => {
    expect(ALL_REF_TYPES).toContain("reviews");
    expect(ALL_REF_TYPES).toContain("discuss");
    expect(ALL_REF_TYPES).toContain("ci");
    expect(ALL_REF_TYPES).toContain("analyses");
    expect(ALL_REF_TYPES).toHaveLength(4);
  });
});

describe("getNotesRef", () => {
  test("returns correct ref for each type", () => {
    expect(getNotesRef("reviews")).toBe("refs/notes/xnotes/reviews");
    expect(getNotesRef("discuss")).toBe("refs/notes/xnotes/discuss");
    expect(getNotesRef("ci")).toBe("refs/notes/xnotes/ci");
    expect(getNotesRef("analyses")).toBe("refs/notes/xnotes/analyses");
  });
});

describe("getAllNotesRefs", () => {
  test("returns all refs", () => {
    const refs = getAllNotesRefs();
    expect(refs).toHaveLength(4);
    expect(refs).toContain("refs/notes/xnotes/reviews");
    expect(refs).toContain("refs/notes/xnotes/discuss");
    expect(refs).toContain("refs/notes/xnotes/ci");
    expect(refs).toContain("refs/notes/xnotes/analyses");
  });
});

describe("getRemoteNotesRef", () => {
  test("returns remote ref with default origin", () => {
    expect(getRemoteNotesRef("reviews")).toBe("origin/refs/notes/xnotes/reviews");
    expect(getRemoteNotesRef("discuss")).toBe("origin/refs/notes/xnotes/discuss");
  });

  test("returns remote ref with custom remote", () => {
    expect(getRemoteNotesRef("reviews", "upstream")).toBe("upstream/refs/notes/xnotes/reviews");
  });
});

describe("parseNotesRef", () => {
  test("parses exact ref path", () => {
    expect(parseNotesRef("refs/notes/xnotes/reviews")).toBe("reviews");
    expect(parseNotesRef("refs/notes/xnotes/discuss")).toBe("discuss");
    expect(parseNotesRef("refs/notes/xnotes/ci")).toBe("ci");
    expect(parseNotesRef("refs/notes/xnotes/analyses")).toBe("analyses");
  });

  test("parses remote ref path", () => {
    expect(parseNotesRef("origin/refs/notes/xnotes/reviews")).toBe("reviews");
    expect(parseNotesRef("upstream/refs/notes/xnotes/discuss")).toBe("discuss");
  });

  test("returns null for invalid refs", () => {
    expect(parseNotesRef("refs/heads/main")).toBeNull();
    expect(parseNotesRef("refs/notes/other")).toBeNull();
    expect(parseNotesRef("invalid")).toBeNull();
  });
});

describe("isNotesRef", () => {
  test("returns true for valid xnotes refs", () => {
    expect(isNotesRef("refs/notes/xnotes/reviews")).toBe(true);
    expect(isNotesRef("refs/notes/xnotes/discuss")).toBe(true);
    expect(isNotesRef("origin/refs/notes/xnotes/ci")).toBe(true);
  });

  test("returns false for invalid refs", () => {
    expect(isNotesRef("refs/heads/main")).toBe(false);
    expect(isNotesRef("refs/notes/other")).toBe(false);
    expect(isNotesRef("invalid")).toBe(false);
  });
});
