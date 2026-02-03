/**
 * Git notes reading utilities
 *
 * @module notes/reader
 */

import { exec } from "../git/commands.js";
import { parseNotesList } from "../git/parser.js";
import {
  type ReviewRequest,
  parseReviewRequest,
  type Comment,
  parseComment,
  type CIResult,
  parseCIResult,
  type AnalysisResult,
  parseAnalysisResult,
} from "../types/index.js";
import { type NotesRefType, getNotesRef } from "./refs.js";

/**
 * Options for reading notes
 */
export interface ReadNotesOptions {
  /** Working directory */
  readonly cwd?: string | undefined;
}

/**
 * Reads raw note content for a commit.
 *
 * @param ref - Notes reference type
 * @param commit - Commit hash to read notes for
 * @param options - Read options
 * @returns Raw note content or null if no note exists
 */
export async function readNoteRaw(
  ref: NotesRefType,
  commit: string,
  options?: ReadNotesOptions
): Promise<string | null> {
  const notesRef = getNotesRef(ref);
  const result = await exec(
    ["notes", `--ref=${notesRef}`, "show", commit],
    { cwd: options?.cwd }
  );

  if (result.exitCode !== 0) {
    // Note doesn't exist
    return null;
  }

  return result.stdout;
}

/**
 * Reads and parses notes for a commit.
 *
 * @param ref - Notes reference type
 * @param commit - Commit hash to read notes for
 * @param parser - Function to parse each line
 * @param options - Read options
 * @returns Array of parsed items
 */
export async function readNote<T>(
  ref: NotesRefType,
  commit: string,
  parser: (line: string) => T,
  options?: ReadNotesOptions
): Promise<T[]> {
  const content = await readNoteRaw(ref, commit, options);

  if (content === null) {
    return [];
  }

  const results: T[] = [];
  const lines = content.split("\n").filter((line) => line.trim().length > 0);

  for (const line of lines) {
    try {
      results.push(parser(line));
    } catch (error) {
      // Skip invalid lines, log warning in debug mode
      if (process.env["XNOTES_DEBUG"]) {
        console.warn(`Failed to parse note line: ${line}`, error);
      }
    }
  }

  return results;
}

/**
 * Lists all commits that have notes attached.
 *
 * @param ref - Notes reference type
 * @param options - Read options
 * @returns Map of commit hash to note hash
 */
export async function listNotesCommits(
  ref: NotesRefType,
  options?: ReadNotesOptions
): Promise<Map<string, string>> {
  const notesRef = getNotesRef(ref);
  const result = await exec(
    ["notes", `--ref=${notesRef}`, "list"],
    { cwd: options?.cwd }
  );

  if (result.exitCode !== 0) {
    // Notes ref doesn't exist yet
    return new Map();
  }

  return parseNotesList(result.stdout);
}

/**
 * Reads review requests for a commit.
 *
 * @param commit - Commit hash
 * @param options - Read options
 * @returns Array of ReviewRequest objects
 */
export async function readReviewRequests(
  commit: string,
  options?: ReadNotesOptions
): Promise<ReviewRequest[]> {
  return readNote("reviews", commit, parseReviewRequest, options);
}

/**
 * Reads comments for a commit.
 *
 * @param commit - Commit hash
 * @param options - Read options
 * @returns Array of Comment objects
 */
export async function readComments(
  commit: string,
  options?: ReadNotesOptions
): Promise<Comment[]> {
  return readNote("discuss", commit, parseComment, options);
}

/**
 * Reads CI results for a commit.
 *
 * @param commit - Commit hash
 * @param options - Read options
 * @returns Array of CIResult objects
 */
export async function readCIResults(
  commit: string,
  options?: ReadNotesOptions
): Promise<CIResult[]> {
  return readNote("ci", commit, parseCIResult, options);
}

/**
 * Reads analysis results for a commit.
 *
 * @param commit - Commit hash
 * @param options - Read options
 * @returns Array of AnalysisResult objects
 */
export async function readAnalysisResults(
  commit: string,
  options?: ReadNotesOptions
): Promise<AnalysisResult[]> {
  return readNote("analyses", commit, parseAnalysisResult, options);
}

/**
 * Reads all review requests from the repository.
 *
 * @param options - Read options
 * @returns Map of commit hash to ReviewRequest array
 */
export async function readAllReviewRequests(
  options?: ReadNotesOptions
): Promise<Map<string, ReviewRequest[]>> {
  const commits = await listNotesCommits("reviews", options);
  const result = new Map<string, ReviewRequest[]>();

  for (const commit of commits.keys()) {
    const requests = await readReviewRequests(commit, options);
    if (requests.length > 0) {
      result.set(commit, requests);
    }
  }

  return result;
}

/**
 * Checks if a notes ref exists.
 *
 * @param ref - Notes reference type
 * @param options - Read options
 * @returns true if the notes ref exists
 */
export async function notesRefExists(
  ref: NotesRefType,
  options?: ReadNotesOptions
): Promise<boolean> {
  const notesRef = getNotesRef(ref);
  const result = await exec(
    ["rev-parse", "--verify", notesRef],
    { cwd: options?.cwd }
  );
  return result.exitCode === 0;
}
