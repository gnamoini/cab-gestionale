/**
 * Read-only EXPLAIN ANALYZE audit via `supabase db query --linked`.
 * Usage: node scripts/ops/db-performance-explain-audit.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildExplainQueries, SAMPLE_CLIENTE } from "./lib/explain-queries.mjs";
import { runExplainQuery } from "./lib/parseExplain.mjs";
import { runSql } from "./lib/runSql.mjs";

const QUERIES = buildExplainQueries(SAMPLE_CLIENTE);

const tableStats = runSql(
  `SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE relname IN ('lavorazioni','mezzi','magazzino_ricambi','movimenti_ricambi','preventivi','documenti','scheda_lavorazione','log_modifiche','app_settings') ORDER BY 1`,
);

const results = [];
for (const q of QUERIES) {
  results.push({
    ...q,
    withoutRls: runExplainQuery(runSql, q, false),
    withRls: runExplainQuery(runSql, q, true),
  });
}

const out = {
  generatedAt: new Date().toISOString(),
  projectRef: "oxmnuovsgenqkuwfolqh",
  migration: "20260711120000_db_performance_indexes",
  tableStats: tableStats.rows,
  sampleCliente: SAMPLE_CLIENTE,
  results,
};

const outDir = join(process.cwd(), "test-results");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "explain-audit-raw.json"), JSON.stringify(out, null, 2));
process.stdout.write(JSON.stringify(out, null, 2));
