/**
 * Slow Query Observatory — orchestrator.
 * Usage: node scripts/ops/slow-query-audit.mjs
 * Output: test-results/slow-query-audit.json, docs/slow-query-audit.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildExplainQueries, RLS_QUERY_IDS } from "./lib/explain-queries.mjs";
import { generateAuditMarkdown } from "./lib/generate-audit-md.mjs";
import { collectPgStatStatements, collectTableStats } from "./lib/pg-stat-statements.mjs";
import { runExplainQuery } from "./lib/parseExplain.mjs";
import { runRestBenchmarkSubset } from "./lib/rest-benchmark-subset.mjs";
import { canRunLinkedDb, runSql } from "./lib/runSql.mjs";

const ROOT = process.cwd();
const RESULTS_DIR = join(ROOT, "test-results");
const BASELINE_PATH = join(RESULTS_DIR, "slow-query-audit-baseline.json");
const OUTPUT_PATH = join(RESULTS_DIR, "slow-query-audit.json");
const DOC_PATH = join(ROOT, "docs", "slow-query-audit.md");
const INVENTORY_PATH = join(ROOT, "scripts", "ops", "query-inventory.json");

const REGRESSION_THRESHOLD_PCT = 10;

function loadJson(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function pctDelta(before, after) {
  if (before == null || after == null || before === 0) return null;
  return Math.round(((after - before) / before) * 1000) / 10;
}

function buildSeqScanFindings(explainResults, tableStats, threshold) {
  const rowsByTable = Object.fromEntries((tableStats ?? []).map((t) => [t.relname, Number(t.n_live_tup)]));
  const findings = [];
  for (const q of explainResults) {
    const withRls = q.withRls;
    if (!withRls?.ok || !withRls.seqScan) continue;
    const tableByScreen = {
      lavorazioni: "lavorazioni",
      mezzi: "mezzi",
      magazzino: "magazzino_ricambi",
      report: "movimenti_ricambi",
      hub_mezzo: "movimenti_ricambi",
      schede: "scheda_lavorazione",
      hub: "log_modifiche",
      settings: "app_settings",
      portale: "lavorazioni",
      preventivi: "preventivi",
      documenti: "documenti",
    };
    const table = tableByScreen[q.screen] ?? q.screen;
    const liveRows = rowsByTable[table];
    const note =
      liveRows != null && liveRows < threshold
        ? `Seq scan OK — ${liveRows} rows < threshold ${threshold}`
        : "Review index coverage";
    findings.push({
      id: q.id,
      label: q.label,
      liveRows: liveRows ?? null,
      executionTimeMs: withRls.executionTimeMs,
      note,
      actionable: liveRows != null && liveRows >= threshold,
    });
  }
  return findings;
}

function buildProposedIndexes(seqScanFindings, explainResults) {
  const proposals = [];
  for (const f of seqScanFindings.filter((x) => x.actionable)) {
    const q = explainResults.find((r) => r.id === f.id);
    if (!q) continue;
    proposals.push({
      queryId: f.id,
      indexProposal: q.expectedIndex,
      rationale: `Seq scan on ~${f.liveRows} rows; execution ${f.executionTimeMs}ms with RLS`,
    });
  }
  return proposals;
}

function buildRlsOverhead(explainResults) {
  return explainResults
    .filter((q) => RLS_QUERY_IDS.includes(q.id))
    .map((q) => {
      const noRls = q.withoutRls?.executionTimeMs;
      const withRls = q.withRls?.executionTimeMs;
      const overheadPct =
        noRls != null && withRls != null && noRls > 0
          ? Math.round(((withRls - noRls) / noRls) * 1000) / 10
          : null;
      return {
        id: q.id,
        label: q.label,
        withoutRlsMs: noRls,
        withRlsMs: withRls,
        overheadPct,
      };
    });
}

function rankHotspots(audit) {
  const p0 = [];
  const p1 = [];
  const p2 = [];

  for (const f of audit.seqScanFindings?.filter((x) => x.actionable) ?? []) {
    p0.push(`${f.id} ${f.label}: seq scan su ${f.liveRows} righe — verificare indice (${f.executionTimeMs}ms)`);
  }

  const appPgStat = (audit.pgStatStatements?.topByMeanTime ?? []).filter((r) =>
    /pgrst_source|public\.(lavorazioni|mezzi|magazzino|movimenti|preventivi|documenti|scheda|log_modifiche|app_settings)/i.test(
      String(r.query_prefix ?? ""),
    ),
  );
  const topMeanApp = appPgStat[0];
  if (topMeanApp && Number(topMeanApp.mean_exec_time_ms) >= 5) {
    p1.push(
      `pg_stat app: ${String(topMeanApp.query_prefix).slice(0, 60)} — mean ${topMeanApp.mean_exec_time_ms}ms (${topMeanApp.calls} calls)`,
    );
  }

  for (const r of audit.restBenchmark?.results ?? []) {
    if (r.bytesKb >= 100) {
      p1.push(`REST payload ${r.id}: ${r.bytesKb} KB (${r.rowCount} rows)`);
    }
    if (r.wallMs >= 300) {
      p1.push(`REST latency ${r.id}: ${r.wallMs}ms`);
    }
  }

  const freqAvoidable = audit.frequencyAudit?.filter((q) => q.avoidable) ?? [];
  for (const q of freqAvoidable) {
    p2.push(`${q.area}/${q.label}: fetch evitabile (${q.notes ?? "hub BFF o duplicazione"})`);
  }

  p2.push("RLS rbac_can_read_row O(n) su liste — refactor solo con evidenza produzione");
  p2.push("Hub modali BFF server — ROI insufficiente (documentato)");

  return { p0, p1, p2 };
}

function compareBaseline(current, baseline) {
  if (!baseline?.explainSummary) return { baselineComparison: [], regressions: [] };
  const comparisons = [];
  const regressions = [];
  for (const q of current.explainResults ?? []) {
    const prev = baseline.explainSummary.find((b) => b.id === q.id);
    if (!prev) continue;
    const after = q.withRls?.executionTimeMs;
    const before = prev.withRlsMs;
    const delta = pctDelta(before, after);
    if (delta != null) {
      comparisons.push({ metric: `${q.id} execution_ms`, before, after, deltaPct: delta });
      if (delta > REGRESSION_THRESHOLD_PCT) {
        regressions.push(`${q.id} execution +${delta}% vs baseline (${before}→${after}ms)`);
      }
    }
  }
  return { baselineComparison: comparisons, regressions };
}

async function main() {
  const warnings = [];
  const inventory = loadJson(INVENTORY_PATH);
  const seqScanThreshold = inventory?.seqScanRowThreshold ?? 500;

  const linkedDbAvailable = canRunLinkedDb();
  if (!linkedDbAvailable) {
    warnings.push("Supabase linked DB non disponibile — audit parziale da snapshot esistenti");
  }

  const explainQueries = buildExplainQueries();
  let explainResults = [];
  let tableStats = [];
  let pgStatStatements = null;

  if (linkedDbAvailable) {
    try {
      tableStats = collectTableStats(runSql);
    } catch (e) {
      warnings.push(`table stats: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      pgStatStatements = collectPgStatStatements(runSql);
    } catch (e) {
      warnings.push(`pg_stat_statements: ${e instanceof Error ? e.message : String(e)}`);
      const fallback = loadJson(join(RESULTS_DIR, "explain-audit-raw.json"));
      if (fallback) warnings.push("Usare snapshot storici in test-results/ per confronto manuale");
    }

    explainResults = explainQueries.map((q) => ({
      ...q,
      withoutRls: runExplainQuery(runSql, q, false),
      withRls: runExplainQuery(runSql, q, true),
    }));
  } else {
    const fallback = loadJson(join(RESULTS_DIR, "explain-audit-raw.json"));
    if (fallback?.results) {
      explainResults = fallback.results;
      tableStats = fallback.tableStats ?? [];
      warnings.push("EXPLAIN da explain-audit-raw.json (fallback)");
    }
  }

  const seqScanFindings = buildSeqScanFindings(explainResults, tableStats, seqScanThreshold);
  const proposedIndexes = buildProposedIndexes(seqScanFindings, explainResults);
  const rlsOverhead = buildRlsOverhead(explainResults);

  let restBenchmark = { ok: false, results: [] };
  try {
    restBenchmark = await runRestBenchmarkSubset();
    if (!restBenchmark.ok) warnings.push(`REST benchmark: ${restBenchmark.error}`);
  } catch (e) {
    warnings.push(`REST benchmark: ${e instanceof Error ? e.message : String(e)}`);
    const fallback = loadJson(join(RESULTS_DIR, "rest-benchmark-roles.json"));
    if (fallback?.benchmarks?.[0]?.sequential) {
      restBenchmark = {
        ok: true,
        results: fallback.benchmarks[0].sequential.slice(0, 5).map((r) => ({
          id: r.name,
          rowCount: r.rowCount,
          bytesKb: Math.round((r.bytesRaw / 1024) * 100) / 100,
          wallMs: r.wallMs,
        })),
        source: "rest-benchmark-roles.json fallback",
      };
      warnings.push("REST da rest-benchmark-roles.json (fallback)");
    }
  }

  const frequencyAudit = (inventory?.queries ?? []).map((q) => ({
    area: q.area,
    label: q.label,
    necessary: q.necessary,
    duplicated: q.duplicated,
    avoidable: q.avoidable,
    notes: q.notes ?? null,
  }));

  const explainSummary = explainResults.map((q) => ({
    id: q.id,
    label: q.label,
    withRlsMs: q.withRls?.executionTimeMs ?? null,
    withoutRlsMs: q.withoutRls?.executionTimeMs ?? null,
    seqScan: q.withRls?.seqScan ?? null,
    indexesUsed: q.withRls?.indexesUsed ?? [],
  }));

  const audit = {
    generatedAt: new Date().toISOString(),
    linkedDbAvailable,
    warnings,
    inventoryVersion: inventory?.version ?? null,
    tableStats,
    pgStatStatements,
    explainResults: explainSummary,
    seqScanFindings,
    proposedIndexes,
    rlsOverhead,
    restBenchmark,
    frequencyAudit,
    residualIssues: [],
    recommendations: [],
  };

  audit.hotspots = rankHotspots(audit);

  if (audit.hotspots.p0.length === 0) {
    audit.residualIssues.push("Nessun seq scan azionabile sopra soglia righe in questa run");
  }
  if (pgStatStatements?.topByMeanTime?.[0]) {
    audit.residualIssues.push(
      `Monitorare: ${String(pgStatStatements.topByMeanTime[0].query_prefix).slice(0, 80)} (mean ${pgStatStatements.topByMeanTime[0].mean_exec_time_ms}ms)`,
    );
  }

  audit.p0OptimizationsApplied = [];

  audit.recommendations = [
    ...(audit.hotspots.p0.length ? audit.hotspots.p0 : []),
    ...(audit.hotspots.p1.length ? audit.hotspots.p1.slice(0, 3) : []),
    "Eseguire npm run ops:slow-query-audit post-deploy e confrontare con baseline",
    "Non aggiungere indici senza EXPLAIN before/after su dataset rappresentativo",
  ];

  const baseline = loadJson(BASELINE_PATH);
  const { baselineComparison, regressions } = compareBaseline(audit, baseline);
  audit.baselineComparison = baselineComparison;
  audit.regressions = regressions;

  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(audit, null, 2));

  if (!existsSync(BASELINE_PATH)) {
    writeFileSync(BASELINE_PATH, JSON.stringify({ ...audit, isBaseline: true }, null, 2));
    warnings.push("Creata baseline in test-results/slow-query-audit-baseline.json");
  }

  const md = generateAuditMarkdown(audit);
  writeFileSync(DOC_PATH, md);

  console.log(`slow-query-audit: wrote ${OUTPUT_PATH}`);
  console.log(`slow-query-audit: wrote ${DOC_PATH}`);
  if (regressions.length) {
    console.error("REGRESSIONS:", regressions.join("; "));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
