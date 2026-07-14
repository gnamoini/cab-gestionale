import type { GestionaleLogEventTone } from "@/lib/gestionale-log/view-model";

/** Badge compatto (tipo evento). */
export const GESTIONALE_LOG_TONE_BADGE: Record<GestionaleLogEventTone, string> = {
  create: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  update: "bg-[color:color-mix(in_srgb,var(--cab-primary)_18%,transparent)] text-[color:var(--cab-primary)]",
  delete: "bg-red-500/15 text-red-800 dark:text-red-300",
  complete: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  archive: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  reopen: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300",
  neutral: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

export const GESTIONALE_LOG_TONE_DOT: Record<GestionaleLogEventTone, string> = {
  create: "bg-emerald-500",
  update: "bg-[color:var(--cab-primary)]",
  delete: "bg-red-500",
  complete: "bg-sky-500",
  archive: "bg-zinc-400",
  reopen: "bg-indigo-500",
  neutral: "bg-zinc-400",
};

const GESTIONALE_LOG_TONE_ACTIVITY_BORDER: Record<GestionaleLogEventTone, string> = {
  create: "border-l-emerald-500",
  update: "border-l-[color:var(--cab-primary)]",
  delete: "border-l-red-500",
  complete: "border-l-sky-500",
  archive: "border-l-zinc-400",
  reopen: "border-l-indigo-500",
  neutral: "border-l-zinc-400",
};

const GESTIONALE_LOG_TONE_ACTIVITY_BG: Record<GestionaleLogEventTone, string> = {
  create: "bg-[color:color-mix(in_srgb,#10b981_7%,var(--cab-card))]",
  update: "bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-card))]",
  delete: "bg-[color:color-mix(in_srgb,#ef4444_7%,var(--cab-card))]",
  complete: "bg-[color:color-mix(in_srgb,#0ea5e9_7%,var(--cab-card))]",
  archive: "bg-[color:color-mix(in_srgb,#71717a_8%,var(--cab-card))]",
  reopen: "bg-[color:color-mix(in_srgb,#6366f1_7%,var(--cab-card))]",
  neutral: "bg-[var(--cab-card)]",
};

/** Accento laterale + fondo per righe attività compatte (dashboard, timeline). */
export function gestionaleLogActivityRowClass(tone: GestionaleLogEventTone): string {
  return `border-l-[3px] ${GESTIONALE_LOG_TONE_ACTIVITY_BORDER[tone]} ${GESTIONALE_LOG_TONE_ACTIVITY_BG[tone]}`;
}
