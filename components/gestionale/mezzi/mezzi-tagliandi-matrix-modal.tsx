"use client";

import { useMemo, useState } from "react";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { LavorazioniModalHeader } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleListTable, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import {
  buildTagliandiMatrixColumnOres,
  buildTagliandiMatrixRows,
  findServiceAtMilestone,
  resolveMatrixTogglePlanId,
  tagliandiMatrixCellState,
  tagliandiMatrixRowHasPlan,
  type TagliandiMatrixCellState,
  type TagliandiMatrixRow,
} from "@/lib/maintenance-plans/tagliandi-matrix";
import { dsScrollbar } from "@/lib/ui/design-system";
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
import { Tooltip } from "@/components/ui";

const matrixRowClass = `${gestionaleListTableRowBaseClass} bg-[var(--cab-card)] hover:bg-[var(--cab-hover)]/40`;
const stickyMezzoClass =
  "sticky left-0 z-[2] bg-[var(--cab-card)] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]";

function cellButtonClass(state: TagliandiMatrixCellState, canEdit: boolean): string {
  const base =
    "inline-flex h-9 w-full min-w-[3rem] max-w-[3.5rem] items-center justify-center rounded-[var(--ds-radius-md)] border text-xs font-semibold tabular-nums transition-all";
  if (state === "na") {
    return `${base} cursor-default border-transparent bg-transparent text-[color:var(--cab-text-muted)] opacity-40`;
  }
  if (!canEdit) {
    return `${base} cursor-default border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] text-[color:var(--cab-text-muted)]`;
  }
  if (state === "done") {
    return `${base} cursor-pointer border-[color:color-mix(in_srgb,var(--cab-success)_50%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_22%,var(--cab-card))] text-[color:color-mix(in_srgb,var(--cab-success)_92%,var(--cab-text))] shadow-sm hover:brightness-95 active:scale-[0.98]`;
  }
  if (state === "overdue") {
    return `${base} cursor-pointer border-[color:color-mix(in_srgb,#d97706_50%,var(--cab-border))] bg-[color:color-mix(in_srgb,#d97706_16%,var(--cab-card))] text-[color:color-mix(in_srgb,#d97706_95%,var(--cab-text))] shadow-sm hover:brightness-95 active:scale-[0.98]`;
  }
  return `${base} cursor-pointer border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] text-[color:var(--cab-text-muted)] hover:border-[color:var(--cab-border-strong)] hover:bg-[var(--cab-hover)] active:scale-[0.98]`;
}

function cellLabel(state: TagliandiMatrixCellState): string {
  if (state === "na") return "·";
  if (state === "done") return "Sì";
  if (state === "overdue") return "No";
  return "No";
}

function MatrixLegend() {
  const items = [
    { label: "Sì", className: "border-[color:color-mix(in_srgb,var(--cab-success)_50%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_22%,var(--cab-card))]" },
    { label: "No", className: "border-[color:var(--cab-border)] bg-[var(--cab-surface-2)]" },
    { label: "No", className: "border-[color:color-mix(in_srgb,#d97706_50%,var(--cab-border))] bg-[color:color-mix(in_srgb,#d97706_16%,var(--cab-card))]" },
  ];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)]/50 px-3 py-2.5 text-[11px] text-[color:var(--cab-text-muted)]">
      <span className="font-medium text-[color:var(--cab-text)]">Legenda</span>
      {items.map((item, i) => (
        <span key={item.label + i} className="inline-flex items-center gap-1.5">
          <span className={`inline-flex h-6 min-w-[2rem] items-center justify-center rounded border px-1 text-[10px] font-semibold ${item.className}`}>
            {item.label}
          </span>
          <span>
            {i === 0 ? "eseguito" : i === 1 ? "da fare" : "scaduto (ore ≥ scadenza)"}
          </span>
        </span>
      ))}
    </div>
  );
}

function MatrixCell({
  row,
  milestoneOre,
  services,
  canEdit,
  pendingKey,
  onToggle,
}: {
  row: TagliandiMatrixRow;
  milestoneOre: number;
  services: ReturnType<typeof useMaintenanceServicesLiteQuery>["data"];
  canEdit: boolean;
  pendingKey: string | null;
  onToggle: (row: TagliandiMatrixRow, milestoneOre: number, nextDone: boolean, serviceId: string | null) => void;
}) {
  const svc = findServiceAtMilestone(services ?? [], row.mezzoId, row.planId, milestoneOre);
  const state = tagliandiMatrixCellState({
    milestoneOre,
    intervalOre: row.intervalOre,
    currentOre: row.currentOre,
    done: Boolean(svc),
  });
  const cellKey = `${row.mezzoId}:${row.planId}:${milestoneOre}`;
  const loading = pendingKey === cellKey;

  if (state === "na") {
    return (
      <td className={`${gestionaleListTableTd} px-1 py-1.5 text-center`}>
        <span className="inline-flex h-9 w-full min-w-[3rem] max-w-[3.5rem] items-center justify-center text-[color:var(--cab-text-muted)] opacity-30">
          ·
        </span>
      </td>
    );
  }

  const title =
    state === "done"
      ? `Tagliando ${milestoneOre} h eseguito — clic per annullare`
      : state === "overdue"
        ? `Tagliando ${milestoneOre} h in scadenza — clic per segnare eseguito`
        : `Tagliando ${milestoneOre} h — clic per segnare eseguito`;

  return (
    <td className={`${gestionaleListTableTd} px-1 py-1.5 text-center`}>
      <Tooltip content={!canEdit ? READONLY_PERMISSION_HINT : title}>
        <button
          type="button"
          className={cellButtonClass(state, canEdit)}
          disabled={!canEdit || loading}
          aria-pressed={state === "done"}
          aria-label={title}
          onClick={() => onToggle(row, milestoneOre, state !== "done", svc?.id ?? null)}
        >
          {loading ? "…" : cellLabel(state)}
        </button>
      </Tooltip>
    </td>
  );
}

