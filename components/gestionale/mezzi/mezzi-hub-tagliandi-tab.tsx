"use client";

import { useMemo, useState } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { MezziHubTabEmpty } from "@/components/gestionale/mezzi/mezzi-hub-ui";
import { MezziRegistraTagliandoModal } from "@/components/gestionale/mezzi/mezzi-registra-tagliando-modal";
import { MezziTagliandiConfigDrawer } from "@/components/gestionale/mezzi/mezzi-tagliandi-config-drawer";
import { MezziTagliandoHistoryRow } from "@/components/gestionale/mezzi/mezzi-tagliando-history-row";
import {
  TAGLIANDO_STATO_BADGE_CLASS,
  TAGLIANDO_STATO_LABELS,
  mapUrgencyToTagliandoStato,
} from "@/lib/maintenance-plans/tagliando-stato-labels";
import { useMaintenanceEngineV2Enabled } from "@/lib/officina/use-maintenance-engine-v2-enabled";
import { isPresetAssignable } from "@/lib/maintenance-plans/maintenance-domain-contract";
import { formatTriggerSummary } from "@/lib/maintenance-plans/maintenance-trigger-helpers";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { VehicleMaintenanceConfigView } from "@/lib/maintenance-plans/v2-types";
import { dsBtnPrimary, dsBtnNeutral, dsScrollbar, dsTable, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import {
  useMezzoMaintenanceHistoryQuery,
  useMezzoMaintenanceStatusesQuery,
  useMaintenancePlansListQuery,
} from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import {
  useMezzoMaintenanceConfigsQuery,
  useRecomputeForecastMutation,
} from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

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
    return <MezziHubTabEmpty message="Nessun piano manutentivo attivo su questo mezzo." />;
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
            <table className={`${dsTable} min-w-[720px] text-xs`}>
              <GlobalTableHead>
                <GlobalTableHeadLabel label="Data" />
                <GlobalTableHeadLabel label="Ore" />
                <GlobalTableHeadLabel label="Piano" />
                <GlobalTableHeadLabel label="Ricambi" />
              </GlobalTableHead>
              <tbody>
                {pagedHistory.map((row) => (
                  <MezziTagliandoHistoryRow key={row.id} row={row} />
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
    enabled: active,
  });
  const plansQ = useMaintenancePlansListQuery(active);
  const historyQ = useMezzoMaintenanceHistoryQuery(mezzo.id, active);
  const recomputeMut = useRecomputeForecastMutation();
  const gestToast = useGestionaleToast();

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
          <div className="space-y-3 px-1 py-2 text-sm text-[color:var(--cab-text-muted)]">
            <p>Nessun piano sul mezzo. Per registrare un tagliando serve prima un piano attivo.</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Clicca <strong>+ Aggiungi piano manutentivo</strong></li>
              <li>Scegli un preset da Mezzi → Tagliandi → Preset</li>
              <li>Salva, poi usa <strong>Registra</strong> sulla riga del piano</li>
            </ol>
            {canEdit ? (
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
            ) : null}
          </div>
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
                {configs.map((c) => {
                  const stato = mapUrgencyToTagliandoStato(c.urgency);
                  const plan = (plansQ.data ?? []).find((p) => p.id === c.presetId);
                  const archivedPreset = c.presetId && plan && !isPresetAssignable(plan.status);
                  const isUrgent = stato === "imminente" || stato === "scaduto";
                  return (
                  <tr key={c.id} className={`${dsTableRow} ${isUrgent ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}>
                    <td className="px-2 py-2 font-medium">
                      {c.label}
                      {archivedPreset ? (
                        <span className="mt-0.5 block text-[10px] font-medium text-amber-700 dark:text-amber-300">
                          Preset archiviato
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 font-mono" title={c.triggerReason ?? undefined}>
                      {formatTriggerSummary(
                        plan?.triggerGroups[0]?.triggers ?? [
                          { triggerType: c.intervalType, threshold: c.intervalValue, priority: 0 },
                        ],
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {c.nextDateEstimated ? fmtDateIt(c.nextDateEstimated) : c.remainingValue != null ? `${Math.round(c.remainingValue)} rim.` : "—"}
                    </td>
                    <td className="px-2 py-2" title={c.confidenceReason ?? undefined}>
                      {c.confidenceLevel ?? "—"}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TAGLIANDO_STATO_BADGE_CLASS[stato]}`}>
                        {TAGLIANDO_STATO_LABELS[stato]}
                      </span>
                    </td>
                    {canEdit ? (
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className={dsBtnNeutral} onClick={() => { setEditConfig(c); setDrawerOpen(true); }}>
                            Configura
                          </button>
                          <button
                            type="button"
                            className={dsBtnNeutral}
                            disabled={recomputeMut.isPending}
                            onClick={() => {
                              recomputeMut.mutate(
                                { configId: c.id, mezzoId: mezzo.id },
                                {
                                  onSuccess: () => gestToast.successOnce(`recompute-${c.id}`, "Pianificazione aggiornata."),
                                  onError: (err) => gestToast.error(err, { entity: "mezzo", action: "update" }),
                                },
                              );
                            }}
                          >
                            Ricalcola
                          </button>
                          <button type="button" className={dsBtnPrimary} onClick={() => setRegisterConfig(c)}>
                            Registra
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
                })}
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
            <table className={`${dsTable} min-w-[720px] text-xs`}>
              <GlobalTableHead>
                <GlobalTableHeadLabel label="Data" />
                <GlobalTableHeadLabel label="Ore" />
                <GlobalTableHeadLabel label="Piano" />
                <GlobalTableHeadLabel label="Ricambi" />
              </GlobalTableHead>
              <tbody>
                {pagedHistory.map((row) => (
                  <MezziTagliandoHistoryRow key={row.id} row={row} />
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
          configIntervalType={registerConfig.intervalType}
          planTriggers={
            (plansQ.data ?? []).find((p) => p.id === registerConfig.presetId)?.triggerGroups[0]?.triggers
          }
          currentKmMezzo={mezzo.km != null ? Number(mezzo.km) : null}
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
  const v2Enabled = useMaintenanceEngineV2Enabled();
  if (v2Enabled) {
    return <HubTagliandiV2 mezzo={mezzo} canEdit={canEdit} active={active} />;
  }
  return <HubTagliandiV1 mezzo={mezzo} canEdit={canEdit} active={active} />;
}
