/**
 * @param {Record<string, unknown>} audit
 */
export function generateAuditMarkdown(audit) {
  const lines = [];
  lines.push("# Slow Query Audit Report");
  lines.push("");
  lines.push(`Generated: ${audit.generatedAt}`);
  lines.push(`Linked DB available: ${audit.linkedDbAvailable ? "yes" : "no"}`);
  if (audit.warnings?.length) {
    lines.push("");
    lines.push("## Warnings");
    for (const w of audit.warnings) lines.push(`- ${w}`);
  }

  lines.push("");
  lines.push("## 1. Top query lente (pg_stat_statements)");
  const appQueries = (rows) =>
    (rows ?? []).filter((r) => /pgrst_source|public\.(lavorazioni|mezzi|magazzino|movimenti|preventivi|documenti|scheda|log_modifiche|app_settings)/i.test(String(r.query_prefix ?? "")));

  const topMeanApp = appQueries(audit.pgStatStatements?.topByMeanTime);
  const topTotalApp = appQueries(audit.pgStatStatements?.topByTotalTime);

  if (topMeanApp.length) {
    lines.push("");
    lines.push("_Filtrate query applicative PostgREST (escluse metadata Supabase)._");
    lines.push("");
    lines.push("| Rank | Query prefix | Calls | Mean ms | Total ms |");
    lines.push("|------|--------------|-------|---------|----------|");
    topMeanApp.slice(0, 10).forEach((row, i) => {
      lines.push(
        `| ${i + 1} | ${String(row.query_prefix ?? "").replace(/\|/g, "\\|").slice(0, 80)} | ${row.calls} | ${row.mean_exec_time_ms} | ${row.total_exec_time_ms} |`,
      );
    });
  } else {
    lines.push("");
    lines.push("_pg_stat_statements non disponibile o DB non collegato._");
  }

  lines.push("");
  lines.push("## 2. Query più frequenti (pg_stat_statements by calls)");
  if (topTotalApp.length) {
    lines.push("");
    lines.push("| Rank | Query prefix | Calls | Total ms |");
    lines.push("|------|--------------|-------|----------|");
    const byCalls = [...topTotalApp].sort(
      (a, b) => Number(b.calls) - Number(a.calls),
    );
    byCalls.slice(0, 10).forEach((row, i) => {
      lines.push(
        `| ${i + 1} | ${String(row.query_prefix ?? "").replace(/\|/g, "\\|").slice(0, 80)} | ${row.calls} | ${row.total_exec_time_ms} |`,
      );
    });
  }

  lines.push("");
  lines.push("## 3. Seq scan rilevati (EXPLAIN)");
  if (audit.seqScanFindings?.length) {
    lines.push("");
    lines.push("| Query | Table rows | Seq scan | Execution ms (RLS on) | Note |");
    lines.push("|-------|------------|----------|----------------------|------|");
    for (const f of audit.seqScanFindings) {
      lines.push(
        `| ${f.id} ${f.label} | ${f.liveRows ?? "?"} | yes | ${f.executionTimeMs ?? "?"} | ${f.note ?? ""} |`,
      );
    }
  } else {
    lines.push("");
    lines.push("_Nessun seq scan problematico sopra soglia righe._");
  }

  lines.push("");
  lines.push("## 4. Indici mancanti proposti");
  if (audit.proposedIndexes?.length) {
    for (const p of audit.proposedIndexes) {
      lines.push(`- **${p.queryId}**: ${p.indexProposal} — ${p.rationale}`);
    }
  } else {
    lines.push("");
    lines.push("_Nessun nuovo indice proposto senza evidenza EXPLAIN._");
  }

  lines.push("");
  lines.push("## 5. Overhead RLS");
  if (audit.rlsOverhead?.length) {
    lines.push("");
    lines.push("| Query | No RLS ms | RLS on ms | Overhead % |");
    lines.push("|-------|----------|-----------|------------|");
    for (const r of audit.rlsOverhead) {
      lines.push(`| ${r.id} ${r.label} | ${r.withoutRlsMs} | ${r.withRlsMs} | ${r.overheadPct}% |`);
    }
  } else {
    lines.push("");
    lines.push("_Dati RLS non disponibili._");
  }

  lines.push("");
  lines.push("## 6. Ottimizzazioni già applicate");
  lines.push("- ROI waterfall: preventivi embed mezzi (−1 query), report DTO server, movimenti mezzo join");
  lines.push("- Migration `20260711120000_db_performance_indexes` (trgm, stato/archived, movimenti ricambio)");
  lines.push("- `idx_log_modifiche_entita_entita_id_created_at` su hub log");
  if (audit.p0OptimizationsApplied?.length) {
    for (const o of audit.p0OptimizationsApplied) lines.push(`- **P0 applicato**: ${o}`);
  } else {
    lines.push("- **P0 in questa run**: nessuna migration/indice aggiunto (seq scan sotto soglia righe o indici già presenti)");
  }

  lines.push("");
  lines.push("## 7. Benchmark before/after (vs baseline)");
  if (audit.baselineComparison?.length) {
    lines.push("");
    lines.push("| Metric | Before | After | Delta % |");
    lines.push("|--------|--------|-------|---------|");
    for (const c of audit.baselineComparison) {
      lines.push(`| ${c.metric} | ${c.before} | ${c.after} | ${c.deltaPct}% |`);
    }
  } else if (audit.regressions?.length) {
    lines.push("");
    for (const r of audit.regressions) lines.push(`- REGRESSION: ${r}`);
  } else {
    lines.push("");
    lines.push("_Prima baseline o nessuna regressione >10%._");
  }

  lines.push("");
  lines.push("## 8. Query frequency audit");
  if (audit.frequencyAudit?.length) {
    lines.push("");
    lines.push("| Area | Query | Necessaria | Duplicata | Evitabile |");
    lines.push("|------|-------|------------|-----------|-----------|");
    for (const q of audit.frequencyAudit) {
      lines.push(
        `| ${q.area} | ${q.label} | ${q.necessary ? "sì" : "no"} | ${q.duplicated ? "sì" : "no"} | ${q.avoidable ? "sì" : "no"} |`,
      );
    }
  }

  lines.push("");
  lines.push("## 9. Payload audit (REST subset)");
  if (audit.restBenchmark?.results?.length) {
    lines.push("");
    lines.push("| Query | Rows | KB | Wall ms |");
    lines.push("|-------|------|-----|---------|");
    for (const r of audit.restBenchmark.results) {
      lines.push(`| ${r.id} | ${r.rowCount} | ${r.bytesKb} | ${r.wallMs} |`);
    }
  }

  lines.push("");
  lines.push("## 10. Hotspot ranking");
  if (audit.hotspots?.p0?.length) {
    lines.push("");
    lines.push("### P0");
    for (const h of audit.hotspots.p0) lines.push(`- ${h}`);
  }
  if (audit.hotspots?.p1?.length) {
    lines.push("");
    lines.push("### P1");
    for (const h of audit.hotspots.p1) lines.push(`- ${h}`);
  }
  if (audit.hotspots?.p2?.length) {
    lines.push("");
    lines.push("### P2");
    for (const h of audit.hotspots.p2) lines.push(`- ${h}`);
  }

  lines.push("");
  lines.push("## 11. Problemi residui");
  if (audit.residualIssues?.length) {
    for (const i of audit.residualIssues) lines.push(`- ${i}`);
  } else {
    lines.push("- Nessun blocco critico emerso in questa run.");
  }

  lines.push("");
  lines.push("## 12. Raccomandazioni future (ROI)");
  if (audit.recommendations?.length) {
    for (const r of audit.recommendations) lines.push(`1. ${r}`);
  }

  lines.push("");
  return lines.join("\n");
}
