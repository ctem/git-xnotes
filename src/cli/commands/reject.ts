/**
 * Reject command - request changes on a review
 *
 * @module cli/commands/reject
 */

import { Command } from "commander";
import { rejectReview } from "../../services/index.js";
import { formatError, formatSuccess } from "../formatters/index.js";

/**
 * Registers the reject command.
 *
 * @param program - Commander program
 */
export function registerRejectCommand(program: Command): void {
  program
    .command("reject")
    .description("Reject a review (request changes)")
    .argument("[commit]", "Review commit (default: HEAD)")
    .requiredOption("-m, --message <text>", "Rejection reason (required)")
    .action(async (commit: string | undefined, options: RejectOptions) => {
      try {
        await executeReject(commit, options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface RejectOptions {
  readonly message: string;
}

async function executeReject(
  commit: string | undefined,
  options: RejectOptions
): Promise<void> {
  await rejectReview(commit, options.message);

  const commitDisplay = commit ? commit.substring(0, 7) : "HEAD";
  console.log(formatSuccess(`Review rejected: ${commitDisplay}`));
  console.log(`  Reason: ${options.message}`);
}
