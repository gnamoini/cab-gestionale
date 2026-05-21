"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { selectPillInner } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsFocus } from "@/lib/ui/design-system";
import {
  lavTablePillMinH,
  lavTablePillTextClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";

type OptionChildProps = { value?: string | number; children?: ReactNode };
export type TablePillOption = { value: string; label: string };

function optionLabelFromProps(props: OptionChildProps, value: string): string {
  if (typeof props.children === "string") return props.children;
  if (Array.isArray(props.children)) return props.children.join("");
  return value;
}

/** Estrae `<option>` anche da fragment annidati (non da sotto-componenti React). */
function parseSelectOptions(children: ReactNode): TablePillOption[] {
  const items: TablePillOption[] = [];
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (child == null || typeof child === "boolean") return;
      if (!isValidElement(child)) return;
      if (child.type === "option") {
        const props = child.props as OptionChildProps;
        const v = String(props.value ?? "");
        items.push({ value: v, label: optionLabelFromProps(props, v) });
        return;
      }
      const nested = (child.props as { children?: ReactNode }).children;
      if (nested != null) walk(nested);
    });
  };
  walk(children);
  return items;
}

const TABLE_PILL_MENU_GAP = 4;
const TABLE_PILL_MENU_Z = 130;

const pillChevron = (
  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

type TablePillMenuCoords = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  scrollInside: boolean;
};

function computeTablePillMenuCoords(trigger: HTMLElement, contentHeight?: number): TablePillMenuCoords {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - TABLE_PILL_MENU_GAP - 8;
  const needed = contentHeight ?? 0;
  const available = Math.max(80, spaceBelow);
  const scrollInside = needed > 0 && needed > available;
  const maxHeight = needed > 0 ? Math.min(needed, available) : available;

  return {
    top: rect.bottom + TABLE_PILL_MENU_GAP,
    left: rect.left,
    width: rect.width,
    maxHeight,
    scrollInside,
  };
}

/** Menu custom per pill tabella: voci centrate (il `<select>` nativo non lo consente). */
function TablePillSelectMenu({
  value,
  onChange,
  options,
  ariaLabel,
  disabled,
  title,
}: {
  value: string;
  onChange: (next: string) => void;
  options: TablePillOption[];
  ariaLabel: string;
  disabled?: boolean;
  title?: string;
}) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<TablePillMenuCoords | null>(null);
  const selected = options.find((o) => o.value === value);
  const shellRef = useRef<HTMLDivElement>(null);

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
      const next = computeTablePillMenuCoords(anchor, contentHeight);
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
        zIndex: TABLE_PILL_MENU_Z,
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
        className={`rounded-lg border border-[color:var(--cab-border)] bg-[#18181b] py-1 shadow-xl ${
          menuCoords.scrollInside ? "gestionale-scrollbar overflow-y-auto" : "overflow-hidden"
        }`}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <li key={opt.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={active}
                className={`w-full cursor-pointer px-2 py-2 text-center ${lavTablePillTextClass} text-[#fafafa] transition-colors hover:bg-[#27272a] ${dsFocus} ${
                  active ? "bg-[#f97316] text-white" : ""
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
    <div ref={shellRef} className={`relative flex ${lavTablePillMinH} w-full items-stretch`}>
      <button
        ref={triggerRef}
        type="button"
        className={`flex min-h-8 w-full cursor-pointer items-center justify-center gap-1 rounded-[inherit] bg-transparent px-2 py-1 text-center ${lavTablePillTextClass} text-inherit outline-none transition-[background-color,color] duration-150 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60 ${dsFocus}`}
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

/** Pill colorata solo lettura (storico): stessa silhouette delle celle tabella principale. */
export function TablePillReadonly({
  shellClass,
  shellStyle,
  title,
  children,
  fitContent = false,
}: {
  shellClass: string;
  shellStyle?: CSSProperties;
  title?: string;
  children: ReactNode;
  fitContent?: boolean;
}) {
  const widthClass = fitContent ? "w-fit max-w-none" : "min-w-0 max-w-[8.75rem]";
  const textClass = fitContent
    ? `min-w-0 flex-1 whitespace-nowrap ${lavTablePillTextClass} text-inherit`
    : `min-w-0 flex-1 truncate ${lavTablePillTextClass} text-inherit`;
  return (
    <div className={`${shellClass} overflow-hidden ${widthClass}`} style={shellStyle} title={title}>
      <div className={`relative flex ${lavTablePillMinH} w-full items-center overflow-hidden rounded-[inherit] px-2 py-0.5`}>
        <span className={textClass}>{children}</span>
      </div>
    </div>
  );
}

/** Select compatto tabella con chevron e altezza fissa (stato / priorità / addetto). */
export function InlineSelectField({
  shellClass,
  shellStyle,
  title,
  value,
  onChange,
  ariaLabel,
  disabled,
  wide = false,
  /** Pill tabella: menu custom con voci centrate. */
  tablePill = false,
  tablePillWidth,
  /** Voci menu pill tabella (es. addetto da componente wrapper). */
  tablePillOptions,
  fullWidth = false,
  children,
}: {
  shellClass: string;
  shellStyle?: CSSProperties;
  title?: string;
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  wide?: boolean;
  tablePill?: boolean;
  tablePillWidth?: string;
  tablePillOptions?: TablePillOption[];
  fullWidth?: boolean;
  children: ReactNode;
}) {
  const widthClass = fullWidth
    ? "w-full max-w-none"
    : tablePill
      ? (tablePillWidth ?? "w-[9.5rem] max-w-full")
      : wide
        ? "w-fit max-w-full shrink-0"
        : "w-full min-w-0 max-w-full";

  const shellOverflow = tablePill ? "overflow-visible" : "overflow-hidden";
  const parsedOptions = tablePill
    ? (tablePillOptions?.length ? tablePillOptions : parseSelectOptions(children))
    : [];

  return (
    <div
      className={`${shellClass} group ${shellOverflow} ${widthClass} ${disabled ? "opacity-60" : ""}`}
      style={shellStyle}
      title={title}
    >
      {tablePill ? (
        <TablePillSelectMenu
          value={value}
          onChange={onChange}
          options={parsedOptions}
          ariaLabel={ariaLabel}
          disabled={disabled}
          title={title}
        />
      ) : (
        <div className={`relative flex ${lavTablePillMinH} w-full items-stretch overflow-hidden rounded-[inherit]`}>
          <select
            className={
              fullWidth || wide
                ? `${selectPillInner} w-full whitespace-nowrap pr-8`
                : selectPillInner
            }
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={ariaLabel}
            disabled={disabled}
          >
            {children}
          </select>
          <span
            className="pointer-events-none absolute right-2 top-1/2 z-[1] -translate-y-1/2 text-current opacity-70 transition-opacity group-hover:opacity-100"
            aria-hidden
          >
            {pillChevron}
          </span>
        </div>
      )}
    </div>
  );
}
