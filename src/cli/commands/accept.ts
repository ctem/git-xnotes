/**
 * Accept command - approve a review
 *
 * @module cli/commands/accept
 */

import { Command } from "commander";
import { acceptReview } from "../../services/index.js";
import { formatError, formatSuccess } from "../formatters/index.js";

/**
 * Registers the accept command.
 *
 * @param program - Commander program
 */
export function registerAcceptCommand(program: Command): void {
  program
    .command("accept")
    .description("Accept/approve a review")
    .argument("[commit]", "Review commit (default: HEAD)")
    .option("-m, --message <text>", "Approval message")
    .action(async (commit: string | undefined, options: AcceptOptions) => {
      try {
        await executeAccept(commit, options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface AcceptOptions {
  readonly message?: string;
}

async function executeAccept(
  commit: string | undefined,
  options: AcceptOptions
): Promise<void> {
  await acceptReview(commit, options.message);

  const commitDisplay = commit ? commit.substring(0, 7) : "HEAD";
  console.log(formatSuccess(`Review accepted: ${commitDisplay}`));
  if (options.message) {
    console.log(`  Message: ${options.message}`);
  }
}
