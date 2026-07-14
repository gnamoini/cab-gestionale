"use client";

import { useMemo, useState } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { MezziHubTabEmpty } from "@/components/gestionale/mezzi/mezzi-hub-ui";
import { MezziRegistraTagliandoModal } from "@/components/gestionale/mezzi/mezzi-registra-tagliando-modal";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { dsBtnPrimary, dsScrollbar, dsTable, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import {
  useMezzoMaintenanceHistoryQuery,
  useMezzoMaintenanceStatusesQuery,
} from "@/src/hooks/gestionale/use-maintenance-plans-queries";

function fmtDateIt(ymd: string): string {
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("it-IT");
  } catch {
    return ymd;
  }
}

export function MezziHubTagliandiTab({
  mezzo,
  canEdit,
  active,
}: {
  mezzo: MezzoGestito;
  canEdit: boolean;
  active: boolean;
}) {
  const statusesQ = useMezzoMaintenanceStatusesQuery({
    mezzoId: mezzo.id,
    tipoAttrezzatura: mezzo.tipoAttrezzatura,
    currentOreMezzo: mezzo.oreKm ?? 0,
    enabled: active,
  });
  const historyQ = useMezzoMaintenanceHistoryQuery(mezzo.id, active);

  const [registerOpen, setRegisterOpen] = useState(false);

  const statuses = statusesQ.data ?? [];
  const history = historyQ.data ?? [];
  const listPageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label } = useClientPagination(history.length, listPageSize);
  const pagedHistory = useMemo(() => sliceItems(history), [history, sliceItems, page]);

  if (statusesQ.isLoading || historyQ.isLoading) {
    return <MezziHubTabEmpty message="Caricamento tagliandi…" />;
  }

  if (statusesQ.isError || historyQ.isError) {
    return <MezziHubTabEmpty message="Errore caricamento dati tagliandi." />;
  }

  if (statuses.length === 0) {
    return (
      <MezziHubTabEmpty message="Nessun piano tagliando applicabile per questo tipo attrezzatura." />
    );
  }

  return (
    <>
      <GestionaleInfoCard title="Piani attivi" subtitle={`${statuses.length} piano/i`} collapsible defaultCollapsed={false}>
        <div className={`${dsTableWrap} ${dsScrollbar}`}>
          <table className={`${dsTable} min-w-[560px] text-xs`}>
            <GlobalTableHead>
              <GlobalTableHeadLabel label="Piano" />
              <GlobalTableHeadLabel label="Ore fatto" />
              <GlobalTableHeadLabel label="Prossimo" />
              <GlobalTableHeadLabel label="Ore mancanti" />
            </GlobalTableHead>
            <tbody>
              {statuses.map((s) => (
                <tr key={s.planId} className={dsTableRow}>
                  <td className="px-2 py-2 font-medium text-[color:var(--cab-text)]">{s.planNome}</td>
                  <td className="px-2 py-2 font-mono">{s.ultimoOre != null ? `${s.ultimoOre} h` : "—"}</td>
                  <td className="px-2 py-2 font-mono">{s.prossimoOre} h</td>
                  <td className="px-2 py-2 font-mono">{s.oreMancanti} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit ? (
          <div className="mt-3 flex justify-end">
            <button type="button" className={dsBtnPrimary} onClick={() => setRegisterOpen(true)}>
              + Registra tagliando
            </button>
          </div>
        ) : null}
      </GestionaleInfoCard>

      <GestionaleInfoCard
        title="Storico esecuzioni"
        subtitle={`${history.length} registrazioni`}
        collapsible
        defaultCollapsed={history.length === 0}
        className="mt-4"
      >
        {history.length === 0 ? (
          <MezziHubTabEmpty message="Nessun tagliando registrato per questo mezzo." />
        ) : (
          <div className={`${dsTableWrap} ${dsScrollbar}`}>
            <table className={`${dsTable} min-w-[640px] text-xs`}>
              <GlobalTableHead>
                <GlobalTableHeadLabel label="Data" />
                <GlobalTableHeadLabel label="Ore" />
                <GlobalTableHeadLabel label="Piano" />
                <GlobalTableHeadLabel label="Ricambi" />
                <GlobalTableHeadLabel label="Registrato da" />
              </GlobalTableHead>
              <tbody>
                {pagedHistory.map((row) => (
                  <tr key={row.id} className={dsTableRow}>
                    <td className="whitespace-nowrap px-2 py-2">{fmtDateIt(row.performedAt)}</td>
                    <td className="px-2 py-2 font-mono">{row.oreAtService} h</td>
                    <td className="px-2 py-2">{row.planNome}</td>
                    <td className="max-w-[220px] px-2 py-2 text-[color:var(--cab-text-muted)]">
                      {row.parts.length > 0
                        ? row.parts.map((p) => `${p.descrizione} (${p.quantita})`).join(", ")
                        : row.note || "—"}
                    </td>
                    <td className="px-2 py-2">{row.performedByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
          </div>
        )}
      </GestionaleInfoCard>

      <MezziRegistraTagliandoModal
        open={registerOpen}
        mezzoId={mezzo.id}
        tipoAttrezzatura={mezzo.tipoAttrezzatura}
        currentOreMezzo={mezzo.oreKm ?? 0}
        onClose={() => setRegisterOpen(false)}
        onSaved={() => {
          void statusesQ.refetch();
          void historyQ.refetch();
        }}
      />
    </>
  );
}
