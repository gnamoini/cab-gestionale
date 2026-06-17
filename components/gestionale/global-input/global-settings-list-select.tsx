"use client";



import { memo, useCallback, useMemo } from "react";

import { GlobalSelect } from "@/components/gestionale/global-input/global-select";

import {
  isStructuredListKey,
  listKeyAllowsDynamicAppend,
  type GlobalSettingsListContext,
  type GlobalSettingsListKey,
} from "@/src/lib/global-list/global-settings-list-keys";
import { useAppendGlobalListValue } from "@/src/hooks/use-append-global-list-value";
import { useGlobalListOptions } from "@/src/hooks/use-global-list-options";
import { mergeCurrentValueInOptions, normListSelectValue, compareListSelectLabel, isNeutralListOptionLabel } from "@/lib/ui/list-select-utils";
import { useClientHydrated } from "@/lib/ui/use-client-hydrated";



export type GlobalSettingsListSelectProps = {

  listKey: GlobalSettingsListKey;

  value: string;

  onChange: (value: string) => void;

  context?: GlobalSettingsListContext;

  disabled?: boolean;

  required?: boolean;

  placeholder?: string;

  className?: string;

  inputClassName?: string;

  id?: string;

  variant?: "default" | "filter";

  filterNeutralValues?: readonly string[];

  allowAdd?: boolean;

  forceInvalid?: boolean;

  invalidMessage?: string;

  /** Solo scelta da elenco: niente digitazione né filtro testuale. */
  selectOnly?: boolean;

  /** Titolo bottom sheet mobile (default: aria-label). */
  sheetTitle?: string;

  /** Soglia opzioni per sheet mobile (0 = sempre su mobile con dominio rollout). */
  minSheetOptions?: number;

  /** Abilita bottom sheet mobile (default: true). */
  mobileSheet?: boolean;

  /** Sheet mobile: searchable (con Cerca) o selectOnly (solo elenco). */
  mobileSheetMode?: "selectOnly" | "searchable" | "off";

  /** Dominio UX sheet rollout (v2). */
  selectorDomain?: import("@/lib/selector-core/selector-domain-policy").SelectorDomain;

  /** Lista DB-driven — policy selectOnly dev warn. */
  dynamicList?: boolean;

  /** Filtro operativo ad alta frequenza. */
  operationalFilter?: boolean;

  /** Voce in testa con value "" (es. «Nessuna marca»). */
  emptyOptionLabel?: string;

  /** Valori esclusi dall'elenco (es. segnaposto interni «—»). */
  excludeValues?: readonly string[];

  /** Chiude gli altri GlobalSelect con lo stesso groupId all'apertura. */
  exclusiveGroup?: string;

  "aria-label"?: string;

};



const MAGAZZINO_MARCA_EMPTY_LABEL = "Nessuna marca";



function resolveDefaultEmptyOptionLabel(

  listKey: GlobalSettingsListKey,

  variant: "default" | "filter",

): string | undefined {

  if (variant === "filter") return undefined;

  if (listKey === "magazzino:marche") return MAGAZZINO_MARCA_EMPTY_LABEL;

  return undefined;

}



/**

 * Combobox collegato a `app_settings`: elenco live, filtro typeahead, aggiunta dinamica.

 */

