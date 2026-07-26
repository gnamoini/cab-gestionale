"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
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
import { dsBtnNeutral, dsBtnPrimary, dsFormField, dsFormInput, dsFormLabel, dsInput } from "@/lib/ui/design-system";
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
}: {
  open: boolean;
  initial: PlanDraft | null;
  onClose: () => void;
}) {
  const { validation: toastValidation, error: toastError, successSaved } = useGestionaleToast();
  const [draft, setDraft] = useState(() => initial ?? emptyPlanDraft());
  const [checklistLabel, setChecklistLabel] = useState("");
  const [forkConfirmOpen, setForkConfirmOpen] = useState(false);
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
  const showVersionBanner = Boolean(draft.id && inUseCount > 0);

  async function savePlan() {
    const payload = planDraftToUpsertInput(draft);
    try {
      await upsertMut.mutateAsync(payload);
      successSaved();
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
    if (draft.id && inUseCount > 0) {
      setForkConfirmOpen(true);
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
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <button type="button" className={dsBtnNeutral} onClick={onClose}>
              Annulla
            </button>
            <LoadingButton type="submit" form="maintenance-preset-form" className={dsBtnPrimary} loading={upsertMut.isPending}>
              Salva
            </LoadingButton>
          </div>
        }
      >
        <GestionaleModalScrollBody>
          {showVersionBanner ? (
            <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              Questo preset è utilizzato da <strong>{inUseCount}</strong> mezzo/i. Il salvataggio creerà una nuova versione
              senza modificare lo storico.
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
            <section className={presetFormSectionClass}>
              <div className={dsFormField}>
                <span className={dsFormLabel}>Checklist operativa</span>
                <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">Opzionale — voci da verificare a ogni tagliando.</p>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
                <GestionaleSearchField
                  value={checklistLabel}
                  onChange={(e) => setChecklistLabel(e.target.value)}
                  placeholder="Nuova voce checklist…"
                  aria-label="Nuova voce checklist"
                  wrapperClassName="min-w-0 flex-1"
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const label = checklistLabel.trim();
                    if (!label) return;
                    setDraft((d) => ({
                      ...d,
                      checklistDraft: [
                        ...d.checklistDraft,
                        { label, sortOrder: d.checklistDraft.length, isRequired: true },
                      ],
                    }));
                    setChecklistLabel("");
                  }}
                />
                <button
                  type="button"
                  className={`${dsBtnNeutral} h-11 shrink-0 sm:w-auto`}
                  onClick={() => {
                    const label = checklistLabel.trim();
                    if (!label) return;
                    setDraft((d) => ({
                      ...d,
                      checklistDraft: [
                        ...d.checklistDraft,
                        { label, sortOrder: d.checklistDraft.length, isRequired: true },
                      ],
                    }));
                    setChecklistLabel("");
                  }}
                >
                  Aggiungi
                </button>
              </div>
              {draft.checklistDraft.length === 0 ? (
                <p className="mt-3 text-sm text-[color:var(--cab-text-muted)]">Nessuna voce checklist.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {draft.checklistDraft.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center justify-between gap-3 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 font-medium text-[color:var(--cab-text)]">{item.label}</span>
                      <button
                        type="button"
                        className={`${dsBtnNeutral} h-9 shrink-0 px-3`}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            checklistDraft: d.checklistDraft.filter((x) => x.label !== item.label),
                          }))
                        }
                      >
                        Rimuovi
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </form>
        </GestionaleModalScrollBody>
      </GestionaleModalShell>

      <GestionaleConfirmDialog
        open={forkConfirmOpen}
        title="Conferma nuova versione"
        message={`Questo preset è utilizzato da ${inUseCount} mezzo/i. Verrà creata una nuova versione. Le configurazioni e le esecuzioni storiche non verranno modificate.`}
        confirmLabel="Salva nuova versione"
        onCancel={() => setForkConfirmOpen(false)}
        onConfirm={async () => {
          setForkConfirmOpen(false);
          await savePlan();
        }}
      />
    </>
  );
}

export { emptyPlanDraft, planToDraft } from "@/lib/maintenance-plans/preset-editor-draft";
