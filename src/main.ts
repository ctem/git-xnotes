/**
 * git-xnotes - Main entry point
 *
 * reviews in git notes
 */

import { greet } from "./lib";

function main(): void {
  const message = greet("World");
  console.log(message);
}

main();
