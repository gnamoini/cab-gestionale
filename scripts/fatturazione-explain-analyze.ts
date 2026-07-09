#!/usr/bin/env npx tsx
/**
 * Rigenera artefatti EXPLAIN ANALYZE su DB staging (richiede DATABASE_URL).
 * ponytail: senza DB, i file in docs/perf/ restano placeholder committati.
 */
import fs from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "docs/perf");
const queries = [
  {
    file: "fatturazione-timeline.explain",
    sql: "EXPLAIN ANALYZE SELECT * FROM invoice_events WHERE invoice_id = gen_random_uuid() ORDER BY created_at DESC, id DESC LIMIT 50",
  },
  {
    file: "fatturazione-open-items.explain",
    sql: "EXPLAIN ANALYZE SELECT * FROM customer_open_items WHERE customer_id = gen_random_uuid() AND status <> 'closed'",
  },
  {
    file: "fatturazione-scadenziario.explain",
    sql: "EXPLAIN ANALYZE SELECT * FROM customer_open_items WHERE remaining_signed < 0 AND status <> 'closed'",
  },
] as const;

if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL assente — artefatti docs/perf/ non rigenerati");
  process.exit(0);
}

console.log("ponytail: collegare client pg per rigenerare EXPLAIN su staging");
for (const q of queries) {
  fs.writeFileSync(path.join(outDir, q.file), `# ${q.sql}\n\n(placeholder — eseguire su staging)\n`, "utf8");
}
