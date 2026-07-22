"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { maintenancePlansEntry } from "@/lib/domain/maintenance-plans-entry";
import { LoadingButton } from "@/components/design-system";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import {
  SETTINGS_SECTION_HINT,
  SettingsListFrame,
  SettingsListSection,
} from "@/components/dashboard/settings-list-ui";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { MaintenancePresetTriggersField } from "@/components/gestionale/maintenance/maintenance-preset-triggers-field";
import {
  MaintenancePresetPartsField,
  type MaintenancePresetPartDraft,
} from "@/components/gestionale/maintenance/maintenance-preset-parts-field";
import { primaryIntervalFromTriggers } from "@/lib/maintenance-plans/maintenance-trigger-helpers";
import {
  MAINTENANCE_PRESET_STATUSES,
  MAINTENANCE_PRESET_STATUS_LABELS,
  MAINTENANCE_INTERVAL_TYPE_LABELS,
} from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenancePresetStatus } from "@/lib/maintenance-plans/maintenance-enums";
import type {
  MaintenanceChecklistItemView,
  MaintenancePlanView,
  MaintenancePresetTriggerView,
  UpsertMaintenancePlanInput,
} from "@/lib/maintenance-plans/types";
import { dsBtnNeutral, dsBtnPrimary, dsFormField, dsFormInput, dsFormLabel, dsTable, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";
import {
  useMaintenancePlansCatalogQuery,
  useMaintenancePlansListQuery,
} from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import {
  useMaintenancePlanDeleteMutation,
  useMaintenancePlanUpsertMutation,
} from "@/src/hooks/gestionale/use-maintenance-plan-mutations";
import { usePermissions } from "@/src/hooks/use-permissions";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type PlanDraft = UpsertMaintenancePlanInput & {
  partsDraft: MaintenancePresetPartDraft[];
  triggersDraft: MaintenancePresetTriggerView[];
  checklistDraft: MaintenanceChecklistItemView[];
};

function emptyDraft(): PlanDraft {
  return {
    nome: "",
    intervalOre: 500,
    intervalType: "ore",
    intervalValue: 500,
    status: "active",
    isActive: true,
    tipoAttrezzaturaIds: [],
    parts: [],
    partsDraft: [],
    triggersDraft: [{ triggerType: "ore", threshold: 500, priority: 0 }],
    checklistDraft: [],
    tempoPrevistoMinuti: null,
  };
}

function planToDraft(plan: MaintenancePlanView): PlanDraft {
  const triggers =
    plan.triggerGroups[0]?.triggers?.length > 0
      ? plan.triggerGroups[0]!.triggers
      : [{ triggerType: plan.intervalType, threshold: plan.intervalValue, priority: 0 }];
  return {
    id: plan.id,
    nome: plan.nome,
    intervalOre: plan.intervalOre,
    intervalType: plan.intervalType,
    intervalValue: plan.intervalValue,
    maintenanceKind: plan.maintenanceKind,
    status: plan.status,
    isActive: plan.isActive,
    tempoPrevistoMinuti: plan.tempoPrevistoMinuti,
    manodoperaCostoOrario: plan.manodoperaCostoOrario,
    tipoAttrezzaturaIds: [...plan.tipoIds],
    parts: plan.parts.map((p) => ({
      ricambioId: p.ricambioId,
      quantita: p.quantita,
      isRequired: p.isRequired,
      replacementCondition: p.replacementCondition,
      note: p.note,
    })),
    partsDraft: plan.parts.map((p) => ({
      ricambioId: p.ricambioId,
      codice: p.codice,
      descrizione: p.descrizione,
      quantita: p.quantita,
      isRequired: p.isRequired,
      replacementCondition: p.replacementCondition,
      note: p.note,
    })),
    triggersDraft: triggers,
    checklistDraft: [...plan.checklist],
    triggerGroups: plan.triggerGroups,
    checklist: plan.checklist,
  };
}

function MaintenancePlanEditorModal({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: PlanDraft | null;
  onClose: () => void;
}) {
  const { validation: toastValidation, error: toastError, successSaved } = useGestionaleToast();
  const [draft, setDraft] = useState(() => initial ?? emptyDraft());
  const [checklistLabel, setChecklistLabel] = useState("");
  const catalogQ = useMaintenancePlansCatalogQuery(open);
  const upsertMut = useMaintenancePlanUpsertMutation();

  useEffect(() => {
    if (open) setDraft(initial ?? emptyDraft());
  }, [open, initial]);

  const catalog = catalogQ.data ?? [];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.nome.trim()) {
      toastValidation("Inserisci il nome del piano.");
      return;
    }
    if (draft.triggersDraft.length === 0 || draft.triggersDraft.some((t) => t.threshold <= 0)) {
      toastValidation("Configura almeno un trigger con soglia valida.");
      return;
    }

    const primary = primaryIntervalFromTriggers(draft.triggersDraft);

    const payload: UpsertMaintenancePlanInput = {
      id: draft.id,
      nome: draft.nome.trim(),
      intervalOre: primary.intervalOre,
      intervalType: primary.intervalType,
      intervalValue: primary.intervalValue,
      maintenanceKind: draft.maintenanceKind,
      status: draft.status,
      isActive: draft.status === "active",
      tempoPrevistoMinuti: draft.tempoPrevistoMinuti,
      manodoperaCostoOrario: draft.manodoperaCostoOrario,
      tipoAttrezzaturaIds: draft.tipoAttrezzaturaIds,
      parts: draft.partsDraft.map((p) => ({
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
          triggers: draft.triggersDraft,
        },
      ],
      checklist: draft.checklistDraft,
    };

    if (draft.tipoAttrezzaturaIds.length === 0) {
      toastValidation("Seleziona almeno un tipo attrezzatura.");
      return;
    }

    try {
      await upsertMut.mutateAsync(payload);
      successSaved();
      onClose();
    } catch (err) {
      toastError(err, { entity: "mezzo", action: "update" });
    }
  }

  if (!open) return null;

  return (
    <GestionaleModalShell
      onRequestClose={onClose}
      title={draft.id ? "Modifica piano tagliando" : "Nuovo piano tagliando"}
      titleId="maintenance-plan-editor-title"
      modalSize="formLarge"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={dsBtnNeutral} onClick={onClose}>
            Annulla
          </button>
          <LoadingButton type="submit" form="maintenance-plan-form" className={dsBtnPrimary} loading={upsertMut.isPending}>
            Salva
          </LoadingButton>
        </div>
      }
    >
      <GestionaleModalScrollBody>
        {upsertMut.error ? (
          <p className="mb-3 text-sm text-red-700 dark:text-red-300">{upsertMut.error.message}</p>
        ) : null}
        <form id="maintenance-plan-form" className="space-y-4" onSubmit={onSubmit}>
          <div className={dsFormField}>
            <label className={dsFormLabel} htmlFor="mp-nome">
              Nome piano
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
  );
}

