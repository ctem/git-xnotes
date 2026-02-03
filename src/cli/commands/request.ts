/**
 * Request command - create a new review request
 *
 * @module cli/commands/request
 */

import { Command } from "commander";
import {
  getCurrentBranch,
  getBranchBase,
  getUserEmail,
  resolveRef,
} from "../../git/index.js";
import { appendReviewRequest } from "../../notes/index.js";
import { createReviewRequest } from "../../types/index.js";
import { formatError, formatSuccess } from "../formatters/index.js";

/**
 * Registers the request command.
 *
 * @param program - Commander program
 */
export function registerRequestCommand(program: Command): void {
  program
    .command("request")
    .description("Create a new review request for the current branch")
    .option("-t, --target <branch>", "Target branch for merge", "main")
    .option("-r, --reviewers <emails...>", "Reviewer email addresses")
    .option("-m, --message <text>", "Review description")
    .option("--base <commit>", "Base commit (auto-detected if omitted)")
    .action(async (options: RequestOptions) => {
      try {
        await executeRequest(options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface RequestOptions {
  readonly target: string;
  readonly reviewers?: readonly string[];
  readonly message?: string;
  readonly base?: string;
}

async function executeRequest(options: RequestOptions): Promise<void> {
  // Get current branch
  const currentBranch = await getCurrentBranch();
  if (currentBranch === "HEAD") {
    throw new Error("Cannot create review request in detached HEAD state");
  }

  // Ensure target branch exists
  const targetRef = `refs/heads/${options.target}`;
  try {
    await resolveRef(targetRef);
  } catch {
    throw new Error(`Target branch '${options.target}' does not exist`);
  }

  // Get the source ref
  const sourceRef = `refs/heads/${currentBranch}`;

  // Find the first commit in the branch
  let baseCommit: string;
  if (options.base) {
    baseCommit = await resolveRef(options.base);
  } else {
    baseCommit = await getBranchBase(currentBranch, options.target);
  }

  // Get user email
  const userEmail = await getUserEmail();

  // Create the review request
  const request = createReviewRequest({
    requester: userEmail,
    reviewRef: sourceRef,
    targetRef: targetRef,
    baseCommit: baseCommit,
    reviewers: options.reviewers ? [...options.reviewers] : undefined,
    description: options.message,
  });

  // Append to notes
  await appendReviewRequest(baseCommit, request);

  // Output success
  console.log(formatSuccess(`Created review request: ${baseCommit.substring(0, 7)}`));
  console.log(`  Source: ${currentBranch}`);
  console.log(`  Target: ${options.target}`);
  if (options.reviewers && options.reviewers.length > 0) {
    console.log(`  Reviewers: ${options.reviewers.join(", ")}`);
  }
}
