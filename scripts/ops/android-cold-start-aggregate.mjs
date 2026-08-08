#!/usr/bin/env node
/**
 * Aggregate android-cold-start JSON runs into summary.json (medians per bucket).
 *
 * Usage: node scripts/ops/android-cold-start-aggregate.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IN_DIR = path.join(ROOT, "test-results", "android-cold-start");
const OUT_FILE = path.join(IN_DIR, "summary.json");

function median(nums) {
  const sorted = [...nums].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function readReports() {
  if (!fs.existsSync(IN_DIR)) return [];
  return fs
    .readdirSync(IN_DIR)
    .filter((f) => f.endsWith(".json") && f !== "summary.json")
    .map((f) => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(IN_DIR, f), "utf8"));
        return { file: f, ...raw };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function extract(report) {
  const r = report.report ?? report;
  if (!r?.buckets) return null;
  return {
    nativeLaunchGap: r.buckets.nativeLaunchGap?.estimatedMs ?? null,
    webStartup: r.buckets.webStartup?.durationMs ?? null,
    applicationStartup: r.buckets.applicationStartup?.durationMs ?? null,
    staticToDismiss:
      r.staticToReactSequence?.measures?.static_hidden_to_dismiss ??
      r.staticToReactSequence?.measures?.boot_mount_to_static_hidden ??
      null,
    perceivedMs: report.perceivedMs ?? null,
    scenario: report.scenario ?? null,
    route: report.route ?? r.meta?.route ?? null,
  };
}

function main() {
  const reports = readReports();
  const rows = reports.map(extract).filter(Boolean);

  const byKey = new Map();
  for (const row of rows) {
    const key = `${row.scenario ?? "unknown"}|${row.route ?? "unknown"}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }

  const groups = {};
  for (const [key, items] of byKey.entries()) {
    groups[key] = {
      count: items.length,
      medians: {
        nativeLaunchGap: median(items.map((i) => i.nativeLaunchGap)),
        webStartup: median(items.map((i) => i.webStartup)),
        applicationStartup: median(items.map((i) => i.applicationStartup)),
        staticToDismiss: median(items.map((i) => i.staticToDismiss)),
        perceivedMs: median(items.map((i) => i.perceivedMs)),
      },
    };
  }

  const summary = {
    aggregatedAt: new Date().toISOString(),
    inputFiles: reports.length,
    groups,
    note: "nativeLaunchGap is estimated only; do not use for web optimization attribution",
  };

  fs.mkdirSync(IN_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(summary, null, 2));
  console.log(`Wrote ${OUT_FILE} (${reports.length} reports)`);
}

main();
