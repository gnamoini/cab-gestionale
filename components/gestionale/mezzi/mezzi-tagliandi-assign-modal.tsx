"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoadingButton, LoadingErrorState } from "@/components/design-system";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MaintenancePresetSummary } from "@/lib/maintenance-plans/types";
import type { MezzoPresetAssignRow } from "@/lib/maintenance-plans/v2-types";
import {
  dsBtnNeutral,
  dsBtnPrimary,
  dsCheckboxInput,
  dsFormField,
  dsFormLabel,
  dsInput,
  dsScrollbar,
} from "@/lib/ui/design-system";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import {
  useBulkAssignPresetMutation,
  useMezziWithoutPresetQuery,
} from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useMaintenancePlansListQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const EMPTY_PRESELECTED_MEZZO_IDS: readonly string[] = [];
const presetPickerSelectClass = `${dsInput} min-h-11 py-2 text-sm font-semibold`;

function mezzoGestitoLabel(m: MezzoGestito): string {
  const marca = m.marcaTelaio?.trim() || m.marca?.trim();
  const modello = m.modelloTelaio?.trim() || m.modello?.trim();
  if (marca && modello) return `${marca} ${modello}`;
  return marca || modello || m.tipoAttrezzatura || "—";
}

function mezzoAssignIdent(m: MezzoPresetAssignRow): string {
  return [m.targa, m.numeroScuderia].filter(Boolean).join(" · ") || m.tipoAttrezzatura || "—";
}

