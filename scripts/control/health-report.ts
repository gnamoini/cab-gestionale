#!/usr/bin/env npx tsx
/**
 * Control Health Dashboard — snapshot + reliability score (Sprint 8)
 * npm run control:health [-- report.json]
 * npm run control:health:reliability [-- history-dir]
 */
import fs from "node:fs";
import path from "node:path";
import { CONTROL_REGISTRY } from "@/lib/control/registry";
import { sortControlsByDependencies } from "@/lib/control/graph";

type ControlReport = {
  context: { runId: string; timestamp: string };
  results: { controlId: string; outcome: string; durationMs: number }[];
  summary?: { pass: number; fail: number; warning: number };
};

type RunHistory = { controlId: string; outcome: string; runId: string }[];

function collectBlockedBy(failedId: string): string[] {
  const blocked: string[] = [];
  for (const c of CONTROL_REGISTRY) {
    if (c.dependsOn?.includes(failedId)) blocked.push(c.id);
  }
  for (const c of CONTROL_REGISTRY) {
    for (const dep of c.dependsOn ?? []) {
      if (blocked.includes(dep) && !blocked.includes(c.id)) blocked.push(c.id);
    }
  }
  return blocked;
}

function loadHistory(dir: string): RunHistory {
  if (!fs.existsSync(dir)) return [];
  const entries: RunHistory = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    try {
      const report = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as ControlReport;
      for (const r of report.results) {
        entries.push({ controlId: r.controlId, outcome: r.outcome, runId: report.context.runId });
      }
    } catch {
      /* skip corrupt */
    }
  }
  return entries;
}

function reliabilityScore(controlId: string, history: RunHistory, lastRun?: ControlReport): number {
  const runs = history.filter((h) => h.controlId === controlId);
  const total = runs.length || 1;
  const successful = runs.filter((r) => r.outcome === "pass").length;
  let base = (successful / total) * 100;

  const flakes = runs.filter((r, i) => i > 0 && r.outcome !== runs[i - 1].outcome).length;
  const flakeRate = total > 1 ? flakes / (total - 1) : 0;
  if (flakeRate > 0.05) base -= 20;

  const last10 = runs.slice(-10);
  if (last10.some((r) => r.outcome === "fail" || r.outcome === "blocked")) base -= 20;

  const last = lastRun?.results.find((r) => r.controlId === controlId);
  if (last && last.durationMs > 120_000) base -= 10;

  return Math.max(0, Math.min(100, Math.round(base)));
}

function main(): void {
  const reliabilityMode = process.argv.includes("--reliability");
  const reportPath = process.argv.find((a) => !a.startsWith("-") && a.endsWith(".json")) ?? "control-report.json";
  const historyDir =
    process.argv.find((a) => a.startsWith("--history="))?.split("=")[1] ?? "control-health/history";

  if (!fs.existsSync(reportPath)) {
    console.error(`Missing ${reportPath} — run control:pr first`);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as ControlReport;
  const outDir = path.join(process.cwd(), "control-health");
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(historyDir, { recursive: true });
  fs.copyFileSync(reportPath, path.join(historyDir, `${report.context.runId}.json`));

  const history = loadHistory(historyDir);

  if (reliabilityMode) {
    console.log("# Control Reliability (0-100)\n");
    for (const r of report.results) {
      const meta = CONTROL_REGISTRY.find((c) => c.id === r.controlId);
      const score = reliabilityScore(r.controlId, history, report);
      const runs = history.filter((h) => h.controlId === r.controlId);
      const ok = runs.filter((h) => h.outcome === "pass").length;
      console.log(`${r.controlId}  Reliability: ${score}`);
      console.log(`  success: ${ok}/${runs.length || 1}  outcome: ${r.outcome}`);
      if (meta?.impact?.length) console.log(`  impact: ${meta.impact.join(", ")}`);
      if (r.outcome === "fail" || r.outcome === "blocked") {
        const blocked = collectBlockedBy(r.controlId);
        if (blocked.length) console.log(`  blocked downstream: ${blocked.join(", ")}`);
      }
      console.log("");
    }
    return;
  }

  const lines: string[] = [
    "# Control Health Snapshot",
    "",
    `Run: ${report.context.runId}`,
    `At: ${report.context.timestamp}`,
    "",
    "## Blast radius (control-level)",
    "",
  ];

  for (const r of report.results.filter((x) => x.outcome === "fail" || x.outcome === "blocked")) {
    const meta = CONTROL_REGISTRY.find((c) => c.id === r.controlId);
    const blocked = collectBlockedBy(r.controlId);
    lines.push(`- **${r.controlId}** failed → blocked: ${blocked.length ? blocked.join(", ") : "none"}`);
    if (meta?.impact?.length) lines.push(`  - impact: ${meta.impact.join(", ")}`);
  }

  lines.push("", "| Control | Outcome | Reliability | Duration | Impact |", "|---------|---------|-------------|----------|--------|");

  for (const r of report.results) {
    const meta = CONTROL_REGISTRY.find((c) => c.id === r.controlId);
    const impact = meta?.impact.join(", ") ?? "—";
    const rel = reliabilityScore(r.controlId, history, report);
    lines.push(`| \`${r.controlId}\` | ${r.outcome} | ${rel} | ${r.durationMs}ms | ${impact} |`);
  }

  const outFile = path.join(outDir, `health-${report.context.runId}.md`);
  fs.writeFileSync(outFile, `${lines.join("\n")}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);

  const order = sortControlsByDependencies(CONTROL_REGISTRY.filter((c) => c.tier === "pr"));
  console.log(`PR tier execution order (${order.length} controls)`);
}

main();
