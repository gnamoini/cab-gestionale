import type { AccountingEntryRow } from "@/src/types/supabase-tables";

export function accountingEntriesToCsv(
  entries: readonly Pick<AccountingEntryRow, "entry_date" | "description" | "status" | "invoice_id">[],
): string {
  const header = "data;descrizione;stato;invoice_id";
  const lines = entries.map((e) =>
    [e.entry_date, e.description.replace(/;/g, ","), e.status, e.invoice_id ?? ""].join(";"),
  );
  return [header, ...lines].join("\n");
}

export function downloadAccountingCsv(entries: Parameters<typeof accountingEntriesToCsv>[0], fileName = "contabilita-export.csv") {
  const blob = new Blob([accountingEntriesToCsv(entries)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
