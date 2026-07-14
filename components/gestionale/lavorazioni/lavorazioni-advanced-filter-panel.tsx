"use client";

import { useMemo } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input/global-settings-list-select";
import { GlobalFilterDateField } from "@/components/gestionale/global-input/global-date-picker";
import {
  LavorazioniFilterField,
  LavorazioniFilterGroup,
  gestionaleFilterFieldInputClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-filter-fields";
import {
  FILTER_ALL,
  buildLavorazioniAddettoFilterItems,
  normalizeAddettoFilterValue,
  type LavorazioniAdvancedFilters,
  type LavorazioniFilterCatalog,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { statoLavorazioneLabel } from "@/src/shared/selectors";

export type LavorazioniAdvancedFilterPanelVariant = "staff" | "clientPortal";

export function LavorazioniAdvancedFilterPanel({
  filters,
  onChange,
  catalog,
  statiOpts = [],
  addettiRecords = [],
  variant = "staff",
}: {
  filters: LavorazioniAdvancedFilters;
  onChange: (patch: Partial<LavorazioniAdvancedFilters>) => void;
  catalog: LavorazioniFilterCatalog;
  statiOpts?: { id: string; label: string }[];
  addettiRecords?: readonly AddettoRecord[];
  variant?: LavorazioniAdvancedFilterPanelVariant;
}) {
  const isStaff = variant === "staff";

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
      ...statiOpts.map((s) => ({
        value: s.id,
        label: statoLavorazioneLabel(s.id, statiOpts),
      })),
    ],
    [statiOpts],
  );

  const addettoItems = useMemo(
    () => buildLavorazioniAddettoFilterItems(addettiRecords),
    [addettiRecords],
  );

  const addettoFilterValue = normalizeAddettoFilterValue(filters.addetto);

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
            aria-label="Filtra cantiere"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Utilizzatore">
          <GlobalSettingsListSelect
            listKey="mezzi:utilizzatori"
            value={filters.utilizzatore}
            onChange={(v) => onChange({ utilizzatore: v })}
            placeholder="Cerca e seleziona…"
            inputClassName={gestionaleFilterFieldInputClass}
            variant="filter"
            aria-label="Filtra utilizzatore"
          />
        </LavorazioniFilterField>
        {isStaff ? (
          <LavorazioniFilterField label="Addetto">
            <GlobalSelect
              items={addettoItems}
              value={addettoFilterValue}
              onChange={(v) => onChange({ addetto: normalizeAddettoFilterValue(v) })}
              inputClassName={gestionaleFilterFieldInputClass}
              strictFromList
              selectOnly
              variant="filter"
              filterNeutralValues={[FILTER_ALL]}
              preserveItemOrder
              alphabeticalBrowse={false}
              selectorDomain="addetti"
              dynamicList
              operationalFilter
              aria-label="Filtra addetto"
            />
          </LavorazioniFilterField>
        ) : null}
        {isStaff ? (
          <LavorazioniFilterField label="Stato">
            <GlobalSelect
              items={statoItems}
              value={filters.stato}
              onChange={(v) => onChange({ stato: v })}
              inputClassName={gestionaleFilterFieldInputClass}
              strictFromList
              selectOnly
              variant="filter"
              filterNeutralValues={[FILTER_ALL]}
              aria-label="Filtra stato"
            />
          </LavorazioniFilterField>
        ) : null}
      </LavorazioniFilterGroup>

      <LavorazioniFilterGroup title="Filtri tecnici">
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
            aria-label="Filtra marca"
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
            aria-label="Filtra modello"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>
    </div>
  );
}
