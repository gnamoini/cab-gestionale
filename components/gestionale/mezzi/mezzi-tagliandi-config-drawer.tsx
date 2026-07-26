"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { MaintenancePresetTriggersField } from "@/components/gestionale/maintenance/maintenance-preset-triggers-field";
import {
  MaintenancePresetPartsField,
  planPartsToDraft,
  type MaintenancePresetPartDraft,
} from "@/components/gestionale/maintenance/maintenance-preset-parts-field";
import { isPresetAssignable } from "@/lib/maintenance-plans/maintenance-domain-contract";
import {
  formatTriggerSummary,
  primaryIntervalFromTriggers,
} from "@/lib/maintenance-plans/maintenance-trigger-helpers";
import type { MaintenancePresetTriggerView } from "@/lib/maintenance-plans/types";
import type { UpsertVehicleMaintenanceConfigInput, VehicleMaintenanceConfigView } from "@/lib/maintenance-plans/v2-types";
import { resolveDrawerAsideClasses } from "@/lib/ui/modal-size-system";
import { OverlayLayerPriority } from "@/lib/ui/overlay-back-stack";
import { useGestionaleOverlayBehavior } from "@/lib/ui/use-gestionale-overlay-behavior";
import { dsBtnNeutral, dsBtnPrimary, dsFormField, dsFormInput, dsFormLabel, dsScrollbar } from "@/lib/ui/design-system";
import { useMaintenancePlansListQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useMaintenancePlanUpsertMutation } from "@/src/hooks/gestionale/use-maintenance-plan-mutations";
import { useUpsertMezzoConfigMutation } from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { usePermissions } from "@/src/hooks/use-permissions";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

function triggersFromPlan(plan: {
  triggerGroups: { triggers: MaintenancePresetTriggerView[] }[];
  intervalType: UpsertVehicleMaintenanceConfigInput["intervalType"];
  intervalValue: number;
}): MaintenancePresetTriggerView[] {
  const fromGroups = plan.triggerGroups[0]?.triggers ?? [];
  if (fromGroups.length > 0) return fromGroups.map((t) => ({ ...t }));
  return [{ triggerType: plan.intervalType, threshold: plan.intervalValue, priority: 0 }];
}

