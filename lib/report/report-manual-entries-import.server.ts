import "server-only";

import { parseSpreadsheetBuffer } from "@/lib/data-import/core/parse-spreadsheet";
import {
  parseReportManualEntriesMatrix,
  type ReportManualEntryImportRow,
} from "@/lib/report/parse-report-manual-entries-import";
import type { ReportManualEntriesImportResult } from "@/lib/report/report-manual-entries-import-types";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { writeSpreadsheetWorkbook } from "@/lib/spreadsheet/xlsx-server";

export const REPORT_MANUAL_ENTRIES_TEMPLATE_FILENAME = "template-import-report-lavorazioni.xlsx";

async function upsertOneServer(row: ReportManualEntryImportRow): Promise<"inserted" | "updated"> {
  const c = await createSupabaseServerUserClient();
  const { data: existing, error: findErr } = await c
    .from("report_manual_entries")
    .select("id")
    .eq("period_month", row.periodMonth)
    .is("deleted_at", null)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);

  if (existing?.id) {
    const { error } = await c
      .from("report_manual_entries")
      .update({ completed_count: row.completedCount, note: row.note })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return "updated";
  }

  const { error } = await c.from("report_manual_entries").insert({
    period_month: row.periodMonth,
    completed_count: row.completedCount,
    note: row.note,
  });
  if (error) throw new Error(error.message);
  return "inserted";
}

export async function importReportManualEntriesSpreadsheetServer(
  bytes: Uint8Array,
  fileName: string,
): Promise<ServiceResult<ReportManualEntriesImportResult>> {
  const allowed = await verifyServerPageWrite("report");
  if (!allowed) return err("Permesso richiesto.");

  let parsedMatrix;
  try {
    parsedMatrix = parseSpreadsheetBuffer(bytes, fileName);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Lettura file non riuscita.");
  }

  const { rows, errors: parseErrors, warnings } = parseReportManualEntriesMatrix(parsedMatrix.matrix);
  const rowErrors = parseErrors.map((e) => `Riga ${e.row}: ${e.message}`);

  if (!rows.length) {
    return err(rowErrors[0] ?? "Nessuna riga importabile nel file.", {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: rowErrors,
      warnings: [...parsedMatrix.warnings, ...warnings],
    });
  }

  let imported = 0;
  let updated = 0;
  const errors = [...rowErrors];

  for (const row of rows) {
    try {
      const kind = await upsertOneServer(row);
      if (kind === "inserted") imported += 1;
      else updated += 1;
    } catch (e) {
      errors.push(
        `Riga ${row.sourceRow}: ${e instanceof Error ? e.message : "Salvataggio non riuscito."}`,
      );
    }
  }

  if (imported === 0 && updated === 0) {
    return err(errors[0] ?? "Import non riuscito.", {
      imported: 0,
      updated: 0,
      skipped: parseErrors.length,
      errors,
      warnings: [...parsedMatrix.warnings, ...warnings],
    });
  }

  return success({
    imported,
    updated,
    skipped: parseErrors.length,
    errors,
    warnings: [...parsedMatrix.warnings, ...warnings],
  });
}

export function buildReportManualEntriesTemplateBuffer(): Buffer {
  return writeSpreadsheetWorkbook((utils) => {
    const sheet = utils.aoa_to_sheet([
      ["Periodo (YYYY-MM)", "Lavorazioni completate", "Note"],
      ["2024-01", 42, "Esempio"],
      ["2024-02", 38, ""],
    ]);
    sheet["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 28 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, sheet, "Lavorazioni");
    return wb;
  });
}
