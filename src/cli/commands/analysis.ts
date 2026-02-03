/**
 * Analysis command - manage analysis results
 *
 * @module cli/commands/analysis
 */

import { Command } from "commander";
import type { AnalysisStatus } from "../../types/index.js";
import { getAnalysisStatus, recordAnalysisResult } from "../../services/index.js";
import { formatError, formatSuccess } from "../formatters/index.js";

/**
 * Registers the analysis command.
 *
 * @param program - Commander program
 */
export function registerAnalysisCommand(program: Command): void {
  const analysis = program.command("analysis").description("Manage analysis results");

  // analysis status [commit]
  analysis
    .command("status")
    .description("Show analysis status for a commit")
    .argument("[commit]", "Commit hash or ref (default: HEAD)")
    .action(async (commit: string | undefined) => {
      try {
        await executeAnalysisStatus(commit);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });

  // analysis record [commit]
  analysis
    .command("record")
    .description("Record an analysis result")
    .argument("[commit]", "Commit hash or ref (default: HEAD)")
    .requiredOption("--url <url>", "Link to analysis results")
    .requiredOption("--status <status>", "Analysis verdict (lgtm, fyi, nmw)")
    .action(async (commit: string | undefined, options: RecordOptions) => {
      try {
        await executeAnalysisRecord(commit, options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface RecordOptions {
  readonly url: string;
  readonly status: string;
}

async function executeAnalysisStatus(commit: string | undefined): Promise<void> {
  const status = await getAnalysisStatus(commit);

  console.log(`Analysis Status for ${status.commit.substring(0, 7)}`);
  console.log(`  Summary: ${formatAnalysisStatus(status.summary)}`);

  if (status.results.length > 0) {
    console.log("\nResults:");
    for (const result of status.results) {
      const date = new Date(parseInt(result.timestamp, 10) * 1000);
      console.log(`  - ${formatAnalysisStatus(result.status)}`);
      console.log(`    ${date.toISOString()}`);
      console.log(`    ${result.url}`);
    }
  } else {
    console.log("\n  No analysis results recorded");
  }
}

async function executeAnalysisRecord(
  commit: string | undefined,
  options: RecordOptions
): Promise<void> {
  // Validate status
  const validStatuses: AnalysisStatus[] = ["lgtm", "fyi", "nmw"];
  if (!validStatuses.includes(options.status as AnalysisStatus)) {
    throw new Error(
      `Invalid status: ${options.status}. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  const resolvedCommit = commit ?? "HEAD";
  await recordAnalysisResult(
    resolvedCommit,
    options.url,
    options.status as AnalysisStatus
  );

  console.log(formatSuccess(`Analysis result recorded for ${resolvedCommit}`));
  console.log(`  Status: ${formatAnalysisStatus(options.status as AnalysisStatus)}`);
  console.log(`  URL: ${options.url}`);
}

function formatAnalysisStatus(status: AnalysisStatus): string {
  switch (status) {
    case "lgtm":
      return "LGTM (Looks Good To Me)";
    case "fyi":
      return "FYI (For Your Information)";
    case "nmw":
      return "NMW (Needs More Work)";
  }
}
