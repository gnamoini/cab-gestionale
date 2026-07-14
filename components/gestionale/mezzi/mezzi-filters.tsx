"use client";

import type { ReactNode } from "react";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import {
  GlobalHierarchyMarcaSelect,
  GlobalHierarchyModelloSelect,
  GlobalSelect,
  GlobalSettingsListSelect,
} from "@/components/gestionale/global-input";
import { dsInput, dsPageToolbar, GESTIONALE_SEARCH_PLACEHOLDER } from "@/lib/ui/design-system";
import { gestionaleFilterFieldLabelClass } from "@/lib/ui/gestionale-field-label";
import type {
  NumeroLavorazioniFilter,
  TagliandiFilter,
  UltimaLavorazioneFilter,
} from "@/lib/mezzi/mezzi-helpers";
import type { GlobalSettingsListKey } from "@/src/lib/global-list/global-settings-list-keys";

function MezziFieldWrap({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  if (htmlFor) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor={htmlFor} className={gestionaleFilterFieldLabelClass}>
          {label}
        </label>
        {children}
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className={gestionaleFilterFieldLabelClass}>{label}</span>
      {children}
    </div>
  );
}

const mezziFieldInputClass = `${dsInput} min-h-11 py-2 text-sm font-semibold`;
const mezziFilterListPlaceholder = "Cerca e seleziona…";
const mezziFilterContainsPlaceholder = "Contiene…";

export type MezziSearchBarProps = {
  search: string;
  onSearch: (v: string) => void;
  /** Es. `min-w-0 flex-1` per allineamento toolbar */
  wrapperClassName?: string;
};

export function MezziSearchBar({ search, onSearch, wrapperClassName = "" }: MezziSearchBarProps) {
  return (
    <GestionaleSearchField
      id="mezzi-search"
      wrapperClassName={wrapperClassName}
      value={search}
      onChange={(e) => onSearch(e.target.value)}
      placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
      aria-label="Cerca mezzi"
    />
  );
}

export type MezziFilterFieldsProps = {
  filtroCliente: string;
  onFiltroCliente: (v: string) => void;
  filtroUtilizzatore: string;
  onFiltroUtilizzatore: (v: string) => void;
  filtroCantiere: string;
  onFiltroCantiere: (v: string) => void;
  filtroTipoAttrezzatura: string;
  onFiltroTipoAttrezzatura: (v: string) => void;
  filtroMarca: string;
  onFiltroMarca: (v: string) => void;
  filtroModello: string;
  onFiltroModello: (v: string) => void;
  filtroMatricola: string;
  onFiltroMatricola: (v: string) => void;
  filtroTarga: string;
  onFiltroTarga: (v: string) => void;
  filtroNumeroScuderia: string;
  onFiltroNumeroScuderia: (v: string) => void;
  filtroMarcaTelaio: string;
  onFiltroMarcaTelaio: (v: string) => void;
  filtroModelloTelaio: string;
  onFiltroModelloTelaio: (v: string) => void;
  filtroTipoTelaio: string;
  onFiltroTipoTelaio: (v: string) => void;
  filtroVin: string;
  onFiltroVin: (v: string) => void;
  filtroTagliandi: TagliandiFilter;
  onFiltroTagliandi: (v: TagliandiFilter) => void;
  filtroNumeroLav: NumeroLavorazioniFilter;
  onFiltroNumeroLav: (v: NumeroLavorazioniFilter) => void;
  filtroUltimaLav: UltimaLavorazioneFilter;
  onFiltroUltimaLav: (v: UltimaLavorazioneFilter) => void;
  /** Se true, niente bordo superiore (il contenitore padre fornisce separazione). */
  embedded?: boolean;
};

