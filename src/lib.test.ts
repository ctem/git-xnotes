import { describe, expect, test } from "vitest";
import * as lib from "./lib";

describe("lib exports", () => {
  test("exports git operations", () => {
    expect(lib.exec).toBeDefined();
    expect(lib.execOrThrow).toBeDefined();
    expect(lib.getCurrentBranch).toBeDefined();
    expect(lib.getHeadCommit).toBeDefined();
    expect(lib.getCommitInfo).toBeDefined();
    expect(lib.isInsideRepo).toBeDefined();
    expect(lib.getRepoRoot).toBeDefined();
  });

  test("exports git parsing utilities", () => {
    expect(lib.parseRefList).toBeDefined();
    expect(lib.parseDiffStat).toBeDefined();
    expect(lib.parseNotesList).toBeDefined();
    expect(lib.shortenHash).toBeDefined();
    expect(lib.isValidHash).toBeDefined();
    expect(lib.isValidEmail).toBeDefined();
  });

  test("exports notes reference management", () => {
    expect(lib.NOTES_REF_PREFIX).toBeDefined();
    expect(lib.NOTES_REFS).toBeDefined();
    expect(lib.ALL_REF_TYPES).toBeDefined();
    expect(lib.getNotesRef).toBeDefined();
    expect(lib.getAllNotesRefs).toBeDefined();
    expect(lib.isNotesRef).toBeDefined();
  });

  test("exports notes reading functions", () => {
    expect(lib.readNoteRaw).toBeDefined();
    expect(lib.readNote).toBeDefined();
    expect(lib.listNotesCommits).toBeDefined();
    expect(lib.readReviewRequests).toBeDefined();
    expect(lib.readComments).toBeDefined();
    expect(lib.readCIResults).toBeDefined();
    expect(lib.readAnalysisResults).toBeDefined();
    expect(lib.readAllReviewRequests).toBeDefined();
  });

  test("exports notes writing functions", () => {
    expect(lib.appendNoteRaw).toBeDefined();
    expect(lib.appendNote).toBeDefined();
    expect(lib.replaceNote).toBeDefined();
    expect(lib.removeNote).toBeDefined();
    expect(lib.appendReviewRequest).toBeDefined();
    expect(lib.appendComment).toBeDefined();
  });

  test("exports notes sync functions", () => {
    expect(lib.pushNotes).toBeDefined();
    expect(lib.fetchNotes).toBeDefined();
    expect(lib.pullNotes).toBeDefined();
    expect(lib.pushAllNotes).toBeDefined();
    expect(lib.fetchAllNotes).toBeDefined();
  });

  test("exports review service functions", () => {
    expect(lib.getReview).toBeDefined();
    expect(lib.acceptReview).toBeDefined();
    expect(lib.rejectReview).toBeDefined();
    expect(lib.submitReview).toBeDefined();
    expect(lib.abandonReview).toBeDefined();
  });

  test("exports CI service functions", () => {
    expect(lib.getCIStatus).toBeDefined();
    expect(lib.recordCIResult).toBeDefined();
    expect(lib.isCIPassing).toBeDefined();
  });

  test("exports analysis service functions", () => {
    expect(lib.getAnalysisStatus).toBeDefined();
    expect(lib.recordAnalysisResult).toBeDefined();
    expect(lib.isAnalysisPassing).toBeDefined();
  });

  test("exports type utilities", () => {
    expect(lib.createReviewRequest).toBeDefined();
    expect(lib.parseReviewRequest).toBeDefined();
    expect(lib.serializeReviewRequest).toBeDefined();
    expect(lib.createComment).toBeDefined();
    expect(lib.parseComment).toBeDefined();
    expect(lib.serializeComment).toBeDefined();
    expect(lib.createCIResult).toBeDefined();
    expect(lib.parseCIResult).toBeDefined();
    expect(lib.createAnalysisResult).toBeDefined();
    expect(lib.parseAnalysisResult).toBeDefined();
  });

  test("exports error types", () => {
    expect(lib.XNotesError).toBeDefined();
    expect(lib.ValidationError).toBeDefined();
    expect(lib.NotFoundError).toBeDefined();
    expect(lib.ConflictError).toBeDefined();
    expect(lib.GitError).toBeDefined();
    expect(lib.NetworkError).toBeDefined();
    expect(lib.StateError).toBeDefined();
    expect(lib.isXNotesError).toBeDefined();
  });
});

describe("lib utility functions", () => {
  test("shortenHash works correctly", () => {
    expect(lib.shortenHash("abc123def456")).toBe("abc123d");
    expect(lib.shortenHash("abc")).toBe("abc");
  });

  test("isValidHash validates hashes", () => {
    expect(lib.isValidHash("abc123")).toBe(true);
    expect(lib.isValidHash("xyz")).toBe(false);
    expect(lib.isValidHash("GHIJKL")).toBe(false);
  });

  test("isValidEmail validates emails", () => {
    expect(lib.isValidEmail("test@example.com")).toBe(true);
    expect(lib.isValidEmail("invalid")).toBe(false);
  });

  test("getNotesRef returns correct ref", () => {
    expect(lib.getNotesRef("reviews")).toBe("refs/notes/xnotes/reviews");
    expect(lib.getNotesRef("discuss")).toBe("refs/notes/xnotes/discuss");
    expect(lib.getNotesRef("ci")).toBe("refs/notes/xnotes/ci");
    expect(lib.getNotesRef("analyses")).toBe("refs/notes/xnotes/analyses");
  });

  test("isNotesRef detects xnotes refs", () => {
    expect(lib.isNotesRef("refs/notes/xnotes/reviews")).toBe(true);
    expect(lib.isNotesRef("refs/notes/other")).toBe(false);
    expect(lib.isNotesRef("refs/heads/main")).toBe(false);
  });
});
