"use client";

import { Fragment, useMemo, useState } from "react";
import {
  GestionaleListTable,
  GlobalTableHeadLabel,
} from "@/components/gestionale/global-table";
import type { MaintenanceServiceHistoryView } from "@/lib/maintenance-plans/types";
import {
  buildAnchoredHubMilestones,
  formatMilestoneThreshold,
  historyToAnchoredExecutions,
  mezzoMeteringFromGestito,
  type AnchoredHubMilestoneRow,
  type MilestoneUnit,
  type ResolvedMilestoneInterval,
} from "@/lib/maintenance-plans/tagliando-milestone-resolution";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  gestionaleListTableRowBaseClass,
  gestionaleListTableTd,
  gestionaleListTableTdCenter,
  gestionaleListTableTdPill,
} from "@/lib/ui/gestionale-list-table";
import { dsCheckboxInput } from "@/lib/ui/design-system";
import {
  TagliandoHistoryExpandedDetail,
  tagliandoComplianceLabel,
  tagliandoRicambiLabel,
} from "@/components/gestionale/mezzi/mezzi-tagliando-history-row";
import { useToggleTagliandiMatrixCellMutation } from "@/src/hooks/gestionale/use-maintenance-plan-mutations";
import { useRecomputeForecastMutation } from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const STATO_BADGE: Record<AnchoredHubMilestoneRow["state"], string> = {
  done: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  pending: "bg-[color:var(--cab-surface-2)] text-[color:var(--cab-text-muted)]",
  overdue: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
};

const STATO_LABEL: Record<AnchoredHubMilestoneRow["state"], string> = {
  done: "Fatto",
  pending: "Prossimo",
  overdue: "Scaduto",
};

const SCAGLIONI_ROW_CLASS: Record<AnchoredHubMilestoneRow["state"], string> = {
  done: "",
  pending: "",
  overdue: "bg-amber-500/[0.06]",
};

function fmtDateIt(ymd: string | undefined): string | null {
  if (!ymd?.trim()) return null;
  try {
    return new Date(`${ymd.slice(0, 10)}T12:00:00`).toLocaleDateString("it-IT");
  } catch {
    return ymd;
  }
}

export type MezziHubTagliandiStoricoPlan = {
  planId: string;
  planLabel: string;
  milestone: ResolvedMilestoneInterval;
  configId?: string | null;
};

function TagliandiHubInsetEmpty({ message }: { message: string }) {
  return (
    <p className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-3 py-5 text-center text-sm text-[color:var(--cab-text-muted)]">
      {message}
    </p>
  );
}

function canManuallyUncheck(row: MaintenanceServiceHistoryView | undefined): boolean {
  if (!row) return false;
  if (row.synthetic) return false;
  if (row.lavorazioneId) return false;
  return row.executionType === "manual";
}

function originLabel(row: MaintenanceServiceHistoryView | undefined): string {
  if (!row) return "—";
  if (row.synthetic || row.lavorazioneId) return "Lavorazione";
  if (row.executionType === "manual") return "Manuale";
  return "Registrato";
}

const SCAGLIONI_TABLE_COLS = 7;