function MezziFilterTextInput({
  id,
  value,
  onChange,
  mono = false,
  placeholder = mezziFilterContainsPlaceholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${mezziFieldInputClass}${mono ? " font-mono" : ""}`}
      placeholder={placeholder}
    />
  );
}

function MezziFilterListSelect({
  id,
  listKey,
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  id: string;
  listKey: GlobalSettingsListKey;
  value: string;
  onChange: (v: string) => void;
  "aria-label": string;
}) {
  return (
    <GlobalSettingsListSelect
      id={id}
      listKey={listKey}
      value={value}
      onChange={onChange}
      inputClassName={mezziFieldInputClass}
      variant="filter"
      allowAdd={false}
      operationalFilter
      placeholder={mezziFilterListPlaceholder}
      aria-label={ariaLabel}
    />
  );
}

export function MezziFilterFields(props: MezziFilterFieldsProps) {
  const { embedded = false } = props;
  return (
    <div className={embedded ? "" : "border-t border-[color:var(--cab-border)] pt-3"}>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        Campi filtro
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MezziFieldWrap label="Cliente" htmlFor="mezzi-filter-cliente">
          <MezziFilterListSelect
            id="mezzi-filter-cliente"
            listKey="mezzi:clienti"
            value={props.filtroCliente}
            onChange={props.onFiltroCliente}
            aria-label="Filtra cliente"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Utilizzatore" htmlFor="mezzi-filter-utilizzatore">
          <MezziFilterListSelect
            id="mezzi-filter-utilizzatore"
            listKey="mezzi:utilizzatori"
            value={props.filtroUtilizzatore}
            onChange={props.onFiltroUtilizzatore}
            aria-label="Filtra utilizzatore"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Cantiere" htmlFor="mezzi-filter-cantiere">
          <MezziFilterListSelect
            id="mezzi-filter-cantiere"
            listKey="mezzi:cantieri"
            value={props.filtroCantiere}
            onChange={props.onFiltroCantiere}
            aria-label="Filtra cantiere"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Tipo attrezzatura" htmlFor="mezzi-filter-tipo-attrezzatura">
          <MezziFilterListSelect
            id="mezzi-filter-tipo-attrezzatura"
            listKey="mezzi:tipiAttrezzatura"
            value={props.filtroTipoAttrezzatura}
            onChange={props.onFiltroTipoAttrezzatura}
            aria-label="Filtra tipo attrezzatura"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Marca">
          <GlobalHierarchyMarcaSelect
            tree="attrezzature"
            value={props.filtroMarca}
            onChange={(v) => {
              props.onFiltroMarca(v);
              if (v.trim() !== props.filtroMarca.trim()) props.onFiltroModello("");
            }}
            inputClassName={mezziFieldInputClass}
            variant="filter"
            allowAdd={false}
            placeholder={mezziFilterListPlaceholder}
            aria-label="Filtra marca attrezzatura"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Modello">
          <GlobalHierarchyModelloSelect
            tree="attrezzature"
            marcaNome={props.filtroMarca}
            value={props.filtroModello}
            onChange={props.onFiltroModello}
            inputClassName={mezziFieldInputClass}
            variant="filter"
            allowAdd={false}
            placeholder={props.filtroMarca.trim() ? mezziFilterListPlaceholder : "Cerca modello…"}
            aria-label="Filtra modello attrezzatura"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Matricola" htmlFor="mezzi-filter-matricola">
          <MezziFilterTextInput
            id="mezzi-filter-matricola"
            value={props.filtroMatricola}
            onChange={props.onFiltroMatricola}
            mono
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Targa" htmlFor="mezzi-filter-targa">
          <MezziFilterTextInput id="mezzi-filter-targa" value={props.filtroTarga} onChange={props.onFiltroTarga} mono />
        </MezziFieldWrap>
        <MezziFieldWrap label="N. scuderia" htmlFor="mezzi-filter-numero-scuderia">
          <MezziFilterTextInput
            id="mezzi-filter-numero-scuderia"
            value={props.filtroNumeroScuderia}
            onChange={props.onFiltroNumeroScuderia}
            mono
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Marca telaio">
          <GlobalHierarchyMarcaSelect
            tree="telai"
            value={props.filtroMarcaTelaio}
            onChange={(v) => {
              props.onFiltroMarcaTelaio(v);
              if (v.trim() !== props.filtroMarcaTelaio.trim()) props.onFiltroModelloTelaio("");
            }}
            inputClassName={mezziFieldInputClass}
            variant="filter"
            allowAdd={false}
            placeholder={mezziFilterListPlaceholder}
            aria-label="Filtra marca telaio"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Modello telaio">
          <GlobalHierarchyModelloSelect
            tree="telai"
            marcaNome={props.filtroMarcaTelaio}
            value={props.filtroModelloTelaio}
            onChange={props.onFiltroModelloTelaio}
            inputClassName={mezziFieldInputClass}
            variant="filter"
            allowAdd={false}
            placeholder={props.filtroMarcaTelaio.trim() ? mezziFilterListPlaceholder : "Cerca modello…"}
            aria-label="Filtra modello telaio"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Tipo telaio" htmlFor="mezzi-filter-tipo-telaio">
          <MezziFilterListSelect
            id="mezzi-filter-tipo-telaio"
            listKey="mezzi:tipiTelaio"
            value={props.filtroTipoTelaio}
            onChange={props.onFiltroTipoTelaio}
            aria-label="Filtra tipo telaio"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="N. telaio (VIN)" htmlFor="mezzi-filter-vin">
          <MezziFilterTextInput id="mezzi-filter-vin" value={props.filtroVin} onChange={props.onFiltroVin} mono />
        </MezziFieldWrap>
        <MezziFieldWrap label="Tagliandi" htmlFor="mezzi-filter-tagliandi">
          <GlobalSelect
            id="mezzi-filter-tagliandi"
            variant="filter"
            inputClassName={mezziFieldInputClass}
            items={[
              { value: "", label: "Tutti" },
              { value: "si", label: "Sì" },
              { value: "no", label: "No" },
            ]}
            value={props.filtroTagliandi}
            onChange={(v) => props.onFiltroTagliandi(v as TagliandiFilter)}
            strictFromList
            selectOnly
            aria-label="Filtra per tagliandi"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="N. lavorazioni" htmlFor="mezzi-filter-numero-lav">
          <GlobalSelect
            id="mezzi-filter-numero-lav"
            variant="filter"
            inputClassName={mezziFieldInputClass}
            items={[
              { value: "", label: "Tutti" },
              { value: "con", label: "Con lavorazioni" },
              { value: "senza", label: "Senza lavorazioni" },
            ]}
            value={props.filtroNumeroLav}
            onChange={(v) => props.onFiltroNumeroLav(v as NumeroLavorazioniFilter)}
            strictFromList
            selectOnly
            aria-label="Filtra per numero lavorazioni"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Ultima lavorazione" htmlFor="mezzi-filter-ultima-lav">
          <GlobalSelect
            id="mezzi-filter-ultima-lav"
            variant="filter"
            inputClassName={mezziFieldInputClass}
            items={[
              { value: "", label: "Tutti" },
              { value: "con", label: "Con lavorazione" },
              { value: "senza", label: "Senza lavorazione" },
              { value: "recenti12m", label: "Ultimi 12 mesi" },
              { value: "oltre12m", label: "Oltre 12 mesi" },
            ]}
            value={props.filtroUltimaLav}
            onChange={(v) => props.onFiltroUltimaLav(v as UltimaLavorazioneFilter)}
            strictFromList
            selectOnly
            aria-label="Filtra per ultima lavorazione"
          />
        </MezziFieldWrap>
      </div>
    </div>
  );
}

export type MezziFiltersProps = MezziSearchBarProps & MezziFilterFieldsProps;

/** Toolbar ricerca + campi filtro (stile allineato a Documenti / Preventivi). */
export function MezziFilters(props: MezziFiltersProps) {
  const { search, onSearch, embedded: _embedded, ...fields } = props;
  void _embedded;
  return (
    <div className={`${dsPageToolbar} min-w-0 w-full max-w-full`}>
      <div className="flex flex-col gap-3">
        <MezziSearchBar search={search} onSearch={onSearch} />
        <MezziFilterFields embedded={false} {...fields} />
      </div>
    </div>
  );
}

export function mezziFieldFiltersActive(input: {
  filtroCliente: string;
  filtroUtilizzatore: string;
  filtroCantiere: string;
  filtroTipoAttrezzatura: string;
  filtroMarca: string;
  filtroModello: string;
  filtroMatricola: string;
  filtroTarga: string;
  filtroNumeroScuderia: string;
  filtroMarcaTelaio: string;
  filtroModelloTelaio: string;
  filtroTipoTelaio: string;
  filtroVin: string;
  filtroTagliandi: TagliandiFilter;
  filtroNumeroLav: NumeroLavorazioniFilter;
  filtroUltimaLav: UltimaLavorazioneFilter;
}): boolean {
  return (
    input.filtroCliente.trim().length > 0 ||
    input.filtroUtilizzatore.trim().length > 0 ||
    input.filtroCantiere.trim().length > 0 ||
    input.filtroTipoAttrezzatura.trim().length > 0 ||
    input.filtroMarca.trim().length > 0 ||
    input.filtroModello.trim().length > 0 ||
    input.filtroMatricola.trim().length > 0 ||
    input.filtroTarga.trim().length > 0 ||
    input.filtroNumeroScuderia.trim().length > 0 ||
    input.filtroMarcaTelaio.trim().length > 0 ||
    input.filtroModelloTelaio.trim().length > 0 ||
    input.filtroTipoTelaio.trim().length > 0 ||
    input.filtroVin.trim().length > 0 ||
    Boolean(input.filtroTagliandi) ||
    Boolean(input.filtroNumeroLav) ||
    Boolean(input.filtroUltimaLav)
  );
}
