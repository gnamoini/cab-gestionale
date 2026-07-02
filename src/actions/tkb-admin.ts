"use server";

import { runFullBenchmarkComparison } from "@/lib/domain/technical-knowledge-base/benchmark/run-benchmark";
import type { BenchmarkReport } from "@/lib/domain/technical-knowledge-base/benchmark/run-benchmark";
import { verifyServerPermission } from "@/src/lib/auth/server-permission-guards";

export type RunTkbBenchmarkResult =
  | { ok: true; report: { legacy: BenchmarkReport; tde: BenchmarkReport } }
  | { ok: false; message: string };

/** Solo admin / manageSecurity — benchmark TKB lato server (node:fs). */
export async function runTkbBenchmarkAction(): Promise<RunTkbBenchmarkResult> {
  const allowed = await verifyServerPermission("manageSecurity");
  if (!allowed) {
    return { ok: false, message: "Accesso riservato agli amministratori." };
  }

  return { ok: true, report: runFullBenchmarkComparison() };
}
