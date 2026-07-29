"use client";

import { useMemo, useState } from "react";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableHeadLabel,
} from "@/components/gestionale/global-table";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { IconActionButton } from "@/components/design-system";
import { HubIconTrash } from "@/components/design-system/hub-table-action-icons";
import { MezziHubTabEmpty } from "@/components/gestionale/mezzi/mezzi-hub-ui";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { MaintenancePresetEditorModal } from "@/components/gestionale/maintenance/maintenance-preset-editor-modal";
import { MezziTagliandiAssignExistingModal } from "@/components/gestionale/mezzi/mezzi-tagliandi-assign-existing-modal";
import {
  MezziHubTagliandiUnifiedSection,
} from "@/components/gestionale/mezzi/mezzi-hub-tagliandi-milestones";
import {
  TAGLIANDO_STATO_BADGE_CLASS,
  TAGLIANDO_STATO_LABELS,
  TAGLIANDO_STATO_ROW_CLASS,
  mapUrgencyToTagliandoStato,
} from "@/lib/maintenance-plans/tagliando-stato-labels";
import { useMaintenanceEngineV2Enabled } from "@/lib/officina/use-maintenance-engine-v2-enabled";
import { isPresetAssignable } from "@/lib/maintenance-plans/maintenance-domain-contract";
import {
  formatTriggerSummary,
  primaryIntervalFromTriggers,
} from "@/lib/maintenance-plans/maintenance-trigger-helpers";
import { emptyPlanDraft } from "@/lib/maintenance-plans/preset-editor-draft";
import {
  remainingMeterToNextFromConfig,
  resolveMilestoneInterval,
} from "@/lib/maintenance-plans/tagliando-milestone-resolution";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { VehicleMaintenanceConfigView } from "@/lib/maintenance-plans/v2-types";
import {
  gestionaleListTableRowBaseClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdCenter,
  gestionaleListTableTdPill,
  gestionaleListTableActionsGroupEnd,
} from "@/lib/ui/gestionale-list-table";
import {
  dsBtnNeutral,
  dsPageToolbarCtaCompact,
  dsTableActionBtnDanger,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";
import {
  useMezzoMaintenanceHistoryQuery,
  useMezzoMaintenanceStatusesQuery,
  useMaintenancePlansListQuery,
} from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import {
  useMezzoMaintenanceConfigsQuery,
  useDeleteMezzoConfigMutation,
  useUpsertMezzoConfigMutation,
} from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const hubTagliandiSecondaryCtaClass = `${dsBtnNeutral} h-11 shrink-0 px-3 text-xs font-semibold sm:px-4`;

const HUB_TAGLIANDI_STACK = "space-y-5";
const HUB_TAGLIANDI_CARD_CLASS = "!p-4 sm:!p-5";
/** Card Tagliandi: sempre aperta, sfondo più contrastato. */
const HUB_TAGLIANDI_SECTION_CARD_CLASS =
  `${HUB_TAGLIANDI_CARD_CLASS} !bg-[var(--cab-card)]`;

function TagliandiPresetEmpty({ canEdit }: { canEdit: boolean }) {
  return (
    <div className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-4 py-6 text-center">
      <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun preset assegnato a questo mezzo.</p>
      {canEdit ? (
        <p className="mt-2 text-xs text-[color:var(--cab-text-muted)]">
          Usa <strong className="text-[color:var(--cab-text)]">Assegna preset</strong> per collegare un piano già
          esistente, oppure <strong className="text-[color:var(--cab-text)]">Crea preset</strong> per definirne uno
          nuovo e assegnarlo subito.
        </p>
      ) : null}
    </div>
  );
}

function configDisplayName(c: VehicleMaintenanceConfigView, planNome?: string): string {
  return (planNome ?? c.presetNome?.trim()) || "Piano senza nome";
}

function intervalFromPlan(plan: MaintenancePlanView) {
  const triggers = plan.triggerGroups[0]?.triggers ?? [];
  if (triggers.length > 0) return primaryIntervalFromTriggers(triggers);
  return {
    intervalType: plan.intervalType,
    intervalValue: plan.intervalValue,
    intervalOre: plan.intervalOre,
  };
}

function buildStoricoPlansFromConfigs(
  configs: VehicleMaintenanceConfigView[],
  plans: { id: string; nome: string; triggerGroups: { triggers: { triggerType: string; threshold: number }[] }[] }[],
) {
  return configs
    .filter((c) => c.presetId)
    .map((c) => {
      const plan = plans.find((p) => p.id === c.presetId);
      const milestone = resolveMilestoneInterval({
        intervalType: c.intervalType,
        intervalValue: c.intervalValue,
        planTriggers: plan?.triggerGroups[0]?.triggers,
      });
      if (!milestone) return null;
      return {
        planId: c.presetId!,
        planLabel: configDisplayName(c, plan?.nome),
        milestone,
        configId: c.id,
        nextDateEstimated: c.nextDateEstimated,
        remainingMeterToNext: remainingMeterToNextFromConfig(c, milestone.unit),
        nextTagliandoHint: {
          explainability: c.explainability,
          remainingValue: c.remainingValue,
          nextDateEstimated: c.nextDateEstimated,
          currentValue: c.currentValue,
          triggerReason: c.triggerReason,
          urgency: c.urgency,
        },
      };
    })
    .filter((p): p is NonNullable<typeof p> => p != null);
}

function HubConfigRowActions({
  deletePending,
  onDelete,
}: {
  deletePending: boolean;
  onDelete: () => void;
}) {
  return (
    <IconActionButton
      label="Rimuovi"
      tooltipForce
      className={dsTableActionBtnDanger}
      disabled={deletePending}
      onClick={onDelete}
    >
      <HubIconTrash className={dsTableActionGlyph} />
    </IconActionButton>
  );
}

function refetchTagliandi(
  refetchers: Array<{ refetch: () => unknown }>,
) {
  for (const q of refetchers) void q.refetch();
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

  const statuses = statusesQ.data ?? [];
  const history = historyQ.data ?? [];
  const storicoPlans = useMemo(
    () =>
      statuses.map((s) => ({
        planId: s.planId,
        planLabel: s.planNome,
        milestone: { unit: "ore" as const, interval: s.intervalOre },
      })),
    [statuses],
  );
  const onToggled = () => refetchTagliandi([statusesQ, historyQ]);

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
    <div className={HUB_TAGLIANDI_STACK}>
      <GestionaleInfoCard title="Preset sul mezzo" className={HUB_TAGLIANDI_CARD_CLASS} collapsible defaultCollapsed={false}>
        <GestionaleListTable
          fixed
          headRow={
            <>
              <GlobalTableHeadLabel label="Piano" />
              <GlobalTableHeadLabel label="Intervallo" />
              <GlobalTableHeadLabel label="Ultimo" align="center" />
              <GlobalTableHeadLabel label="Prossimo" align="center" />
              <GlobalTableHeadLabel label="Mancanti" align="center" />
            </>
          }
        >
          {statuses.map((s) => (
            <tr key={s.planId} className={gestionaleListTableRowBaseClass}>
              <td className={`${gestionaleListTableTd} font-medium text-[color:var(--cab-text)]`}>{s.planNome}</td>
              <td className={`${gestionaleListTableTd} font-mono tabular-nums text-[color:var(--cab-text-muted)]`}>
                {s.intervalOre} h
              </td>
              <td className={`${gestionaleListTableTdCenter} font-mono tabular-nums`}>
                {s.ultimoOre != null ? `${s.ultimoOre} h` : "—"}
              </td>
              <td className={`${gestionaleListTableTdCenter} font-mono tabular-nums`}>{s.prossimoOre} h</td>
              <td className={`${gestionaleListTableTdCenter} font-mono tabular-nums`}>{s.oreMancanti} h</td>
            </tr>
          ))}
        </GestionaleListTable>
      </GestionaleInfoCard>

      <GestionaleInfoCard title="Tagliandi" className={HUB_TAGLIANDI_SECTION_CARD_CLASS}>
        <MezziHubTagliandiUnifiedSection
          mezzo={mezzo}
          plans={storicoPlans}
          history={history}
          canEdit={canEdit}
          onToggled={onToggled}
        />
      </GestionaleInfoCard>
    </div>
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
  const deleteMut = useDeleteMezzoConfigMutation();
  const upsertConfigMut = useUpsertMezzoConfigMutation();
  const gestToast = useGestionaleToast();

  const [assignOpen, setAssignOpen] = useState(false);
  const [guidedAssignOpen, setGuidedAssignOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VehicleMaintenanceConfigView | null>(null);

  const configs = configsQ.data ?? [];
  const history = historyQ.data ?? [];
  const storicoPlans = useMemo(
    () => buildStoricoPlansFromConfigs(configs, plansQ.data ?? []),
    [configs, plansQ.data],
  );
  const deletePending = deleteMut.isPending;
  const onToggled = () => refetchTagliandi([configsQ, historyQ]);

  async function confirmDeletePlan() {
    if (!deleteTarget) return;
    const nome = configDisplayName(
      deleteTarget,
      (plansQ.data ?? []).find((p) => p.id === deleteTarget.presetId)?.nome,
    );
    try {
      await deleteMut.mutateAsync({ configId: deleteTarget.id, mezzoId: mezzo.id });
      gestToast.successOnce(`delete-plan-${deleteTarget.id}`, `Piano "${nome}" rimosso dal mezzo.`);
      setDeleteTarget(null);
    } catch (err) {
      gestToast.error(err, { entity: "mezzo", action: "delete" });
    }
  }

  async function assignCreatedPlan(plan: MaintenancePlanView) {
    const primary = intervalFromPlan(plan);
    await upsertConfigMut.mutateAsync({
      mezzoId: mezzo.id,
      presetId: plan.id,
      isActive: true,
      intervalType: primary.intervalType,
      intervalValue: primary.intervalValue,
      activatedAt: new Date().toISOString().slice(0, 10),
    });
    gestToast.successOnce(
      `create-assign-${mezzo.id}-${plan.id}`,
      `Preset "${plan.nome}" creato e assegnato al mezzo.`,
    );
    await configsQ.refetch();
  }

  if (configsQ.isLoading || historyQ.isLoading) {
    return <MezziHubTabEmpty message="Caricamento piani manutentivi…" />;
  }
  if (configsQ.isError) {
    return <MezziHubTabEmpty message="Errore caricamento piani manutentivi." />;
  }

  const assignPrimary = configs.length === 0;
  const presetActions = canEdit ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        className={assignPrimary ? dsPageToolbarCtaCompact : hubTagliandiSecondaryCtaClass}
        onClick={() => setAssignOpen(true)}
      >
        Assegna preset
      </button>
      <button
        type="button"
        className={assignPrimary ? hubTagliandiSecondaryCtaClass : dsPageToolbarCtaCompact}
        onClick={() => setCreateOpen(true)}
      >
        Crea preset
      </button>
    </div>
  ) : null;

  return (
    <div className={HUB_TAGLIANDI_STACK}>
      <GestionaleInfoCard
        title="Preset sul mezzo"
        actions={presetActions}
        className={HUB_TAGLIANDI_CARD_CLASS}
        collapsible
        defaultCollapsed={false}
      >
        {configs.length === 0 ? (
          <TagliandiPresetEmpty canEdit={canEdit} />
        ) : (
          <GestionaleListTable
            fixed
            colgroup={
              <>
                <col className="w-[40%]" />
                <col className="w-[26%]" />
                <col className="w-[9rem]" />
                {canEdit ? <col className="w-[9.5rem] min-w-[9.5rem]" /> : null}
              </>
            }
            headRow={
              <>
                <GlobalTableHeadLabel label="Preset" />
                <GlobalTableHeadLabel label="Intervallo" />
                <GlobalTableHeadLabel label="Stato" align="center" />
                {canEdit ? <GestionaleListTableActionsHead /> : null}
              </>
            }
          >
            {configs.map((c) => {
              const stato = mapUrgencyToTagliandoStato(c.urgency);
              const plan = (plansQ.data ?? []).find((p) => p.id === c.presetId);
              const archivedPreset = c.presetId && plan && !isPresetAssignable(plan.status);
              const pianoLabel = configDisplayName(c, plan?.nome);
              return (
                <tr
                  key={c.id}
                  className={`${gestionaleListTableRowBaseClass} ${TAGLIANDO_STATO_ROW_CLASS[stato]}`}
                >
                  <td
                    className={`${gestionaleListTableTd} min-w-0 py-2 font-medium text-[color:var(--cab-text)]`}
                  >
                    <span className="line-clamp-2 leading-snug">{pianoLabel}</span>
                    {!c.presetId ? (
                      <span className="mt-0.5 block text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        Preset mancante
                      </span>
                    ) : null}
                    {archivedPreset ? (
                      <span className="mt-0.5 block text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        Preset archiviato
                      </span>
                    ) : null}
                  </td>
                  <td className={`${gestionaleListTableTd} py-2 text-sm font-medium tabular-nums text-[color:var(--cab-text)]`}>
                    {formatTriggerSummary(
                      plan?.triggerGroups[0]?.triggers ?? [
                        { triggerType: c.intervalType, threshold: c.intervalValue, priority: 0 },
                      ],
                    )}
                  </td>
                  <td className={gestionaleListTableTdPill}>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TAGLIANDO_STATO_BADGE_CLASS[stato]}`}
                    >
                      {TAGLIANDO_STATO_LABELS[stato]}
                    </span>
                  </td>
                  {canEdit ? (
                    <td className={gestionaleListTableTdAzioni}>
                      <div className={gestionaleListTableActionsGroupEnd}>
                        <HubConfigRowActions
                          deletePending={deletePending}
                          onDelete={() => setDeleteTarget(c)}
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </GestionaleListTable>
        )}
      </GestionaleInfoCard>

      <GestionaleInfoCard title="Tagliandi" className={HUB_TAGLIANDI_SECTION_CARD_CLASS}>
        <MezziHubTagliandiUnifiedSection
          mezzo={mezzo}
          plans={storicoPlans}
          history={history}
          canEdit={canEdit}
          onToggled={onToggled}
          hasConfigs={configs.length > 0}
          onRequestAssignPreset={() => setGuidedAssignOpen(true)}
        />
      </GestionaleInfoCard>

      <MezziTagliandiAssignExistingModal
        mezzoId={mezzo.id}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => {
          void configsQ.refetch();
          void historyQ.refetch();
        }}
        excludePresetIds={configs.map((c) => c.presetId).filter((id): id is string => Boolean(id?.trim()))}
        variant="toolbar"
      />

      <MezziTagliandiAssignExistingModal
        mezzoId={mezzo.id}
        open={guidedAssignOpen}
        onClose={() => setGuidedAssignOpen(false)}
        onAssigned={() => {
          void configsQ.refetch();
          void historyQ.refetch();
        }}
        excludePresetIds={configs.map((c) => c.presetId).filter((id): id is string => Boolean(id?.trim()))}
        variant="guided"
      />

      <MaintenancePresetEditorModal
        open={createOpen}
        initial={emptyPlanDraft()}
        onClose={() => setCreateOpen(false)}
        onSaved={assignCreatedPlan}
      />

      <GestionaleConfirmDialog
        open={deleteTarget != null}
        title="Eliminare piano dal mezzo?"
        subtitle={
          deleteTarget
            ? configDisplayName(
                deleteTarget,
                (plansQ.data ?? []).find((p) => p.id === deleteTarget.presetId)?.nome,
              )
            : undefined
        }
        message="Il piano verrà rimosso da questo mezzo. Lo storico tagliandi già registrato resta invariato."
        confirmLabel={deletePending ? "Eliminazione…" : "Elimina piano"}
        destructive
        pending={deletePending}
        layerClassName={cabModalZConfirm}
        onCancel={() => {
          if (deletePending) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDeletePlan()}
      />
    </div>
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