function GlobalSettingsListSelectInner({

  listKey,

  value,

  onChange,

  context,

  disabled,

  required,

  placeholder,

  className,

  inputClassName,

  id,

  variant = "default",

  filterNeutralValues,

  allowAdd = true,

  forceInvalid,

  invalidMessage,

  selectOnly,

  sheetTitle,

  minSheetOptions,

  mobileSheet,

  mobileSheetMode,

  selectorDomain,

  dynamicList,

  operationalFilter,

  emptyOptionLabel,

  excludeValues,

  exclusiveGroup,

  "aria-label": ariaLabel,

}: GlobalSettingsListSelectProps) {
  const hydrated = useClientHydrated();
  const list = useGlobalListOptions(listKey, context);
  const structured = isStructuredListKey(listKey);
  const canAppendList = listKeyAllowsDynamicAppend(listKey);
  const { append, canAppend, isPending } = useAppendGlobalListValue(listKey, context);

  const listPending = list.isLoading || !list.ready;
  const deferListUi = hydrated && listPending;
  const resolvedEmptyOptionLabel = emptyOptionLabel ?? resolveDefaultEmptyOptionLabel(listKey, variant);

  const onAddToList = useCallback(

    async (raw: string): Promise<string | null> => {

      const canonical = await append(raw);

      if (canonical) onChange(canonical);

      return canonical ?? null;

    },

    [append, onChange],

  );



  const optionsForUi = useMemo(() => {
    let opts = mergeCurrentValueInOptions(value, list.options);
    if (excludeValues?.length) {
      const excluded = new Set(excludeValues.map((v) => normListSelectValue(v)));
      opts = opts.filter((o) => !excluded.has(normListSelectValue(o)));
    }
    if (resolvedEmptyOptionLabel) {
      opts = opts.filter((o) => !isNeutralListOptionLabel(o));
    }
    return opts;
  }, [list.options, value, excludeValues, resolvedEmptyOptionLabel]);

  const itemsForUi = useMemo(() => {
    const base = structured
      ? [...list.items].sort((a, b) => compareListSelectLabel(a.label, b.label))
      : [...optionsForUi]
          .map((o) => ({ value: o, label: o }))
          .sort((a, b) => compareListSelectLabel(a.label, b.label));
    if (!resolvedEmptyOptionLabel) return base;
    const empty = { value: "", label: resolvedEmptyOptionLabel };
    const rest = base.filter(
      (item) => item.value.trim() !== "" && !isNeutralListOptionLabel(item.label),
    );
    return [empty, ...rest];
  }, [structured, list.items, optionsForUi, resolvedEmptyOptionLabel]);



  const hierarchyBlocked =

    context?.hierarchyKind === "modello" && !(context.marcaNome?.trim());



  const emptyMessage = useMemo(() => {

    if (hierarchyBlocked) return "Seleziona prima la marca.";

    if (list.isError) return "Elenco non disponibile. Riprova tra poco.";

    if (!list.ready && list.isLoading) return "Caricamento…";

    return "Nessun risultato";

  }, [hierarchyBlocked, list.isError, list.isLoading, list.ready]);

  const isMagazzinoListKey = listKey.startsWith("magazzino:");
  const isMezziListKey = listKey.startsWith("mezzi:");
  const resolvedSelectorDomain =
    selectorDomain ?? (isMagazzinoListKey ? "magazzino" : isMezziListKey ? "mezzi" : undefined);
  const resolvedMobileSheetMode =
    mobileSheetMode ?? (isMezziListKey && !selectOnly ? "searchable" : undefined);
  const resolvedPlaceholder =
    placeholder ??
    (isMezziListKey || isMagazzinoListKey || listKey === "lavorazioni:addetti"
      ? "Digita o seleziona…"
      : undefined);

  const sharedProps = {

    id,

    variant,

    filterNeutralValues,

    className,

    inputClassName,

    value,

    onChange,

    disabled: disabled || hierarchyBlocked || deferListUi,

    required,

    placeholder: resolvedPlaceholder,

    "aria-label": ariaLabel,

    isLoading: deferListUi,

    strictFromList: true as const,

    allowAdd: allowAdd && canAppendList,

    canAdd: canAppend && canAppendList,

    addPending: isPending,

    onAddToList: allowAdd && canAppendList ? onAddToList : undefined,

    forceInvalid,

    invalidMessage,

    emptyMessage,

    selectOnly,

    sheetTitle,

    minSheetOptions,

    mobileSheet,

    mobileSheetMode: resolvedMobileSheetMode,

    selectorDomain: resolvedSelectorDomain,

    dynamicList: dynamicList ?? (isMagazzinoListKey || isMezziListKey),

    operationalFilter,

    recentsKey: isMagazzinoListKey ? undefined : listKey,

    alphabeticalBrowse: isMagazzinoListKey,

    similarStandardizeLegalSuffix:
      listKey === "mezzi:clienti" ||
      listKey === "mezzi:utilizzatori" ||
      listKey === "magazzino:fornitori",

    exclusiveGroup,

  };



  if (structured || resolvedEmptyOptionLabel) {

    return (

      <GlobalSelect

        {...sharedProps}

        items={itemsForUi}

        coloredOptions={structured}

      />

    );

  }



  return <GlobalSelect {...sharedProps} options={optionsForUi} />;

}

