type ActivityFeedEventStyle = {
  badge: string;
  rowBorder: string;
  rowBg: string;
};

const STYLES: Record<string, ActivityFeedEventStyle> = {
  ingresso: {
    badge: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
    rowBorder: "border-l-emerald-500",
    rowBg: "bg-[color:color-mix(in_srgb,#10b981_8%,var(--cab-card))]",
  },
  ingresso_magazzino: {
    badge: "bg-teal-500/15 text-teal-800 dark:text-teal-300",
    rowBorder: "border-l-teal-500",
    rowBg: "bg-[color:color-mix(in_srgb,#14b8a6_8%,var(--cab-card))]",
  },
  uscita_magazzino: {
    badge: "bg-orange-500/15 text-orange-900 dark:text-orange-200",
    rowBorder: "border-l-orange-500",
    rowBg: "bg-[color:color-mix(in_srgb,#f97316_8%,var(--cab-card))]",
  },
  movimento_magazzino: {
    badge: "bg-zinc-500/12 text-zinc-700 dark:text-zinc-300",
    rowBorder: "border-l-zinc-400",
    rowBg: "bg-[var(--cab-card)]",
  },
  lavorazione_aggiornata: {
    badge: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
    rowBorder: "border-l-amber-500",
    rowBg: "bg-[color:color-mix(in_srgb,#f59e0b_7%,var(--cab-card))]",
  },
  completata: {
    badge: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
    rowBorder: "border-l-sky-500",
    rowBg: "bg-[color:color-mix(in_srgb,#0ea5e9_8%,var(--cab-card))]",
  },
  archiviata: {
    badge: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
    rowBorder: "border-l-zinc-400",
    rowBg: "bg-[color:color-mix(in_srgb,#71717a_8%,var(--cab-card))]",
  },
  riaperta: {
    badge: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300",
    rowBorder: "border-l-indigo-500",
    rowBg: "bg-[color:color-mix(in_srgb,#6366f1_7%,var(--cab-card))]",
  },
  ricambio_inserito: {
    badge: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
    rowBorder: "border-l-emerald-400",
    rowBg: "bg-[color:color-mix(in_srgb,#10b981_6%,var(--cab-card))]",
  },
  ricambio_aggiornato: {
    badge: "bg-cyan-500/15 text-cyan-900 dark:text-cyan-200",
    rowBorder: "border-l-cyan-500",
    rowBg: "bg-[color:color-mix(in_srgb,#06b6d4_7%,var(--cab-card))]",
  },
  documento_creato: {
    badge: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
    rowBorder: "border-l-violet-500",
    rowBg: "bg-[color:color-mix(in_srgb,#8b5cf6_7%,var(--cab-card))]",
  },
  documento_aggiornato: {
    badge: "bg-[color:color-mix(in_srgb,var(--cab-primary)_16%,transparent)] text-[color:var(--cab-primary)]",
    rowBorder: "border-l-[color:var(--cab-primary)]",
    rowBg: "bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-card))]",
  },
  eliminato: {
    badge: "bg-red-500/15 text-red-800 dark:text-red-300",
    rowBorder: "border-l-red-500",
    rowBg: "bg-[color:color-mix(in_srgb,#ef4444_7%,var(--cab-card))]",
  },
  annullato: {
    badge: "bg-red-500/12 text-red-700 dark:text-red-300",
    rowBorder: "border-l-red-400",
    rowBg: "bg-[color:color-mix(in_srgb,#ef4444_5%,var(--cab-card))]",
  },
  file: {
    badge: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
    rowBorder: "border-l-slate-400",
    rowBg: "bg-[var(--cab-card)]",
  },
  default: {
    badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    rowBorder: "border-l-zinc-400",
    rowBg: "bg-[var(--cab-card)]",
  },
};

/** ponytail: lookup tabellare per etichetta feed — estendere STYLES se nascono nuove label. */
export function resolveActivityFeedStyleKey(eventLabel: string): keyof typeof STYLES {
  const label = eventLabel.trim().toLowerCase();
  if (label === "ingresso") return "ingresso";
  if (label === "ingresso magazzino") return "ingresso_magazzino";
  if (label === "uscita magazzino") return "uscita_magazzino";
  if (label === "movimento magazzino") return "movimento_magazzino";
  if (label === "lavorazione aggiornata") return "lavorazione_aggiornata";
  if (label === "completata") return "completata";
  if (label === "archiviata") return "archiviata";
  if (label === "riaperta") return "riaperta";
  if (label === "ricambio inserito") return "ricambio_inserito";
  if (label === "ricambio aggiornato") return "ricambio_aggiornato";
  if (label.includes("eliminat") || label === "elemento eliminato") return "eliminato";
  if (label.includes("annullat")) return "annullato";
  if (label.includes("file")) return "file";
  if (
    label === "preventivo creato" ||
    label === "fattura emessa" ||
    label === "ddt creato" ||
    label === "incasso registrato" ||
    label === "nuovo elemento"
  ) {
    return "documento_creato";
  }
  if (
    label === "preventivo aggiornato" ||
    label === "fattura aggiornata" ||
    label === "ddt aggiornato" ||
    label === "ordine aggiornato" ||
    label === "aggiornamento"
  ) {
    return "documento_aggiornato";
  }
  return "default";
}

function styleFor(eventLabel: string): ActivityFeedEventStyle {
  return STYLES[resolveActivityFeedStyleKey(eventLabel)] ?? STYLES.default;
}

export function activityFeedEventBadgeClass(eventLabel: string): string {
  return styleFor(eventLabel).badge;
}

export function activityFeedEventRowClass(eventLabel: string): string {
  const s = styleFor(eventLabel);
  return `border-l-[3px] ${s.rowBorder} ${s.rowBg}`;
}
