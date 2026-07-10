"use client";

import { useEffect, useState } from "react";
import type { ImportDashboardStats } from "@/lib/import-core/import-dashboard.server";

export function ImportCenterPanel() {
  const [stats, setStats] = useState<ImportDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/import/dashboard");
        const json = (await res.json()) as ImportDashboardStats & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Caricamento fallito");
        if (!cancelled) setStats(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Errore");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Caricamento import…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!stats) return null;

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <header>
        <h2 className="text-lg font-semibold">Import Center</h2>
        <p className="text-sm text-muted-foreground">Stato pipeline import AI ed ERP (ultime 24h).</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attivi" value={String(stats.active)} />
        <StatCard label="Failed 24h" value={String(stats.failed24h)} />
        <StatCard label="Needs review" value={String(stats.needsReview)} />
        <StatCard label="Token AI 24h" value={String(stats.aiTokens24h)} />
      </div>
      <div className="text-sm text-muted-foreground">
        P95 durata: {stats.p95DurationMs != null ? `${stats.p95DurationMs} ms` : "—"} · Error rate:{" "}
        {(stats.errorRate24h * 100).toFixed(1)}%
      </div>
      <ul className="divide-y rounded-md border text-sm">
        {stats.recent.length === 0 ? (
          <li className="p-3 text-muted-foreground">Nessuna execution recente.</li>
        ) : (
          stats.recent.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="font-mono text-xs">{row.correlationDisplay}</span>
              <span>{row.feature}</span>
              <span className={row.status === "failed" ? "text-destructive" : ""}>{row.status}</span>
              {row.errorMessage ? <span className="text-xs text-muted-foreground">{row.errorMessage}</span> : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
