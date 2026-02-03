/**
 * Abandon command - close a review without merging
 *
 * @module cli/commands/abandon
 */

import { Command } from "commander";
import { abandonReview } from "../../services/index.js";
import { formatError, formatSuccess } from "../formatters/index.js";

/**
 * Registers the abandon command.
 *
 * @param program - Commander program
 */
export function registerAbandonCommand(program: Command): void {
  program
    .command("abandon")
    .description("Abandon a review (close without merging)")
    .argument("[commit]", "Review commit (default: HEAD)")
    .action(async (commit: string | undefined) => {
      try {
        await executeAbandon(commit);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

async function executeAbandon(commit: string | undefined): Promise<void> {
  await abandonReview(commit);

  const commitDisplay = commit ? commit.substring(0, 7) : "HEAD";
  console.log(formatSuccess(`Review abandoned: ${commitDisplay}`));
}
