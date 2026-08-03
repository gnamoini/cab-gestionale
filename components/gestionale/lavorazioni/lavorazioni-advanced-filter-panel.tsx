"use client";

import { useMemo } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";
import {
  GlobalHierarchyMarcaSelect,
  GlobalHierarchyModelloSelect,
  GlobalSettingsListSelect,
} from "@/components/gestionale/global-input/global-settings-list-select";
import { GlobalFilterDateField } from "@/components/gestionale/global-input/global-date-picker";
import {
  LavorazioniFilterField,
  LavorazioniFilterGroup,
  gestionaleFilterFieldInputClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-filter-fields";
import { AddettoPicker } from "@/components/domain/addetti";
import {
  FILTER_ALL,
  buildLavorazioniUtilizzatoreFilterItems,
  normalizeAddettoFilterValue,
  type LavorazioniAdvancedFilters,
  type LavorazioniFilterCatalog,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";

export type LavorazioniAdvancedFilterPanelVariant = "staff" | "clientPortal";

export function LavorazioniAdvancedFilterPanel({
  filters,
  onChange,
  catalog,
  addettiRecords = [],
  variant = "staff",
  restrictUtilizzatoriToCatalog = false,
}: {
  filters: LavorazioniAdvancedFilters;
  onChange: (patch: Partial<LavorazioniAdvancedFilters>) => void;
  catalog: LavorazioniFilterCatalog;
  addettiRecords?: readonly AddettoRecord[];
  variant?: LavorazioniAdvancedFilterPanelVariant;
  /** Portale clienti: limita utilizzatori al catalogo righe visibili (solo ruolo cliente). */
  restrictUtilizzatoriToCatalog?: boolean;
}) {
  const isStaff = variant === "staff";
  const useCatalogUtilizzatori = variant === "clientPortal" && restrictUtilizzatoriToCatalog;

  const marcaFilterValue = filters.marca === FILTER_ALL ? "" : filters.marca;
  const modelloFilterValue = filters.modello === FILTER_ALL ? "" : filters.modello;
  const marcaTelaioFilterValue = filters.marcaTelaio === FILTER_ALL ? "" : filters.marcaTelaio;
  const modelloTelaioFilterValue = filters.modelloTelaio === FILTER_ALL ? "" : filters.modelloTelaio;

  const addettoFilterValue = normalizeAddettoFilterValue(filters.addetto);

  const utilizzatoreFilterItems = useMemo(
    () =>
      useCatalogUtilizzatori
        ? buildLavorazioniUtilizzatoreFilterItems(catalog, filters.utilizzatore)
        : [],
    [useCatalogUtilizzatori, catalog, filters.utilizzatore],
  );

  return (
    <div className="space-y-3" aria-label="Filtri avanzati">
      <LavorazioniFilterGroup title="Filtri temporali">
        <LavorazioniFilterField label="Data ingresso da" htmlFor="lav-filter-ingresso-da">
          <GlobalFilterDateField
            id="lav-filter-ingresso-da"
            valueYmd={filters.ingressoDa}
            onChangeYmd={(v) => onChange({ ingressoDa: v })}
            aria-label="Data ingresso da"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Data ingresso a" htmlFor="lav-filter-ingresso-a">
          <GlobalFilterDateField
            id="lav-filter-ingresso-a"
            valueYmd={filters.ingressoA}
            onChangeYmd={(v) => onChange({ ingressoA: v })}
            aria-label="Data ingresso a"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Data completamento da" htmlFor="lav-filter-completamento-da">
          <GlobalFilterDateField
            id="lav-filter-completamento-da"
            valueYmd={filters.completamentoDa}
            onChangeYmd={(v) => onChange({ completamentoDa: v })}
            aria-label="Data completamento da"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Data completamento a" htmlFor="lav-filter-completamento-a">
          <GlobalFilterDateField
            id="lav-filter-completamento-a"
            valueYmd={filters.completamentoA}
            onChangeYmd={(v) => onChange({ completamentoA: v })}
            aria-label="Data completamento a"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>

      <LavorazioniFilterGroup title="Filtri entità">
        {isStaff ? (
          <LavorazioniFilterField label="Cliente">
            <GlobalSettingsListSelect
              listKey="mezzi:clienti"
              value={filters.cliente}
              onChange={(v) => onChange({ cliente: v })}
              placeholder="Cerca e seleziona…"
              inputClassName={gestionaleFilterFieldInputClass}
              variant="filter"
              allowAdd={false}
              aria-label="Filtra cliente"
            />
          </LavorazioniFilterField>
        ) : null}
        <LavorazioniFilterField label="Cantiere">
          <GlobalSettingsListSelect
            listKey="mezzi:cantieri"
            value={filters.cantiere}
            onChange={(v) => onChange({ cantiere: v })}
            placeholder="Cerca e seleziona…"
            inputClassName={gestionaleFilterFieldInputClass}
            variant="filter"
            allowAdd={false}
            aria-label="Filtra cantiere"
          />
        </LavorazioniFilterField>
        <div className="hidden min-w-0 sm:contents">
          <LavorazioniFilterField label="Utilizzatore">
            {useCatalogUtilizzatori ? (
              <GlobalSelect
                items={utilizzatoreFilterItems}
                value={filters.utilizzatore}
                onChange={(v) => onChange({ utilizzatore: v })}
                inputClassName={gestionaleFilterFieldInputClass}
                strictFromList
                variant="filter"
                placeholder="Cerca e seleziona…"
                aria-label="Filtra utilizzatore"
              />
            ) : (
              <GlobalSettingsListSelect
                listKey="mezzi:utilizzatori"
                value={filters.utilizzatore}
                onChange={(v) => onChange({ utilizzatore: v })}
                placeholder="Cerca e seleziona…"
                inputClassName={gestionaleFilterFieldInputClass}
                variant="filter"
                allowAdd={false}
                aria-label="Filtra utilizzatore"
              />
            )}
          </LavorazioniFilterField>
        </div>
        {isStaff ? (
          <LavorazioniFilterField label="Addetto">
            <AddettoPicker
              variant="filter"
              value={addettoFilterValue === FILTER_ALL ? "" : addettoFilterValue}
              onChange={(v) => onChange({ addetto: normalizeAddettoFilterValue(v) })}
              ariaLabel="Filtra addetto"
              inputClassName={gestionaleFilterFieldInputClass}
            />
          </LavorazioniFilterField>
        ) : null}
      </LavorazioniFilterGroup>

      <LavorazioniFilterGroup title="Filtri tecnici">
        <LavorazioniFilterField label="Marca">
          <GlobalHierarchyMarcaSelect
            tree="attrezzature"
            value={marcaFilterValue}
            onChange={(v) => {
              const marca = v.trim() ? v : FILTER_ALL;
              onChange({ marca, modello: FILTER_ALL });
            }}
            inputClassName={gestionaleFilterFieldInputClass}
            variant="filter"
            allowAdd={false}
            placeholder="Cerca e seleziona…"
            aria-label="Filtra marca"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Modello">
          <GlobalHierarchyModelloSelect
            tree="attrezzature"
            marcaNome={marcaFilterValue}
            value={modelloFilterValue}
            onChange={(v) => onChange({ modello: v.trim() ? v : FILTER_ALL })}
            inputClassName={gestionaleFilterFieldInputClass}
            variant="filter"
            allowAdd={false}
            disabled={filters.marca === FILTER_ALL}
            placeholder={filters.marca === FILTER_ALL ? "Seleziona prima la marca" : "Cerca e seleziona…"}
            aria-label="Filtra modello"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Marca telaio">
          <GlobalHierarchyMarcaSelect
            tree="telai"
            value={marcaTelaioFilterValue}
            onChange={(v) => {
              const marcaTelaio = v.trim() ? v : FILTER_ALL;
              onChange({ marcaTelaio, modelloTelaio: FILTER_ALL });
            }}
            inputClassName={gestionaleFilterFieldInputClass}
            variant="filter"
            allowAdd={false}
            placeholder="Cerca e seleziona…"
            aria-label="Filtra marca telaio"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Modello telaio">
          <GlobalHierarchyModelloSelect
            tree="telai"
            marcaNome={marcaTelaioFilterValue}
            value={modelloTelaioFilterValue}
            onChange={(v) => onChange({ modelloTelaio: v.trim() ? v : FILTER_ALL })}
            inputClassName={gestionaleFilterFieldInputClass}
            variant="filter"
            allowAdd={false}
            disabled={filters.marcaTelaio === FILTER_ALL}
            placeholder={filters.marcaTelaio === FILTER_ALL ? "Seleziona prima la marca telaio" : "Cerca e seleziona…"}
            aria-label="Filtra modello telaio"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>
    </div>
  );
}
