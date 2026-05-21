"use client";

/**
 * Select a elenco fisso (senza ricerca): pill colorata + menu a tendina.
 * Standard globale per stato, priorità, addetto in tabella/card Lavorazioni e casi analoghi.
 * Per elenchi con ricerca/fuzzy/aggiunta valori usare `GlobalSelect`.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { dsFocus } from "@/lib/ui/design-system";
import { globalFixedListPillMenuPanel } from "@/lib/ui/global-input";

export type FixedListPillOption = {
  value: string;
  label: string;
  /** Colori pill per voce (es. stato/priorità/addetto da impostazioni). */
  pillStyle?: CSSProperties;
};

const MENU_GAP = 6;
const MENU_Z = 130;

const pillChevron = (
  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

export const fixedListPillTextClass = "text-[13px] font-medium leading-tight tracking-wide";

export const fixedListPillMinH = "min-h-8";

type MenuCoords = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  scrollInside: boolean;
};

function computeMenuCoords(trigger: HTMLElement, contentHeight?: number): MenuCoords {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP - 8;
  const needed = contentHeight ?? 0;
  const available = Math.max(80, spaceBelow);
  const scrollInside = needed > 0 && needed > available;
  const maxHeight = needed > 0 ? Math.min(needed, available) : available;

  return {
    top: rect.bottom + MENU_GAP,
    left: rect.left,
    width: rect.width,
    maxHeight,
    scrollInside,
  };
}

export function GlobalFixedListPillSelect({
  value,
  onChange,
  options,
  ariaLabel,
  disabled,
  title,
  /** Classi layout pill (bordo, ombra, focus ring) — un solo contenitore visivo. */
  shellClass,
  /** Stile pill selezionata se le opzioni non definiscono `pillStyle`. */
  fallbackPillStyle,
}: {
  value: string;
  onChange: (next: string) => void;
  options: readonly FixedListPillOption[];
  ariaLabel: string;
  disabled?: boolean;
  title?: string;
  shellClass?: string;
  fallbackPillStyle?: CSSProperties;
}) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);
  const selected = options.find((o) => o.value === value);
  const shellRef = useRef<HTMLDivElement>(null);
  const triggerStyle = selected?.pillStyle ?? fallbackPillStyle;

  const close = useCallback(() => setOpen(false), []);

  const measureTrigger = useCallback((): HTMLElement | null => {
    const shell = shellRef.current?.parentElement;
    if (shell) return shell;
    return triggerRef.current;
  }, []);

  const updateMenuCoords = useCallback(() => {
    const anchor = measureTrigger();
    if (!anchor) return;
    const contentHeight = menuRef.current?.scrollHeight;
    setMenuCoords((prev) => {
      const next = computeMenuCoords(anchor, contentHeight);
      if (
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.maxHeight === next.maxHeight &&
        prev.scrollInside === next.scrollInside
      ) {
        return prev;
      }
      return next;
    });
  }, [measureTrigger]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuCoords(null);
      return;
    }
    updateMenuCoords();
  }, [open, updateMenuCoords, options.length]);

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    updateMenuCoords();
  }, [open, menuCoords?.left, menuCoords?.width, updateMenuCoords]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onReposition = () => updateMenuCoords();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, close, updateMenuCoords]);

  const menuStyle: CSSProperties | undefined = menuCoords
    ? {
        position: "fixed",
        left: menuCoords.left,
        width: menuCoords.width,
        maxHeight: menuCoords.maxHeight,
        top: menuCoords.top,
        zIndex: MENU_Z,
      }
    : undefined;

  const menu =
    open && menuCoords ? (
      <ul
        ref={menuRef}
        id={listId}
        role="listbox"
        aria-label={ariaLabel}
        style={menuStyle}
        className={`${globalFixedListPillMenuPanel} ${
          menuCoords.scrollInside ? "overflow-y-auto" : "overflow-hidden"
        }`}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          const optStyle = opt.pillStyle ?? fallbackPillStyle;
          return (
            <li key={opt.value} role="presentation" className="py-0.5">
              <button
                type="button"
                role="option"
                aria-selected={active}
                style={optStyle}
                className={`w-full cursor-pointer rounded-md border px-2 py-1.5 text-center ${fixedListPillTextClass} transition-[filter,box-shadow] duration-150 hover:brightness-[1.06] ${dsFocus} ${
                  active ? "ring-2 ring-inset ring-white/35 shadow-sm" : ""
                }`}
                onClick={() => {
                  onChange(opt.value);
                  close();
                }}
              >
                {opt.label}
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div ref={shellRef} className={`relative flex w-full ${fixedListPillMinH} items-stretch`}>
      <button
        ref={triggerRef}
        type="button"
        style={triggerStyle}
        className={`flex min-h-8 w-full min-w-0 cursor-pointer items-center justify-center gap-1 px-2 py-1 text-center ${fixedListPillTextClass} outline-none transition-[filter,box-shadow,background-color,border-color,color] duration-150 hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-60 ${dsFocus} ${shellClass ?? "rounded-lg border border-black/10 shadow-sm dark:border-white/10"}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        title={title}
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
      >
        <span className="min-w-0 truncate">{selected?.label ?? value}</span>
        {pillChevron}
      </button>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