export function MezziTagliandiMatrixModal({
  open,
  onClose,
  canEdit,
}: {
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
}) {
  const tagliandiMezziQ = useMezziListQuery({ tagliandi: "si" }, { enabled: open });
  const mezzi = tagliandiMezziQ.data ?? [];
  const plansQ = useMaintenancePlansListQuery(open);
  const catalogQ = useMaintenancePlansCatalogQuery(open);
  const servicesQ = useMaintenanceServicesLiteQuery(open);
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
      }),
    [matrixRows, servicesQ.data],
  );

  const loading = tagliandiMezziQ.isLoading || plansQ.isLoading || catalogQ.isLoading || servicesQ.isLoading;
  const error = tagliandiMezziQ.isError || plansQ.isError || catalogQ.isError || servicesQ.isError;

  async function onToggle(
    row: TagliandiMatrixRow,
    milestoneOre: number,
    nextDone: boolean,
    serviceId: string | null,
  ) {
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
  }

  if (!open) return null;

  return (
    <GestionaleModalShell
      modalSize="analytics"
      onRequestClose={onClose}
      titleId="mezzi-tagliandi-matrix-title"
      header={
        <LavorazioniModalHeader
          title="Matrice tagliandi"
          subtitle="Mezzi con Tagliandi Sì · griglia ogni 500 h · clic sulla cella per Sì/No"
          titleId="mezzi-tagliandi-matrix-title"
          onRequestClose={onClose}
        />
      }
    >
      <GestionaleModalScrollBody className="p-4">
        {loading ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento matrice…</p>
        ) : error ? (
          <p className="text-sm text-red-700 dark:text-red-300">Errore caricamento dati tagliandi.</p>
        ) : matrixRows.length === 0 ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            Nessun mezzo con Tagliandi Sì. Imposta il toggle nella tabella mezzi.
          </p>
        ) : (
          <div className={`${dsScrollbar} max-h-[min(70vh,42rem)] overflow-auto rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)]`}>
            <GestionaleListTable
              wrapClassName="mt-0"
              className="min-w-max text-xs"
              headRow={
                <>
                  <GlobalTableHeadLabel
                    label="Mezzo"
                    thClassName={`min-w-[14rem] ${stickyMezzoClass}`}
                  />
                  <GlobalTableHeadLabel
                    label="Intervallo"
                    thClassName="min-w-[6.5rem] whitespace-nowrap"
                  />
                  <GlobalTableHeadLabel label="Ore" thClassName="w-[4.5rem] text-center" align="center" />
                  {columnOres.map((ore) => (
                    <GlobalTableHeadLabel
                      key={ore}
                      label={`${ore} h`}
                      thClassName="min-w-[3.25rem] whitespace-nowrap bg-[var(--cab-surface-2)]/80 text-center"
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
                  <td className={`${gestionaleListTableTd} ${stickyMezzoClass}`}>
                    <div className="min-w-0 py-0.5">
                      <p className="truncate text-sm font-medium text-[color:var(--cab-text)]">{row.mezzoLabel}</p>
                      <p className="truncate text-[11px] text-[color:var(--cab-text-muted)]">{row.cliente}</p>
                      <p className="truncate text-[10px] text-[color:var(--cab-text-muted)] opacity-80">
                        {row.tipoAttrezzatura}
                      </p>
                    </div>
                  </td>
                  <td className={`${gestionaleListTableTd} min-w-[6.5rem]`}>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-[color:var(--cab-text)]">{row.planNome}</span>
                      {!tagliandiMatrixRowHasPlan(row) ? (
                        <p className="text-[10px] leading-tight text-[color:var(--cab-text-muted)]">senza piano dedicato</p>
                      ) : null}
                    </div>
                  </td>
                  <td className={`${gestionaleListTableTd} text-center`}>
                    <span className="inline-flex min-w-[3rem] items-center justify-center rounded-[var(--ds-radius-md)] border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] px-2 py-1 font-mono text-sm font-semibold tabular-nums text-[color:var(--cab-text)]">
                      {row.currentOre}
                    </span>
                  </td>
                  {columnOres.map((milestoneOre) => (
                    <MatrixCell
                      key={milestoneOre}
                      row={row}
                      milestoneOre={milestoneOre}
                      services={servicesQ.data}
                      canEdit={canEdit}
                      pendingKey={pendingKey}
                      onToggle={onToggle}
                    />
                  ))}
                </tr>
              ))}
            </GestionaleListTable>
          </div>
        )}
        <MatrixLegend />
        <p className="mt-2 text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
          Disattivare «Tagliandi» sulla riga mezzo lo nasconde dalla matrice. Le registrazioni già salvate restano in
          archivio.
        </p>
      </GestionaleModalScrollBody>
    </GestionaleModalShell>
  );
}
