/**
 * Keyset cursor semantics for list_lavorazioni_paginated (ORDER BY created_at DESC, id DESC).
 * next_cursor must be the minimum (last) tuple in the page, not the maximum (first).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sql = readFileSync(
  resolve(import.meta.dirname, "../../supabase/migrations/20260802135200_fix_list_lavorazioni_paginated_last_row.sql"),
  "utf8",
);

assert.match(sql, /last_row as \(/);
assert.match(sql, /order by f\.created_at asc, f\.id asc nulls first/, "cursor = min tuple of page");
assert.doesNotMatch(
  sql,
  /last_row[\s\S]*order by f\.created_at desc, f\.id desc[\s\S]*limit 1/,
  "must not use max row as cursor",
);

console.log("list-lavorazioni-paginated-cursor.test.ts OK");
