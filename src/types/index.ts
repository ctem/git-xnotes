/**
 * Type definitions and utilities for git-xnotes
 *
 * @module types
 */

// Review types
export type {
  ReviewRequest,
  ReviewState,
} from "./review.js";
export {
  REVIEW_SCHEMA_VERSION,
  validateReviewRequest,
  getReviewState,
  sortRequestsByTimestamp,
  getLatestRequest,
  serializeReviewRequest,
  parseReviewRequest,
  createReviewRequest,
  resetTimestampCounter,
} from "./review.js";

// Comment types
export type {
  Comment,
  CommentLocation,
  LineRange,
  CommentWithHash,
  CommentTree,
} from "./comment.js";
export {
  COMMENT_SCHEMA_VERSION,
  validateComment,
  computeCommentHash,
  serializeComment,
  parseComment,
  createComment,
  resetCommentTimestampCounter,
  findReplies,
  buildCommentTree,
  getLatestVersion,
} from "./comment.js";

// CI types
export type {
  CIResult,
  CIStatus,
  CIStatusSummary,
} from "./ci.js";
export {
  CI_SCHEMA_VERSION,
  validateCIResult,
  serializeCIResult,
  parseCIResult,
  createCIResult,
  computeCISummary,
  getLatestCIResult,
} from "./ci.js";

// Analysis types
export type {
  AnalysisResult,
  AnalysisStatus,
  AnalysisStatusSummary,
} from "./analysis.js";
export {
  ANALYSIS_SCHEMA_VERSION,
  validateAnalysisResult,
  serializeAnalysisResult,
  parseAnalysisResult,
  createAnalysisResult,
  computeAnalysisSummary,
} from "./analysis.js";

// Error types
export {
  XNotesError,
  ValidationError,
  NotFoundError,
  ConflictError,
  GitError,
  NetworkError,
  StateError,
  isXNotesError,
  isXNotesErrorWithCode,
  wrapError,
} from "./errors.js";
