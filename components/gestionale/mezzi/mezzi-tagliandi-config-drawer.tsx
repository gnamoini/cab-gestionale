"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { MaintenancePresetTriggersField } from "@/components/gestionale/maintenance/maintenance-preset-triggers-field";
import {
  MaintenancePresetPartsField,
  planPartsToDraft,
  type MaintenancePresetPartDraft,
} from "@/components/gestionale/maintenance/maintenance-preset-parts-field";
import {
  MAINTENANCE_KINDS,
  MAINTENANCE_KIND_LABELS,
} from "@/lib/maintenance-plans/maintenance-enums";
import {
  formatTriggerSummary,
  primaryIntervalFromTriggers,
} from "@/lib/maintenance-plans/maintenance-trigger-helpers";
import { resolvePlansForMezzo, resolveTipoCatalogId } from "@/lib/maintenance-plans/resolve-plans-for-mezzo";
import type { MaintenancePresetTriggerView } from "@/lib/maintenance-plans/types";
import type { UpsertVehicleMaintenanceConfigInput, VehicleMaintenanceConfigView } from "@/lib/maintenance-plans/v2-types";
import { resolveDrawerAsideClasses } from "@/lib/ui/modal-size-system";
import { OverlayLayerPriority } from "@/lib/ui/overlay-back-stack";
import { useGestionaleOverlayBehavior } from "@/lib/ui/use-gestionale-overlay-behavior";
import { dsBtnNeutral, dsBtnPrimary, dsFormField, dsFormInput, dsFormLabel, dsScrollbar } from "@/lib/ui/design-system";
import {
  useMaintenancePlansCatalogQuery,
  useMaintenancePlansListQuery,
} from "@/src/hooks/gestionale/use-maintenance-plans-queries";
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
  tipoAttrezzatura,
  config,
  onClose,
  onSaved,
}: {
  open: boolean;
  mezzoId: string;
  tipoAttrezzatura: string;
  config: VehicleMaintenanceConfigView | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { validation: toastValidation, error: toastError, successSaved } = useGestionaleToast();
  const mezziPerm = usePermissions("mezzi");
  const canEditPreset = mezziPerm.canWrite;
  const plansQ = useMaintenancePlansListQuery(open);
  const catalogQ = useMaintenancePlansCatalogQuery(open);
  const upsertMut = useUpsertMezzoConfigMutation();
  const presetUpsertMut = useMaintenancePlanUpsertMutation();

  const [presetId, setPresetId] = useState<string>("");
  const [maintenanceKind, setMaintenanceKind] = useState<UpsertVehicleMaintenanceConfigInput["maintenanceKind"]>("tagliando_ore");
  const [label, setLabel] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [triggersDraft, setTriggersDraft] = useState<MaintenancePresetTriggerView[]>([
    { triggerType: "ore", threshold: 500, priority: 0 },
  ]);
  const [savePresetToo, setSavePresetToo] = useState(true);
  const [partsDraft, setPartsDraft] = useState<MaintenancePresetPartDraft[]>([]);

  const applicablePlans = useMemo(() => {
    if (!plansQ.data) return [];
    return resolvePlansForMezzo({
      tipoAttrezzatura,
      catalog: catalogQ.data ?? [],
      plans: plansQ.data,
    });
  }, [plansQ.data, catalogQ.data, tipoAttrezzatura]);

  const selectedPlan = applicablePlans.find((p) => p.id === presetId) ?? null;

  useEffect(() => {
    if (!open) return;
    setPresetId(config?.presetId ?? "");
    setMaintenanceKind(config?.maintenanceKind ?? "tagliando_ore");
    setLabel(config?.label ?? "");
    setIsActive(config?.isActive ?? true);
    setSavePresetToo(true);
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
    setLabel(selectedPlan.nome);
    setMaintenanceKind(selectedPlan.maintenanceKind ?? "tagliando_ore");
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
      let linkedPresetId = presetId || null;

      if (savePresetToo && canEditPreset) {
        if (selectedPlan) {
          await presetUpsertMut.mutateAsync({
            id: selectedPlan.id,
            nome: label.trim() || selectedPlan.nome,
            intervalOre: primary.intervalOre,
            intervalType: primary.intervalType,
            intervalValue: primary.intervalValue,
            maintenanceKind: selectedPlan.maintenanceKind,
            status: selectedPlan.status,
            isActive: selectedPlan.isActive,
            tempoPrevistoMinuti: selectedPlan.tempoPrevistoMinuti,
            manodoperaCostoOrario: selectedPlan.manodoperaCostoOrario,
            tipoAttrezzaturaIds: [...selectedPlan.tipoIds],
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
            checklist: selectedPlan.checklist,
          });
          linkedPresetId = selectedPlan.id;
        } else {
          const nome = label.trim() || `Piano ${tipoAttrezzatura}`;
          const tipoAttrezzaturaId = resolveTipoCatalogId(tipoAttrezzatura, catalogQ.data ?? []);
          if (!tipoAttrezzaturaId) {
            toastValidation("Tipo attrezzatura non presente nel catalogo. Verrà sincronizzato automaticamente al salvataggio.");
            return;
          }
          const created = await presetUpsertMut.mutateAsync({
            nome,
            intervalOre: primary.intervalOre,
            intervalType: primary.intervalType,
            intervalValue: primary.intervalValue,
            maintenanceKind,
            status: "active",
            isActive: true,
            tipoAttrezzaturaIds: [tipoAttrezzaturaId],
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
            checklist: [],
          });
          linkedPresetId = created.id ?? null;
        }
      }

      await upsertMut.mutateAsync({
        id: config?.id,
        mezzoId,
        presetId: linkedPresetId,
        maintenanceKind,
        isActive,
        intervalType: primary.intervalType,
        intervalValue: primary.intervalValue,
        label: label.trim() || undefined,
        activatedAt: new Date().toISOString().slice(0, 10),
      });
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
            1) Scegli o crea preset · 2) Imposta intervalli · 3) Salva · 4) Usa Registra per ogni esecuzione.
          </p>
        </div>
        <form id="tagliandi-config-form" onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {applicablePlans.length === 0 && !plansQ.isLoading ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              Nessun preset per «{tipoAttrezzatura}». Crea un piano qui sotto o in Mezzi → Tagliandi → Preset.
            </p>
          ) : null}
          <label className={dsFormField}>
            <span className={dsFormLabel}>Preset collegato</span>
            <select className={dsFormInput} value={presetId} onChange={(e) => setPresetId(e.target.value)}>
              <option value="">Nuovo preset per questo mezzo</option>
              {applicablePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({formatTriggerSummary(p.triggerGroups[0]?.triggers ?? [])})
                </option>
              ))}
            </select>
          </label>
          <label className={dsFormField}>
            <span className={dsFormLabel}>Nome / etichetta</span>
            <input className={dsFormInput} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Es. Tagliando 500h / 12 mesi" />
          </label>
          <label className={dsFormField}>
            <span className={dsFormLabel}>Tipo manutenzione</span>
            <select
              className={dsFormInput}
              value={maintenanceKind}
              onChange={(e) => setMaintenanceKind(e.target.value as UpsertVehicleMaintenanceConfigInput["maintenanceKind"])}
            >
              {MAINTENANCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {MAINTENANCE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
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
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Piano attivo su questo mezzo
          </label>
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
