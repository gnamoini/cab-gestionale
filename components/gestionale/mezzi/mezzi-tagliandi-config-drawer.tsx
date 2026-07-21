"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import {
  MAINTENANCE_INTERVAL_TYPES,
  MAINTENANCE_KINDS,
  MAINTENANCE_KIND_LABELS,
} from "@/lib/maintenance-plans/maintenance-enums";
import type { UpsertVehicleMaintenanceConfigInput, VehicleMaintenanceConfigView } from "@/lib/maintenance-plans/v2-types";
import { resolveDrawerAsideClasses } from "@/lib/ui/modal-size-system";
import { OverlayLayerPriority } from "@/lib/ui/overlay-back-stack";
import { useGestionaleOverlayBehavior } from "@/lib/ui/use-gestionale-overlay-behavior";
import { dsBtnNeutral, dsBtnPrimary, dsFormField, dsFormInput, dsFormLabel, dsScrollbar } from "@/lib/ui/design-system";
import { useMaintenancePlansListQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useUpsertMezzoConfigMutation } from "@/src/hooks/gestionale/use-maintenance-engine-v2";

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
  const plansQ = useMaintenancePlansListQuery(open);
  const upsertMut = useUpsertMezzoConfigMutation();

  const [presetId, setPresetId] = useState<string>("");
  const [maintenanceKind, setMaintenanceKind] = useState<UpsertVehicleMaintenanceConfigInput["maintenanceKind"]>("tagliando_ore");
  const [intervalType, setIntervalType] = useState<UpsertVehicleMaintenanceConfigInput["intervalType"]>("ore");
  const [intervalValue, setIntervalValue] = useState("500");
  const [label, setLabel] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setPresetId(config?.presetId ?? "");
    setMaintenanceKind(config?.maintenanceKind ?? "tagliando_ore");
    setIntervalType(config?.intervalType ?? "ore");
    setIntervalValue(String(config?.intervalValue ?? 500));
    setLabel(config?.label ?? "");
    setIsActive(config?.isActive ?? true);
  }, [open, config]);

  useEffect(() => {
    const plan = (plansQ.data ?? []).find((p) => p.id === presetId);
    if (plan && !config) {
      setIntervalValue(String(plan.intervalOre));
      setLabel(plan.nome);
    }
  }, [presetId, plansQ.data, config]);

  useGestionaleOverlayBehavior({
    open,
    onRequestClose: onClose,
    source: "MezziTagliandiConfigDrawer",
    overlayBack: { layer: "drawer", priority: OverlayLayerPriority.drawer },
  });

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(intervalValue);
    if (!Number.isFinite(value) || value <= 0) return;

    await upsertMut.mutateAsync({
      id: config?.id,
      mezzoId,
      presetId: presetId || null,
      maintenanceKind,
      isActive,
      intervalType,
      intervalValue: value,
      label: label.trim() || undefined,
      activatedAt: new Date().toISOString().slice(0, 10),
    });
    onSaved();
    onClose();
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
            {config ? "Modifica piano" : "Nuovo piano manutentivo"}
          </h2>
        </div>
        <form id="tagliandi-config-form" onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <label className={dsFormField}>
            <span className={dsFormLabel}>Preset</span>
            <select
              className={dsFormInput}
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
            >
              <option value="">Configurazione personalizzata</option>
              {(plansQ.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.intervalOre} h)
                </option>
              ))}
            </select>
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
          <label className={dsFormField}>
            <span className={dsFormLabel}>Intervallo</span>
            <div className="flex gap-2">
              <select
                className={`${dsFormInput} w-28`}
                value={intervalType}
                onChange={(e) => setIntervalType(e.target.value as UpsertVehicleMaintenanceConfigInput["intervalType"])}
              >
                {MAINTENANCE_INTERVAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                className={dsFormInput}
                type="number"
                min={1}
                value={intervalValue}
                onChange={(e) => setIntervalValue(e.target.value)}
              />
            </div>
          </label>
          <label className={dsFormField}>
            <span className={dsFormLabel}>Etichetta</span>
            <input className={dsFormInput} value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Piano attivo
          </label>
        </form>
        <div className="flex justify-end gap-2 border-t border-[color:var(--cab-border)] p-4">
          <button type="button" className={dsBtnNeutral} onClick={onClose}>
            Annulla
          </button>
          <LoadingButton type="submit" form="tagliandi-config-form" className={dsBtnPrimary} loading={upsertMut.isPending}>
            Salva
          </LoadingButton>
        </div>
      </aside>
    </div>
  );
}
