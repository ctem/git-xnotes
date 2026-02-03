/**
 * Show command - show review details
 *
 * @module cli/commands/show
 */

import { Command } from "commander";
import { getHeadCommit, resolveRef, execOrThrow } from "../../git/index.js";
import { readReviewRequests, readComments } from "../../notes/index.js";
import {
  getReviewState,
  computeCommentHash,
  buildCommentTree,
  type CommentWithHash,
  type CommentTree,
} from "../../types/index.js";
import {
  formatReviewDetail,
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
    .description("Show details of a specific review")
    .argument("[commit]", "Review commit (default: HEAD)")
    .option("--diff", "Show diff of changes", false)
    .option("--comments", "Include comments", true)
    .option("--json", "Output as JSON", false)
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
  readonly diff: boolean;
  readonly comments: boolean;
  readonly json: boolean;
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

  // Read review requests
  const requests = await readReviewRequests(commit);
  if (requests.length === 0) {
    throw new Error(`No review found for commit ${commit.substring(0, 7)}`);
  }

  // Get latest request and status
  const sorted = [...requests].sort(
    (a, b) => parseInt(b.timestamp, 10) - parseInt(a.timestamp, 10)
  );
  const latest = sorted[0];
  if (!latest) {
    throw new Error(`No review found for commit ${commit.substring(0, 7)}`);
  }

  const status = getReviewState(requests);

  // Read and process comments
  let commentTrees: CommentTree[] = [];
  if (options.comments) {
    const rawComments = await readComments(commit);

    // Add hashes to comments
    const commentsWithHash: CommentWithHash[] = rawComments.map((c) => ({
      ...c,
      hash: computeCommentHash(c),
    }));

    // Build comment trees (only for root comments - those without parent)
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
  const output = formatReviewDetail(
    {
      commit,
      author: latest.requester,
      target: latest.targetRef,
      source: latest.reviewRef,
      status,
      description: latest.description ?? "",
    },
    commentTrees,
    format
  );

  console.log(output);

  // Show diff if requested
  if (options.diff) {
    console.log("\n--- Diff ---\n");
    const targetBranch = latest.targetRef.replace("refs/heads/", "");
    const sourceBranch = latest.reviewRef.replace("refs/heads/", "");
    const diffOutput = await execOrThrow([
      "diff",
      `${targetBranch}...${sourceBranch}`,
    ]);
    console.log(diffOutput);
  }
}
