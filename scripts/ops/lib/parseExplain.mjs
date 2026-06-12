export function collectIndexes(node, acc = []) {
  if (!node || typeof node !== "object") return acc;
  if (node["Index Name"]) acc.push(node["Index Name"]);
  for (const child of node.Plans ?? []) collectIndexes(child, acc);
  return acc;
}

export function hasSeqScan(node) {
  if (!node) return false;
  if (node["Node Type"] === "Seq Scan") return true;
  return (node.Plans ?? []).some(hasSeqScan);
}

export function collectFilters(node, acc = []) {
  if (!node || typeof node !== "object") return acc;
  if (node["Filter"]) acc.push(node["Filter"]);
  for (const child of node.Plans ?? []) collectFilters(child, acc);
  return acc;
}

export function summarizePlan(node, depth = 0) {
  if (!node) return "";
  const pad = "  ".repeat(depth);
  const idx = node["Index Name"] ? ` [${node["Index Name"]}]` : "";
  const rows = node["Actual Rows"] ?? node["Plan Rows"] ?? "?";
  let out = `${pad}${node["Node Type"]} actual_rows=${rows}${idx}\n`;
  for (const child of node.Plans ?? []) out += summarizePlan(child, depth + 1);
  return out;
}

export function parseExplain(payload) {
  const row = payload.rows?.[0];
  const key = row ? Object.keys(row).find((k) => k.toUpperCase().includes("QUERY PLAN")) : null;
  const planRoot = key ? row[key]?.[0] : null;
  const root = planRoot?.Plan;
  const indexes = [...new Set(collectIndexes(root))];
  const filters = collectFilters(root);
  return {
    executionTimeMs: planRoot?.["Execution Time"] ?? null,
    planningTimeMs: planRoot?.["Planning Time"] ?? null,
    nodeType: root?.["Node Type"] ?? null,
    actualRows: root?.["Actual Rows"] ?? null,
    planRows: root?.["Plan Rows"] ?? null,
    indexesUsed: indexes,
    seqScan: hasSeqScan(root),
    filters,
    hasRbacFilter: filters.some((f) => /rbac_can_read_row|rbac_module_can|rbac_has_capability/i.test(String(f))),
    planSummary: summarizePlan(root).trim(),
  };
}

export function runExplainQuery(runSql, q, rls = false) {
  const prefix = rls ? `BEGIN; SET LOCAL row_security = on; ` : `BEGIN; SET LOCAL row_security = off; `;
  const sql = `${prefix}EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${q.sql}; COMMIT;`;
  try {
    const payload = runSql(sql);
    return { ok: true, ...parseExplain(payload) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
