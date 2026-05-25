"use client";



import { useCallback, useMemo } from "react";

import { GlobalSelect } from "@/components/gestionale/global-input/global-select";

import {

  isStructuredListKey,

  listKeyAllowsDynamicAppend,

  type GlobalSettingsListContext,

  type GlobalSettingsListKey,

} from "@/src/lib/global-list/global-settings-list-keys";

import { useAppendGlobalListValue } from "@/src/hooks/use-append-global-list-value";

import { useGlobalListOptions } from "@/src/hooks/use-global-list-options";



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

  "aria-label"?: string;

};



/**

 * Combobox collegato a `app_settings`: elenco live, filtro typeahead, aggiunta dinamica.

 */

export function GlobalSettingsListSelect({

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

  "aria-label": ariaLabel,

}: GlobalSettingsListSelectProps) {

  const list = useGlobalListOptions(listKey, context);

  const structured = isStructuredListKey(listKey);

  const canAppendList = listKeyAllowsDynamicAppend(listKey);

  const { append, canAppend, isPending } = useAppendGlobalListValue(listKey, context);



  const onAddToList = useCallback(

    async (raw: string) => {

      const canonical = await append(raw);

      if (canonical) onChange(canonical);

    },

    [append, onChange],

  );



  const hierarchyBlocked =

    context?.hierarchyKind === "modello" && !(context.marcaNome?.trim());



  const emptyMessage = useMemo(() => {

    if (hierarchyBlocked) return "Seleziona prima la marca.";

    if (list.isError) return "Elenco non disponibile. Riprova tra poco.";

    if (!list.ready && list.isLoading) return "Caricamento…";

    return "Nessun risultato";

  }, [hierarchyBlocked, list.isError, list.isLoading, list.ready]);



  const sharedProps = {

    id,

    variant,

    filterNeutralValues,

    className,

    inputClassName,

    value,

    onChange,

    disabled: disabled || hierarchyBlocked || !list.ready,

    required,

    placeholder,

    "aria-label": ariaLabel,

    isLoading: list.isLoading || !list.ready,

    strictFromList: true as const,

    allowAdd: allowAdd && canAppendList,

    canAdd: canAppend && canAppendList,

    addPending: isPending,

    onAddToList: allowAdd && canAppendList ? onAddToList : undefined,

    forceInvalid,

    invalidMessage,

    emptyMessage,

    selectOnly,

    similarStandardizeLegalSuffix:
      listKey === "mezzi:clienti" ||
      listKey === "mezzi:utilizzatori" ||
      listKey === "magazzino:fornitori",

  };



  if (structured) {

    return (

      <GlobalSelect

        {...sharedProps}

        items={list.items}

        coloredOptions

      />

    );

  }



  return <GlobalSelect {...sharedProps} options={list.options} />;

}



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

  placeholder,

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

  placeholder,

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


