/**
 * git-xnotes Library API
 *
 * This module exports the public API for using git-xnotes as a library.
 * All functions accept an optional `cwd` parameter to specify the git repository path.
 *
 * @example
 * ```typescript
 * import { readReviewRequests, getReview } from 'git-xnotes';
 *
 * // Read reviews from a specific git repository
 * const reviews = await readReviewRequests(commit, { cwd: '/path/to/repo' });
 *
 * // Get review info with full context
 * const review = await getReview(commit, { cwd: '/path/to/repo' });
 * ```
 *
 * @module git-xnotes
 */

// =============================================================================
// Git Operations
// =============================================================================

export type {
  GitCommandResult,
  GitOptions,
  CommitInfo,
} from "./git/index.js";

export {
  exec,
  execOrThrow,
  getCurrentBranch,
  getHeadCommit,
  getMergeBase,
  getBranchBase,
  getCommitInfo,
  getUserEmail,
  getUserName,
  getRemoteUrl,
  refExists,
  resolveRef,
  isInsideRepo,
  getRepoRoot,
} from "./git/index.js";

// Git parsing utilities
export type {
  RefInfo,
  DiffFileStat,
  DiffStat,
} from "./git/index.js";

export {
  parseRefList,
  parseRefInfo,
  parseDiffStat,
  parseNotesList,
  parseBranchList,
  shortenHash,
  isValidHash,
  isValidEmail,
} from "./git/index.js";

// =============================================================================
// Notes Operations
// =============================================================================

// Reference management
export type { NotesRefType } from "./notes/index.js";

export {
  NOTES_REF_PREFIX,
  NOTES_REFS,
  ALL_REF_TYPES,
  getNotesRef,
  getAllNotesRefs,
  getRemoteNotesRef,
  parseNotesRef,
  isNotesRef,
} from "./notes/index.js";

// Reading notes
export type { ReadNotesOptions } from "./notes/index.js";

export {
  readNoteRaw,
  readNote,
  listNotesCommits,
  readReviewRequests,
  readComments,
  readCIResults,
  readAnalysisResults,
  readAllReviewRequests,
  notesRefExists,
} from "./notes/index.js";

// Writing notes
export type { WriteNotesOptions } from "./notes/index.js";

export {
  appendNoteRaw,
  appendNote,
  replaceNote,
  removeNote,
  appendReviewRequest,
  appendComment,
  appendCIResult,
  appendAnalysisResult,
} from "./notes/index.js";

// Merging notes
export type { MergeNotesOptions } from "./notes/index.js";

export {
  MERGE_STRATEGY,
  configureMergeStrategy,
  configureAllMergeStrategies,
  mergeNotes,
  isMergeStrategyConfigured,
  ensureMergeStrategiesConfigured,
} from "./notes/index.js";

// Synchronization
export type { SyncNotesOptions, SyncResult } from "./notes/index.js";

export {
  pushNotes,
  fetchNotes,
  pullNotes,
  pushAllNotes,
  fetchAllNotes,
} from "./notes/index.js";

// =============================================================================
// Services (High-level Business Logic)
// =============================================================================

// Review service
export type {
  SubmitOptions,
  ReviewInfo,
  ReviewServiceOptions,
} from "./services/index.js";

export {
  getReview,
  acceptReview,
  rejectReview,
  submitReview,
  abandonReview,
} from "./services/index.js";

// CI service
export type { CIServiceOptions } from "./services/index.js";

export {
  getCIStatus,
  recordCIResult,
  getLatestCIResult as getLatestCIServiceResult,
  isCIPassing,
  getCIResultsByAgent,
} from "./services/index.js";

// Analysis service
export type { AnalysisServiceOptions } from "./services/index.js";

export {
  getAnalysisStatus,
  recordAnalysisResult,
  getLatestAnalysisResult,
  needsAttention,
  isAnalysisPassing,
} from "./services/index.js";

// =============================================================================
// Types
// =============================================================================

// Review types
export type {
  ReviewRequest,
  ReviewState,
} from "./types/index.js";

export {
  REVIEW_SCHEMA_VERSION,
  validateReviewRequest,
  getReviewState,
  sortRequestsByTimestamp,
  getLatestRequest,
  serializeReviewRequest,
  parseReviewRequest,
  createReviewRequest,
} from "./types/index.js";

// Comment types
export type {
  Comment,
  CommentLocation,
  LineRange,
  CommentWithHash,
  CommentTree,
} from "./types/index.js";

export {
  COMMENT_SCHEMA_VERSION,
  validateComment,
  computeCommentHash,
  serializeComment,
  parseComment,
  createComment,
  findReplies,
  buildCommentTree,
  getLatestVersion,
} from "./types/index.js";

// CI types
export type {
  CIResult,
  CIStatus,
  CIStatusSummary,
} from "./types/index.js";

export {
  CI_SCHEMA_VERSION,
  validateCIResult,
  serializeCIResult,
  parseCIResult,
  createCIResult,
  computeCISummary,
  getLatestCIResult,
} from "./types/index.js";

// Analysis types
export type {
  AnalysisResult,
  AnalysisStatus,
  AnalysisStatusSummary,
} from "./types/index.js";

export {
  ANALYSIS_SCHEMA_VERSION,
  validateAnalysisResult,
  serializeAnalysisResult,
  parseAnalysisResult,
  createAnalysisResult,
  computeAnalysisSummary,
} from "./types/index.js";

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
} from "./types/index.js";
