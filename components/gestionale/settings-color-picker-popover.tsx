"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type RefObject } from "react";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { GLOBAL_DROPDOWN_PORTAL_Z } from "@/lib/ui/global-dropdown-portal";
import { useGlobalDropdownPortal } from "@/components/gestionale/global-input/use-global-dropdown-portal";

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
  const [mounted, setMounted] = useState(false);
  const hex = normalizeHex(value) ?? "#52525b";

  const { style } = useGlobalDropdownPortal({
    open: open && mounted,
    anchorRef,
    contentRef: panelRef,
    placement: "bottom-end",
    matchAnchorWidth: false,
    panelWidth: 160,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

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
      className="flex min-w-0 min-w-[9rem] max-w-full flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      style={{ ...style, zIndex: GLOBAL_DROPDOWN_PORTAL_Z }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Scegli colore
      </span>
      <input
        type="color"
        value={hex}
        aria-label={ariaLabel}
        className="h-10 w-full max-w-[10rem] cursor-pointer overflow-hidden rounded border border-zinc-200 bg-zinc-50 p-0 dark:border-zinc-600 dark:bg-zinc-800"
        onChange={(e) => {
          const nh = normalizeHex(e.target.value);
          if (nh) onChange(nh);
        }}
      />
      <button
        type="button"
        className="text-left text-xs font-medium text-[color:var(--cab-primary)] hover:underline"
        onClick={onClose}
      >
        Chiudi
      </button>
    </div>,
    document.body,
  );
}
