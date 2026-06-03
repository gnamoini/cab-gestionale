"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { runProductionReadinessCheckAction } from "@/src/actions/production-readiness";
import type { ProductionReadinessResult } from "@/lib/production/production-readiness-types";
import {
  dsBtnNeutral,
  dsBtnPrimary,
  dsPageToolbarBtn,
  dsStackPage,
  dsTypoSmall,
} from "@/lib/ui/design-system";

function FindingList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "danger" | "warning";
}) {
  if (items.length === 0) {
    return (
      <p className={`${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>Nessun elemento.</p>
    );
  }
  const border =
    tone === "danger"
      ? "border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))]"
      : "border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))]";
  const text = tone === "danger" ? "text-[color:var(--cab-danger)]" : "text-[color:var(--cab-warning)]";

  return (
    <div>
      <h3 className={`mb-2 text-sm font-semibold ${text}`}>{title}</h3>
      <ul className={`space-y-2 rounded-lg border ${border} bg-[var(--cab-surface)] p-3`}>
        {items.map((item, i) => (
          <li key={`${i}-${item.slice(0, 24)}`} className="text-sm leading-snug text-[color:var(--cab-text)]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductionReadinessView() {
  const [report, setReport] = useState<ProductionReadinessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await runProductionReadinessCheckAction();
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      setReport(null);
      return;
    }
    setReport(res.report);
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const ready = report?.ready ?? false;

  return (
    <div className={dsStackPage}>
      <PageHeader
        title="Production Readiness"
        description="Gate automatico pilot → production: verifica flag, storage, RBAC e coerenza codice prima del deploy."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link href="/dashboard/security" className={dsBtnNeutral}>
              ← Sicurezza
            </Link>
            <button type="button" className={dsPageToolbarBtn} onClick={() => void runCheck()} disabled={loading}>
              {loading ? "Verifica…" : "Riesegui check"}
            </button>
          </div>
        }
      />

      {error ? (
        <ShellCard title="Errore">
          <p className="text-sm text-[color:var(--cab-danger)]">{error}</p>
          <button type="button" className={`${dsBtnPrimary} mt-3`} onClick={() => void runCheck()}>
            Riprova
          </button>
        </ShellCard>
      ) : null}

      {report && !error ? (
        <>
          <ShellCard title="Esito">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-bold ${
                  ready
                    ? "bg-[color:color-mix(in_srgb,var(--cab-success)_15%,var(--cab-surface))] text-[color:var(--cab-success)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-success)_40%,var(--cab-border))]"
                    : "bg-[color:color-mix(in_srgb,var(--cab-danger)_12%,var(--cab-surface))] text-[color:var(--cab-danger)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))]"
                }`}
              >
                {ready ? "✔ READY" : "✖ NOT READY"}
              </span>
              <p className={`${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>
                Ultimo controllo: {new Date(report.checkedAt).toLocaleString("it-IT")}
                {report.meta.dbChecked ? " · DB verificato" : " · DB non verificato"}
                {report.meta.productionTarget ? " · target production" : ""}
              </p>
            </div>
          </ShellCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ShellCard title="Blockers" subtitle="Devono essere risolti prima del deploy.">
              <FindingList title="Bloccanti" items={report.blockers} tone="danger" />
            </ShellCard>
            <ShellCard title="Warnings" subtitle="Non bloccano il gate ma richiedono attenzione.">
              <FindingList title="Avvisi" items={report.warnings} tone="warning" />
            </ShellCard>
          </div>
        </>
      ) : null}

      {loading && !report ? (
        <p className="text-sm text-[color:var(--cab-text-muted)]">Esecuzione controlli…</p>
      ) : null}
    </div>
  );
}
