import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { splitActivityFeedLogs } from "@/lib/audit/split-activity-feed-logs";
import type { LogModificaWithProfileRow } from "@/src/types/supabase-tables";

const ROOT = process.cwd();
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261110120000_log_modifiche_entity_history_retention.sql"),
  "utf8",
);

assert.doesNotMatch(migration, /partition by entita\s*\n\s*order by created_at desc/i);
assert.match(migration, /coalesce\(entita_id::text, '__GLOBAL__'\)/);

const row = (entita: string, entita_id: string): LogModificaWithProfileRow =>
  ({
    id: `${entita}-${entita_id}`,
    entita,
    entita_id,
    azione: "UPDATE",
    autore_id: null,
    payload: {},
    created_at: "2026-01-01T00:00:00.000Z",
    profiles: null,
  }) as LogModificaWithProfileRow;

const split = splitActivityFeedLogs([
  row("lavorazioni", "a"),
  row("magazzino_ricambi", "b"),
  row("preventivi", "c"),
  row("invoices", "d"),
]);
assert.equal(split.lavorazioni.length, 1);
assert.equal(split.magazzino.length, 1);
assert.equal(split.preventivi.length, 1);
assert.equal(split.fatturazione.length, 1);

console.log("log-modifiche-retention-partition.test.ts OK");
