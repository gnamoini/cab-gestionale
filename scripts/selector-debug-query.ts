#!/usr/bin/env npx tsx
/**
 * Cursor-friendly Debug DSL CLI — prints CursorDebugResult JSON.
 *
 * Usage:
 *   npx tsx scripts/selector-debug-query.ts "trace:gc → policy → snapshot"
 *   npx tsx scripts/selector-debug-query.ts "module:convergence"
 *   npx tsx scripts/selector-debug-query.ts "impact:selector-decision-engine"
 */
import { executeDebugQuery } from "@/lib/selector-core/selector-debug-dsl-engine";

const query = process.argv.slice(2).join(" ").trim();

if (!query) {
  console.error(
    "Usage: npx tsx scripts/selector-debug-query.ts \"trace:gc → policy → snapshot\"",
  );
  process.exit(1);
}

const result = executeDebugQuery(query);
console.log(JSON.stringify(result, null, 2));
