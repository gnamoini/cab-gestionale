"use client";

import { useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import { globalAutocompleteDropdownPortalPanel } from "@/lib/ui/global-input";
import { dsInput } from "@/lib/ui/design-system";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";

type RicambiMagSearchPortalProps = {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hits: RicambioMagazzino[];
  onSelect: (p: RicambioMagazzino) => void;
  placeholder: string;
  ariaLabel: string;
};

export function RicambiMagSearchPortal({
  value,
  onChange,
  open,
  onOpenChange,
  hits,
  onSelect,
  placeholder,
  ariaLabel,
}: RicambiMagSearchPortalProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const trimmed = value.trim();
  const showDropdown = open && trimmed.length > 0;
  const hasHits = hits.length > 0;

  const { style: portalStyle, scrollInside, placementOriginClass } = useGlobalDropdownPortal({
    open: showDropdown,
    anchorRef: wrapRef,
    contentRef: panelRef,
    repositionDeps: [hits.length, value],
  });

  const dismiss = useCallback(() => onOpenChange(false), [onOpenChange]);
  useDropdownOutsideDismiss(showDropdown, wrapRef, panelRef, dismiss);

  const portalPanel =
    showDropdown && portalStyle ? (
      <div ref={panelRef} style={portalStyle}>
        {hasHits ? (
          <ul
            role="listbox"
            className={`${globalAutocompleteDropdownPortalPanel} py-1 text-[11px] ${placementOriginClass} ${
              scrollInside ? "overflow-y-auto" : "overflow-hidden"
            }`}
          >
            {hits.map((p) => (
              <li key={p.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  className="flex w-full min-w-0 flex-col px-3 py-2 text-left hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] dark:hover:bg-orange-950/30"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onSelect(p);
                  }}
                >
                  <span className="font-medium text-[color:var(--cab-text)]">{p.descrizione || "—"}</span>
                  <span className="text-[color:var(--cab-text-muted)]">
                    {(() => {
                      const codiceUi = ricambioCodiceForUi(p.codiceFornitoreOriginale);
                      const marca = p.marca?.trim() || "—";
                      return codiceUi ? `${codiceUi} · ${marca}` : marca;
                    })()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p
            role="status"
            className={`${globalAutocompleteDropdownPortalPanel} px-3 py-2 text-[11px] text-[color:var(--cab-text-muted)]`}
          >
            Nessun ricambio trovato.
          </p>
        )}
      </div>
    ) : null;

  return (
    <div ref={wrapRef} className="relative max-w-xl max-md:overflow-visible" data-ricambi-mag-search="1">
      <GestionaleSearchField
        wrapperClassName="w-full"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onOpenChange(true);
        }}
        onFocus={() => onOpenChange(true)}
        autoComplete="off"
        aria-label={ariaLabel}
      />
      {typeof document !== "undefined" && portalPanel ? createPortal(portalPanel, document.body) : null}
    </div>
  );
}

export type RicambioSuggestion = {
  id: string;
  descrizione: string;
  marca: string;
  codiceFornitoreOriginale: string;
};

type RicambioRowAutocompletePortalProps = {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: RicambioSuggestion[];
  onSelect: (s: RicambioSuggestion) => void;
  placeholder?: string;
};

export function RicambioRowAutocompletePortal({
  value,
  onChange,
  open,
  onOpenChange,
  suggestions,
  onSelect,
  placeholder = "Nome / descrizione",
}: RicambioRowAutocompletePortalProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const showDropdown = open && suggestions.length > 0;

  const { style: portalStyle, scrollInside, placementOriginClass } = useGlobalDropdownPortal({
    open: showDropdown,
    anchorRef: wrapRef,
    contentRef: panelRef,
    repositionDeps: [suggestions.length, value],
  });

  const dismiss = useCallback(() => onOpenChange(false), [onOpenChange]);
  useDropdownOutsideDismiss(showDropdown, wrapRef, panelRef, dismiss);

  const menu =
    showDropdown && portalStyle ? (
      <ul
        ref={panelRef}
        role="listbox"
        style={portalStyle}
        className={`${globalAutocompleteDropdownPortalPanel} py-1 text-[11px] ${placementOriginClass} ${
          scrollInside ? "overflow-y-auto" : "overflow-hidden"
        }`}
      >
        {suggestions.map((p) => (
          <li key={p.id} role="presentation">
            <button
              type="button"
              role="option"
              className="flex w-full flex-col px-2 py-1.5 text-left hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(p)}
            >
              <span className="font-medium text-[color:var(--cab-text)]">{p.descrizione}</span>
              <span className="text-[color:var(--cab-text-muted)]">
                {(() => {
                  const codiceUi = ricambioCodiceForUi(p.codiceFornitoreOriginale);
                  const marca = p.marca?.trim() || "—";
                  return codiceUi ? `${marca} · ${codiceUi}` : marca;
                })()}
              </span>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div ref={wrapRef} className="relative max-md:overflow-visible">
      <input
        className={`${dsInput} min-h-10 w-full min-w-0`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => onOpenChange(true)}
        placeholder={placeholder}
      />
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
