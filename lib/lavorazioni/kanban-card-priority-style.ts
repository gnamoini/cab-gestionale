import type { CSSProperties } from "react";
import { prioritaDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { PrioritaLav } from "@/lib/lavorazioni/types";

export const KANBAN_PRIO_ACCENT_VAR = "--kanban-prio-accent";
export const KANBAN_PRIO_BORDER_VAR = "--kanban-prio-border";
export const KANBAN_PRIO_BG_VAR = "--kanban-prio-bg";

export type KanbanCardPriorityVisual = {
  className: string;
  style: CSSProperties;
  /** Indicatore non solo-colore (punto accanto al titolo). */
  dotClassName: string;
  dotStyle: CSSProperties;
};

function accentStyle(
  accent: string,
  extra?: { border?: string; bg?: string },
): CSSProperties {
  const border = extra?.border ?? accent;
  const bg = extra?.bg ?? accent;
  return {
    [KANBAN_PRIO_ACCENT_VAR]: accent,
    [KANBAN_PRIO_BORDER_VAR]: border,
    [KANBAN_PRIO_BG_VAR]: bg,
  } as CSSProperties;
}

/** Bordo, punto e tint sfondo: stesso rosso «alta» (mix sfondo più intenso in className urgente). */
function kanbanUrgenteColors(overrides?: Partial<Record<PrioritaLav, string>> | null): {
  border: string;
  bg: string;
  dot: string;
} {
  const alta = prioritaDisplayColor("alta", overrides);
  return { border: alta, bg: alta, dot: alta };
}

/**
 * Stili card Kanban per priorità — token CAB + colore priorità da tema globale.
 * Solo presentazione; nessuna logica workflow.
 */
export function kanbanCardPriorityVisual(
  priorita: PrioritaLav,
  prioritaColors?: Partial<Record<PrioritaLav, string>> | null,
): KanbanCardPriorityVisual {
  const accent = prioritaDisplayColor(priorita, prioritaColors);
  const dotBase = "mt-1.5 inline-block size-2 shrink-0 rounded-full ring-2 ring-[color:var(--cab-card)]";

  switch (priorita) {
    case "urgente": {
      const u = kanbanUrgenteColors(prioritaColors);
      return {
        className: [
          "border-l-[5px] border-l-[color:var(--kanban-prio-border)]",
          "bg-[color:color-mix(in_srgb,var(--kanban-prio-bg)_26%,var(--cab-card))]",
          "shadow-[var(--cab-shadow-sm),0_0_0_1px_color-mix(in_srgb,var(--kanban-prio-bg)_32%,transparent),0_6px_16px_-6px_color-mix(in_srgb,var(--kanban-prio-bg)_48%,transparent)]",
          "ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--kanban-prio-bg)_20%,transparent)]",
        ].join(" "),
        style: accentStyle(accent, { border: u.border, bg: u.bg }),
        dotClassName: dotBase,
        dotStyle: { backgroundColor: u.dot },
      };
    }
    case "alta":
      return {
        className: [
          "border-l-[5px] border-l-[color:var(--kanban-prio-border)]",
          "bg-[color:color-mix(in_srgb,var(--kanban-prio-bg)_12%,var(--cab-card))]",
          "shadow-[var(--cab-shadow-sm),0_4px_14px_-8px_color-mix(in_srgb,var(--kanban-prio-bg)_32%,transparent)]",
        ].join(" "),
        style: accentStyle(accent),
        dotClassName: dotBase,
        dotStyle: { backgroundColor: accent },
      };
    case "media":
      return {
        className: [
          "border-l-4 border-l-[color:color-mix(in_srgb,var(--kanban-prio-accent)_50%,var(--cab-border-strong))]",
          "bg-[color:color-mix(in_srgb,var(--kanban-prio-accent)_7%,var(--cab-card))]",
          "shadow-[var(--cab-shadow-sm)]",
        ].join(" "),
        style: accentStyle(accent),
        dotClassName: dotBase,
        dotStyle: { backgroundColor: accent },
      };
    case "bassa":
      return {
        className: [
          "border-l-4 border-l-[color:color-mix(in_srgb,var(--cab-border-strong)_72%,var(--cab-text-muted))]",
          "bg-[color:color-mix(in_srgb,var(--cab-surface-2)_38%,var(--cab-card))]",
          "shadow-[var(--cab-shadow-sm)]",
        ].join(" "),
        style: {},
        dotClassName: `${dotBase} bg-[color:color-mix(in_srgb,var(--cab-text-muted)_55%,var(--cab-border))]`,
        dotStyle: {},
      };
    default:
      return {
        className: "border-l-4 border-l-[color:var(--cab-border-strong)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]",
        style: {},
        dotClassName: `${dotBase} bg-[color:var(--cab-border-strong)]`,
        dotStyle: {},
      };
  }
}
