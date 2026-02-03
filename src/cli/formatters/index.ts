/**
 * Output formatters for CLI
 *
 * @module cli/formatters
 */

import type { ReviewState, CommentTree } from "../../types/index.js";

/**
 * Output format types
 */
export type OutputFormat = "table" | "json" | "oneline";

/**
 * Review list item for display
 */
export interface ReviewListItem {
  readonly commit: string;
  readonly author: string;
  readonly target: string;
  readonly status: ReviewState;
  readonly description: string;
}

/**
 * Formats a review list for output.
 *
 * @param items - Review list items
 * @param format - Output format
 * @returns Formatted string
 */
export function formatReviewList(
  items: readonly ReviewListItem[],
  format: OutputFormat
): string {
  switch (format) {
    case "json":
      return JSON.stringify({ reviews: items }, null, 2);

    case "oneline":
      return items
        .map((item) =>
          `${item.commit.substring(0, 7)} ${item.author} ${item.target} ${item.status} ${item.description}`
        )
        .join("\n");

    case "table":
    default:
      return formatTable(
        items.map((item) => [
          item.commit.substring(0, 7),
          truncate(item.author, 20),
          truncate(item.target.replace("refs/heads/", ""), 12),
          item.status,
          truncate(item.description, 40),
        ]),
        ["COMMIT", "AUTHOR", "TARGET", "STATUS", "DESCRIPTION"]
      );
  }
}

/**
 * Formats a table with headers.
 *
 * @param rows - Table rows
 * @param headers - Column headers
 * @returns Formatted table string
 */
export function formatTable(
  rows: readonly (readonly string[])[],
  headers: readonly string[]
): string {
  if (rows.length === 0) {
    return headers.join("  ");
  }

  // Calculate column widths
  const widths = headers.map((header, i) => {
    const cellWidths = rows.map((row) => (row[i] ?? "").length);
    return Math.max(header.length, ...cellWidths);
  });

  // Format header
  const headerLine = headers
    .map((header, i) => header.padEnd(widths[i] ?? 0))
    .join("  ");

  // Format rows
  const rowLines = rows.map((row) =>
    row.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join("  ")
  );

  return [headerLine, ...rowLines].join("\n");
}

/**
 * Truncates a string to a maximum length.
 *
 * @param str - String to truncate
 * @param maxLen - Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) {
    return str;
  }
  return str.substring(0, maxLen - 3) + "...";
}

/**
 * Formats a review detail for output.
 *
 * @param review - Review information
 * @param comments - Comment trees
 * @param format - Output format
 * @returns Formatted string
 */
export function formatReviewDetail(
  review: {
    commit: string;
    author: string;
    target: string;
    source: string;
    status: ReviewState;
    description: string;
  },
  comments: readonly CommentTree[],
  format: OutputFormat
): string {
  switch (format) {
    case "json":
      return JSON.stringify({ review, comments }, null, 2);

    default:
      const lines: string[] = [];

      lines.push(`Review: ${review.commit.substring(0, 7)}`);
      lines.push(`Author: ${review.author}`);
      lines.push(`Source: ${review.source.replace("refs/heads/", "")}`);
      lines.push(`Target: ${review.target.replace("refs/heads/", "")}`);
      lines.push(`Status: ${review.status}`);
      lines.push("");
      lines.push(review.description || "(no description)");

      if (comments.length > 0) {
        lines.push("");
        lines.push("--- Comments ---");
        for (const tree of comments) {
          lines.push(...formatCommentTree(tree, 0));
        }
      }

      return lines.join("\n");
  }
}

/**
 * Formats a comment tree recursively.
 *
 * @param tree - Comment tree
 * @param depth - Indentation depth
 * @returns Array of formatted lines
 */
function formatCommentTree(tree: CommentTree, depth: number): string[] {
  const indent = "  ".repeat(depth);
  const lines: string[] = [];

  const comment = tree.comment;
  const date = new Date(parseInt(comment.timestamp, 10) * 1000);
  const dateStr = date.toISOString().split("T")[0];

  lines.push(`${indent}[${dateStr}] ${comment.author}:`);
  lines.push(`${indent}  ${comment.description}`);

  if (comment.location) {
    const loc = comment.location;
    const range = loc.range
      ? `:${loc.range.startLine}-${loc.range.endLine}`
      : "";
    lines.push(`${indent}  @ ${loc.path}${range}`);
  }

  for (const reply of tree.replies) {
    lines.push(...formatCommentTree(reply, depth + 1));
  }

  return lines;
}

/**
 * Formats an error for CLI output.
 *
 * @param error - Error to format
 * @returns Formatted error string
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}

/**
 * Formats a success message.
 *
 * @param message - Success message
 * @returns Formatted message
 */
export function formatSuccess(message: string): string {
  return message;
}

/**
 * Checks if colors should be used in output.
 *
 * @returns true if colors should be used
 */
export function shouldUseColors(): boolean {
  return (
    process.env["NO_COLOR"] === undefined &&
    process.stdout.isTTY === true
  );
}
