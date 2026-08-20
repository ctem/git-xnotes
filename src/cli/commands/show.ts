/**
 * Show command - show comments for a commit
 *
 * @module cli/commands/show
 */

import { Command } from "commander";
import { getHeadCommit, resolveRef } from "../../git/index.js";
import { readComments } from "../../notes/index.js";
import {
  computeCommentHash,
  buildCommentTree,
  getLatestVersion,
  type CommentWithHash,
  type CommentTree,
} from "../../types/index.js";
import {
  formatCommitComments,
  formatError,
  type OutputFormat,
} from "../formatters/index.js";

/**
 * Registers the show command.
 *
 * @param program - Commander program
 */
export function registerShowCommand(program: Command): void {
  program
    .command("show")
    .description("Show comments for a commit")
    .argument("[commit]", "Commit to show comments for (default: HEAD)")
    .option("--json", "Output as JSON", false)
    .option("--latest", "Show only the latest version of each comment", false)
    .action(async (commit: string | undefined, options: ShowOptions) => {
      try {
        await executeShow(commit, options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface ShowOptions {
  readonly json: boolean;
  readonly latest: boolean;
}

async function executeShow(
  commitArg: string | undefined,
  options: ShowOptions
): Promise<void> {
  // Resolve commit
  let commit: string;
  if (commitArg) {
    commit = await resolveRef(commitArg);
  } else {
    commit = await getHeadCommit();
  }

  // Read comments
  const rawComments = await readComments(commit);

  // Add hashes to comments
  const commentsWithHash: CommentWithHash[] = rawComments.map((c) => ({
    ...c,
    hash: computeCommentHash(c),
  }));

  // Build comment trees
  const commentTrees: CommentTree[] = [];

  if (options.latest) {
    // Find root comments that are not superseded
    const rootComments = commentsWithHash.filter((c) => !c.parent);

    for (const root of rootComments) {
      const latestRoot = getLatestVersion(commentsWithHash, root.hash);
      if (latestRoot && latestRoot.hash === root.hash) {
        const tree = buildCommentTreeWithRemap(commentsWithHash, root.hash);
        if (tree) {
          commentTrees.push(tree);
        }
      }
    }
  } else {
    // Build trees from root comments (those without parent)
    const rootComments = commentsWithHash.filter((c) => !c.parent);
    for (const root of rootComments) {
      const tree = buildCommentTree(commentsWithHash, root.hash);
      if (tree) {
        commentTrees.push(tree);
      }
    }
  }

  // Format output
  const format: OutputFormat = options.json ? "json" : "table";
  const output = formatCommitComments(commit, commentTrees, format);

  console.log(output);
}

/**
 * Builds a comment tree with edit-chain remapping.
 * Replies are attached to the latest version of the comment they reply to.
 */
function buildCommentTreeWithRemap(
  comments: readonly CommentWithHash[],
  rootHash: string
): CommentTree | null {
  const root = comments.find((c) => c.hash === rootHash);
  if (!root) {
    return null;
  }

  const replies = findRepliesWithRemap(comments, rootHash);
  return {
    comment: root,
    replies: replies
      .map((r) => buildCommentTreeWithRemap(comments, r.hash))
      .filter((t): t is CommentTree => t !== null),
  };
}

/**
 * Finds replies to a comment, remapping parent through edit-chain resolution.
 * A reply is attached if its parent (remapped) matches the rootHash.
 */
function findRepliesWithRemap(
  comments: readonly CommentWithHash[],
  rootHash: string
): CommentWithHash[] {
  return comments.filter((c) => {
    if (c.hash === rootHash) {
      return false;
    }
    if (!c.parent) {
      return false;
    }
    const resolvedParentHash = getLatestVersion(comments, c.parent)?.hash ?? c.parent;
    return resolvedParentHash === rootHash;
  });
}
