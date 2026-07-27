"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { isPresetAssignable } from "@/lib/maintenance-plans/maintenance-domain-contract";
import { primaryIntervalFromTriggers } from "@/lib/maintenance-plans/maintenance-trigger-helpers";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";
import { dsBtnNeutral, dsBtnPrimary, dsFormField, dsFormLabel, dsInput } from "@/lib/ui/design-system";
import { useUpsertMezzoConfigMutation } from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useMaintenancePlansListQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const presetPickerSelectClass = `${dsInput} min-h-11 py-2 text-sm font-semibold`;

function intervalFromPlan(plan: MaintenancePlanView) {
  const triggers = plan.triggerGroups[0]?.triggers ?? [];
  if (triggers.length > 0) return primaryIntervalFromTriggers(triggers);
  return {
    intervalType: plan.intervalType,
    intervalValue: plan.intervalValue,
    intervalOre: plan.intervalOre,
  };
}

export function MezziTagliandiAssignExistingModal({
  mezzoId,
  open,
  onClose,
  onAssigned,
  /** Preset già collegati a questo mezzo — esclusi dal picker. */
  excludePresetIds = [],
}: {
  mezzoId: string;
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
  excludePresetIds?: readonly string[];
}) {
  const { validation: toastValidation, error: toastError, successOnce } = useGestionaleToast();
  const [presetId, setPresetId] = useState("");
  const openedRef = useRef(false);

  const plansQ = useMaintenancePlansListQuery(open);
  const upsertMut = useUpsertMezzoConfigMutation();

  const excluded = useMemo(() => {
    const ids = new Set<string>();
    for (const id of excludePresetIds) {
      const t = id.trim();
      if (t) ids.add(t);
    }
    return ids;
  }, [excludePresetIds]);

  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;
    setPresetId("");
  }, [open]);

  const assignablePresets = useMemo(
    () => (plansQ.data ?? []).filter((p) => isPresetAssignable(p.status) && !excluded.has(p.id)),
    [plansQ.data, excluded],
  );

  const presetItems = useMemo(
    () => [
      { value: "", label: "Seleziona preset…" },
      ...assignablePresets.map((p) => ({ value: p.id, label: p.nome })),
    ],
    [assignablePresets],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!presetId.trim()) {
      toastValidation("Seleziona un preset esistente.");
      return;
    }
    const plan = assignablePresets.find((p) => p.id === presetId);
    if (!plan) {
      toastValidation("Preset non disponibile. Ricarica la pagina e riprova.");
      return;
    }
    const primary = intervalFromPlan(plan);
    try {
      await upsertMut.mutateAsync({
        mezzoId,
        presetId: plan.id,
        isActive: true,
        intervalType: primary.intervalType,
        intervalValue: primary.intervalValue,
        activatedAt: new Date().toISOString().slice(0, 10),
      });
      successOnce(`assign-preset-${mezzoId}-${plan.id}`, `Preset "${plan.nome}" assegnato al mezzo.`);
      onAssigned();
      onClose();
    } catch (err) {
      toastError(err, { entity: "mezzo", action: "update" });
    }
  }

  if (!open) return null;

  return (
    <GestionaleModalShell
      onRequestClose={onClose}
      title="Assegna preset"
      titleId="mezzi-tagliandi-assign-existing-title"
      modalSize="formSmall"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <button type="button" className={dsBtnNeutral} onClick={onClose} disabled={upsertMut.isPending}>
            Annulla
          </button>
          <LoadingButton
            type="submit"
            form="mezzi-tagliandi-assign-existing-form"
            className={dsBtnPrimary}
            loading={upsertMut.isPending}
          >
            Assegna
          </LoadingButton>
        </div>
      }
    >
      <GestionaleModalScrollBody>
        <form id="mezzi-tagliandi-assign-existing-form" className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div className={dsFormField}>
            <label className={dsFormLabel} htmlFor="mezzi-tagliandi-assign-existing-preset">
              Preset
            </label>
            <GlobalSelect
              id="mezzi-tagliandi-assign-existing-preset"
              variant="filter"
              inputClassName={presetPickerSelectClass}
              value={presetId}
              onChange={setPresetId}
              items={presetItems}
              strictFromList
              selectOnly
              disabled={plansQ.isLoading || upsertMut.isPending}
              aria-label="Seleziona preset da assegnare"
            />
            {plansQ.isError ? (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">Errore caricamento preset.</p>
            ) : null}
            {!plansQ.isLoading && !plansQ.isError && assignablePresets.length === 0 ? (
              <p className="mt-2 text-xs text-[color:var(--cab-text-muted)]">
                {excluded.size > 0
                  ? "Tutti i preset attivi sono già assegnati a questo mezzo. Crea un nuovo preset se serve."
                  : "Nessun preset attivo disponibile. Crea un nuovo preset dal mezzo."}
              </p>
            ) : null}
          </div>
        </form>
      </GestionaleModalScrollBody>
    </GestionaleModalShell>
  );
}
