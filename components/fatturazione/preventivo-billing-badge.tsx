import type { PreventivoBillingStatusRow } from "@/src/types/supabase-tables";

const LABELS: Record<PreventivoBillingStatusRow["stato_fatturazione"], string> = {
  non_fatturato: "Non fatturato",
  parzialmente_fatturato: "Parz. fatturato",
  totalmente_fatturato: "Fatturato",
};

const CLASS: Record<PreventivoBillingStatusRow["stato_fatturazione"], string> = {
  non_fatturato: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  parzialmente_fatturato: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
  totalmente_fatturato: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
};

export function PreventivoBillingBadge({
  status,
}: {
  status: PreventivoBillingStatusRow["stato_fatturazione"] | undefined;
}) {
  if (!status || status === "non_fatturato") return null;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${CLASS[status]}`}>
      {LABELS[status]}
    </span>
  );
}
