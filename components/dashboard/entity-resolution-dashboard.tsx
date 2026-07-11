"use client";

type DashboardMetrics = {
  autoResolved: number;
  manualResolved: number;
  ambiguous: number;
  unresolved: number;
  cacheHits: number;
  llmInvocations: number;
  avgElapsedMs: number;
  topCorrections: Array<{ ocr: string; label: string; hits: number }>;
};

export function EntityResolutionDashboard({ metrics }: { metrics: DashboardMetrics }) {
  const total = metrics.autoResolved + metrics.manualResolved + metrics.ambiguous + metrics.unresolved;
  const autoRate = total > 0 ? Math.round((metrics.autoResolved / total) * 100) : 0;
  const llmRate = total > 0 ? Math.round((metrics.llmInvocations / total) * 100) : 0;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Entity Resolution</h2>
        <p className="text-sm text-[color:var(--cab-muted-fg)]">Metriche acquisizione AI e riconciliazione entità</p>
      </header>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Match automatici" value={`${autoRate}%`} hint={`${metrics.autoResolved} campi`} />
        <MetricCard label="Conferme manuali" value={String(metrics.manualResolved)} />
        <MetricCard label="Ambigui" value={String(metrics.ambiguous)} />
        <MetricCard label="Non risolti" value={String(metrics.unresolved)} />
        <MetricCard label="Cache hit" value={String(metrics.cacheHits)} />
        <MetricCard label="Invocazioni LLM" value={`${llmRate}%`} hint={`${metrics.llmInvocations} totali`} />
        <MetricCard label="Tempo medio" value={`${metrics.avgElapsedMs.toFixed(1)} ms`} />
      </dl>
      {metrics.topCorrections.length > 0 ? (
        <div className="rounded border border-[color:var(--cab-border)] p-3">
          <h3 className="text-sm font-medium">Top correzioni OCR apprese</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {metrics.topCorrections.map((c) => (
              <li key={`${c.ocr}-${c.label}`}>
                {c.ocr} → <span className="font-medium">{c.label}</span> ({c.hits}×)
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded border border-[color:var(--cab-border)] p-3">
      <dt className="text-xs text-[color:var(--cab-muted-fg)]">{label}</dt>
      <dd className="text-xl font-semibold">{value}</dd>
      {hint ? <p className="text-[11px] text-[color:var(--cab-muted-fg)]">{hint}</p> : null}
    </div>
  );
}
