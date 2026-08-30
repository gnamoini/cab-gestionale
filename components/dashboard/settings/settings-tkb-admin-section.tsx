"use client";

import { useCallback, useEffect, useState } from "react";
import type { TkbBuildReport } from "@/lib/domain/technical-knowledge-base/types";
import type { BenchmarkReport } from "@/lib/domain/technical-knowledge-base/benchmark/run-benchmark";
import {
  getTkbAdminStateAction,
  publishTkbAction,
  refreshTkbDraftAction,
  runTkbBenchmarkAction,
} from "@/src/actions/tkb-admin";
import { dsBtnPrimary, dsBtnSecondary } from "@/lib/ui/design-system";

type BenchmarkComparison = { legacy: BenchmarkReport; tde: BenchmarkReport };

/** Admin TKB: publish da dati operativi + benchmark + audit build. */
export function SettingsTkbAdminSection() {
  const [kbVersion, setKbVersion] = useState<number | null>(null);
  const [draftStale, setDraftStale] = useState(true);
  const [lastPublish, setLastPublish] = useState("");
  const [buildReport, setBuildReport] = useState<TkbBuildReport | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkComparison | null>(null);
  const [kbStats, setKbStats] = useState<BenchmarkReport["kbStats"] | null>(null);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const loadState = useCallback(async () => {
    const state = await getTkbAdminStateAction();
    if ("ok" in state && state.ok === false) return;
    if ("kbVersion" in state) {
      setKbVersion(state.kbVersion);
      setDraftStale(state.draftStale);
      setBuildReport(state.buildReport);
    }
  }, []);

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
    setKbStats(res.kbStats);
  }, []);

   
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    void loadState();
    void loadBenchmark();
  }, [loadState, loadBenchmark]);

  const onPublish = async () => {
    setPublishing(true);
    const r = await publishTkbAction();
    setPublishing(false);
    if (!r.ok) {
      setLastPublish(r.message);
      return;
    }
    setKbVersion(r.kbVersion);
    setBuildReport(r.buildReport);
    setDraftStale(false);
    setLastPublish(r.idempotent ? "Idempotente — kbVersion invariata" : `Pubblicato v${r.kbVersion}`);
    void loadBenchmark();
  };

  const onRefreshDraft = async () => {
    const r = await refreshTkbDraftAction();
    if (r.ok) {
      setBuildReport(r.buildReport);
      setDraftStale(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[color:var(--cab-text-primary)]">Knowledge Base tecnica</h3>
        <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
          Materializza la KB dai dati operativi attivi. Solo snapshot pubblicati alimentano il Description Engine.
        </p>
      </div>
      <p className="text-sm">
        Versione pubblicata: <strong>{kbVersion ?? "—"}</strong>
        {draftStale ? (
          <span className="ml-2 text-xs text-[color:var(--cab-warning)]">Bozza non aggiornata</span>
        ) : (
          <span className="ml-2 text-xs text-[color:var(--cab-text-muted)]">Bozza sincronizzata</span>
        )}
      </p>
      {lastPublish ? <p className="text-xs text-[color:var(--cab-text-muted)]">{lastPublish}</p> : null}
      <div className="flex gap-2 min-w-0 flex-nowrap sm:flex-wrap">
        <button type="button" className={dsBtnPrimary} onClick={() => void onPublish()} disabled={publishing}>
          {publishing ? "Pubblicazione…" : "Pubblica TKB"}
        </button>
        <button type="button" className={dsBtnSecondary} onClick={() => void onRefreshDraft()}>
          Aggiorna bozza
        </button>
      </div>
      {buildReport?.counts ? (
        <div className="rounded-md border border-[color:var(--cab-border-subtle)] p-3 text-xs space-y-1">
          <p className="font-medium">Build report</p>
          <p className="text-[color:var(--cab-text-muted)]">
            {buildReport.counts.interventi} interventi · {buildReport.counts.componenti} componenti ·{" "}
            {buildReport.counts.activities} attività · {buildReport.durationMs}ms
          </p>
          {(buildReport.warnings?.length ?? 0) > 0 ? (
            <p className="text-[color:var(--cab-warning)]">{buildReport.warnings.slice(0, 3).join("; ")}</p>
          ) : null}
        </div>
      ) : null}
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
            {kbStats ? (
              <>
                <li>
                  KB indicizzata: {kbStats.interventi} interventi, {kbStats.componenti} componenti,{" "}
                  {kbStats.descrizioni} descrizioni
                </li>
                <li>Categorie: {kbStats.categorie}</li>
              </>
            ) : null}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
