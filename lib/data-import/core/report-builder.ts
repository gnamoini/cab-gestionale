import type { ImportExecuteError, ImportExecuteStats } from "@/lib/data-import/core/types";

export function buildImportReportCsv(
  stats: ImportExecuteStats,
  errors: ImportExecuteError[],
  fileName: string,
): string {
  const lines = [
    "Report importazione",
    `File;${fileName}`,
    `Creati;${stats.created}`,
    `Aggiornati;${stats.updated}`,
    `Saltati;${stats.skipped}`,
    `Errori;${stats.errors}`,
    `Warning;${stats.warnings}`,
    "",
    "Riga;Messaggio",
    ...errors.map((e) => `${e.rowIndex};${e.message.replace(/;/g, ",")}`),
  ];
  return lines.join("\n");
}

export function downloadTextFile(content: string, fileName: string, mime = "text/csv;charset=utf-8") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
