"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  GestionaleModalFooterActions,
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterSaveButton,
} from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { MaintenancePresetTriggersField } from "@/components/gestionale/maintenance/maintenance-preset-triggers-field";
import { MaintenancePresetPartsField } from "@/components/gestionale/maintenance/maintenance-preset-parts-field";
import {
  MAINTENANCE_PRESET_STATUSES,
  MAINTENANCE_PRESET_STATUS_LABELS,
} from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenancePresetStatus } from "@/lib/maintenance-plans/maintenance-enums";
import {
  emptyPlanDraft,
  planDraftToUpsertInput,
  type PlanDraft,
} from "@/lib/maintenance-plans/preset-editor-draft";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";
import { dsFormField, dsFormInput, dsFormLabel, dsInput } from "@/lib/ui/design-system";
import { useMaintenancePlanUpsertMutation } from "@/src/hooks/gestionale/use-maintenance-plan-mutations";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const statusItems = MAINTENANCE_PRESET_STATUSES.map((s) => ({
  value: s,
  label: MAINTENANCE_PRESET_STATUS_LABELS[s],
}));

const statusSelectClass = `${dsInput} min-h-11 py-2 text-sm font-semibold`;

const presetFormSectionClass =
  "rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_45%,var(--cab-card))] p-4 shadow-[var(--cab-shadow-sm)]";

export function MaintenancePresetEditorModal({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: PlanDraft | null;
  onClose: () => void;
  /** Called after successful upsert; when set, skips default success toast (caller owns feedback). */
  onSaved?: (plan: MaintenancePlanView) => void | Promise<void>;
}) {
  const { validation: toastValidation, error: toastError, successSaved } = useGestionaleToast();
  const [draft, setDraft] = useState(() => initial ?? emptyPlanDraft());
  const upsertMut = useMaintenancePlanUpsertMutation();
  const editorOpenedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      editorOpenedRef.current = false;
      return;
    }
    if (editorOpenedRef.current) return;
    editorOpenedRef.current = true;
    setDraft(initial ?? emptyPlanDraft());
  }, [open, initial]);

  const inUseCount = draft.assignedMezziCount ?? 0;
  const showAssignedBanner = Boolean(draft.id && inUseCount > 0);

  async function savePlan() {
    const payload = planDraftToUpsertInput(draft);
    try {
      const plan = await upsertMut.mutateAsync(payload);
      if (onSaved) {
        await onSaved(plan);
      } else {
        successSaved();
      }
      onClose();
    } catch (err) {
      toastError(err, { entity: "mezzo", action: "update" });
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.nome.trim()) {
      toastValidation("Inserisci il nome del preset.");
      return;
    }
    if (draft.triggersDraft.length === 0 || draft.triggersDraft.some((t) => t.threshold <= 0)) {
      toastValidation("Configura almeno un trigger con soglia valida.");
      return;
    }
    void savePlan();
  }

  if (!open) return null;

  return (
    <>
      <GestionaleModalShell
        onRequestClose={onClose}
        title={draft.id ? "Modifica preset tagliando" : "Nuovo preset tagliando"}
        titleId="maintenance-preset-editor-title"
        modalSize="formLarge"
        footer={
          <GestionaleModalFooterActions>
            <GestionaleModalFooterCancelButton onClick={onClose} />
            <GestionaleModalFooterSaveButton type="submit" form="maintenance-preset-form" loading={upsertMut.isPending} />
          </GestionaleModalFooterActions>
        }
      >
        <GestionaleModalScrollBody>
          {showAssignedBanner ? (
            <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              Questo preset è assegnato a <strong>{inUseCount}</strong> mezzo/i. Il salvataggio aggiorna il preset e
              propaga intervalli/nome alle configurazioni di quei mezzi. Lo storico tagliandi già registrato resta
              invariato.
            </p>
          ) : null}
          {upsertMut.error ? (
            <p className="mb-3 text-sm text-red-700 dark:text-red-300">{upsertMut.error.message}</p>
          ) : null}
          <form id="maintenance-preset-form" className="space-y-4" onSubmit={onSubmit}>
            <section className={presetFormSectionClass}>
              <div className={dsFormField}>
                <label className={dsFormLabel} htmlFor="mp-nome">
                  Nome preset
                </label>
                <input
                  id="mp-nome"
                  className={dsFormInput}
                  value={draft.nome}
                  onChange={(e) => setDraft((d) => ({ ...d, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className={dsFormField}>
                  <label className={dsFormLabel} htmlFor="mp-status">
                    Stato
                  </label>
                  <GlobalSelect
                    id="mp-status"
                    variant="filter"
                    inputClassName={statusSelectClass}
                    items={statusItems}
                    value={draft.status ?? "active"}
                    onChange={(value) =>
                      setDraft((d) => ({
                        ...d,
                        status: value as MaintenancePresetStatus,
                        isActive: value === "active",
                      }))
                    }
                    strictFromList
                    selectOnly
                    aria-label="Stato preset"
                  />
                </div>
                <div className={dsFormField}>
                  <label className={dsFormLabel} htmlFor="mp-tempo">
                    Tempo previsto (min)
                  </label>
                  <input
                    id="mp-tempo"
                    type="number"
                    min={0}
                    className={dsFormInput}
                    value={draft.tempoPrevistoMinuti ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        tempoPrevistoMinuti: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            <MaintenancePresetTriggersField
              triggers={draft.triggersDraft}
              onChange={(triggersDraft) => setDraft((d) => ({ ...d, triggersDraft }))}
            />
            <MaintenancePresetPartsField
              parts={draft.partsDraft}
              onChange={(partsDraft) => setDraft((d) => ({ ...d, partsDraft }))}
              enabled={open}
            />
          </form>
        </GestionaleModalScrollBody>
      </GestionaleModalShell>
    </>
  );
}

export { emptyPlanDraft, planToDraft } from "@/lib/maintenance-plans/preset-editor-draft";