export function SettingsMaintenancePlansSection() {
  const settingsPayload = useCabAppSettingsPayloadQuery({ enabled: true });
  const { canManageSettings } = usePermissions();
  const { validation: toastValidation } = useGestionaleToast();
  const plansQ = useMaintenancePlansListQuery();
  const deleteMut = useMaintenancePlanDeleteMutation();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<PlanDraft | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const labels = settingsPayload.data?.resolved?.mezziListe?.tipiAttrezzatura;
    if (!canManageSettings || !labels?.length) return;
    void maintenancePlansEntry.ensureCatalogLabels(labels).then((res) => {
      if (res.success && (res.data ?? 0) > 0) {
        toastValidation(`${res.data} tipo/i attrezzatura sincronizzati nel catalogo.`);
      }
    });
  }, [canManageSettings, settingsPayload.data?.resolved?.mezziListe?.tipiAttrezzatura, toastValidation]);

  const plans = plansQ.data ?? [];
  const loading = plansQ.isLoading;

  const deletePlan = useMemo(() => plans.find((p) => p.id === deleteId) ?? null, [plans, deleteId]);

  return (
    <SettingsListSection
      title="Piani tagliando"
      description="Preset riutilizzabili con trigger multipli, ricambi da magazzino e checklist."
    >
      <p className={SETTINGS_SECTION_HINT}>
        I tipi attrezzatura provengono dal catalogo DB. Trigger in OR: il tagliando scade al primo intervallo raggiunto.
      </p>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          className={dsBtnPrimary}
          onClick={() => {
            setEditorDraft(emptyDraft());
            setEditorOpen(true);
          }}
        >
          Nuovo piano
        </button>
      </div>
      <SettingsListFrame>
        <div className={dsTableWrap}>
          <table className={`${dsTable} min-w-[720px] text-sm`}>
            <GlobalTableHead>
              <GlobalTableHeadLabel label="Nome" />
              <GlobalTableHeadLabel label="Trigger" />
              <GlobalTableHeadLabel label="Tipi" />
              <GlobalTableHeadLabel label="Ricambi" />
              <GlobalTableHeadLabel label="Stato" />
              <GlobalTableHeadLabel label="" thClassName="w-36" align="right" />
            </GlobalTableHead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[color:var(--cab-text-muted)]">
                    Caricamento…
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[color:var(--cab-text-muted)]">
                    Nessun piano configurato.
                  </td>
                </tr>
              ) : (
                plans.map((p) => {
                  const triggers = p.triggerGroups[0]?.triggers ?? [];
                  const triggerLabel =
                    triggers.length > 0
                      ? triggers.map((t) => `${t.threshold} ${MAINTENANCE_INTERVAL_TYPE_LABELS[t.triggerType]}`).join(" OR ")
                      : `${p.intervalValue} ${MAINTENANCE_INTERVAL_TYPE_LABELS[p.intervalType]}`;
                  return (
                    <tr key={p.id} className={dsTableRow}>
                      <td className="px-2 py-2 font-medium">{p.nome}</td>
                      <td className="px-2 py-2 text-xs">{triggerLabel}</td>
                      <td className="px-2 py-2 text-[color:var(--cab-text-muted)]">{p.tipoLabels.join(", ") || "—"}</td>
                      <td className="px-2 py-2">{p.parts.length}</td>
                      <td className="px-2 py-2">{MAINTENANCE_PRESET_STATUS_LABELS[p.status]}</td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className={dsBtnNeutral}
                            onClick={() => {
                              setEditorDraft(planToDraft(p));
                              setEditorOpen(true);
                            }}
                          >
                            Modifica
                          </button>
                          {p.status !== "archived" ? (
                            <button type="button" className={dsBtnNeutral} onClick={() => setDeleteId(p.id)}>
                              Archivia
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SettingsListFrame>

      <MaintenancePlanEditorModal
        open={editorOpen}
        initial={editorDraft}
        onClose={() => {
          setEditorOpen(false);
          setEditorDraft(null);
        }}
      />

      <GestionaleConfirmDialog
        open={deleteId != null}
        title="Archiviare il piano?"
        message={deletePlan ? `Il piano "${deletePlan.nome}" non sarà più applicato ai mezzi. Lo storico resta intatto.` : ""}
        confirmLabel="Archivia"
        destructive
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          await deleteMut.mutateAsync(deleteId);
          setDeleteId(null);
        }}
      />
    </SettingsListSection>
  );
}
