"use client";

import { useCallback, useMemo, useState, memo } from "react";
import { GestionaleListTable, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { LoadingErrorState } from "@/components/design-system";
import {
  buildTagliandiMatrixColumnOres,
  buildTagliandiMatrixRows,
  isMilestoneApplicable,
  resolveMatrixTogglePlanId,
  tagliandiMatrixCellState,
  TAGLIANDI_MATRIX_NO_PLAN_ID,
  type MaintenanceServiceLite,
  type TagliandiMatrixCellState,
  type TagliandiMatrixRow,
} from "@/lib/maintenance-plans/tagliandi-matrix";
import { dsFocus, dsScrollbar } from "@/lib/ui/design-system";
import { gestionaleListTableRowBaseClass, gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useToggleTagliandiMatrixCellMutation } from "@/src/hooks/gestionale/use-maintenance-plan-mutations";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import {
  useMaintenancePlansCatalogQuery,
  useMaintenancePlansListQuery,
  useMaintenanceServicesLiteQuery,
} from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";

const matrixRowClass = `${gestionaleListTableRowBaseClass} group bg-[var(--cab-card)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--cab-hover)_65%,var(--cab-card))]`;
const matrixMezzoColClass = "w-[5rem] max-w-[5rem]";
const stickyMezzoClass = `sticky left-0 z-[3] ${matrixMezzoColClass} bg-[var(--cab-surface-2)] shadow-[4px_0_10px_-6px_rgba(0,0,0,0.18)] group-hover:bg-[color:color-mix(in_srgb,var(--cab-hover)_55%,var(--cab-surface-2))]`;
const stickyMezzoBodyClass = `sticky left-0 z-[2] ${matrixMezzoColClass} bg-[var(--cab-card)] shadow-[4px_0_10px_-6px_rgba(0,0,0,0.14)] group-hover:bg-[color:color-mix(in_srgb,var(--cab-hover)_65%,var(--cab-card))]`;
const matrixHeadClass =
  "border-b-2 border-[color:var(--cab-border-strong)] bg-[var(--cab-surface-2)] text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]";
const oreCurrentColClass = "w-[2rem] min-w-[2rem] max-w-[2rem]";
const scuderiaColClass = "w-[2rem] min-w-[2rem] max-w-[2rem]";
const oreMilestoneColClass = "w-[1.5rem] min-w-[1.5rem] max-w-[1.5rem]";
const oreHeadClass = `${matrixHeadClass} ${oreMilestoneColClass} px-0 py-1 text-center text-[8px] leading-none tracking-tight`;
const oreTdClass = `${gestionaleListTableTd} ${oreMilestoneColClass} px-0 py-0.5 text-center align-middle`;
const oreCurrentTdClass = `${gestionaleListTableTd} ${oreCurrentColClass} px-0 py-0.5 text-center align-middle`;
const scuderiaTdClass = `${gestionaleListTableTd} ${scuderiaColClass} px-0 py-0.5 text-center align-middle`;
const matrixCellSquareSizeClass = "h-[1.875rem] w-[1.875rem] min-w-[1.875rem]";
const matrixScudOreTextClass =
  "font-mono text-xs font-semibold tabular-nums leading-none text-[color:var(--cab-text)]";
const matrixMezzoPrimaryClass = "truncate text-sm font-medium leading-snug text-[color:var(--cab-text)]";
const matrixMezzoSecondaryClass = "truncate text-xs leading-snug text-[color:var(--cab-text-muted)]";
const matrixCellCenterClass = "flex w-full items-center justify-center";

function MatrixNaCell() {
  return (
    <td className={oreTdClass}>
      <div className={matrixCellCenterClass}>
        <span className={`${matrixCellSquareSizeClass} inline-block`} aria-hidden />
      </div>
    </td>
  );
}

function buildTagliandiServiceLookup(services: MaintenanceServiceLite[]): Map<string, MaintenanceServiceLite> {
  const map = new Map<string, MaintenanceServiceLite>();
  for (const s of services) {
    map.set(`${s.mezzoId}:${s.planId}:${s.oreAtService}`, s);
    map.set(`${s.mezzoId}:ore:${s.oreAtService}`, s);
  }
  return map;
}

function lookupTagliandiService(
  lookup: Map<string, MaintenanceServiceLite>,
  mezzoId: string,
  planId: string,
  milestoneOre: number,
): MaintenanceServiceLite | null {
  if (planId === TAGLIANDI_MATRIX_NO_PLAN_ID) {
    return lookup.get(`${mezzoId}:ore:${milestoneOre}`) ?? null;
  }
  return lookup.get(`${mezzoId}:${planId}:${milestoneOre}`) ?? null;
}

function cellLabel(state: TagliandiMatrixCellState): string {
  if (state === "na") return "";
  return state === "done" ? "Sì" : "No";
}

/** Quadrato stato: arancione + Sì, grigio + No. */
function cellSquareClass(state: TagliandiMatrixCellState, canEdit: boolean): string {
  const base =
    `inline-flex ${matrixCellSquareSizeClass} items-center justify-center rounded-[3px] border text-[10px] font-bold leading-none transition-all duration-150`;
  if (state === "na") {
    return `${base} border-transparent bg-transparent opacity-0`;
  }
  if (!canEdit) {
    return `${base} cursor-default border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-text-muted)_28%,var(--cab-surface-2))] text-[color:var(--cab-text-muted)]`;
  }
  if (state === "done") {
    return `${base} cursor-pointer border-[color:color-mix(in_srgb,#ea580c_75%,#c2410c)] bg-[#ea580c] text-white shadow-[0_0_0_1px_color-mix(in_srgb,#ea580c_35%,transparent)] hover:brightness-110 active:scale-95`;
  }
  if (state === "overdue") {
    return `${base} cursor-pointer border-[color:color-mix(in_srgb,var(--cab-border-strong)_80%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-text-muted)_32%,var(--cab-surface-2))] text-[color:var(--cab-text)] ring-1 ring-[color:color-mix(in_srgb,#ea580c_55%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--cab-text-muted)_38%,var(--cab-surface-2))] active:scale-95`;
  }
  return `${base} cursor-pointer border-[color:color-mix(in_srgb,var(--cab-border-strong)_75%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-text-muted)_28%,var(--cab-surface-2))] text-[color:var(--cab-text-muted)] hover:bg-[color:color-mix(in_srgb,var(--cab-text-muted)_36%,var(--cab-surface-2))] hover:border-[color:var(--cab-border-strong)] active:scale-95`;
}

const MatrixCell = memo(function MatrixCell({
  row,
  milestoneOre,
  serviceLookup,
  canEdit,
  pendingKey,
  onToggle,
}: {
  row: TagliandiMatrixRow;
  milestoneOre: number;
  serviceLookup: Map<string, MaintenanceServiceLite>;
  canEdit: boolean;
  pendingKey: string | null;
  onToggle: (row: TagliandiMatrixRow, milestoneOre: number, nextDone: boolean, serviceId: string | null) => void;
}) {
  if (!isMilestoneApplicable(row.intervalOre, milestoneOre)) {
    return <MatrixNaCell />;
  }

  const svc = lookupTagliandiService(serviceLookup, row.mezzoId, row.planId, milestoneOre);
  const state = tagliandiMatrixCellState({
    milestoneOre,
    intervalOre: row.intervalOre,
    currentOre: row.currentOre,
    done: Boolean(svc),
  });
  const cellKey = `${row.mezzoId}:${row.planId}:${milestoneOre}`;
  const loading = pendingKey === cellKey;

  if (state === "na") {
    return <MatrixNaCell />;
  }

  const title =
    state === "done"
      ? `Tagliando ${milestoneOre} h eseguito — clic per annullare`
      : state === "overdue"
        ? `Tagliando ${milestoneOre} h in scadenza — clic per segnare eseguito`
        : `Tagliando ${milestoneOre} h — clic per segnare eseguito`;
  const label = loading ? "…" : cellLabel(state);

  return (
    <td className={oreTdClass}>
      <div className={matrixCellCenterClass}>
        <button
          type="button"
          className={`${matrixCellCenterClass} p-0 ${dsFocus} rounded-[6px] disabled:opacity-60`}
          disabled={!canEdit || loading}
          aria-pressed={state === "done"}
          aria-label={title}
          title={!canEdit ? READONLY_PERMISSION_HINT : title}
          onClick={() => onToggle(row, milestoneOre, state !== "done", svc?.id ?? null)}
        >
          <span className={`${cellSquareClass(state, canEdit)} ${loading ? "animate-pulse opacity-70" : ""}`}>
            {label}
          </span>
        </button>
      </div>
    </td>
  );
});

export function MezziTagliandiMatrixTable({
  enabled = true,
  canEdit,
}: {
  enabled?: boolean;
  canEdit: boolean;
}) {
  const tagliandiMezziQ = useMezziListQuery({ tagliandi: "si" }, { enabled });
  const mezzi = tagliandiMezziQ.data ?? [];
  const plansQ = useMaintenancePlansListQuery(enabled);
  const catalogQ = useMaintenancePlansCatalogQuery(enabled);
  const servicesQ = useMaintenanceServicesLiteQuery(enabled);
  const toggleMut = useToggleTagliandiMatrixCellMutation();
  const { error: toastError } = useGestionaleToast();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const plans = plansQ.data ?? [];

  const matrixRows = useMemo(
    () =>
      buildTagliandiMatrixRows({
        mezzi,
        plans,
        catalog: catalogQ.data ?? [],
      }),
    [mezzi, plans, catalogQ.data],
  );

  const columnOres = useMemo(
    () =>
      buildTagliandiMatrixColumnOres({
        rows: matrixRows,
        services: servicesQ.data ?? [],
        minColumns: 16,
        maxColumns: 24,
        ensureOres: [7500, 8000],
      }),
    [matrixRows, servicesQ.data],
  );

  const serviceLookup = useMemo(
    () => buildTagliandiServiceLookup(servicesQ.data ?? []),
    [servicesQ.data],
  );

  const loading = tagliandiMezziQ.isLoading || plansQ.isLoading || catalogQ.isLoading || servicesQ.isLoading;
  const error = tagliandiMezziQ.isError || plansQ.isError || catalogQ.isError || servicesQ.isError;

  const onToggle = useCallback(
    async (
      row: TagliandiMatrixRow,
      milestoneOre: number,
      nextDone: boolean,
      serviceId: string | null,
    ) => {
      if (!canEdit) return;
      const planId = resolveMatrixTogglePlanId(row, plans);
      if (!planId) {
        toastError("Configura almeno un piano tagliando in Impostazioni.", { entity: "mezzo", action: "create" });
        return;
      }
      const cellKey = `${row.mezzoId}:${row.planId}:${milestoneOre}`;
      setPendingKey(cellKey);
      try {
        await toggleMut.mutateAsync({
          mezzoId: row.mezzoId,
          planId,
          milestoneOre,
          done: nextDone,
          mezzoOreSnapshot: row.currentOre,
          existingServiceId: serviceId,
        });
      } catch (e) {
        toastError(e, { entity: "mezzo", action: nextDone ? "create" : "delete" });
      } finally {
        setPendingKey(null);
      }
    },
    [canEdit, plans, toastError, toggleMut],
  );

  if (!enabled) return null;

  if (loading) {
    return <p className="mt-4 text-sm text-[color:var(--cab-text-muted)]">Caricamento matrice tagliandi…</p>;
  }

  if (error) {
    return (
      <LoadingErrorState
        title="Impossibile caricare la matrice tagliandi"
        description="Errore caricamento dati."
        className="mt-4"
      />
    );
  }

  if (matrixRows.length === 0) {
    return (
      <p className="mt-4 text-sm text-[color:var(--cab-text-muted)]">
        Nessun mezzo con Tagliandi Sì. Passa alla vista Anagrafica e imposta il toggle sulla riga mezzo.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div
        className={`${dsScrollbar} overflow-auto rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)]`}
      >
        <GestionaleListTable
          wrapClassName="mt-0"
          fixed
          colgroup={
            <>
              <col className={matrixMezzoColClass} />
              <col className={scuderiaColClass} />
              <col className={oreCurrentColClass} />
              {columnOres.map((ore) => (
                <col key={ore} className={oreMilestoneColClass} />
              ))}
            </>
          }
          className="w-full border-collapse text-xs"
          headRow={
            <>
              <GlobalTableHeadLabel
                label="Mezzo"
                thClassName={`${matrixHeadClass} ${stickyMezzoClass} z-[4]`}
              />
              <GlobalTableHeadLabel
                label="Scud."
                thClassName={`${matrixHeadClass} ${scuderiaColClass} px-0 text-center text-[10px] leading-none`}
                align="center"
              />
              <GlobalTableHeadLabel
                label="Ore"
                thClassName={`${matrixHeadClass} ${oreCurrentColClass} px-0 text-center text-[10px] leading-none`}
                align="center"
              />
              {columnOres.map((ore) => (
                <GlobalTableHeadLabel
                  key={ore}
                  label={`${ore}h`}
                  thClassName={oreHeadClass}
                  align="center"
                />
              ))}
            </>
          }
          empty={false}
          emptyMessage=""
          colSpan={3 + columnOres.length}
        >
          {matrixRows.map((row) => (
            <tr key={`${row.mezzoId}:${row.planId}`} className={matrixRowClass}>
              <td className={`${gestionaleListTableTd} ${stickyMezzoBodyClass} overflow-hidden`}>
                <div className="flex min-w-0 flex-col gap-0.5 py-0.5 pr-0.5">
                  <p className={matrixMezzoPrimaryClass}>{row.attrezzaturaLabel}</p>
                  <p className={matrixMezzoSecondaryClass}>{row.cliente}</p>
                </div>
              </td>
              <td className={scuderiaTdClass}>
                <div className={matrixCellCenterClass}>
                  <span className={matrixScudOreTextClass}>{row.numeroScuderia ?? "—"}</span>
                </div>
              </td>
              <td className={oreCurrentTdClass}>
                <div className={matrixCellCenterClass}>
                  <span className={matrixScudOreTextClass}>{row.currentOre}</span>
                </div>
              </td>
              {columnOres.map((milestoneOre) => (
                <MatrixCell
                  key={milestoneOre}
                  row={row}
                  milestoneOre={milestoneOre}
                  serviceLookup={serviceLookup}
                  canEdit={canEdit}
                  pendingKey={pendingKey}
                  onToggle={onToggle}
                />
              ))}
            </tr>
          ))}
        </GestionaleListTable>
      </div>
    </div>
  );
}
