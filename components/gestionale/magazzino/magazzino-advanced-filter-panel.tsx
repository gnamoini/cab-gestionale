"use client";

import { useMemo } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";
import {
  GlobalHierarchyMarcaSelect,
  GlobalHierarchyModelloSelect,
  GlobalSettingsListSelect,
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
  void catalog;
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
      <LavorazioniFilterGroup title="Anagrafica prodotto">
        <LavorazioniFilterField label="Marca ricambio" htmlFor="mag-filter-marca-ricambio">
          <GlobalSettingsListSelect
            id="mag-filter-marca-ricambio"
            listKey="magazzino:marche"
            value={filters.marcaRicambio === FILTER_ALL ? "" : filters.marcaRicambio}
            onChange={(v) => onChange({ marcaRicambio: v.trim() ? v : FILTER_ALL })}
            inputClassName={gestionaleFilterFieldInputClass}
            variant="filter"
            filterNeutralValues={[FILTER_ALL, ""]}
            allowAdd={false}
            placeholder="Cerca marca…"
            aria-label="Filtra marca ricambio"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Categoria" htmlFor="mag-filter-categoria">
          <GlobalSelect
            id="mag-filter-categoria"
            items={categoriaItems}
            value={filters.categoria}
            onChange={(v) => onChange({ categoria: v })}
            inputClassName={gestionaleFilterFieldInputClass}
            placeholder="Cerca categoria…"
            strictFromList
            variant="filter"
            filterNeutralValues={[FILTER_ALL]}
            aria-label="Filtra categoria ricambio"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Fornitore non originale" htmlFor="mag-filter-fornitore-no">
          <GlobalSettingsListSelect
            id="mag-filter-fornitore-no"
            listKey="magazzino:fornitori"
            value={filters.fornitoreNonOriginale === FILTER_ALL ? "" : filters.fornitoreNonOriginale}
            onChange={(v) => onChange({ fornitoreNonOriginale: v.trim() ? v : FILTER_ALL })}
            inputClassName={gestionaleFilterFieldInputClass}
            variant="filter"
            filterNeutralValues={[FILTER_ALL, ""]}
            allowAdd={false}
            placeholder="Cerca fornitore…"
            aria-label="Filtra fornitore non originale"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>

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
            variant="filter"
            allowAdd={false}
            placeholder="Cerca marca…"
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
            variant="filter"
            allowAdd={false}
            placeholder={filters.compatMarca === FILTER_ALL ? "Seleziona prima la marca" : "Cerca modello…"}
            disabled={filters.compatMarca === FILTER_ALL}
            aria-label="Filtra modello compatibilità"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>

      <LavorazioniFilterGroup title="Compatibilità telaio">
        <LavorazioniFilterField label="Marca telaio">
          <GlobalHierarchyMarcaSelect
            tree="telai"
            value={filters.telaioMarca === FILTER_ALL ? "" : filters.telaioMarca}
            onChange={(v) => {
              const telaioMarca = v.trim() ? v : FILTER_ALL;
              onChange({ telaioMarca, telaioModello: FILTER_ALL });
            }}
            inputClassName={gestionaleFilterFieldInputClass}
            variant="filter"
            allowAdd={false}
            placeholder="Cerca marca…"
            aria-label="Filtra marca telaio"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Modello telaio">
          <GlobalHierarchyModelloSelect
            tree="telai"
            marcaNome={filters.telaioMarca === FILTER_ALL ? "" : filters.telaioMarca}
            value={filters.telaioModello === FILTER_ALL ? "" : filters.telaioModello}
            onChange={(v) => onChange({ telaioModello: v.trim() ? v : FILTER_ALL })}
            inputClassName={gestionaleFilterFieldInputClass}
            variant="filter"
            allowAdd={false}
            placeholder={filters.telaioMarca === FILTER_ALL ? "Seleziona prima la marca" : "Cerca modello…"}
            disabled={filters.telaioMarca === FILTER_ALL}
            aria-label="Filtra modello telaio"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>
    </div>
  );
}
