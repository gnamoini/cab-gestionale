"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminGetLatestKbVersion,
  adminPublishTkbFromSeed,
} from "@/lib/domain/technical-knowledge-base/tkb-admin-service";
import type { BenchmarkReport } from "@/lib/domain/technical-knowledge-base/benchmark/run-benchmark";
import { runTkbBenchmarkAction } from "@/src/actions/tkb-admin";
import { dsBtnPrimary } from "@/lib/ui/design-system";

type BenchmarkComparison = { legacy: BenchmarkReport; tde: BenchmarkReport };

/** Admin TKB: publish idempotente + benchmark report (server action). */
export function SettingsTkbAdminSection() {
  const [kbVersion, setKbVersion] = useState<number | null>(() => adminGetLatestKbVersion());
  const [lastPublish, setLastPublish] = useState<string>("");
  const [benchmark, setBenchmark] = useState<BenchmarkComparison | null>(null);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(true);

  const loadBenchmark = useCallback(async () => {
    setBenchmarkLoading(true);
    setBenchmarkError(null);
    const res = await runTkbBenchmarkAction();
    setBenchmarkLoading(false);
    if (!res.ok) {
      setBenchmark(null);
      setBenchmarkError(res.message);
      return;
    }
    setBenchmark(res.report);
  }, []);

  useEffect(() => {
    void loadBenchmark();
  }, [loadBenchmark]);

  const onPublish = () => {
    const r = adminPublishTkbFromSeed();
    setKbVersion(r.kbVersion);
    setLastPublish(r.idempotent ? "Idempotente — kbVersion invariata" : `Pubblicato v${r.kbVersion}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[color:var(--cab-text-primary)]">Knowledge Base tecnica</h3>
        <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
          Publish atomico con snapshot immutabile. Solo KB published alimenta il Description Engine.
        </p>
      </div>
      <p className="text-sm">
        Versione corrente: <strong>{kbVersion ?? "—"}</strong>
      </p>
      {lastPublish ? <p className="text-xs text-[color:var(--cab-text-muted)]">{lastPublish}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={dsBtnPrimary} onClick={onPublish}>
          Pubblica seed TKB
        </button>
      </div>
      <div className="rounded-md border border-[color:var(--cab-border-subtle)] p-3 text-xs">
        <p className="font-medium">Benchmark</p>
        {benchmarkLoading ? (
          <p className="mt-2 text-[color:var(--cab-text-muted)]">Caricamento benchmark…</p>
        ) : benchmarkError ? (
          <p className="mt-2 text-[color:var(--cab-danger)]">{benchmarkError}</p>
        ) : benchmark ? (
          <ul className="mt-2 space-y-1 text-[color:var(--cab-text-muted)]">
            <li>Legacy OAR: {(benchmark.legacy.oar * 100).toFixed(0)}%</li>
            <li>TDE OAR: {(benchmark.tde.oar * 100).toFixed(0)}%</li>
            <li>TDE THR: {(benchmark.tde.thr * 100).toFixed(1)}% (target 0%)</li>
            <li>TDE coverage: {(benchmark.tde.kbCoverage * 100).toFixed(0)}%</li>
          </ul>
        ) : null}
      </div>
    </div>
  );
}
