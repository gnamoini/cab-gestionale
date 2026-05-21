"use client";

import { useMemo } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";
import { GlobalFilterDateField } from "@/components/gestionale/global-input/global-date-picker";
import {
  LavorazioniFilterField,
  LavorazioniFilterGroup,
  gestionaleFilterFieldInputClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-filter-fields";
import {
  FILTER_ALL,
  PREVENTIVO_STATI,
  type PreventiviAdvancedFilters,
  type PreventiviFilterCatalog,
} from "@/lib/preventivi/preventivi-advanced-filters";

export function PreventiviAdvancedFilterPanel({
  filters,
  onChange,
  catalog,
}: {
  filters: PreventiviAdvancedFilters;
  onChange: (patch: Partial<PreventiviAdvancedFilters>) => void;
  catalog: PreventiviFilterCatalog;
}) {
  const modelloOptions = useMemo(() => {
    if (filters.marca === FILTER_ALL || !filters.marca.trim()) {
      const all = new Set<string>();
      for (const list of Object.values(catalog.modelliByMarca)) {
        for (const m of list) all.add(m);
      }
      return [...all].sort((a, b) => a.localeCompare(b, "it"));
    }
    return catalog.modelliByMarca[filters.marca] ?? [];
  }, [catalog.modelliByMarca, filters.marca]);

  const statoItems = useMemo(
    () => [
      { value: FILTER_ALL, label: "Tutti gli stati" },
      ...PREVENTIVO_STATI.map((s) => ({ value: s.id, label: s.label })),
    ],
    [],
  );

  return (
    <div className="space-y-3" aria-label="Filtri avanzati preventivi">
      <LavorazioniFilterGroup title="Data creazione">
        <LavorazioniFilterField label="Data creazione da">
          <GlobalFilterDateField
            valueYmd={filters.dataCreazioneDa}
            onChangeYmd={(v) => onChange({ dataCreazioneDa: v })}
            aria-label="Data creazione preventivo da"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Data creazione a">
          <GlobalFilterDateField
            valueYmd={filters.dataCreazioneA}
            onChangeYmd={(v) => onChange({ dataCreazioneA: v })}
            aria-label="Data creazione preventivo a"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>

      <LavorazioniFilterGroup title="Anagrafica">
        <LavorazioniFilterField label="Cliente">
          <GlobalSelect
            value={filters.cliente}
            onChange={(v) => onChange({ cliente: v })}
            options={catalog.clienti}
            placeholder="Cerca e seleziona…"
            inputClassName={gestionaleFilterFieldInputClass}
            strictFromList
            variant="filter"
            aria-label="Filtra cliente preventivi"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Cantiere">
          <GlobalSelect
            value={filters.cantiere}
            onChange={(v) => onChange({ cantiere: v })}
            options={catalog.cantieri}
            placeholder="Cerca e seleziona…"
            inputClassName={gestionaleFilterFieldInputClass}
            strictFromList
            variant="filter"
            aria-label="Filtra cantiere preventivi"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Utilizzatore">
          <GlobalSelect
            value={filters.utilizzatore}
            onChange={(v) => onChange({ utilizzatore: v })}
            options={catalog.utilizzatori}
            placeholder="Cerca e seleziona…"
            inputClassName={gestionaleFilterFieldInputClass}
            strictFromList
            variant="filter"
            aria-label="Filtra utilizzatore preventivi"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Stato preventivo">
          <GlobalSelect
            items={statoItems}
            value={filters.stato}
            onChange={(v) => onChange({ stato: v })}
            inputClassName={gestionaleFilterFieldInputClass}
            strictFromList
            variant="filter"
            aria-label="Filtra stato preventivo"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>

      <LavorazioniFilterGroup title="Attrezzatura">
        <LavorazioniFilterField label="Marca">
          <GlobalSelect
            value={filters.marca === FILTER_ALL ? "" : filters.marca}
            onChange={(v) => {
              const marca = v.trim() ? v : FILTER_ALL;
              onChange({ marca, modello: FILTER_ALL });
            }}
            options={catalog.marche}
            placeholder="Cerca e seleziona…"
            inputClassName={gestionaleFilterFieldInputClass}
            strictFromList
            variant="filter"
            aria-label="Filtra marca attrezzatura preventivi"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Modello">
          <GlobalSelect
            value={filters.modello === FILTER_ALL ? "" : filters.modello}
            onChange={(v) => onChange({ modello: v.trim() ? v : FILTER_ALL })}
            options={modelloOptions}
            placeholder={filters.marca === FILTER_ALL ? "Seleziona prima la marca" : "Cerca e seleziona…"}
            inputClassName={gestionaleFilterFieldInputClass}
            strictFromList
            disabled={filters.marca === FILTER_ALL}
            variant="filter"
            aria-label="Filtra modello attrezzatura preventivi"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>
    </div>
  );
}
