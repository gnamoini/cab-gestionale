#!/usr/bin/env npx tsx
/**
 * Aggregate shadow cutover records — SHA-first correlation via GitHub API.
 * npm run control:shadow-report [-- --gate] [-- --limit=20] [-- --out=report.json]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  countConsecutiveGreenFromNewest,
  type ShadowCutoverRecord,
} from "@/lib/control/shadow-correlation";

type GhRun = {
  id: number;
  head_sha: string;
  conclusion: string | null;
  pull_requests?: { number: number }[];
  event: string;
  created_at: string;
};

type GhJob = {
  name: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
};

function ghApi<T>(endpoint: string): T {
  const result = spawnSync("gh", ["api", endpoint, "--paginate"], {
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `gh api failed: ${endpoint}`);
  }
  const raw = result.stdout.trim();
  if (!raw) return [] as T;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed as T;
  } catch {
    const lines = raw.split("\n").filter(Boolean);
    return lines.map((l) => JSON.parse(l)) as T;
  }
}

function repoSlug(): string {
  const env = process.env.GITHUB_REPOSITORY;
  if (env) return env;
  const r = spawnSync("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], {
    encoding: "utf8",
    shell: true,
  });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  throw new Error("Set GITHUB_REPOSITORY or run from a gh-linked repo");
}

function workflowId(slug: string, fileName: string): number {
  const data = ghApi<{ workflows: { id: number; path: string }[] }>(`repos/${slug}/actions/workflows`);
  const wf = data.workflows.find((w) => w.path.endsWith(fileName));
  if (!wf) throw new Error(`Workflow not found: ${fileName}`);
  return wf.id;
}

function listRuns(slug: string, wfId: number, perPage = 100): GhRun[] {
  const data = ghApi<{ workflow_runs: GhRun[] }>(
    `repos/${slug}/actions/workflows/${wfId}/runs?per_page=${perPage}&status=completed`,
  );
  return data.workflow_runs ?? (Array.isArray(data) ? (data as GhRun[]) : []);
}

function jobDurationMs(jobs: GhJob[], jobName: string): number | null {
  const job = jobs.find((j) => j.name === jobName);
  if (!job?.started_at || !job.completed_at) return null;
  return new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
}

function runJobs(slug: string, runId: number): GhJob[] {
  const data = ghApi<{ jobs: GhJob[] }>(`repos/${slug}/actions/runs/${runId}/jobs`);
  return data.jobs ?? [];
}

function prNumber(run: GhRun): number | null {
  return run.pull_requests?.[0]?.number ?? null;
}

function buildRecords(slug: string, limit: number): ShadowCutoverRecord[] {
  const legacyWf = workflowId(slug, "release-gate.yml");
  const controlWf = workflowId(slug, "control-pr.yml");

  const legacyRuns = listRuns(slug, legacyWf, 150).filter((r) => r.event === "pull_request");
  const controlRuns = listRuns(slug, controlWf, 150).filter((r) => r.event === "pull_request");

  const legacyBySha = new Map<string, GhRun>();
  for (const run of legacyRuns) {
    if (!legacyBySha.has(run.head_sha)) legacyBySha.set(run.head_sha, run);
  }
  const controlBySha = new Map<string, GhRun>();
  for (const run of controlRuns) {
    if (!controlBySha.has(run.head_sha)) controlBySha.set(run.head_sha, run);
  }

  const shas = [...legacyBySha.keys()].filter((sha) => controlBySha.has(sha));
  shas.sort((a, b) => {
    const ta = legacyBySha.get(a)!.created_at;
    const tb = legacyBySha.get(b)!.created_at;
    return tb.localeCompare(ta);
  });

  const records: ShadowCutoverRecord[] = [];
  for (const sha of shas.slice(0, limit)) {
    const legacyRun = legacyBySha.get(sha)!;
    const controlRun = controlBySha.get(sha)!;
    const legacyJobs = runJobs(slug, legacyRun.id);
    const controlJobs = runJobs(slug, controlRun.id);
    const legacyDur = jobDurationMs(legacyJobs, "release-gate");
    const controlDur = jobDurationMs(controlJobs, "control-pr");
    const legacy = legacyRun.conclusion ?? "unknown";
    const control = controlRun.conclusion ?? "unknown";
    const mismatch = legacy !== control ? 1 : 0;
    const record: ShadowCutoverRecord = {
      sha,
      legacyRunId: legacyRun.id,
      controlRunId: controlRun.id,
      pr: prNumber(legacyRun) ?? prNumber(controlRun),
      legacy,
      control,
      legacyJobDurationMs: legacyDur,
      controlJobDurationMs: controlDur,
      durationDeltaMs:
        legacyDur !== null && controlDur !== null ? controlDur - legacyDur : null,
      mismatch,
      unexpectedNewFailures: legacy === "success" && control === "failure" ? 1 : 0,
      blockerMismatchRate: mismatch,
      green: false,
    };
    record.green =
      (legacy === "success" || legacy === "neutral") &&
      (control === "success" || control === "neutral") &&
      record.mismatch === 0 &&
      record.unexpectedNewFailures === 0;
    records.push(record);
  }
  return records;
}

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  const sec = Math.round(ms / 1000);
  if (Math.abs(sec) < 120) return `${sec}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function printTable(records: ShadowCutoverRecord[]): void {
  console.log("");
  console.log(
    "| PR # | commit SHA | legacy run | control run | legacy | control | duration Δ | mismatch |",
  );
  console.log(
    "|------|------------|------------|-------------|--------|---------|------------|----------|",
  );
  for (const r of records) {
    console.log(
      `| ${r.pr ?? "—"} | ${r.sha.slice(0, 7)} | ${r.legacyRunId} | ${r.controlRunId} | ${r.legacy} | ${r.control} | ${formatMs(r.durationDeltaMs)} | ${r.mismatch} |`,
    );
  }
}

function main(): void {
  const gate = process.argv.includes("--gate");
  const limit = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "20");
  const outPath =
    process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] ?? "shadow-cutover-report.json";
  const inputPath = process.argv.find((a) => a.startsWith("--input="))?.split("=")[1];

  let records: ShadowCutoverRecord[];
  if (inputPath && fs.existsSync(inputPath)) {
    records = JSON.parse(fs.readFileSync(inputPath, "utf8")) as ShadowCutoverRecord[];
  } else {
    const slug = repoSlug();
    console.log(`Fetching runs for ${slug}…`);
    records = buildRecords(slug, Math.max(limit, 20));
  }

  const streak = countConsecutiveGreenFromNewest(records);
  const report = {
    generatedAt: new Date().toISOString(),
    limit,
    consecutiveGreenSha: streak,
    records: records.slice(0, limit),
  };

  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  printTable(report.records);

  console.log("");
  console.log(`consecutiveGreenSha=${streak} records=${report.records.length}`);
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);

  if (gate) {
    const blockers: string[] = [];
    if (streak < limit) blockers.push(`consecutiveGreenSha ${streak} < ${limit}`);
    const bad = report.records.filter((r) => !r.green).length;
    if (bad > 0) blockers.push(`${bad} non-green SHA in window`);
    const unexpected = report.records.reduce((s, r) => s + r.unexpectedNewFailures, 0);
    if (unexpected > 0) blockers.push(`unexpectedNewFailures=${unexpected}`);
    const durations = report.records
      .filter((r) => r.legacyJobDurationMs && r.controlJobDurationMs)
      .map((r) => r.controlJobDurationMs! / r.legacyJobDurationMs!);
    if (durations.length) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      if (avg > 1.2) blockers.push(`avg duration ratio ${avg.toFixed(2)} > 1.2`);
    }
    if (blockers.length) {
      console.error("shadow-cutover-report — GATE FAIL");
      for (const b of blockers) console.error(`- ${b}`);
      process.exit(1);
    }
    console.log("shadow-cutover-report — GATE PASS");
  }
}

main();
