"use client";

import { Tooltip } from "@/components/ui";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useClientHydrated } from "@/lib/ui/use-client-hydrated";
import { ADDETTO_COLOR_POOL } from "@/lib/lavorazioni/addetto-colors-assign";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { CloseButton } from "@/components/design-system";
import { GLOBAL_DROPDOWN_PORTAL_Z } from "@/lib/ui/global-dropdown-portal";
import { useGlobalDropdownPortal } from "@/components/gestionale/global-input/use-global-dropdown-portal";
import { dsFocus, dsInput, dsTableActionBtnColorSwatch } from "@/lib/ui/design-system";

const PRESET_SWATCH_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 p-0 shadow-[var(--cab-shadow-sm)] transition-[border-color,box-shadow,transform] duration-150 hover:scale-[1.04] active:scale-[0.98] touch-manipulation [-webkit-tap-highlight-color:transparent]";

/** Contenuto pannello (12 swatch + hex + native picker) — sopra il default dropdown 320px. */
const COLOR_PICKER_PANEL_MAX_HEIGHT = 520;

const COLOR_PICKER_PANEL_CLASS =
  "flex min-w-[14rem] max-w-full min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-3 shadow-[var(--cab-shadow-md)] gestionale-scrollbar";

function commitHexDraft(raw: string, onChange: (hex: string) => void): string | null {
  const nh = normalizeHex(raw);
  if (!nh) return null;
  onChange(nh);
  return nh;
}

/** Campione cliccabile — apre il selettore colori nativo del sistema (stessa shell dello swatch riga). */
function SettingsNativeColorPickerButton({
  value,
  ariaLabel,
  onChange,
}: {
  value: string;
  ariaLabel: string;
  onChange: (hex: string) => void;
}) {
  const hex = normalizeHex(value) ?? "#52525b";

  return (
    <Tooltip content={"Selettore colori di sistema"}><label className={`${dsTableActionBtnColorSwatch} relative shrink-0 touch-manipulation`} style={{ backgroundColor: hex }}>
      <input type="color" value={hex} aria-label={ariaLabel} className="absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0" onChange={(e) => {
        const nh = normalizeHex(e.target.value);
        if (!nh)
            return;
        onChange(nh);
    }}/>
    </label></Tooltip>
  );
}

export function SettingsColorPickerPopover({
  open,
  anchorRef,
  value,
  ariaLabel,
  onChange,
  onClose,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  value: string;
  ariaLabel: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const hexInputRef = useRef<HTMLInputElement>(null);
  const mounted = useClientHydrated();
  const hex = normalizeHex(value) ?? "#52525b";
  const [hexDraft, setHexDraft] = useState(hex);

  const { style } = useGlobalDropdownPortal({
    open: open && mounted,
    anchorRef,
    contentRef: panelRef,
    placement: "bottom-end",
    matchAnchorWidth: false,
    panelWidth: 224,
    maxHeight: COLOR_PICKER_PANEL_MAX_HEIGHT,
  });

   
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setHexDraft(hex);
  }, [hex, open]);

  const applyHexDraft = useCallback(() => {
    const next = commitHexDraft(hexDraft, onChange);
    if (next) setHexDraft(next);
  }, [hexDraft, onChange]);

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      const t = ev.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onClose();
    }
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={ariaLabel}
      className={COLOR_PICKER_PANEL_CLASS}
      style={{ ...style, zIndex: GLOBAL_DROPDOWN_PORTAL_Z }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Scegli colore
        </p>
        <CloseButton onClick={onClose} label="Chiudi" />
      </div>

      <div
        className="grid grid-cols-4 gap-1.5"
        role="listbox"
        aria-label={`Palette colori per ${ariaLabel}`}
      >
        {ADDETTO_COLOR_POOL.map((preset) => {
          const nh = normalizeHex(preset) ?? preset;
          const selected = nh === hex;
          return (
            <button
              key={nh}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={`Colore ${nh}`}
              className={`${PRESET_SWATCH_CLASS} ${dsFocus} ${
                selected
                  ? "border-[color:var(--cab-primary)] ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)]"
                  : "border-[color:var(--cab-border)]"
              }`}
              style={{ backgroundColor: nh }}
              onClick={() => {
                onChange(nh);
                setHexDraft(nh);
              }}
            />
          );
        })}
      </div>

      <div className="block min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Personalizza
        </span>
        <div className="mt-1.5 flex items-stretch gap-1.5">
          <input
            ref={hexInputRef}
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            value={hexDraft}
            aria-label={`Codice hex ${ariaLabel}`}
            placeholder="#2563eb"
            className={`${dsInput} ${dsFocus} min-h-10 min-w-0 flex-1 font-mono text-xs uppercase tabular-nums`}
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={applyHexDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyHexDraft();
                hexInputRef.current?.blur();
              }
            }}
          />
          <SettingsNativeColorPickerButton
            value={hex}
            ariaLabel={`Selettore colore ${ariaLabel}`}
            onChange={(nh) => {
              onChange(nh);
              setHexDraft(nh);
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
