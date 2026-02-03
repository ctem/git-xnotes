/**
 * CI command - manage CI status
 *
 * @module cli/commands/ci
 */

import { Command } from "commander";
import type { CIStatus } from "../../types/index.js";
import { getCIStatus, recordCIResult } from "../../services/index.js";
import { formatError, formatSuccess } from "../formatters/index.js";

/**
 * Registers the ci command.
 *
 * @param program - Commander program
 */
export function registerCICommand(program: Command): void {
  const ci = program.command("ci").description("Manage CI status");

  // ci status [commit]
  ci.command("status")
    .description("Show CI status for a commit")
    .argument("[commit]", "Commit hash or ref (default: HEAD)")
    .action(async (commit: string | undefined) => {
      try {
        await executeCIStatus(commit);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });

  // ci record [commit]
  ci.command("record")
    .description("Record a CI result")
    .argument("[commit]", "Commit hash or ref (default: HEAD)")
    .requiredOption("--agent <name>", "CI system identifier (e.g., github-actions)")
    .requiredOption("--status <status>", "Build status (success, failure, pending)")
    .option("--url <url>", "Link to build")
    .action(async (commit: string | undefined, options: RecordOptions) => {
      try {
        await executeCIRecord(commit, options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface RecordOptions {
  readonly agent: string;
  readonly status: string;
  readonly url?: string | undefined;
}

async function executeCIStatus(commit: string | undefined): Promise<void> {
  const status = await getCIStatus(commit);

  console.log(`CI Status for ${status.commit.substring(0, 7)}`);
  console.log(`  Summary: ${formatCIStatus(status.summary)}`);

  if (status.results.length > 0) {
    console.log("\nResults:");
    for (const result of status.results) {
      const date = new Date(parseInt(result.timestamp, 10) * 1000);
      console.log(`  - ${result.agent}: ${formatCIStatus(result.status)}`);
      console.log(`    ${date.toISOString()}`);
      if (result.url) {
        console.log(`    ${result.url}`);
      }
    }
  } else {
    console.log("\n  No CI results recorded");
  }
}

async function executeCIRecord(
  commit: string | undefined,
  options: RecordOptions
): Promise<void> {
  // Validate status
  const validStatuses: CIStatus[] = ["success", "failure", "pending"];
  if (!validStatuses.includes(options.status as CIStatus)) {
    throw new Error(`Invalid status: ${options.status}. Must be one of: ${validStatuses.join(", ")}`);
  }

  const resolvedCommit = commit ?? "HEAD";
  await recordCIResult(
    resolvedCommit,
    options.agent,
    options.status as CIStatus,
    options.url
  );

  console.log(formatSuccess(`CI result recorded for ${resolvedCommit}`));
  console.log(`  Agent: ${options.agent}`);
  console.log(`  Status: ${formatCIStatus(options.status as CIStatus)}`);
  if (options.url) {
    console.log(`  URL: ${options.url}`);
  }
}

function formatCIStatus(status: CIStatus | "mixed"): string {
  switch (status) {
    case "success":
      return "SUCCESS";
    case "failure":
      return "FAILURE";
    case "pending":
      return "PENDING";
    case "mixed":
      return "MIXED";
  }
}
