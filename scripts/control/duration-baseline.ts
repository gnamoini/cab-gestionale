#!/usr/bin/env npx tsx
/**
 * PR job duration baseline — p50/p95 via GitHub job API (not workflow wall time).
 * npm run control:duration:baseline [-- --days=30] [-- --out=control-duration-baseline.json]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type GhRun = { id: number; event: string; head_branch?: string };
type GhJob = {
  name: string;
  started_at: string | null;
  completed_at: string | null;
  conclusion: string | null;
};

function ghApi<T>(endpoint: string): T {
  const result = spawnSync("gh", ["api", endpoint], { encoding: "utf8", shell: true });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || `gh api failed`);
  return JSON.parse(result.stdout) as T;
}

function repoSlug(): string {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const r = spawnSync("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], {
    encoding: "utf8",
    shell: true,
  });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  throw new Error("GITHUB_REPOSITORY or gh repo required");
}

function workflowId(slug: string, fileName: string): number {
  const data = ghApi<{ workflows: { id: number; path: string }[] }>(`repos/${slug}/actions/workflows`);
  const wf = data.workflows.find((w) => w.path.endsWith(fileName));
  if (!wf) throw new Error(`Workflow ${fileName} not found`);
  return wf.id;
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

function collectJobDurations(slug: string, wfFile: string, jobName: string, maxRuns: number): number[] {
  const wfId = workflowId(slug, wfFile);
  const data = ghApi<{ workflow_runs: GhRun[] }>(
    `repos/${slug}/actions/workflows/${wfId}/runs?per_page=${maxRuns}&status=completed`,
  );
  const runs = (data.workflow_runs ?? []).filter((r) => r.event === "pull_request");
  const durations: number[] = [];
  for (const run of runs) {
    const jobs = ghApi<{ jobs: GhJob[] }>(`repos/${slug}/actions/runs/${run.id}/jobs`).jobs ?? [];
    const job = jobs.find((j) => j.name === jobName);
    if (job?.started_at && job.completed_at) {
      durations.push(new Date(job.completed_at).getTime() - new Date(job.started_at).getTime());
    }
  }
  return durations.sort((a, b) => a - b);
}

function fmt(ms: number | null): string {
  if (ms === null) return "—";
  return `${(ms / 60_000).toFixed(1)}m`;
}

function main(): void {
  const days = Number(process.argv.find((a) => a.startsWith("--days="))?.split("=")[1] ?? "30");
  const outPath =
    process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] ??
    "control-duration-baseline.json";
  const maxRuns = Math.min(100, Math.max(20, days * 3));

  const slug = repoSlug();
  const legacy = collectJobDurations(slug, "release-gate.yml", "release-gate", maxRuns);
  const control = collectJobDurations(slug, "control-pr.yml", "control-pr", maxRuns);

  const legacyP50 = percentile(legacy, 0.5);
  const legacyP95 = percentile(legacy, 0.95);
  const controlP50 = percentile(control, 0.5);
  const controlP95 = percentile(control, 0.95);

  const deltaP50 =
    legacyP50 !== null && controlP50 !== null ? controlP50 - legacyP50 : null;
  const ratioP95 =
    legacyP95 && controlP95 && legacyP95 > 0 ? controlP95 / legacyP95 : null;

  const report = {
    generatedAt: new Date().toISOString(),
    repository: slug,
    windowDays: days,
    releaseGate: { job: "release-gate", n: legacy.length, p50Ms: legacyP50, p95Ms: legacyP95 },
    controlPr: { job: "control-pr", n: control.length, p50Ms: controlP50, p95Ms: controlP95 },
    deltaP50Ms: deltaP50,
    p95Ratio: ratioP95,
    targets: {
      controlPrP50MaxMs: 15 * 60_000,
      p95RegressionMaxRatio: 1.2,
    },
    warnings: [] as string[],
  };

  if (controlP50 !== null && controlP50 > report.targets.controlPrP50MaxMs) {
    report.warnings.push(`control-pr p50 ${fmt(controlP50)} > 15m target`);
  }
  if (ratioP95 !== null && ratioP95 > report.targets.p95RegressionMaxRatio) {
    report.warnings.push(`p95 ratio ${ratioP95.toFixed(2)} > 1.2`);
  }

  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log("control:duration:baseline");
  console.log(`  release-gate  p50=${fmt(legacyP50)} p95=${fmt(legacyP95)} (n=${legacy.length})`);
  console.log(`  control-pr    p50=${fmt(controlP50)} p95=${fmt(controlP95)} (n=${control.length})`);
  if (deltaP50 !== null) console.log(`  delta p50     ${fmt(deltaP50)}`);
  if (ratioP95 !== null) console.log(`  p95 ratio     ${ratioP95.toFixed(2)}`);
  for (const w of report.warnings) console.log(`  WARN: ${w}`);
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
}

main();
