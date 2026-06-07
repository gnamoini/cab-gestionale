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
import {
  clampScontoRicambiPercent,
  getScontoRicambiCliente,
  renameClienteInListe,
  setScontoRicambiCliente,
} from "@/lib/mezzi/cliente-commerciale";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { sortStringsItCaseInsensitive } from "@/lib/ui/sort-strings-it";

export function SettingsClientiCommercialiList({
  liste,
  setListe,
  nuovo,
  setNuovo,
  onAdd,
  onRemove,
  onRename,
}: {
  liste: MezziListePrefs;
  setListe: Dispatch<SetStateAction<MezziListePrefs>>;
  nuovo: string;
  setNuovo: (v: string) => void;
  onAdd: (trimmed: string) => void;
  onRemove: (nome: string) => void;
  onRename: (from: string, to: string) => void;
}) {
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const { gate, similarDialog } = useSettingsSimilarGate();
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? liste.clienti.filter((v) => v.toLowerCase().includes(t)) : [...liste.clienti];
    return sortStringsItCaseInsensitive(base);
  }, [liste.clienti, q]);

  const tryAdd = (raw: string) => {
    gate(liste.clienti, raw, undefined, () => {
      onAdd(raw.trim());
      setNuovo("");
    });
  };

  const tryRename = (from: string, next: string) => {
    const t = next.trim();
    if (!t || t === from) return;
    gate(liste.clienti, t, from, () => {
      setListe((prev) => renameClienteInListe(prev, from, t));
      onRename(from, t);
    });
  };

  return (
    <div className={SETTINGS_SECTION_CARD}>
      <SettingsSectionHeader
        level="card"
        title="Clienti"
        description="Sconto ricambi % applicato automaticamente nei preventivi (solo ricambi, non manodopera)."
      />
      <GestionaleSearchField
        wrapperClassName="mt-2 w-full"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtra elenco…"
        autoComplete="off"
        aria-label="Filtra clienti"
      />
      <SettingsAddRow
        value={nuovo}
        onChange={setNuovo}
        placeholder="Nuovo cliente"
        inputAriaLabel="Nuovo cliente"
        onAdd={() => tryAdd(nuovo)}
      />
      {filtered.length === 0 ? (
        <SettingsEmptyState>Nessun cliente. Aggiungi il primo con il campo sopra.</SettingsEmptyState>
      ) : (
        <ul className={SETTINGS_LIST_DIVIDER_UL}>
          {filtered.map((nome) => {
            const sconto = getScontoRicambiCliente(liste, nome);
            return (
              <SettingsEditableStringRow
                key={nome}
                value={nome}
                onRenameBlur={tryRename}
                onRemove={() => setPendingDelete(nome)}
                trailing={
                  <label
                    htmlFor={settingsConfigFieldId("config-sconto-cliente", nome)}
                    className="flex min-w-0 shrink-0 items-center gap-1 text-xs text-[color:var(--cab-text-muted)]"
                  >
                    Sconto ricambi %
                    <input
                      id={settingsConfigFieldId("config-sconto-cliente", nome)}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step={1}
                      value={sconto}
                      onChange={(e) => {
                        const n = clampScontoRicambiPercent(Number(e.target.value));
                        setListe((prev) => setScontoRicambiCliente(prev, nome, n));
                      }}
                      className={SETTINGS_DISCOUNT_INPUT}
                      aria-label={`Sconto ricambi per ${nome}`}
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
          if (pendingDelete) onRemove(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
