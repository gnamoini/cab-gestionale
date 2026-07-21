"use client";

import { useMemo, useState } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { MezziHubTabEmpty } from "@/components/gestionale/mezzi/mezzi-hub-ui";
import { MezziRegistraTagliandoModal } from "@/components/gestionale/mezzi/mezzi-registra-tagliando-modal";
import { MezziTagliandiConfigDrawer } from "@/components/gestionale/mezzi/mezzi-tagliandi-config-drawer";
import { URGENCY_LABELS } from "@/lib/maintenance-plans/compute-maintenance-urgency";
import { isMaintenanceEngineV2Enabled } from "@/lib/officina/maintenance-engine-v2-flag";
import { mezzoTagliandiEnabled } from "@/lib/mezzi/mezzi-meta";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { VehicleMaintenanceConfigView } from "@/lib/maintenance-plans/v2-types";
import { dsBtnPrimary, dsBtnNeutral, dsScrollbar, dsTable, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import {
  useMezzoMaintenanceHistoryQuery,
  useMezzoMaintenanceStatusesQuery,
} from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useMezzoMaintenanceConfigsQuery } from "@/src/hooks/gestionale/use-maintenance-engine-v2";

function fmtDateIt(ymd: string): string {
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("it-IT");
  } catch {
    return ymd;
  }
}

