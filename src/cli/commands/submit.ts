/**
 * Submit command - merge an accepted review
 *
 * @module cli/commands/submit
 */

import { Command } from "commander";
import { submitReview, getReview } from "../../services/index.js";
import { formatError, formatSuccess } from "../formatters/index.js";

/**
 * Registers the submit command.
 *
 * @param program - Commander program
 */
export function registerSubmitCommand(program: Command): void {
  program
    .command("submit")
    .description("Merge an accepted review into the target branch")
    .argument("[commit]", "Review commit (default: HEAD)")
    .option("--merge", "Create merge commit (no fast-forward)")
    .option("--rebase", "Rebase onto target")
    .option("--ff", "Fast-forward only (default)")
    .option("--tbr", 'Submit without acceptance ("to be reviewed")')
    .action(async (commit: string | undefined, options: SubmitCommandOptions) => {
      try {
        await executeSubmit(commit, options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface SubmitCommandOptions {
  readonly merge?: boolean;
  readonly rebase?: boolean;
  readonly ff?: boolean;
  readonly tbr?: boolean;
}

async function executeSubmit(
  commit: string | undefined,
  options: SubmitCommandOptions
): Promise<void> {
  // Get review info first to show in output
  const review = await getReview(commit);
  const targetBranch = review.request.targetRef.replace("refs/heads/", "");
  const sourceBranch = review.request.reviewRef.replace("refs/heads/", "");

  await submitReview(commit, options);

  const commitDisplay = commit ? commit.substring(0, 7) : review.commit.substring(0, 7);
  console.log(formatSuccess(`Review submitted: ${commitDisplay}`));
  console.log(`  Merged: ${sourceBranch} -> ${targetBranch}`);

  if (options.tbr) {
    console.log("  Note: Submitted without acceptance (TBR)");
  }

  if (options.merge) {
    console.log("  Strategy: merge commit");
  } else if (options.rebase) {
    console.log("  Strategy: rebase");
  } else {
    console.log("  Strategy: fast-forward");
  }
}
