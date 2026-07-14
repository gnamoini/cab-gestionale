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
import type { MaintenancePlanView, UpsertMaintenancePlanInput } from "@/lib/maintenance-plans/types";
import { dsBtnNeutral, dsBtnPrimary, dsFormField, dsFormInput, dsFormLabel, dsTable, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";
import {
  useMaintenancePlansCatalogQuery,
  useMaintenancePlansListQuery,
  useMaintenanceRicambiSearchQuery,
} from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import {
  useMaintenancePlanDeleteMutation,
  useMaintenancePlanUpsertMutation,
} from "@/src/hooks/gestionale/use-maintenance-plan-mutations";
import { usePermissions } from "@/src/hooks/use-permissions";

type PartDraft = { ricambioId: string; codice: string; descrizione: string; quantita: number };

function emptyDraft(): UpsertMaintenancePlanInput & { partsDraft: PartDraft[] } {
  return {
    nome: "",
    intervalOre: 500,
    isActive: true,
    tipoAttrezzaturaIds: [],
    parts: [],
    partsDraft: [],
  };
}

function planToDraft(plan: MaintenancePlanView): UpsertMaintenancePlanInput & { partsDraft: PartDraft[] } {
  return {
    id: plan.id,
    nome: plan.nome,
    intervalOre: plan.intervalOre,
    isActive: plan.isActive,
    tipoAttrezzaturaIds: [...plan.tipoIds],
    parts: plan.parts.map((p) => ({ ricambioId: p.ricambioId, quantita: p.quantita })),
    partsDraft: plan.parts.map((p) => ({
      ricambioId: p.ricambioId,
      codice: p.codice,
      descrizione: p.descrizione,
      quantita: p.quantita,
    })),
  };
}

function MaintenancePlanEditorModal({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: (UpsertMaintenancePlanInput & { partsDraft: PartDraft[] }) | null;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => initial ?? emptyDraft());
  const [ricSearch, setRicSearch] = useState("");
  const catalogQ = useMaintenancePlansCatalogQuery(open);
  const ricambiQ = useMaintenanceRicambiSearchQuery(ricSearch, open && ricSearch.trim().length >= 2);
  const upsertMut = useMaintenancePlanUpsertMutation();

  useEffect(() => {
    if (open) setDraft(initial ?? emptyDraft());
  }, [open, initial]);

  const catalog = catalogQ.data ?? [];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.nome.trim() || draft.intervalOre <= 0 || draft.tipoAttrezzaturaIds.length === 0) return;
    const payload: UpsertMaintenancePlanInput = {
      id: draft.id,
      nome: draft.nome.trim(),
      intervalOre: draft.intervalOre,
      isActive: draft.isActive,
      tipoAttrezzaturaIds: draft.tipoAttrezzaturaIds,
      parts: draft.partsDraft.map((p) => ({ ricambioId: p.ricambioId, quantita: p.quantita })),
    };
    await upsertMut.mutateAsync(payload);
    onClose();
  }

  if (!open) return null;

  return (
    <GestionaleModalShell
      onRequestClose={onClose}
      title={draft.id ? "Modifica piano tagliando" : "Nuovo piano tagliando"}
      titleId="maintenance-plan-editor-title"
      modalSize="formMedium"
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
          <div className={dsFormField}>
            <label className={dsFormLabel} htmlFor="mp-interval">
              Intervallo (ore)
            </label>
            <input
              id="mp-interval"
              type="number"
              min={1}
              className={dsFormInput}
              value={draft.intervalOre}
              onChange={(e) => setDraft((d) => ({ ...d, intervalOre: Number(e.target.value) || 0 }))}
              required
            />
          </div>
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
            <span className={dsFormLabel}>Ricambi previsti</span>
            <input
              className={dsFormInput}
              placeholder="Cerca ricambio (codice o nome)…"
              value={ricSearch}
              onChange={(e) => setRicSearch(e.target.value)}
            />
            {(ricambiQ.data ?? []).length > 0 ? (
              <ul className="mt-2 max-h-32 overflow-y-auto rounded border border-[color:var(--cab-border)] text-sm">
                {(ricambiQ.data ?? []).map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="w-full px-2 py-1.5 text-left hover:bg-[var(--cab-hover)]"
                      onClick={() => {
                        if (draft.partsDraft.some((p) => p.ricambioId === r.id)) return;
                        setDraft((d) => ({
                          ...d,
                          partsDraft: [
                            ...d.partsDraft,
                            { ricambioId: r.id, codice: r.codice, descrizione: r.nome, quantita: 1 },
                          ],
                        }));
                        setRicSearch("");
                      }}
                    >
                      {r.codice} — {r.nome}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className="mt-2 space-y-2">
              {draft.partsDraft.map((p) => (
                <li key={p.ricambioId} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {p.codice} — {p.descrizione}
                  </span>
                  <input
                    type="number"
                    min={0.001}
                    step={0.001}
                    className={`${dsFormInput} w-24`}
                    value={p.quantita}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        partsDraft: d.partsDraft.map((x) =>
                          x.ricambioId === p.ricambioId ? { ...x, quantita: Number(e.target.value) || 0 } : x,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    className={dsBtnNeutral}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        partsDraft: d.partsDraft.filter((x) => x.ricambioId !== p.ricambioId),
                      }))
                    }
                  >
                    Rimuovi
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
            />
            Piano attivo
          </label>
        </form>
      </GestionaleModalScrollBody>
    </GestionaleModalShell>
  );
}

export function SettingsMaintenancePlansSection() {
  const settingsPayload = useCabAppSettingsPayloadQuery({ enabled: true });
  const { canManageSettings } = usePermissions();
  const plansQ = useMaintenancePlansListQuery();
  const deleteMut = useMaintenancePlanDeleteMutation();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<(UpsertMaintenancePlanInput & { partsDraft: PartDraft[] }) | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const labels = settingsPayload.data?.resolved?.mezziListe?.tipiAttrezzatura;
    if (!canManageSettings || !labels?.length) return;
    void maintenancePlansEntry.ensureCatalogLabels(labels);
  }, [canManageSettings, settingsPayload.data?.resolved?.mezziListe?.tipiAttrezzatura]);

  const plans = plansQ.data ?? [];
  const loading = plansQ.isLoading;

  const deletePlan = useMemo(() => plans.find((p) => p.id === deleteId) ?? null, [plans, deleteId]);

  return (
    <SettingsListSection
      title="Piani tagliando"
      description="Configurazione centralizzata per tipo attrezzatura. Le esecuzioni si registrano manualmente sul mezzo."
    >
      <p className={SETTINGS_SECTION_HINT}>
        I tipi attrezzatura provengono dal catalogo DB. Se aggiungi un tipo solo in Impostazioni → Tipo attrezzatura,
        associalo qui dopo averlo sincronizzato nel catalogo (upsert automatico in arrivo).
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
          <table className={`${dsTable} min-w-[640px] text-sm`}>
            <GlobalTableHead>
              <GlobalTableHeadLabel label="Nome" />
              <GlobalTableHeadLabel label="Intervallo" />
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
                plans.map((p) => (
                  <tr key={p.id} className={dsTableRow}>
                    <td className="px-2 py-2 font-medium">{p.nome}</td>
                    <td className="px-2 py-2">{p.intervalOre} h</td>
                    <td className="px-2 py-2 text-[color:var(--cab-text-muted)]">{p.tipoLabels.join(", ") || "—"}</td>
                    <td className="px-2 py-2">{p.parts.length}</td>
                    <td className="px-2 py-2">{p.isActive ? "Attivo" : "Disattivo"}</td>
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
                        <button type="button" className={dsBtnNeutral} onClick={() => setDeleteId(p.id)}>
                          Disattiva
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
        title="Disattivare il piano?"
        message={deletePlan ? `Il piano "${deletePlan.nome}" non sarà più applicato ai mezzi.` : ""}
        confirmLabel="Disattiva"
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
