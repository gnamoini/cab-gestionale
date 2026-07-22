"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
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
import { dsBtnNeutral, dsBtnPrimary, dsFormField, dsFormInput, dsFormLabel } from "@/lib/ui/design-system";
import { useMaintenancePlansCatalogQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useMaintenancePlanUpsertMutation } from "@/src/hooks/gestionale/use-maintenance-plan-mutations";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

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
  const catalogQ = useMaintenancePlansCatalogQuery(open);
  const upsertMut = useMaintenancePlanUpsertMutation();

  useEffect(() => {
    if (open) setDraft(initial ?? emptyPlanDraft());
  }, [open, initial]);

  const catalog = catalogQ.data ?? [];
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
    if (draft.tipoAttrezzaturaIds.length === 0) {
      toastValidation("Seleziona almeno un tipo attrezzatura.");
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
          <div className="flex justify-end gap-2">
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={dsFormField}>
                <label className={dsFormLabel} htmlFor="mp-status">
                  Stato
                </label>
                <select
                  id="mp-status"
                  className={dsFormInput}
                  value={draft.status ?? "active"}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      status: e.target.value as MaintenancePresetStatus,
                      isActive: e.target.value === "active",
                    }))
                  }
                >
                  {MAINTENANCE_PRESET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {MAINTENANCE_PRESET_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
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
            <MaintenancePresetTriggersField
              triggers={draft.triggersDraft}
              onChange={(triggersDraft) => setDraft((d) => ({ ...d, triggersDraft }))}
            />
            <MaintenancePresetPartsField
              parts={draft.partsDraft}
              onChange={(partsDraft) => setDraft((d) => ({ ...d, partsDraft }))}
              enabled={open}
            />
            <div className={dsFormField}>
              <span className={dsFormLabel}>Tipi attrezzatura</span>
              {catalog.length === 0 ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Catalogo tipi vuoto: i tipi verranno sincronizzati automaticamente al salvataggio.
                </p>
              ) : null}
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] p-2">
                {catalog.map((t) => {
                  const checked = draft.tipoAttrezzaturaIds.includes(t.id);
                  return (
                    <label key={t.id} className="inline-flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setDraft((d) => ({
                            ...d,
                            tipoAttrezzaturaIds: checked
                              ? d.tipoAttrezzaturaIds.filter((id) => id !== t.id)
                              : [...d.tipoAttrezzaturaIds, t.id],
                          }))
                        }
                      />
                      {t.label}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className={dsFormField}>
              <span className={dsFormLabel}>Checklist operativa</span>
              <div className="flex gap-2">
                <input
                  className={dsFormInput}
                  placeholder="Nuova voce checklist…"
                  value={checklistLabel}
                  onChange={(e) => setChecklistLabel(e.target.value)}
                />
                <button
                  type="button"
                  className={dsBtnNeutral}
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
              <ul className="mt-2 space-y-1 text-sm">
                {draft.checklistDraft.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-2">
                    <span>{item.label}</span>
                    <button
                      type="button"
                      className={dsBtnNeutral}
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
            </div>
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
