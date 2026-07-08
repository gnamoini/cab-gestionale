"use client";

import { useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import { globalAutocompleteDropdownPortalPanel } from "@/lib/ui/global-input";
import { preventivoEditorTableInput } from "@/components/preventivi/preventivo-editor-ui";

export type OrdineMagazzinoSuggestion = {
  id: string;
  descrizione: string;
  codice: string;
  marca: string;
  fornitoreMatch: boolean;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: OrdineMagazzinoSuggestion[];
  onSelect: (s: OrdineMagazzinoSuggestion) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel: string;
};

export function OrdineFornitoreRigaMagazzinoField({
  value,
  onChange,
  open,
  onOpenChange,
  suggestions,
  onSelect,
  disabled,
  placeholder,
  ariaLabel,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const trimmed = value.trim();
  const showDropdown = open && trimmed.length > 0;

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
        className={`${globalAutocompleteDropdownPortalPanel} z-[120] py-1 text-[11px] ${placementOriginClass} ${
          scrollInside ? "max-h-56 overflow-y-auto" : "overflow-hidden"
        }`}
      >
        {suggestions.length ? (
          suggestions.map((p) => (
            <li key={p.id} role="presentation">
              <button
                type="button"
                role="option"
                className="flex w-full min-w-0 flex-col px-2 py-1.5 text-left hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onSelect(p);
                }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate font-medium text-[color:var(--cab-text)]">
                    {p.descrizione || "—"}
                  </span>
                  {p.fornitoreMatch ? (
                    <span className="shrink-0 rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] px-1.5 py-0.5 text-[10px] font-medium text-[color:color-mix(in_srgb,var(--cab-primary)_88%,var(--cab-text))]">
                      Fornitore
                    </span>
                  ) : null}
                </span>
                <span className="truncate text-[color:var(--cab-text-muted)]">
                  {p.codice || "—"} · {p.marca || "—"}
                </span>
              </button>
            </li>
          ))
        ) : (
          <li role="status" className="px-2 py-1.5 text-[color:var(--cab-text-muted)]">
            Nessun ricambio in magazzino.
          </li>
        )}
      </ul>
    ) : null;

  return (
    <div ref={wrapRef} className="relative min-w-0 max-md:overflow-visible">
      <input
        className={preventivoEditorTableInput}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          onOpenChange(true);
        }}
        onFocus={() => onOpenChange(true)}
      />
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
