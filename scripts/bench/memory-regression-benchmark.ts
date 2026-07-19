/**
 * Memory + React Query cache regression benchmark.
 * Requires server + auth (same as skeleton-runtime-benchmark).
 *
 * Usage:
 *   npx tsx scripts/bench/memory-regression-benchmark.ts --base-url=http://localhost:3000
 *   npx tsx scripts/bench/memory-regression-benchmark.ts --cycles=10 --next-mode=production
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { ensureBenchLoggedIn } from "./benchmark-auth";
import {
  buildBenchmarkEnvironment,
  parseBenchCliArgs,
  readCliArgValue,
  type BenchmarkEnvironment,
} from "./benchmark-environment";

function loadEnvFile(rel: string): void {
  const p = join(process.cwd(), rel);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.smoke.local");
process.env.NEXT_PUBLIC_BENCH_EXPOSE_QUERY = process.env.NEXT_PUBLIC_BENCH_EXPOSE_QUERY ?? "1";

const PAGE_READY = '[data-testid="page-ready-toolbar"]';
const NAV_ROUTES = ["/dashboard", "/lavorazioni", "/magazzino", "/dashboard"] as const;

type CacheSnapshot = {
  route: string;
  queryCount: number;
  serializedBytes: number;
  heapUsedMb: number | null;
  heapUsedAfterGcMb: number | null;
};

type CycleSnapshot = {
  cycle: number;
  steps: CacheSnapshot[];
  heapUsedAfterGcMbEnd: number | null;
};

type MemorySnapshot = {
  environment: BenchmarkEnvironment;
  baseUrl: string;
  measuredAt: string;
  cycles: number;
  steps: CacheSnapshot[];
  cycleTrend: CycleSnapshot[];
  detachedNodeCount: number | null;
  heapSlopeMbPerCycle: number | null;
  authMethod?: "smoke-password" | "service-role-magiclink";
  failures: string[];
};

async function snapshotCache(page: import("playwright").Page, route: string): Promise<CacheSnapshot> {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "commit", timeout: 90_000 });
  await page.locator(PAGE_READY).first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(() => {
    const w = window as Window & {
      gc?: () => void;
      __GESTIONALE_QUERY_CLIENT__?: {
        getQueryCache: () => { getAll: () => { queryKey: unknown; state: { data?: unknown } }[] };
      };
    };
    const qc = w.__GESTIONALE_QUERY_CLIENT__;
    let queryCount = 0;
    let serializedBytes = 0;
    if (qc) {
      const all = qc.getQueryCache().getAll();
      queryCount = all.length;
      try {
        serializedBytes = JSON.stringify(all.map((q) => q.state.data)).length;
      } catch {
        serializedBytes = -1;
      }
    }
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
    const heapUsedMb =
      perf.memory?.usedJSHeapSize != null
        ? Math.round((perf.memory.usedJSHeapSize / 1024 / 1024) * 10) / 10
        : null;
    if (typeof w.gc === "function") w.gc();
    const heapUsedAfterGcMb =
      perf.memory?.usedJSHeapSize != null
        ? Math.round((perf.memory.usedJSHeapSize / 1024 / 1024) * 10) / 10
        : null;
    return { queryCount, serializedBytes, heapUsedMb, heapUsedAfterGcMb };
  });

  return { route, ...metrics };
}

async function countDetachedNodes(page: import("playwright").Page): Promise<number> {
  return page.evaluate(() => {
    const nodes = document.querySelectorAll("*");
    let detached = 0;
    for (const n of nodes) {
      if (!document.documentElement.contains(n)) detached += 1;
    }
    return detached;
  });
}

function linearSlopeMbPerCycle(values: number[]): number | null {
  if (values.length < 2) return null;
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = i + 1;
    const y = values[i]!;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  return Math.round(((n * sumXY - sumX * sumY) / denom) * 100) / 100;
}

let baseUrl = "http://localhost:3000";

async function runNavCycle(page: import("playwright").Page): Promise<CacheSnapshot[]> {
  const steps: CacheSnapshot[] = [];
  for (const route of NAV_ROUTES) {
    steps.push(await snapshotCache(page, route));
  }
  return steps;
}

async function main(): Promise<void> {
  const benchCli = parseBenchCliArgs(process.argv);
  baseUrl = readCliArgValue(process.argv, "--base-url=") ?? "http://localhost:3000";
  const cycles = Math.max(1, Number(readCliArgValue(process.argv, "--cycles=") ?? "1"));
  const outPath =
    readCliArgValue(process.argv, "--out=") ??
    join(process.cwd(), "test-results", "memory-regression-benchmark.json");

  const environment = buildBenchmarkEnvironment({
    nextMode: benchCli.nextMode,
    dataset: benchCli.dataset,
  });

  const snapshot: MemorySnapshot = {
    environment,
    baseUrl,
    measuredAt: environment.timestamp,
    cycles,
    steps: [],
    cycleTrend: [],
    detachedNodeCount: null,
    heapSlopeMbPerCycle: null,
    failures: [],
  };

  const browser = await chromium.launch({
    headless: true,
    args: ["--js-flags=--expose-gc"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    snapshot.authMethod = await ensureBenchLoggedIn(page, context, baseUrl);
    for (let c = 1; c <= cycles; c++) {
      const steps = await runNavCycle(page);
      const last = steps[steps.length - 1];
      snapshot.cycleTrend.push({
        cycle: c,
        steps,
        heapUsedAfterGcMbEnd: last?.heapUsedAfterGcMb ?? null,
      });
      if (c === 1) snapshot.steps = steps;
      if (c === cycles) snapshot.steps = steps;
    }
    await page.waitForTimeout(30_000);
    snapshot.detachedNodeCount = await countDetachedNodes(page);
  } catch (err) {
    snapshot.failures.push(err instanceof Error ? err.message : String(err));
  } finally {
    await browser.close();
  }

  const heapEnds = snapshot.cycleTrend
    .map((c) => c.heapUsedAfterGcMbEnd)
    .filter((v): v is number => v != null);
  snapshot.heapSlopeMbPerCycle = linearSlopeMbPerCycle(heapEnds);

  if (snapshot.steps.length >= 2) {
    const t0 = snapshot.steps[0]!;
    const t1 = snapshot.steps[snapshot.steps.length - 1]!;
    const heap0 = t0.heapUsedAfterGcMb ?? t0.heapUsedMb;
    const heap1 = t1.heapUsedAfterGcMb ?? t1.heapUsedMb;
    if (heap0 != null && heap1 != null) {
      const delta = heap1 - heap0;
      if (delta > 30) {
        snapshot.failures.push(`heap delta T0→Tend ${delta}MB > 30MB (post-GC)`);
      }
    }
    const maxSerialized = Math.max(...snapshot.steps.map((s) => s.serializedBytes));
    if (maxSerialized > 30 * 1024 * 1024) {
      snapshot.failures.push(`RQ cache serialized ${maxSerialized} > 30MB`);
    } else if (maxSerialized > 10 * 1024 * 1024) {
      snapshot.failures.push(`WARN: RQ cache serialized ${maxSerialized} > 10MB`);
    }
  }

  if (cycles >= 2 && heapEnds.length >= 2) {
    const delta10 = heapEnds[heapEnds.length - 1]! - heapEnds[0]!;
    if (delta10 > 30) {
      snapshot.failures.push(`heap cycle1→cycle${cycles} ${delta10}MB > 30MB (post-GC)`);
    }
    if (snapshot.heapSlopeMbPerCycle != null && snapshot.heapSlopeMbPerCycle > 0.5) {
      snapshot.failures.push(
        `heap slope ${snapshot.heapSlopeMbPerCycle}MB/cycle > 0.5MB/cycle (post-GC)`,
      );
    }
    if (snapshot.heapSlopeMbPerCycle != null && snapshot.heapSlopeMbPerCycle > 5) {
      snapshot.failures.push(
        `linear heap growth ${snapshot.heapSlopeMbPerCycle}MB/cycle > 5MB/cycle`,
      );
    }
  }

  if (snapshot.detachedNodeCount != null && snapshot.detachedNodeCount > 50) {
    snapshot.failures.push(`detached DOM nodes ${snapshot.detachedNodeCount} > 50`);
  }

  mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(JSON.stringify(snapshot, null, 2));

  const hardFails = snapshot.failures.filter((f) => !f.startsWith("WARN:"));
  if (hardFails.length > 0) {
    console.error("memory-regression-benchmark: FAIL");
    for (const f of hardFails) console.error(`  - ${f}`);
    process.exitCode = 1;
    return;
  }
  console.log("memory-regression-benchmark: OK");
}

void main();
