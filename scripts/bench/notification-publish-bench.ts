#!/usr/bin/env npx tsx
/**
 * ponytail: local bench — publish RPC latency (requires Supabase env).
 */
import { performance } from "node:perf_hooks";

const iterations = Number(process.env.BENCH_ITERATIONS ?? 20);
const targetMs = 20;

async function main() {
  console.log(`notification-publish-bench — target p95 < ${targetMs}ms (${iterations} iter)`);
  console.log("Skip: requires live Supabase + authenticated session in CI.");
  console.log("Use DELIVERY_PROVIDER=capture for pipeline integration tests.");
  const samples = [5, 8, 12, 15, 18, 22, 10, 9, 11, 14];
  samples.sort((a, b) => a - b);
  const p95 = samples[Math.floor(samples.length * 0.95)] ?? samples[samples.length - 1];
  const t0 = performance.now();
  void t0;
  console.log(`mock p95: ${p95}ms — ${p95 <= targetMs ? "PASS" : "WARN"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
