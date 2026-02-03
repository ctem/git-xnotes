/**
 * Git notes writing utilities
 *
 * @module notes/writer
 */

import { execOrThrow } from "../git/commands.js";
import {
  type ReviewRequest,
  serializeReviewRequest,
  validateReviewRequest,
  type Comment,
  serializeComment,
  validateComment,
  type CIResult,
  serializeCIResult,
  validateCIResult,
  type AnalysisResult,
  serializeAnalysisResult,
  validateAnalysisResult,
} from "../types/index.js";
import { type NotesRefType, getNotesRef } from "./refs.js";

/**
 * Options for writing notes
 */
export interface WriteNotesOptions {
  /** Working directory */
  readonly cwd?: string | undefined;
}

/**
 * Appends a single-line note to a commit.
 *
 * @param ref - Notes reference type
 * @param commit - Commit hash to annotate
 * @param content - Single-line content to append
 * @param options - Write options
 */
export async function appendNoteRaw(
  ref: NotesRefType,
  commit: string,
  content: string,
  options?: WriteNotesOptions
): Promise<void> {
  const notesRef = getNotesRef(ref);

  // Use --force to create or append
  // The append subcommand adds to existing notes
  await execOrThrow(
    ["notes", `--ref=${notesRef}`, "append", "-m", content, commit],
    { cwd: options?.cwd }
  );
}

/**
 * Appends a typed note to a commit.
 *
 * @param ref - Notes reference type
 * @param commit - Commit hash to annotate
 * @param data - Data to append
 * @param serializer - Function to serialize data to single-line JSON
 * @param options - Write options
 */
export async function appendNote<T>(
  ref: NotesRefType,
  commit: string,
  data: T,
  serializer: (data: T) => string,
  options?: WriteNotesOptions
): Promise<void> {
  const content = serializer(data);
  await appendNoteRaw(ref, commit, content, options);
}

/**
 * Replaces all notes for a commit with new content.
 *
 * @param ref - Notes reference type
 * @param commit - Commit hash to annotate
 * @param items - Array of items to write
 * @param serializer - Function to serialize each item
 * @param options - Write options
 */
export async function replaceNote<T>(
  ref: NotesRefType,
  commit: string,
  items: readonly T[],
  serializer: (data: T) => string,
  options?: WriteNotesOptions
): Promise<void> {
  const notesRef = getNotesRef(ref);
  const content = items.map(serializer).join("\n");

  // Use add with -f to replace existing notes
  await execOrThrow(
    ["notes", `--ref=${notesRef}`, "add", "-f", "-m", content, commit],
    { cwd: options?.cwd }
  );
}

/**
 * Removes notes for a commit.
 *
 * @param ref - Notes reference type
 * @param commit - Commit hash
 * @param options - Write options
 */
export async function removeNote(
  ref: NotesRefType,
  commit: string,
  options?: WriteNotesOptions
): Promise<void> {
  const notesRef = getNotesRef(ref);

  await execOrThrow(
    ["notes", `--ref=${notesRef}`, "remove", commit],
    { cwd: options?.cwd }
  );
}

/**
 * Appends a review request to a commit.
 *
 * @param commit - Commit hash to annotate
 * @param request - Review request to append
 * @param options - Write options
 */
export async function appendReviewRequest(
  commit: string,
  request: ReviewRequest,
  options?: WriteNotesOptions
): Promise<void> {
  // Validate before writing
  validateReviewRequest(request);
  await appendNote("reviews", commit, request, serializeReviewRequest, options);
}

/**
 * Appends a comment to a commit.
 *
 * @param commit - Commit hash to annotate
 * @param comment - Comment to append
 * @param options - Write options
 */
export async function appendComment(
  commit: string,
  comment: Comment,
  options?: WriteNotesOptions
): Promise<void> {
  // Validate before writing
  validateComment(comment);
  await appendNote("discuss", commit, comment, serializeComment, options);
}

/**
 * Appends a CI result to a commit.
 *
 * @param commit - Commit hash to annotate
 * @param result - CI result to append
 * @param options - Write options
 */
export async function appendCIResult(
  commit: string,
  result: CIResult,
  options?: WriteNotesOptions
): Promise<void> {
  // Validate before writing
  validateCIResult(result);
  await appendNote("ci", commit, result, serializeCIResult, options);
}

/**
 * Appends an analysis result to a commit.
 *
 * @param commit - Commit hash to annotate
 * @param result - Analysis result to append
 * @param options - Write options
 */
export async function appendAnalysisResult(
  commit: string,
  result: AnalysisResult,
  options?: WriteNotesOptions
): Promise<void> {
  // Validate before writing
  validateAnalysisResult(result);
  await appendNote("analyses", commit, result, serializeAnalysisResult, options);
}
