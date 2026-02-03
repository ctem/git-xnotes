/**
 * List command - list open reviews
 *
 * @module cli/commands/list
 */

import { Command } from "commander";
import { readAllReviewRequests } from "../../notes/index.js";
import { getReviewState } from "../../types/index.js";
import {
  formatReviewList,
  formatError,
  type OutputFormat,
  type ReviewListItem,
} from "../formatters/index.js";

/**
 * Registers the list command.
 *
 * @param program - Commander program
 */
export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List open reviews in the repository")
    .option("-a, --all", "Include closed/submitted reviews", false)
    .option("--author <email>", "Filter by author email")
    .option("--target <branch>", "Filter by target branch")
    .option(
      "-f, --format <type>",
      "Output format: table, json, oneline",
      "table"
    )
    .action(async (options: ListOptions) => {
      try {
        await executeList(options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface ListOptions {
  readonly all: boolean;
  readonly author?: string;
  readonly target?: string;
  readonly format: string;
}

async function executeList(options: ListOptions): Promise<void> {
  // Read all review requests
  const allRequests = await readAllReviewRequests();

  // Convert to list items
  const items: ReviewListItem[] = [];

  for (const [commit, requests] of allRequests) {
    if (requests.length === 0) continue;

    // Get the latest request to determine current state
    const sorted = [...requests].sort(
      (a, b) => parseInt(b.timestamp, 10) - parseInt(a.timestamp, 10)
    );
    const latest = sorted[0];
    if (!latest) continue;

    const status = getReviewState(requests);

    // Filter by status if not showing all
    if (!options.all && (status === "submitted" || status === "abandoned")) {
      continue;
    }

    // Filter by author
    if (options.author && latest.requester !== options.author) {
      continue;
    }

    // Filter by target
    if (options.target) {
      const targetRef = `refs/heads/${options.target}`;
      if (latest.targetRef !== targetRef) {
        continue;
      }
    }

    items.push({
      commit,
      author: latest.requester,
      target: latest.targetRef,
      status,
      description: latest.description ?? "",
    });
  }

  // Sort by timestamp (newest first)
  items.sort((a, b) => b.commit.localeCompare(a.commit));

  // Format and output
  const format = validateFormat(options.format);
  const output = formatReviewList(items, format);
  console.log(output);

  if (items.length === 0) {
    console.log("No reviews found.");
  }
}

function validateFormat(format: string): OutputFormat {
  if (format === "table" || format === "json" || format === "oneline") {
    return format;
  }
  throw new Error(`Invalid format: ${format}. Use table, json, or oneline.`);
}
