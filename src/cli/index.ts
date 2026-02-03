/**
 * CLI entry point for git-xnotes
 *
 * @module cli
 */

import { Command } from "commander";
import { registerRequestCommand } from "./commands/request.js";
import { registerListCommand } from "./commands/list.js";
import { registerShowCommand } from "./commands/show.js";
import { registerCommentCommand } from "./commands/comment.js";
import { registerPushCommand } from "./commands/push.js";
import { registerPullCommand } from "./commands/pull.js";
import { registerAcceptCommand } from "./commands/accept.js";
import { registerRejectCommand } from "./commands/reject.js";
import { registerSubmitCommand } from "./commands/submit.js";
import { registerAbandonCommand } from "./commands/abandon.js";
import { registerSyncCommand } from "./commands/sync.js";
import { registerCICommand } from "./commands/ci.js";
import { registerAnalysisCommand } from "./commands/analysis.js";
import { registerConfigCommand } from "./commands/config.js";
import { formatError } from "./formatters/index.js";
import { isInsideRepo } from "../git/index.js";

/**
 * Creates and configures the CLI program.
 *
 * @returns Configured Commander program
 */
export function createProgram(): Command {
  const program = new Command()
    .name("git-xnotes")
    .description("Distributed code review annotations in git notes")
    .version("0.1.0");

  // Global options
  program
    .option("--debug", "Enable debug output")
    .option("--no-color", "Disable colored output")
    .option("-C, --directory <path>", "Run in specified directory");

  // Register Phase 1 commands
  registerRequestCommand(program);
  registerListCommand(program);
  registerShowCommand(program);
  registerCommentCommand(program);
  registerPushCommand(program);
  registerPullCommand(program);

  // Register Phase 2 commands
  registerAcceptCommand(program);
  registerRejectCommand(program);
  registerSubmitCommand(program);
  registerAbandonCommand(program);

  // Register Phase 3 commands
  registerSyncCommand(program);

  // Register Phase 4 commands
  registerCICommand(program);
  registerAnalysisCommand(program);
  registerConfigCommand(program);

  return program;
}

/**
 * Main CLI entry point.
 */
export async function main(): Promise<void> {
  try {
    // Check if we're in a git repository
    const inRepo = await isInsideRepo();
    if (!inRepo) {
      console.error("Error: Not in a git repository");
      process.exit(1);
    }

    // Parse and execute
    const program = createProgram();
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(formatError(error));
    process.exit(1);
  }
}
