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
  type MagazzinoTagliandoFilter,
} from "@/lib/magazzino/magazzino-advanced-filters";
import { dsPageToolbarBtn } from "@/lib/ui/design-system";

function magazzinoPresetToggleClass(active: boolean) {
  return active
    ? `${dsPageToolbarBtn} w-full justify-start sm:w-auto border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_88%,var(--cab-text))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]`
    : `${dsPageToolbarBtn} w-full justify-start sm:w-auto`;
}

export function MagazzinoAdvancedFilterPanel({
  filters,
  onChange,
  catalog,
  soloSottoScorta,
  nascondiScortaZero,
  onSoloSottoScortaChange,
  onNascondiScortaZeroChange,
}: {
  filters: MagazzinoAdvancedFilters;
  onChange: (patch: Partial<MagazzinoAdvancedFilters>) => void;
  catalog: MagazzinoFilterCatalog;
  soloSottoScorta: boolean;
  nascondiScortaZero: boolean;
  onSoloSottoScortaChange: (next: boolean) => void;
  onNascondiScortaZeroChange: (next: boolean) => void;
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

  const tagliandoItems = useMemo(
    () => [
      { value: FILTER_ALL, label: "Tutti" },
      { value: "solo" as MagazzinoTagliandoFilter, label: "Solo tagliandi" },
      { value: "escludi" as MagazzinoTagliandoFilter, label: "Escludi tagliandi" },
    ],
    [],
  );

  const produttoreItems = useMemo(
    () => [
      { value: FILTER_ALL, label: "Tutti i produttori" },
      ...catalog.produttoriAlternativi.map((p) => ({ value: p, label: p })),
    ],
    [catalog.produttoriAlternativi],
  );

  return (
    <div className="space-y-3" aria-label="Filtri avanzati magazzino">
      <LavorazioniFilterGroup title="Filtri rapidi">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            aria-pressed={soloSottoScorta}
            onClick={() => onSoloSottoScortaChange(!soloSottoScorta)}
            className={magazzinoPresetToggleClass(soloSottoScorta)}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                soloSottoScorta
                  ? "bg-[color:var(--cab-primary)]"
                  : "bg-[color:color-mix(in_srgb,var(--cab-text-muted)_55%,transparent)]"
              }`}
              aria-hidden
            />
            Sotto scorta minima
          </button>
          <button
            type="button"
            aria-pressed={nascondiScortaZero}
            onClick={() => onNascondiScortaZeroChange(!nascondiScortaZero)}
            className={magazzinoPresetToggleClass(nascondiScortaZero)}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                nascondiScortaZero
                  ? "bg-[color:var(--cab-primary)]"
                  : "bg-[color:color-mix(in_srgb,var(--cab-text-muted)_55%,transparent)]"
              }`}
              aria-hidden
            />
            Nascondi scorta 0
          </button>
        </div>
      </LavorazioniFilterGroup>

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
        <LavorazioniFilterField label="Tagliando" htmlFor="mag-filter-tagliando">
          <GlobalSelect
            id="mag-filter-tagliando"
            items={tagliandoItems}
            value={filters.tagliando}
            onChange={(v) => onChange({ tagliando: v as MagazzinoTagliandoFilter })}
            inputClassName={gestionaleFilterFieldInputClass}
            selectOnly
            variant="filter"
            aria-label="Filtra tagliando"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Fornitore alternativo" htmlFor="mag-filter-fornitore-no">
          <GlobalSettingsListSelect
            id="mag-filter-fornitore-no"
            listKey="magazzino:fornitori"
            value={filters.fornitoreNonOriginale === FILTER_ALL ? "" : filters.fornitoreNonOriginale}
            onChange={(v) =>
              onChange({
                fornitoreNonOriginale: v.trim() ? v : FILTER_ALL,
                produttoreAlternativo: FILTER_ALL,
              })
            }
            inputClassName={gestionaleFilterFieldInputClass}
            variant="filter"
            filterNeutralValues={[FILTER_ALL, ""]}
            allowAdd={false}
            placeholder="Cerca fornitore…"
            aria-label="Filtra fornitore alternativo"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Produttore alternativo" htmlFor="mag-filter-produttore-alt">
          <GlobalSelect
            id="mag-filter-produttore-alt"
            items={produttoreItems}
            value={filters.produttoreAlternativo}
            onChange={(v) => onChange({ produttoreAlternativo: v })}
            inputClassName={gestionaleFilterFieldInputClass}
            selectOnly
            variant="filter"
            filterNeutralValues={[FILTER_ALL]}
            disabled={filters.fornitoreNonOriginale === FILTER_ALL}
            placeholder={
              filters.fornitoreNonOriginale === FILTER_ALL ? "Seleziona prima il fornitore" : "Produttore…"
            }
            aria-label="Filtra produttore alternativo"
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
