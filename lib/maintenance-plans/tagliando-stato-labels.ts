import type { MaintenanceUrgency } from "@/lib/maintenance-plans/maintenance-enums";

export type TagliandoStatoUi = "programmato" | "imminente" | "scaduto" | "completato";

export const TAGLIANDO_STATO_LABELS: Record<TagliandoStatoUi, string> = {
  programmato: "Programmato",
  imminente: "Imminente",
  scaduto: "Scaduto",
  completato: "Completato",
};

export const TAGLIANDO_STATO_BADGE_CLASS: Record<TagliandoStatoUi, string> = {
  programmato: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  imminente: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  scaduto: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200",
  completato: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

export const TAGLIANDO_STATO_ROW_CLASS: Record<TagliandoStatoUi, string> = {
  programmato: "",
  imminente: "bg-amber-50/80 dark:bg-amber-950/20",
  scaduto: "bg-red-50/80 dark:bg-red-950/20",
  completato: "",
};

export function mapUrgencyToTagliandoStato(
  urgency: MaintenanceUrgency,
  opts?: { recentlyCompleted?: boolean },
): TagliandoStatoUi {
  if (opts?.recentlyCompleted) return "completato";
  switch (urgency) {
    case "rosso":
      return "scaduto";
    case "giallo":
    case "arancione":
      return "imminente";
    case "verde":
    default:
      return "programmato";
  }
}

export function tagliandoStatoFilterMatches(
  stato: TagliandoStatoUi,
  filter: TagliandoStatoUi | "",
): boolean {
  if (!filter) return true;
  return stato === filter;
}