function HubTagliandiV1({
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
    return <MezziHubTabEmpty message="Nessun piano tagliando applicabile per questo tipo attrezzatura." />;
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
      <GestionaleInfoCard title="Storico esecuzioni" subtitle={`${history.length} registrazioni`} collapsible className="mt-4">
        {history.length === 0 ? (
          <MezziHubTabEmpty message="Nessun tagliando registrato." />
        ) : (
          <div className={`${dsTableWrap} ${dsScrollbar}`}>
            <table className={`${dsTable} min-w-[640px] text-xs`}>
              <GlobalTableHead>
                <GlobalTableHeadLabel label="Data" />
                <GlobalTableHeadLabel label="Ore" />
                <GlobalTableHeadLabel label="Piano" />
              </GlobalTableHead>
              <tbody>
                {pagedHistory.map((row) => (
                  <tr key={row.id} className={dsTableRow}>
                    <td className="px-2 py-2">{fmtDateIt(row.performedAt)}</td>
                    <td className="px-2 py-2 font-mono">{row.oreAtService} h</td>
                    <td className="px-2 py-2">{row.planNome}</td>
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

function HubTagliandiV2({
  mezzo,
  canEdit,
  active,
}: {
  mezzo: MezzoGestito;
  canEdit: boolean;
  active: boolean;
}) {
  const configsQ = useMezzoMaintenanceConfigsQuery({
    mezzoId: mezzo.id,
    oreKm: mezzo.oreKm ?? 0,
    kmFromMeta: mezzo.km != null ? Number(mezzo.km) : null,
    tipoAttrezzatura: mezzo.tipoAttrezzatura,
    tagliandiEnabled: mezzoTagliandiEnabled(mezzo),
    enabled: active,
  });
  const historyQ = useMezzoMaintenanceHistoryQuery(mezzo.id, active);

  const [registerConfig, setRegisterConfig] = useState<VehicleMaintenanceConfigView | null>(null);
  const [editConfig, setEditConfig] = useState<VehicleMaintenanceConfigView | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const configs = configsQ.data ?? [];
  const history = historyQ.data ?? [];
  const listPageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label } = useClientPagination(history.length, listPageSize);
  const pagedHistory = useMemo(() => sliceItems(history), [history, sliceItems, page]);

  if (configsQ.isLoading || historyQ.isLoading) {
    return <MezziHubTabEmpty message="Caricamento piani manutentivi…" />;
  }
  if (configsQ.isError) {
    return <MezziHubTabEmpty message="Errore caricamento piani manutentivi." />;
  }

  return (
    <>
      <GestionaleInfoCard title="Piani attivi" subtitle={`${configs.length} configurazione/i`} collapsible defaultCollapsed={false}>
        {configs.length === 0 ? (
          <MezziHubTabEmpty message="Nessun piano configurato. Aggiungi un piano manutentivo." />
        ) : (
          <div className={`${dsTableWrap} ${dsScrollbar}`}>
            <table className={`${dsTable} min-w-[720px] text-xs`}>
              <GlobalTableHead>
                <GlobalTableHeadLabel label="Piano" />
                <GlobalTableHeadLabel label="Intervallo" />
                <GlobalTableHeadLabel label="Prossima" />
                <GlobalTableHeadLabel label="Confidenza" />
                <GlobalTableHeadLabel label="Stato" />
                {canEdit ? <GlobalTableHeadLabel label="Azioni" /> : null}
              </GlobalTableHead>
              <tbody>
                {configs.map((c) => (
                  <tr key={c.id} className={dsTableRow}>
                    <td className="px-2 py-2 font-medium">{c.label}</td>
                    <td className="px-2 py-2 font-mono">
                      {c.intervalValue} {c.intervalType}
                    </td>
                    <td className="px-2 py-2">{c.nextDateEstimated ? fmtDateIt(c.nextDateEstimated) : "—"}</td>
                    <td className="px-2 py-2" title={c.confidenceReason ?? undefined}>
                      {c.confidenceLevel ?? "—"}
                    </td>
                    <td className="px-2 py-2">{URGENCY_LABELS[c.urgency]}</td>
                    {canEdit ? (
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          <button type="button" className={dsBtnNeutral} onClick={() => { setEditConfig(c); setDrawerOpen(true); }}>
                            Configura
                          </button>
                          <button type="button" className={dsBtnPrimary} onClick={() => setRegisterConfig(c)}>
                            Registra
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {canEdit ? (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className={dsBtnPrimary}
              onClick={() => {
                setEditConfig(null);
                setDrawerOpen(true);
              }}
            >
              + Aggiungi piano manutentivo
            </button>
          </div>
        ) : null}
      </GestionaleInfoCard>

      <GestionaleInfoCard title="Storico esecuzioni" subtitle={`${history.length} registrazioni`} collapsible className="mt-4">
        {history.length === 0 ? (
          <MezziHubTabEmpty message="Nessun tagliando registrato." />
        ) : (
          <div className={`${dsTableWrap} ${dsScrollbar}`}>
            <table className={`${dsTable} min-w-[640px] text-xs`}>
              <GlobalTableHead>
                <GlobalTableHeadLabel label="Data" />
                <GlobalTableHeadLabel label="Ore" />
                <GlobalTableHeadLabel label="Piano" />
              </GlobalTableHead>
              <tbody>
                {pagedHistory.map((row) => (
                  <tr key={row.id} className={dsTableRow}>
                    <td className="px-2 py-2">{fmtDateIt(row.performedAt)}</td>
                    <td className="px-2 py-2 font-mono">{row.oreAtService} h</td>
                    <td className="px-2 py-2">{row.planNome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
          </div>
        )}
      </GestionaleInfoCard>

      <MezziTagliandiConfigDrawer
        open={drawerOpen}
        mezzoId={mezzo.id}
        config={editConfig}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => void configsQ.refetch()}
      />

      {registerConfig ? (
        <MezziRegistraTagliandoModal
          open
          mezzoId={mezzo.id}
          tipoAttrezzatura={mezzo.tipoAttrezzatura}
          currentOreMezzo={mezzo.oreKm ?? 0}
          defaultPlanId={registerConfig.presetId ?? undefined}
          configId={registerConfig.id}
          onClose={() => setRegisterConfig(null)}
          onSaved={() => {
            void configsQ.refetch();
            void historyQ.refetch();
          }}
        />
      ) : null}
    </>
  );
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
  if (isMaintenanceEngineV2Enabled()) {
    return <HubTagliandiV2 mezzo={mezzo} canEdit={canEdit} active={active} />;
  }
  return <HubTagliandiV1 mezzo={mezzo} canEdit={canEdit} active={active} />;
}
