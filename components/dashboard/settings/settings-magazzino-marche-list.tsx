"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import { settingsConfigFieldId } from "@/components/dashboard/settings/settings-config-field-id";
import {
  SettingsAddRow,
  SettingsEditableStringRow,
  SettingsEmptyState,
  SettingsSectionHeader,
  SETTINGS_DISCOUNT_INPUT,
  SETTINGS_LIST_DIVIDER_UL,
  SETTINGS_SECTION_CARD,
} from "@/components/dashboard/settings-list-ui";
import { useSettingsSimilarGate } from "@/components/dashboard/use-settings-similar-gate";
import { clampScontoRicambiPercent } from "@/lib/mezzi/cliente-commerciale";
import {
  getScontoFornitoreMarca,
  registerMarcaInMagazzinoMaster,
  removeMarcaFromMagazzinoMaster,
  renameMarcaInMagazzinoMaster,
  setScontoFornitoreMarca,
} from "@/lib/magazzino/marca-fornitore-sconto";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { sortStringsItCaseInsensitive } from "@/lib/ui/sort-strings-it";

export function SettingsMagazzinoMarcheList({
  mag,
  setMag,
  nuovo,
  setNuovo,
  onRename,
}: {
  mag: MagazzinoMasterPrefs;
  setMag: Dispatch<SetStateAction<MagazzinoMasterPrefs>>;
  nuovo: string;
  setNuovo: (v: string) => void;
  onRename: (from: string, to: string) => void;
}) {
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const { gate, similarDialog } = useSettingsSimilarGate();
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? mag.marche.filter((v) => v.toLowerCase().includes(t)) : [...mag.marche];
    return sortStringsItCaseInsensitive(base);
  }, [mag.marche, q]);

  const tryAdd = (raw: string) => {
    gate(mag.marche, raw, undefined, () => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      setMag((prev) => registerMarcaInMagazzinoMaster(prev, trimmed));
      setNuovo("");
    });
  };

  const tryRename = (from: string, next: string) => {
    const t = next.trim();
    if (!t || t === from) return;
    gate(mag.marche, t, from, () => {
      setMag((prev) => renameMarcaInMagazzinoMaster(prev, from, t));
      onRename(from, t);
    });
  };

  return (
    <div className={SETTINGS_SECTION_CARD}>
      <SettingsSectionHeader
        level="card"
        title="Marche ricambi"
        description="Sconto % sul prezzo di listino fornitore originale, applicato automaticamente ai ricambi con la stessa marca."
      />
      <GestionaleSearchField
        wrapperClassName="mt-2 w-full"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtra elenco…"
        autoComplete="off"
        aria-label="Filtra marche ricambi"
      />
      <SettingsAddRow
        value={nuovo}
        onChange={setNuovo}
        placeholder="Nuova marca"
        inputAriaLabel="Nuova marca"
        onAdd={() => tryAdd(nuovo)}
      />
      {filtered.length === 0 ? (
        <SettingsEmptyState>Nessuna marca. Aggiungi la prima con il campo sopra.</SettingsEmptyState>
      ) : (
        <ul className={SETTINGS_LIST_DIVIDER_UL}>
          {filtered.map((nome) => {
            const sconto = getScontoFornitoreMarca(mag, nome);
            return (
              <SettingsEditableStringRow
                key={nome}
                value={nome}
                onRenameBlur={tryRename}
                onRemove={() => setPendingDelete(nome)}
                trailing={
                  <label
                    htmlFor={settingsConfigFieldId("config-sconto-marca", nome)}
                    className="flex min-w-0 shrink-0 items-center gap-1 text-xs text-[color:var(--cab-text-muted)]"
                  >
                    Sconto listino %
                    <input
                      id={settingsConfigFieldId("config-sconto-marca", nome)}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step={0.1}
                      value={sconto}
                      onChange={(e) => {
                        const n = clampScontoRicambiPercent(Number(e.target.value));
                        setMag((prev) => setScontoFornitoreMarca(prev, nome, n));
                      }}
                      className={SETTINGS_DISCOUNT_INPUT}
                      aria-label={`Sconto listino per ${nome}`}
                    />
                  </label>
                }
              />
            );
          })}
        </ul>
      )}
      {similarDialog}
      <SettingsEliminaConfirmDialog
        open={pendingDelete != null}
        itemLabel={pendingDelete ?? undefined}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) setMag((prev) => removeMarcaFromMagazzinoMaster(prev, pendingDelete));
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
