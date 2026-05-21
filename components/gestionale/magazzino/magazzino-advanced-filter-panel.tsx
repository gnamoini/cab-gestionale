"use client";

import { useMemo } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";
import {
  LavorazioniFilterField,
  LavorazioniFilterGroup,
  gestionaleFilterFieldInputClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-filter-fields";
import {
  FILTER_ALL,
  type MagazzinoAdvancedFilters,
  type MagazzinoFilterCatalog,
} from "@/lib/magazzino/magazzino-advanced-filters";

export function MagazzinoAdvancedFilterPanel({
  filters,
  onChange,
  catalog,
}: {
  filters: MagazzinoAdvancedFilters;
  onChange: (patch: Partial<MagazzinoAdvancedFilters>) => void;
  catalog: MagazzinoFilterCatalog;
}) {
  const modelloOptions = useMemo(() => {
    if (filters.compatMarca === FILTER_ALL || !filters.compatMarca.trim()) {
      const all = new Set<string>();
      for (const list of Object.values(catalog.compatModelliByMarca)) {
        for (const m of list) all.add(m);
      }
      return [...all].sort((a, b) => a.localeCompare(b, "it"));
    }
    return catalog.compatModelliByMarca[filters.compatMarca] ?? [];
  }, [catalog.compatModelliByMarca, filters.compatMarca]);

  const categoriaItems = useMemo(
    () => [
      { value: FILTER_ALL, label: "Tutte le categorie" },
      ...catalog.categorie.map((c) => ({ value: c, label: c })),
    ],
    [catalog.categorie],
  );

  return (
    <div className="space-y-3" aria-label="Filtri avanzati magazzino">
      <LavorazioniFilterGroup title="Compatibilità attrezzatura">
        <LavorazioniFilterField label="Marca (compatibilità)">
          <GlobalSelect
            value={filters.compatMarca === FILTER_ALL ? "" : filters.compatMarca}
            onChange={(v) => {
              const compatMarca = v.trim() ? v : FILTER_ALL;
              onChange({ compatMarca, compatModello: FILTER_ALL });
            }}
            options={catalog.compatMarche}
            placeholder="Cerca e seleziona…"
            inputClassName={gestionaleFilterFieldInputClass}
            strictFromList
            variant="filter"
            aria-label="Filtra marca compatibilità"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Modello (compatibilità)">
          <GlobalSelect
            value={filters.compatModello === FILTER_ALL ? "" : filters.compatModello}
            onChange={(v) => onChange({ compatModello: v.trim() ? v : FILTER_ALL })}
            options={modelloOptions}
            placeholder={
              filters.compatMarca === FILTER_ALL ? "Seleziona prima la marca" : "Cerca e seleziona…"
            }
            inputClassName={gestionaleFilterFieldInputClass}
            strictFromList
            disabled={filters.compatMarca === FILTER_ALL}
            variant="filter"
            aria-label="Filtra modello compatibilità"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>

      <LavorazioniFilterGroup title="Anagrafica prodotto">
        <LavorazioniFilterField label="Categoria">
          <GlobalSelect
            items={categoriaItems}
            value={filters.categoria}
            onChange={(v) => onChange({ categoria: v })}
            inputClassName={gestionaleFilterFieldInputClass}
            strictFromList
            variant="filter"
            aria-label="Filtra categoria ricambio"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>
    </div>
  );
}