function MezziHubTagliandiScaglioniTable({
  mezzo,
  plan,
  history,
  canEdit,
  onToggled,
}: {
  mezzo: MezzoGestito;
  plan: MezziHubTagliandiStoricoPlan;
  history: MaintenanceServiceHistoryView[];
  canEdit: boolean;
  onToggled: () => void;
}) {
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const toggleMut = useToggleTagliandiMatrixCellMutation();
  const recomputeMut = useRecomputeForecastMutation();
  const gestToast = useGestionaleToast();
  const metering = mezzoMeteringFromGestito(mezzo);
  const currentValue = plan.milestone.unit === "km" ? metering.km : metering.ore;

  const planHistory = useMemo(
    () => history.filter((h) => h.planId === plan.planId),
    [history, plan.planId],
  );

  const historyByServiceId = useMemo(() => new Map(planHistory.map((h) => [h.id, h])), [planHistory]);

  const milestones = useMemo(
    () =>
      buildAnchoredHubMilestones({
        interval: plan.milestone.interval,
        currentValue,
        executions: historyToAnchoredExecutions(planHistory, plan.milestone.unit),
      }),
    [plan.milestone.interval, plan.milestone.unit, currentValue, planHistory],
  );

  async function handleToggle(milestone: AnchoredHubMilestoneRow, nextDone: boolean) {
    const historyRow = milestone.serviceId ? historyByServiceId.get(milestone.serviceId) : undefined;

    if (!nextDone && !canManuallyUncheck(historyRow)) {
      gestToast.error("Questo tagliando è stato registrato da una lavorazione e non può essere deselezionato.", {
        entity: "mezzo",
        action: "update",
      });
      return;
    }

    if (milestone.synthetic) {
      gestToast.error("Registrazione derivata da lavorazione: completa o sincronizza dalla scheda lavorazione.", {
        entity: "mezzo",
        action: "update",
      });
      return;
    }

    try {
      await toggleMut.mutateAsync({
        mezzoId: mezzo.id,
        planId: plan.planId,
        milestoneOre: milestone.value,
        done: nextDone,
        mezzoOreSnapshot: metering.ore,
        existingServiceId: milestone.serviceId ?? null,
      });
      if (plan.configId) {
        recomputeMut.mutate({ configId: plan.configId, mezzoId: mezzo.id });
      }
      onToggled();
      gestToast.successOnce(
        `milestone-${plan.planId}-${milestone.value}-${nextDone}`,
        nextDone
          ? `Tagliando ${formatMilestoneThreshold(plan.milestone.unit, milestone.value)} registrato.`
          : `Tagliando ${formatMilestoneThreshold(plan.milestone.unit, milestone.value)} rimosso.`,
      );
    } catch (err) {
      gestToast.error(err, { entity: "mezzo", action: "update" });
    }
  }

  if (milestones.length === 0) return null;

  const doneCount = milestones.filter((m) => m.done).length;

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h4 className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          {plan.planLabel}
        </h4>
        <span className="shrink-0 rounded-full bg-[color:var(--cab-surface-2)] px-2 py-0.5 text-[10px] font-medium tabular-nums text-[color:var(--cab-text-muted)]">
          {doneCount}/{milestones.length}
        </span>
      </div>
      <GestionaleListTable
        fixed
        colgroup={
          <>
            <col className="w-[2.75rem]" />
            <col />
            <col className="w-[6.5rem]" />
            <col className="w-[5.5rem]" />
            <col className="w-[5rem]" />
            <col className="w-[5rem]" />
            <col className="w-[4.25rem]" />
          </>
        }
        headRow={
          <>
            <GlobalTableHeadLabel label="N°" align="center" />
            <GlobalTableHeadLabel label="Soglia" />
            <GlobalTableHeadLabel label="Stato" align="center" />
            <GlobalTableHeadLabel label="Origine" align="center" />
            <GlobalTableHeadLabel label="Compl." align="center" />
            <GlobalTableHeadLabel label="Ricambi" align="center" />
            <GlobalTableHeadLabel label="Fatto" align="center" />
          </>
        }
      >
        {milestones.map((milestone, index) => {
          const historyRow = milestone.serviceId ? historyByServiceId.get(milestone.serviceId) : undefined;
          const performedDate = fmtDateIt(milestone.performedAt ?? historyRow?.performedAt);
          const lockedDone = milestone.done && (!canManuallyUncheck(historyRow) || milestone.synthetic);
          const disabled = !canEdit || toggleMut.isPending || lockedDone;
          const rowKey = `${milestone.done ? "done" : "future"}-${milestone.value}-${milestone.serviceId ?? index}`;
          const expandable = Boolean(milestone.done && historyRow);
          const expanded = expandable && expandedServiceId === historyRow?.id;

          return (
            <Fragment key={rowKey}>
              <tr className={`${gestionaleListTableRowBaseClass} ${SCAGLIONI_ROW_CLASS[milestone.state]}`}>
                <td className={`${gestionaleListTableTdCenter} font-mono text-xs tabular-nums text-[color:var(--cab-text-muted)]`}>
                  {index + 1}
                </td>
                <td className={`${gestionaleListTableTd} font-mono tabular-nums`}>
                  {expandable ? (
                    <button
                      type="button"
                      className="text-left hover:underline"
                      aria-expanded={expanded}
                      onClick={() =>
                        setExpandedServiceId((prev) => (prev === historyRow?.id ? null : (historyRow?.id ?? null)))
                      }
                    >
                      <div className="font-medium text-[color:var(--cab-text)]">
                        {formatMilestoneThreshold(plan.milestone.unit, milestone.value)}
                      </div>
                      {performedDate ? (
                        <div className="mt-0.5 text-[10px] font-normal text-[color:var(--cab-primary)]">
                          {performedDate}
                        </div>
                      ) : null}
                    </button>
                  ) : (
                    <>
                      <div>{formatMilestoneThreshold(plan.milestone.unit, milestone.value)}</div>
                      {milestone.done && performedDate ? (
                        <div className="mt-0.5 text-[10px] font-normal text-[color:var(--cab-text-muted)]">
                          {performedDate}
                        </div>
                      ) : null}
                    </>
                  )}
                </td>
                <td className={gestionaleListTableTdPill}>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATO_BADGE[milestone.state]}`}
                  >
                    {STATO_LABEL[milestone.state]}
                  </span>
                </td>
                <td className={`${gestionaleListTableTdCenter} text-xs text-[color:var(--cab-text-muted)]`}>
                  {milestone.done ? originLabel(historyRow) : "—"}
                </td>
                <td className={`${gestionaleListTableTdCenter} font-mono text-xs tabular-nums`}>
                  {tagliandoComplianceLabel(historyRow)}
                </td>
                <td className={`${gestionaleListTableTdCenter} text-xs text-[color:var(--cab-text-muted)]`}>
                  {tagliandoRicambiLabel(historyRow)}
                </td>
                <td className={gestionaleListTableTdCenter}>
                  <input
                    type="checkbox"
                    className={dsCheckboxInput}
                    checked={milestone.done}
                    disabled={disabled}
                    title={lockedDone ? "Registrato da lavorazione" : undefined}
                    aria-label={`Tagliando ${formatMilestoneThreshold(plan.milestone.unit, milestone.value)} ${milestone.done ? "eseguito" : "da eseguire"}`}
                    onChange={(e) => void handleToggle(milestone, e.target.checked)}
                  />
                </td>
              </tr>
              {expanded && historyRow ? (
                <tr className={gestionaleListTableRowBaseClass}>
                  <td
                    colSpan={SCAGLIONI_TABLE_COLS}
                    className="bg-[color:color-mix(in_srgb,var(--cab-hover)_40%,transparent)] px-3 py-3"
                  >
                    <TagliandoHistoryExpandedDetail
                      row={historyRow}
                      canEdit={canEdit}
                      onReviewSaved={onToggled}
                    />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </GestionaleListTable>
    </div>
  );
}

export function fmtMezziHubTagliandiSubtitle(historyCount: number, planCount: number): string {
  const exec = historyCount === 1 ? "1 esecuzione" : `${historyCount} esecuzioni`;
  const plans = planCount === 1 ? "1 piano" : `${planCount} piani`;
  return `${exec} · ${plans}`;
}

/** Tabella unificata scaglioni + dettaglio esecuzioni (compliance, ricambi). */
export function MezziHubTagliandiUnifiedSection({
  mezzo,
  plans,
  history,
  canEdit,
  onToggled,
}: {
  mezzo: MezzoGestito;
  plans: MezziHubTagliandiStoricoPlan[];
  history: MaintenanceServiceHistoryView[];
  canEdit: boolean;
  onToggled: () => void;
}) {
  const scaglioniPlans = plans.filter((p) => p.milestone.interval > 0 && p.planId);
  const metering = mezzoMeteringFromGestito(mezzo);

  if (scaglioniPlans.length === 0) {
    return (
      <TagliandiHubInsetEmpty message="Nessuno scaglione ore/km sui preset assegnati. Configura un intervallo ore o km nel preset." />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
        Contatore attuale:{" "}
        <span className="font-mono tabular-nums text-[color:var(--cab-text)]">
          {metering.ore.toLocaleString("it-IT")} h
        </span>
        {metering.km > 0 ? (
          <>
            {" "}
            ·{" "}
            <span className="font-mono tabular-nums text-[color:var(--cab-text)]">
              {metering.km.toLocaleString("it-IT")} km
            </span>
          </>
        ) : null}
        . Spunta gli scaglioni eseguiti, completa una lavorazione con flag Tagliando, o apri una riga per
        compliance e ricambi.
      </p>
      <div className="space-y-3">
        {scaglioniPlans.map((plan) => (
          <MezziHubTagliandiScaglioniTable
            key={plan.planId}
            mezzo={mezzo}
            plan={plan}
            history={history}
            canEdit={canEdit}
            onToggled={onToggled}
          />
        ))}
      </div>
    </div>
  );
}

/** @deprecated Usare MezziHubTagliandiUnifiedSection */
export const MezziHubTagliandiScaglioniSection = MezziHubTagliandiUnifiedSection;

/** @deprecated Dettaglio integrato in MezziHubTagliandiUnifiedSection */
export function MezziHubTagliandiRegistrazioniSection({
  history,
}: {
  history: MaintenanceServiceHistoryView[];
  canEdit?: boolean;
  onToggled?: () => void;
  listPageSize?: number;
}) {
  if (history.length === 0) {
    return <TagliandiHubInsetEmpty message="Nessuna registrazione ancora." />;
  }
  return (
    <TagliandiHubInsetEmpty message="Le registrazioni sono integrate nella tabella scaglioni sopra." />
  );
}

/** Compat: entrambe le sezioni in un unico pannello. */
export function MezziHubTagliandiStoricoPanel({
  mezzo,
  plans,
  history,
  canEdit,
  onToggled,
  listPageSize,
}: {
  mezzo: MezzoGestito;
  plans: MezziHubTagliandiStoricoPlan[];
  history: MaintenanceServiceHistoryView[];
  canEdit: boolean;
  onToggled: () => void;
  listPageSize: number;
}) {
  return (
    <div className="space-y-6">
      <MezziHubTagliandiUnifiedSection
        mezzo={mezzo}
        plans={plans}
        history={history}
        canEdit={canEdit}
        onToggled={onToggled}
      />
    </div>
  );
}

/** @deprecated Usare MezziHubTagliandiStoricoPanel */
export type MezziHubTagliandiMilestonePlan = {
  planId: string;
  planLabel: string;
  intervalOre: number;
  configId?: string | null;
};

/** @deprecated Usare MezziHubTagliandiStoricoPanel */
export function MezziHubTagliandiMilestones(props: {
  mezzo: MezzoGestito;
  plans: MezziHubTagliandiMilestonePlan[];
  history: MaintenanceServiceHistoryView[];
  canEdit: boolean;
  onToggled: () => void;
}) {
  return (
    <MezziHubTagliandiStoricoPanel
      mezzo={props.mezzo}
      plans={props.plans.map((p) => ({
        planId: p.planId,
        planLabel: p.planLabel,
        milestone: { unit: "ore" as MilestoneUnit, interval: p.intervalOre },
        configId: p.configId,
      }))}
      history={props.history}
      canEdit={props.canEdit}
      onToggled={props.onToggled}
      listPageSize={10}
    />
  );
}