export const GlobalSettingsListSelect = memo(GlobalSettingsListSelectInner);



/** Marca da gerarchia attrezzature/telai (impostazioni globali). */

export function GlobalHierarchyMarcaSelect({
  tree,
  value,
  onChange,
  disabled,
  required,
  className,
  inputClassName,
  variant = "default",
  placeholder = "Digita o seleziona…",
  allowAdd,
  selectOnly,
  emptyOptionLabel,
  "aria-label": ariaLabel,
}: {
  tree: "attrezzature" | "telai";
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  variant?: "default" | "filter";
  placeholder?: string;
  /** Consente «Aggiungi …» se il valore non è in elenco (richiede permesso configurazione). Default: true. */
  allowAdd?: boolean;
  selectOnly?: boolean;
  /** Voce in testa con value "" (es. «Nessuna marca»). */
  emptyOptionLabel?: string;
  "aria-label"?: string;
}) {
  return (
    <GlobalSettingsListSelect
      listKey="mezzi:clienti"
      value={value}
      onChange={onChange}
      context={{ hierarchyTree: tree, hierarchyKind: "marca" }}
      disabled={disabled}
      required={required}
      className={className}
      inputClassName={inputClassName}
      variant={variant}
      placeholder={placeholder}
      allowAdd={allowAdd ?? true}
      selectOnly={selectOnly}
      emptyOptionLabel={emptyOptionLabel}
      aria-label={ariaLabel}
    />
  );
}



/** Modello per marca (gerarchia attrezzature/telai). */

export function GlobalHierarchyModelloSelect({
  tree,
  marcaNome,
  value,
  onChange,
  disabled,
  required,
  className,
  inputClassName,
  variant = "default",
  placeholder = "Digita o seleziona…",
  allowAdd,
  selectOnly,
  "aria-label": ariaLabel,
}: {
  tree: "attrezzature" | "telai";
  marcaNome: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  variant?: "default" | "filter";
  placeholder?: string;
  /** Consente «Aggiungi …» se il valore non è in elenco (richiede permesso configurazione). Default: true. */
  allowAdd?: boolean;
  selectOnly?: boolean;
  "aria-label"?: string;
}) {
  return (
    <GlobalSettingsListSelect
      listKey="mezzi:clienti"
      value={value}
      onChange={onChange}
      context={{ hierarchyTree: tree, hierarchyKind: "modello", marcaNome }}
      disabled={disabled}
      required={required}
      className={className}
      inputClassName={inputClassName}
      variant={variant}
      placeholder={placeholder}
      allowAdd={allowAdd ?? true}
      selectOnly={selectOnly}
      aria-label={ariaLabel}
    />
  );
}



/** Marca telaio — autocomplete globale da `app_settings.mezziListe.telai`. */

export function GlobalTelaiMarcaSelect(

  props: Omit<React.ComponentProps<typeof GlobalHierarchyMarcaSelect>, "tree">,

) {

  return <GlobalHierarchyMarcaSelect tree="telai" {...props} />;

}



/** Modello telaio — autocomplete globale da gerarchia telai (richiede marca). */

export function GlobalTelaiModelloSelect(

  props: Omit<React.ComponentProps<typeof GlobalHierarchyModelloSelect>, "tree">,

) {

  return <GlobalHierarchyModelloSelect tree="telai" {...props} />;

}



/** Marca attrezzatura — alias gerarchia attrezzature. */

export function GlobalAttrezzatureMarcaSelect(

  props: Omit<React.ComponentProps<typeof GlobalHierarchyMarcaSelect>, "tree">,

) {

  return <GlobalHierarchyMarcaSelect tree="attrezzature" {...props} />;

}



/** Modello attrezzatura — alias gerarchia attrezzature. */

export function GlobalAttrezzatureModelloSelect(

  props: Omit<React.ComponentProps<typeof GlobalHierarchyModelloSelect>, "tree">,

) {

  return <GlobalHierarchyModelloSelect tree="attrezzature" {...props} />;

}


