"use client";

import { useMemo } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";
import {
  GlobalHierarchyMarcaSelect,
  GlobalHierarchyModelloSelect,
} from "@/components/gestionale/global-input/global-settings-list-select";
import { useGlobalListOptions } from "@/src/hooks/use-global-list-options";
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
  const categoriaList = useGlobalListOptions("magazzino:categorie");
  const categoriaItems = useMemo(
    () => [
      { value: FILTER_ALL, label: "Tutte le categorie" },
      ...categoriaList.options.map((c) => ({ value: c, label: c })),
    ],
    [categoriaList.options],
  );

  return (
    <div className="space-y-3" aria-label="Filtri avanzati magazzino">
      <LavorazioniFilterGroup title="Compatibilità attrezzatura">
        <LavorazioniFilterField label="Marca (compatibilità)">
          <GlobalHierarchyMarcaSelect
            tree="attrezzature"
            value={filters.compatMarca === FILTER_ALL ? "" : filters.compatMarca}
            onChange={(v) => {
              const compatMarca = v.trim() ? v : FILTER_ALL;
              onChange({ compatMarca, compatModello: FILTER_ALL });
            }}
            inputClassName={gestionaleFilterFieldInputClass}
            aria-label="Filtra marca compatibilità"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Modello (compatibilità)">
          <GlobalHierarchyModelloSelect
            tree="attrezzature"
            marcaNome={filters.compatMarca === FILTER_ALL ? "" : filters.compatMarca}
            value={filters.compatModello === FILTER_ALL ? "" : filters.compatModello}
            onChange={(v) => onChange({ compatModello: v.trim() ? v : FILTER_ALL })}
            inputClassName={gestionaleFilterFieldInputClass}
            disabled={filters.compatMarca === FILTER_ALL}
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