export function MezziTagliandiConfigDrawer({
  open,
  mezzoId,
  config,
  onClose,
  onSaved,
}: {
  open: boolean;
  mezzoId: string;
  config: VehicleMaintenanceConfigView | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { validation: toastValidation, error: toastError, successSaved } = useGestionaleToast();
  const mezziPerm = usePermissions("mezzi");
  const canEditPreset = mezziPerm.canWrite;
  const plansQ = useMaintenancePlansListQuery(open);
  const upsertMut = useUpsertMezzoConfigMutation();
  const presetUpsertMut = useMaintenancePlanUpsertMutation();

  const [presetId, setPresetId] = useState<string>("");
  const [triggersDraft, setTriggersDraft] = useState<MaintenancePresetTriggerView[]>([
    { triggerType: "ore", threshold: 500, priority: 0 },
  ]);
  const [savePresetToo, setSavePresetToo] = useState(false);
  const [partsDraft, setPartsDraft] = useState<MaintenancePresetPartDraft[]>([]);

  const activePresets = useMemo(
    () => (plansQ.data ?? []).filter((p) => isPresetAssignable(p.status)),
    [plansQ.data],
  );

  const linkedPlan = config?.presetId ? (plansQ.data ?? []).find((p) => p.id === config.presetId) : null;

  const presetOptions = useMemo(() => {
    if (linkedPlan && !activePresets.some((p) => p.id === linkedPlan.id)) {
      return [...activePresets, linkedPlan];
    }
    return activePresets;
  }, [activePresets, linkedPlan]);

  const selectedPlan = presetOptions.find((p) => p.id === presetId) ?? null;
  const archivedPresetWarning =
    config?.presetId && linkedPlan && !isPresetAssignable(linkedPlan.status);

  useEffect(() => {
    if (!open) return;
    setPresetId(config?.presetId ?? "");
    setSavePresetToo(false);
    if (config?.presetId && plansQ.data) {
      const plan = plansQ.data.find((p) => p.id === config.presetId);
      if (plan) {
        setTriggersDraft(triggersFromPlan(plan));
        setPartsDraft(planPartsToDraft(plan.parts));
      }
    } else if (!config) {
      setTriggersDraft([{ triggerType: "ore", threshold: 500, priority: 0 }]);
      setPartsDraft([]);
    }
  }, [open, config, plansQ.data]);

  useEffect(() => {
    if (!open || config || !selectedPlan) return;
    setTriggersDraft(triggersFromPlan(selectedPlan));
    setPartsDraft(planPartsToDraft(selectedPlan.parts));
  }, [open, config, selectedPlan]);

  useGestionaleOverlayBehavior({
    open,
    onRequestClose: onClose,
    source: "MezziTagliandiConfigDrawer",
    overlayBack: { layer: "drawer", priority: OverlayLayerPriority.drawer },
  });

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!presetId.trim()) {
      toastValidation("Seleziona un preset esistente.");
      return;
    }
    const plan = (plansQ.data ?? []).find((p) => p.id === presetId) ?? selectedPlan;
    if (!plan) {
      toastValidation("Preset non disponibile. Ricarica la pagina e riprova.");
      return;
    }
    if (triggersDraft.length === 0 || triggersDraft.some((t) => t.threshold <= 0)) {
      toastValidation("Configura almeno un intervallo con soglia maggiore di zero.");
      return;
    }
    if (triggersDraft.length > 1 && (!savePresetToo || !canEditPreset)) {
      toastValidation(
        "Per ore+mesi o km+mesi salva anche il preset globale (serve permesso scrittura Mezzi).",
      );
      return;
    }
    const primary = primaryIntervalFromTriggers(triggersDraft);

    try {
      await upsertMut.mutateAsync({
        id: config?.id,
        mezzoId,
        presetId,
        isActive: true,
        intervalType: primary.intervalType,
        intervalValue: primary.intervalValue,
        activatedAt: new Date().toISOString().slice(0, 10),
      });

      if (savePresetToo && canEditPreset) {
        try {
          await presetUpsertMut.mutateAsync({
            id: plan.id,
            nome: plan.nome,
            intervalOre: primary.intervalOre,
            intervalType: primary.intervalType,
            intervalValue: primary.intervalValue,
            status: plan.status,
            isActive: plan.isActive,
            tempoPrevistoMinuti: plan.tempoPrevistoMinuti,
            manodoperaCostoOrario: plan.manodoperaCostoOrario,
            parts: partsDraft.map((p) => ({
              ricambioId: p.ricambioId,
              quantita: p.quantita,
              isRequired: p.isRequired,
              replacementCondition: p.replacementCondition,
              note: p.note,
            })),
            triggerGroups: [
              {
                operator: "OR",
                sortOrder: 0,
                label: "Intervallo principale",
                triggers: triggersDraft,
              },
            ],
            checklist: plan.checklist,
          });
        } catch (presetErr) {
          toastError(presetErr, { entity: "mezzo", action: "update" });
          onSaved();
          onClose();
          return;
        }
      }

      successSaved();
      onSaved();
      onClose();
    } catch (err) {
      toastError(err, { entity: "mezzo", action: "update" });
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/30" role="presentation" onClick={onClose}>
      <aside
        className={`${resolveDrawerAsideClasses("drawerFilter")} ${dsScrollbar} flex h-full flex-col bg-[var(--cab-card)] shadow-xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="tagliandi-config-title"
      >
        <div className="border-b border-[color:var(--cab-border)] px-4 py-3">
          <h2 id="tagliandi-config-title" className="text-base font-semibold">
            {config ? "Modifica piano sul mezzo" : "Aggiungi piano manutentivo"}
          </h2>
          <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
            1) Scegli un preset esistente · 2) Imposta intervalli · 3) Salva · 4) Usa Registra per ogni esecuzione.
          </p>
        </div>
        <form id="tagliandi-config-form" onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {archivedPresetWarning ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              Il preset collegato è archiviato. Scegli un preset attivo o creane uno nuovo.
            </p>
          ) : null}
          <label className={dsFormField}>
            <span className={dsFormLabel}>Preset collegato</span>
            <select
              className={dsFormInput}
              value={presetId}
              required
              onChange={(e) => setPresetId(e.target.value)}
            >
              <option value="" disabled>
                Seleziona preset…
              </option>
              {presetOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({formatTriggerSummary(p.triggerGroups[0]?.triggers ?? [])})
                </option>
              ))}
            </select>
          </label>
          {selectedPlan ? (
            <p className="text-sm text-[color:var(--cab-text-muted)]">
              Piano: <span className="font-medium text-[color:var(--cab-text)]">{selectedPlan.nome}</span>
            </p>
          ) : null}
          <MaintenancePresetTriggersField triggers={triggersDraft} onChange={setTriggersDraft} compact />
          <MaintenancePresetPartsField parts={partsDraft} onChange={setPartsDraft} enabled={open} />
          {canEditPreset ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={savePresetToo} onChange={(e) => setSavePresetToo(e.target.checked)} />
              Salva intervalli anche nel preset globale (riutilizzabile su altri mezzi)
            </label>
          ) : (
            <p className="text-xs text-[color:var(--cab-text-muted)]">
              Le modifiche agli intervalli si applicano solo a questo mezzo.
            </p>
          )}
        </form>
        <div className="flex justify-end gap-2 border-t border-[color:var(--cab-border)] p-4">
          <button type="button" className={dsBtnNeutral} onClick={onClose}>
            Annulla
          </button>
          <LoadingButton
            type="submit"
            form="tagliandi-config-form"
            className={dsBtnPrimary}
            loading={upsertMut.isPending || presetUpsertMut.isPending}
          >
            Salva piano
          </LoadingButton>
        </div>
      </aside>
    </div>
  );
}
