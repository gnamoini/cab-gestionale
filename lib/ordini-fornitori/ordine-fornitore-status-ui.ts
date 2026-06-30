import type { OrdineFornitoreStatus } from "@/lib/ordini-fornitori/types";

const STATUS_LABEL: Record<OrdineFornitoreStatus, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  confermato: "Confermato",
  annullato: "Annullato",
};

export function ordineFornitoreStatusLabel(status: OrdineFornitoreStatus): string {
  return STATUS_LABEL[status] ?? status;
}

export function ordineFornitoreStatusBadgeClass(status: OrdineFornitoreStatus): string {
  switch (status) {
    case "bozza":
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
    case "inviato":
      return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200";
    case "confermato":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case "annullato":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}
