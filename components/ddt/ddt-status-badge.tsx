import type { DdtStatus } from "@/lib/ddt/types";

const STATUS_CLASS: Record<DdtStatus, string> = {
  bozza: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  confermato: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  stampato: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100",
  consegnato: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  annullato: "bg-zinc-200 text-zinc-500 line-through dark:bg-zinc-900 dark:text-zinc-500",
};

const STATUS_LABEL: Record<DdtStatus, string> = {
  bozza: "Bozza",
  confermato: "Confermato",
  stampato: "Stampato",
  consegnato: "Consegnato",
  annullato: "Annullato",
};

export function ddtStatusLabel(status: DdtStatus): string {
  return STATUS_LABEL[status] ?? status;
}

export function DdtStatusBadge({ status }: { status: DdtStatus }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASS[status] ?? STATUS_CLASS.bozza}`}
      aria-label={`Stato DDT: ${ddtStatusLabel(status)}`}
    >
      {ddtStatusLabel(status)}
    </span>
  );
}

export function formatDdtDate(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("it-IT");
  } catch {
    return ymd;
  }
}
