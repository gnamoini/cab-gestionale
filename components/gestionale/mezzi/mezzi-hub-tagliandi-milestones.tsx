"use client";

import { useMemo } from "react";
import { IconActionButton } from "@/components/design-system";
import { HubIconOpen } from "@/components/design-system/hub-table-action-icons";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableHeadLabel,
} from "@/components/gestionale/global-table";
import type { MaintenanceServiceHistoryView } from "@/lib/maintenance-plans/types";
import {
  buildAnchoredHubMilestones,
  estimateHubMilestoneDueDate,
  formatMilestoneThreshold,
  historyToAnchoredExecutions,
  mezzoMeteringFromGestito,
  type AnchoredHubMilestoneRow,
  type MilestoneUnit,
  type ResolvedMilestoneInterval,
} from "@/lib/maintenance-plans/tagliando-milestone-resolution";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { buildPreventiviLavorazioneFocusHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import {
  gestionaleListTableRowBaseClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdCenter,
  gestionaleListTableActionsGroupEnd,
} from "@/lib/ui/gestionale-list-table";
import {
  dsCheckboxInput,
  dsTableActionBtnPrimary,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import { useToggleTagliandiMatrixCellMutation } from "@/src/hooks/gestionale/use-maintenance-plan-mutations";
import { useRecomputeForecastMutation } from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

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
  /** Forecast SSOT dal config mezzo (prossimo due). */
  nextDateEstimated?: string | null;
  remainingMeterToNext?: number | null;
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

  const executions = useMemo(
    () => historyToAnchoredExecutions(planHistory, plan.milestone.unit),
    [planHistory, plan.milestone.unit],
  );

  const milestones = useMemo(
    () =>
      buildAnchoredHubMilestones({
        interval: plan.milestone.interval,
        currentValue,
        executions,
      }),
    [plan.milestone.interval, currentValue, executions],
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

  return (
    <div className="space-y-3">
      <h4 className="min-w-0 truncate text-base font-semibold leading-snug text-[color:var(--cab-text)]">
        {plan.planLabel}
      </h4>
      <GestionaleListTable
        fixed
        colgroup={
          <>
            <col className="w-[2.75rem]" />
            <col />
            <col className="w-[4.75rem]" />
            <col className="w-[7rem]" />
            <col className="w-[5.5rem]" />
          </>
        }
        headRow={
          <>
            <GlobalTableHeadLabel label="N°" align="center" />
            <GlobalTableHeadLabel label="Soglia" />
            <GlobalTableHeadLabel label="Fatto" align="center" />
            <GlobalTableHeadLabel label="Origine" align="center" />
            <GestionaleListTableActionsHead />
          </>
        }
      >
        {milestones.map((milestone, index) => {
          const historyRow = milestone.serviceId ? historyByServiceId.get(milestone.serviceId) : undefined;
          const lockedDone = milestone.done && (!canManuallyUncheck(historyRow) || milestone.synthetic);
          const disabled = !canEdit || toggleMut.isPending || lockedDone;
          const rowKey = `${milestone.done ? "done" : "future"}-${milestone.value}-${milestone.serviceId ?? index}`;
          const sogliaLabel = formatMilestoneThreshold(plan.milestone.unit, milestone.value);
          const lavorazioneId =
            (historyRow?.lavorazioneId ?? milestone.lavorazioneId)?.trim() || "";
          const dueYmd = estimateHubMilestoneDueDate({
            done: milestone.done,
            performedAt: milestone.performedAt ?? historyRow?.performedAt,
            milestoneValue: milestone.value,
            currentValue,
            interval: plan.milestone.interval,
            unit: plan.milestone.unit,
            executions,
            nextDateEstimated: plan.nextDateEstimated,
            remainingMeterToNext: plan.remainingMeterToNext,
          });
          const sogliaDate = fmtDateIt(dueYmd ?? undefined);
          const sogliaDateClass = milestone.done
            ? "mt-1 text-xs font-semibold text-[color:var(--cab-primary)]"
            : milestone.state === "overdue"
              ? "mt-1 text-xs font-semibold text-amber-700 dark:text-amber-200"
              : "mt-1 text-xs font-medium text-[color:var(--cab-text)]";

          return (
            <tr key={rowKey} className={`${gestionaleListTableRowBaseClass} ${SCAGLIONI_ROW_CLASS[milestone.state]}`}>
              <td
                className={`${gestionaleListTableTdCenter} py-3 font-mono text-xs font-semibold tabular-nums text-[color:var(--cab-text)]`}
              >
                {index + 1}
              </td>
              <td className={`${gestionaleListTableTd} py-3`}>
                <div className="text-sm font-semibold tabular-nums text-[color:var(--cab-text)]">
                  {sogliaLabel}
                </div>
                {sogliaDate ? <div className={sogliaDateClass}>{sogliaDate}</div> : null}
              </td>
              <td className={`${gestionaleListTableTdCenter} py-3`}>
                <input
                  type="checkbox"
                  className={dsCheckboxInput}
                  checked={milestone.done}
                  disabled={disabled}
                  title={lockedDone ? "Registrato da lavorazione" : undefined}
                  aria-label={`Tagliando ${sogliaLabel} ${milestone.done ? "eseguito" : "da eseguire"}`}
                  onChange={(e) => void handleToggle(milestone, e.target.checked)}
                />
              </td>
              <td className={`${gestionaleListTableTdCenter} py-3 text-xs text-[color:var(--cab-text)]`}>
                {milestone.done ? originLabel(historyRow) : "—"}
              </td>
              <td className={gestionaleListTableTdAzioni}>
                <div className={gestionaleListTableActionsGroupEnd}>
                  {lavorazioneId ? (
                    <IconActionButton
                      as="link"
                      href={buildPreventiviLavorazioneFocusHref(lavorazioneId, "storico")}
                      label="Apri lavorazione"
                      tooltipForce
                      className={dsTableActionBtnPrimary}
                    >
                      <HubIconOpen className={dsTableActionGlyph} />
                    </IconActionButton>
                  ) : null}
                </div>
              </td>
            </tr>
          );
        })}
      </GestionaleListTable>
    </div>
  );
}

/** Tabella scaglioni tagliandi. */
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

  if (scaglioniPlans.length === 0) {
    return (
      <TagliandiHubInsetEmpty message="Nessuno scaglione ore/km sui preset assegnati. Configura un intervallo ore o km nel preset." />
    );
  }

  return (
    <div className="space-y-5">
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
