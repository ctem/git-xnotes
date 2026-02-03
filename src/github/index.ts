/**
 * GitHub integration layer
 *
 * @module github
 */

// Client
export {
  type GitHubConfig,
  type PR,
  type PRComment,
  GitHubClient,
  getConfigFromEnv,
  getConfigFromGit,
  createClient,
} from "./client.js";

// PR Mapping
export {
  type PRMapping,
  type PRMappingOptions,
  findPRForCurrentBranch,
  findPRForBranch,
  findPRByNumber,
  mapPRToReviewRequest,
  getPRState,
  listPRMappings,
} from "./pr.js";

// Comment Sync
export {
  type SyncResult,
  type SyncConflict,
  type SyncOptions,
  mapPRCommentToComment,
  mapCommentToPRBody,
  pullComments,
  pushComments,
  syncComments,
  detectConflicts,
  autoSync,
} from "./sync.js";
