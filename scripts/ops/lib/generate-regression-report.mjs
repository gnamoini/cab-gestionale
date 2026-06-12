/**
 * @param {Record<string, unknown>} diffResult
 */
export function generateRegressionReportMarkdown(diffResult) {
  const lines = [];
  lines.push("# Performance Regression Report");
  lines.push("");
  lines.push(`Generated: ${diffResult.generatedAt}`);
  lines.push("");

  lines.push("## P0 — Regressioni critiche");
  if (diffResult.failures?.length) {
    for (const f of diffResult.failures) {
      lines.push(`- **${f.route ?? f.metric}**: ${f.message}`);
      if (f.evidence) lines.push(`  - Evidenza: ${f.evidence}`);
      if (f.sourceFile) lines.push(`  - File: \`${f.sourceFile}\``);
      if (f.fix) lines.push(`  - Fix proposto: ${f.fix}`);
    }
  } else {
    lines.push("- Nessuna regressione critica.");
  }

  lines.push("");
  lines.push("## P1 — Regressioni importanti");
  if (diffResult.warnings?.length) {
    for (const w of diffResult.warnings) {
      lines.push(`- **${w.route ?? w.metric}**: ${w.message}`);
      if (w.evidence) lines.push(`  - Evidenza: ${w.evidence}`);
      if (w.sourceFile) lines.push(`  - File: \`${w.sourceFile}\``);
      if (w.fix) lines.push(`  - Fix proposto: ${w.fix}`);
    }
  } else {
    lines.push("- Nessun warning.");
  }

  lines.push("");
  lines.push("## P2 — Advisory (dev-only)");
  const p2 = diffResult.advisory ?? [];
  if (p2.length) {
    for (const a of p2) lines.push(`- ${a}`);
  } else {
    lines.push("- Nessun advisory da render/query frequency in questa run.");
  }

  lines.push("");
  lines.push("## Delta summary");
  if (diffResult.deltas?.length) {
    lines.push("");
    lines.push("| Route | Metric | Before | After | Delta % | Severity |");
    lines.push("|-------|--------|--------|-------|---------|----------|");
    for (const d of diffResult.deltas) {
      lines.push(
        `| ${d.route} | ${d.metric} | ${d.before} | ${d.after} | ${d.deltaPct ?? "n/a"}% | ${d.severity} |`,
      );
    }
  }

  lines.push("");
  return lines.join("\n");
}
