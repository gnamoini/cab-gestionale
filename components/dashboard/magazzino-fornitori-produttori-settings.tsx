"use client";

import { useMemo, useState } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input";
import {
  normalizeFornitoreKey,
  removeFornitoreFromProduttoriMap,
  renameFornitoreInProduttoriMap,
} from "@/lib/magazzino/fornitore-produttore-master";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { gestionaleFilterFieldInputClass } from "@/components/gestionale/lavorazioni/lavorazioni-filter-fields";
import { SETTINGS_ROW_BTN_DANGER } from "@/components/dashboard/settings-list-ui";
import { dsBtnPrimary, dsInput } from "@/lib/ui/design-system";

type Props = {
  mag: MagazzinoMasterPrefs;
  patchMag: (fn: (prev: MagazzinoMasterPrefs) => MagazzinoMasterPrefs) => void;
};

export function MagazzinoFornitoriProduttoriSettings({ mag, patchMag }: Props) {
  const fornitori = mag.fornitori ?? [];
  const [selectedFornitore, setSelectedFornitore] = useState("");
  const [nuovoProduttore, setNuovoProduttore] = useState("");

  const activeFornitore = selectedFornitore.trim() || fornitori[0] || "";
  const key = normalizeFornitoreKey(activeFornitore);
  const produttori = useMemo(() => {
    if (!key) return [];
    return mag.produttoriByFornitore?.[key] ?? [];
  }, [mag.produttoriByFornitore, key]);

  const fornitoreItems = useMemo(
    () => fornitori.map((f) => ({ value: f, label: f })),
    [fornitori],
  );

  function patchProduttori(nextList: string[]) {
    if (!key) return;
    patchMag((prev) => ({
      ...prev,
      produttoriByFornitore: {
        ...(prev.produttoriByFornitore ?? {}),
        [key]: nextList,
      },
    }));
  }

  return (
    <div className="mt-6 space-y-3 rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
      <p className="text-sm font-semibold text-[color:var(--cab-text)]">Produttori per fornitore</p>
      <p className="text-xs text-[color:var(--cab-text-muted)]">
        Collega i produttori a ciascun fornitore alternativo; nel modal ricambio la select produttore dipende dal fornitore scelto.
      </p>
      {fornitori.length === 0 ? (
        <p className="text-xs text-[color:var(--cab-text-muted)]">Aggiungi prima almeno un fornitore alternativo.</p>
      ) : (
        <>
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]">Fornitore</span>
            <GlobalSelect
              selectOnly
              variant="default"
              value={activeFornitore}
              onChange={(v) => setSelectedFornitore(v)}
              items={fornitoreItems}
              inputClassName={gestionaleFilterFieldInputClass}
              aria-label="Fornitore per gestione produttori"
            />
          </label>
          <ul className="space-y-1">
            {produttori.map((p) => (
              <li key={p} className="flex items-center justify-between gap-2 rounded-md border border-[color:var(--cab-border)] px-2 py-1 text-sm">
                <span>{p}</span>
                <button
                  type="button"
                  className={SETTINGS_ROW_BTN_DANGER}
                  onClick={() => patchProduttori(produttori.filter((x) => x !== p))}
                  aria-label={`Elimina produttore ${p}`}
                >
                  Elimina
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              value={nuovoProduttore}
              onChange={(e) => setNuovoProduttore(e.target.value)}
              placeholder="Nuovo produttore"
              className={`${dsInput} min-w-0 flex-1`}
            />
            <button
              type="button"
              className={dsBtnPrimary}
              onClick={() => {
                const v = nuovoProduttore.trim();
                if (!v || produttori.includes(v)) return;
                patchProduttori([...produttori, v]);
                setNuovoProduttore("");
              }}
            >
              Aggiungi
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function magazzinoMasterOnFornitoreRename(
  prev: MagazzinoMasterPrefs,
  from: string,
  to: string,
): MagazzinoMasterPrefs {
  const map = renameFornitoreInProduttoriMap(prev.produttoriByFornitore ?? {}, from, to);
  return { ...prev, produttoriByFornitore: map };
}

export function magazzinoMasterOnFornitoreRemove(
  prev: MagazzinoMasterPrefs,
  fornitore: string,
): MagazzinoMasterPrefs {
  const map = removeFornitoreFromProduttoriMap(prev.produttoriByFornitore ?? {}, fornitore);
  return { ...prev, produttoriByFornitore: map };
}