function matchesMezzoAssignSearch(m: MezzoPresetAssignRow, q: string): boolean {
  if (!q) return true;
  const hay = [m.targa, m.numeroScuderia, m.attrezzaturaLabel, m.tipoAttrezzatura]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function mapMezziToAssignRows(
  mezzi: MezzoGestito[],
  withoutPresetIds: ReadonlySet<string>,
): MezzoPresetAssignRow[] {
  return mezzi
    .filter((m) => !m.hubSynthetic)
    .map((m) => ({
      mezzoId: m.id,
      numeroScuderia: m.numeroScuderia?.trim() || null,
      targa: m.targa?.trim() || null,
      attrezzaturaLabel: mezzoGestitoLabel(m),
      tipoAttrezzatura: m.tipoAttrezzatura,
      hasActivePreset: !withoutPresetIds.has(m.id),
    }))
    .sort((a, b) => (a.numeroScuderia ?? "").localeCompare(b.numeroScuderia ?? "", "it", { numeric: true }));
}

export function MezziTagliandiAssignModal({
  open,
  preset: presetProp,
  preselectedMezzoIds = EMPTY_PRESELECTED_MEZZO_IDS,
  onClose,
}: {
  open: boolean;
  preset: MaintenancePresetSummary | null;
  preselectedMezzoIds?: readonly string[];
  onClose: () => void;
}) {
  const gestToast = useGestionaleToast();
  const [presetId, setPresetId] = useState(presetProp?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(preselectedMezzoIds));
  const [search, setSearch] = useState("");
  const [replaceConfirm, setReplaceConfirm] = useState(false);
  const openedRef = useRef(false);

  const presetsQ = useMaintenancePlansListQuery(open && !presetProp);
  const mezziQ = useMezziListQuery(undefined, { enabled: open, staleTime: 30_000 });
  const withoutPresetQ = useMezziWithoutPresetQuery(open);
  const assignMut = useBulkAssignPresetMutation();

  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;
    setPresetId(presetProp?.id ?? "");
    setSelected(new Set(preselectedMezzoIds));
    setSearch("");
  }, [open, presetProp?.id, preselectedMezzoIds]);

  const activePresets = useMemo(
    () => (presetsQ.data ?? []).filter((p) => p.status === "active"),
    [presetsQ.data],
  );

  const withoutPresetIds = useMemo(
    () => new Set((withoutPresetQ.data ?? []).map((m) => m.mezzoId)),
    [withoutPresetQ.data],
  );

  const allMezzi = useMemo(
    () => mapMezziToAssignRows(mezziQ.data ?? [], withoutPresetIds),
    [mezziQ.data, withoutPresetIds],
  );

  const searchQuery = search.trim().toLowerCase();
  const filteredMezzi = useMemo(
    () => allMezzi.filter((m) => matchesMezzoAssignSearch(m, searchQuery)),
    [allMezzi, searchQuery],
  );
  const withoutPresetCount = useMemo(() => allMezzi.filter((m) => !m.hasActivePreset).length, [allMezzi]);

  const presetLabel =
    presetProp?.nome ??
    activePresets.find((p) => p.id === presetId)?.nome ??
    (presetId ? "Preset selezionato" : null);

  const toggleMezzo = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function runAssign(replaceExisting: boolean) {
    if (!presetId || selected.size === 0) {
      gestToast.validation("Seleziona un preset e almeno un mezzo.");
      return;
    }
    try {
      const res = await assignMut.mutateAsync({
        presetId,
        mezzoIds: [...selected],
        replaceExisting,
      });
      const { assigned, skipped } = res;
      if (skipped.length > 0) {
        gestToast.info(`Assegnati ${assigned}/${selected.size} mezzi. ${skipped.length} saltati.`);
      } else {
        gestToast.successOnce("bulk-assign", `Piano assegnato a ${assigned} mezzi.`);
      }
      onClose();
    } catch (err) {
      gestToast.error(err, { entity: "mezzo", action: "update" });
    }
  }

  if (!open) return null;

  const mezziLoading = mezziQ.isLoading || withoutPresetQ.isLoading;
  const mezziListError = mezziQ.isError ? mezziQ.error : withoutPresetQ.isError ? withoutPresetQ.error : null;

  return (
    <>
      <GestionaleModalShell
        onRequestClose={onClose}
        title="Assegna preset ai mezzi"
        titleId="tagliandi-assign-title"
        modalSize="formMedium"
        footer={
          <div className="flex w-full items-center justify-end gap-2 min-w-0 flex-nowrap sm:flex-wrap">
            <button type="button" className={dsBtnNeutral} onClick={onClose}>
              Annulla
            </button>
            <LoadingButton
              type="button"
              className={dsBtnPrimary}
              loading={assignMut.isPending}
              onClick={() => setReplaceConfirm(true)}
              disabled={!presetId || selected.size === 0}
            >
              Assegna ({selected.size})
            </LoadingButton>
          </div>
        }
      >
        <GestionaleModalScrollBody>
          {presetProp ? (
            <div className={dsFormField}>
              <span className={dsFormLabel}>Preset</span>
              <p className="text-sm font-semibold text-[color:var(--cab-text)]">{presetProp.nome}</p>
              {presetProp.triggerSummary ? (
                <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">{presetProp.triggerSummary}</p>
              ) : null}
            </div>
          ) : (
            <div className={dsFormField}>
              <label className={dsFormLabel} htmlFor="assign-preset-picker">
                Preset
              </label>
              <GlobalSelect
                id="assign-preset-picker"
                variant="filter"
                inputClassName={presetPickerSelectClass}
                items={[
                  { value: "", label: "Seleziona preset…" },
                  ...activePresets.map((p) => ({ value: p.id, label: p.nome })),
                ]}
                value={presetId}
                onChange={setPresetId}
                strictFromList
                selectOnly
                aria-label="Seleziona preset da assegnare"
              />
            </div>
          )}

          <div className={`${dsFormField} mt-4`}>
            <label className={dsFormLabel} htmlFor="assign-mezzi-search">
              Mezzi
            </label>
            <GestionaleSearchField
              id="assign-mezzi-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca targa, scuderia, attrezzatura…"
              aria-label="Cerca mezzi da assegnare"
            />
            <p className="mt-2 text-xs text-[color:var(--cab-text-muted)]">
              {filteredMezzi.length} di {allMezzi.length} mezzi
              {withoutPresetCount < allMezzi.length ? ` · ${withoutPresetCount} senza piano attivo` : ""}
              {selected.size > 0 ? ` · ${selected.size} selezionati` : ""}
            </p>
            <div
              className={`mt-2 max-h-72 overflow-y-auto rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] ${dsScrollbar}`}
            >
              {mezziListError ? (
                <div className="p-3">
                  <LoadingErrorState
                    title="Errore caricamento mezzi"
                    onRetry={() => {
                      void mezziQ.refetch();
                      void withoutPresetQ.refetch();
                    }}
                  />
                </div>
              ) : mezziLoading ? (
                <p className="p-3 text-sm text-[color:var(--cab-text-muted)]">Caricamento mezzi…</p>
              ) : allMezzi.length === 0 ? (
                <p className="p-3 text-sm text-[color:var(--cab-text-muted)]">Nessun mezzo in anagrafica.</p>
              ) : filteredMezzi.length === 0 ? (
                <p className="p-3 text-sm text-[color:var(--cab-text-muted)]">Nessun mezzo corrisponde alla ricerca.</p>
              ) : (
                <ul className="divide-y divide-[color:var(--cab-border)]">
                  {filteredMezzi.map((m) => {
                    const checked = selected.has(m.mezzoId);
                    return (
                      <li key={m.mezzoId}>
                        <label
                          className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-[var(--cab-hover)] ${checked ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))]" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className={dsCheckboxInput}
                            checked={checked}
                            onChange={() => toggleMezzo(m.mezzoId)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-[color:var(--cab-text)]">{m.attrezzaturaLabel}</span>
                            <span className="block text-xs text-[color:var(--cab-text-muted)]">{mezzoAssignIdent(m)}</span>
                          </span>
                          {m.hasActivePreset ? (
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              Piano attivo
                            </span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </GestionaleModalScrollBody>
      </GestionaleModalShell>

      <GestionaleConfirmDialog
        open={replaceConfirm}
        title="Conferma assegnazione"
        message={`Assegnare ${presetLabel ? `"${presetLabel}"` : "il preset"} a ${selected.size} mezzo/i? I piani attivi esistenti sullo stesso mezzo verranno sostituiti e la pianificazione ricalcolata.`}
        confirmLabel="Assegna"
        onCancel={() => setReplaceConfirm(false)}
        onConfirm={async () => {
          setReplaceConfirm(false);
          await runAssign(true);
        }}
      />
    </>
  );
}
