"use client";

import { useMemo, useState } from "react";
import { LoadingErrorState } from "@/components/design-system";
import { GestionaleListTable, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { URGENCY_LABELS, URGENCY_ROW_CLASS } from "@/lib/maintenance-plans/compute-maintenance-urgency";
import { isMaintenanceEngineV2Enabled } from "@/lib/officina/maintenance-engine-v2-flag";
import { groupOverviewByInterval } from "@/lib/maintenance-plans/resolve-mezzo-metering";
import type { TagliandiOverviewRow } from "@/lib/maintenance-plans/v2-types";
import { gestionaleListTableRowBaseClass, gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";
import { useTagliandiOverviewQuery } from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { MezziTagliandiMatrixTable } from "@/components/gestionale/mezzi/mezzi-tagliandi-matrix-table";

function fmtDate(ymd: string | null): string {
  if (!ymd) return "—";
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("it-IT");
  } catch {
    return ymd;
  }
}

function OverviewTable({
  title,
  rows,
  canEdit,
}: {
  title: string;
  rows: TagliandiOverviewRow[];
  canEdit: boolean;
}) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-sm font-semibold text-[color:var(--cab-text)]">{title}</h3>
      <GestionaleListTable
        fixed
        headRow={
          <>
            <GlobalTableHeadLabel label="Scud." />
            <GlobalTableHeadLabel label="Targa" />
            <GlobalTableHeadLabel label="Mezzo" />
            <GlobalTableHeadLabel label="Preset" />
            <GlobalTableHeadLabel label="Ultimo" />
            <GlobalTableHeadLabel label="Attuale" />
            <GlobalTableHeadLabel label="Mancanti" />
            <GlobalTableHeadLabel label="Previsto" />
            <GlobalTableHeadLabel label="Confidenza" />
            <GlobalTableHeadLabel label="Stato" />
            <GlobalTableHeadLabel label="Azioni" />
          </>
        }
      >
        {rows.map((row) => (
          <tr key={row.configId} className={`${gestionaleListTableRowBaseClass} ${URGENCY_ROW_CLASS[row.urgency]}`}>
            <td className={gestionaleListTableTd}>{row.numeroScuderia ?? "—"}</td>
            <td className={gestionaleListTableTd}>{row.targa ?? "—"}</td>
            <td className={gestionaleListTableTd}>{row.attrezzaturaLabel}</td>
            <td className={gestionaleListTableTd}>{row.presetNome}</td>
            <td className={`${gestionaleListTableTd} font-mono text-xs`}>
              {row.ultimoValueAtService != null ? row.ultimoValueAtService : "—"}
            </td>
            <td className={`${gestionaleListTableTd} font-mono text-xs`}>{row.currentValue}</td>
            <td className={`${gestionaleListTableTd} font-mono text-xs`}>
              {row.remainingValue != null ? Math.round(row.remainingValue) : "—"}
            </td>
            <td className={gestionaleListTableTd}>{fmtDate(row.nextDateEstimated)}</td>
            <td className={gestionaleListTableTd} title={row.confidenceReason ?? undefined}>
              {row.confidenceLevel ?? "—"}
              {row.confidencePct != null ? ` (${row.confidencePct}%)` : ""}
            </td>
            <td className={gestionaleListTableTd}>{URGENCY_LABELS[row.urgency]}</td>
            <td className={gestionaleListTableTd}>
              {canEdit && row.canPlanWorkshop ? (
                <button
                  type="button"
                  disabled
                  title="Disponibile a breve"
                  className="text-xs text-[color:var(--cab-text-muted)] opacity-60"
                >
                  Pianifica lavorazione
                </button>
              ) : (
                "—"
              )}
            </td>
          </tr>
        ))}
      </GestionaleListTable>
    </section>
  );
}

export function MezziTagliandiOverview({ canEdit }: { canEdit: boolean }) {
  const overviewQ = useTagliandiOverviewQuery(true);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const rows = overviewQ.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.targa ?? "").toLowerCase().includes(q) ||
        (r.numeroScuderia ?? "").toLowerCase().includes(q) ||
        r.attrezzaturaLabel.toLowerCase().includes(q) ||
        r.presetNome.toLowerCase().includes(q),
    );
  }, [overviewQ.data, search]);

  const groups = useMemo(() => groupOverviewByInterval(filtered), [filtered]);

  if (overviewQ.isLoading) {
    return <div className="p-4 text-sm text-[color:var(--cab-text-muted)]">Caricamento overview tagliandi…</div>;
  }

  if (overviewQ.isError) {
    return (
      <LoadingErrorState
        title="Errore caricamento overview tagliandi"
        onRetry={() => void overviewQ.refetch()}
      />
    );
  }

  if (groups.length === 0) {
    return (
      <div className="p-4 text-sm text-[color:var(--cab-text-muted)]">
        Nessun piano manutentivo attivo. Attiva i tagliandi sui mezzi e configura i piani.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca targa, scuderia, mezzo…"
          className="max-w-xs rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-1.5 text-sm"
        />
        <span className="text-xs text-[color:var(--cab-text-muted)]">{filtered.length} configurazioni</span>
      </div>
      {groups.map((g) => (
        <OverviewTable
          key={g.key}
          title={`${g.intervalType === "ore" ? "Ore" : g.intervalType === "km" ? "Km" : "Giorni"} — ${g.intervalValue}`}
          rows={g.rows}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}

export function MezziTagliandiPanel({ canEdit }: { canEdit: boolean }) {
  if (isMaintenanceEngineV2Enabled()) {
    return <MezziTagliandiOverview canEdit={canEdit} />;
  }
  return <MezziTagliandiMatrixTable enabled canEdit={canEdit} />;
}
