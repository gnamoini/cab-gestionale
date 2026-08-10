"use client";

import {
  DIPENDENTI_TIMESHEET_EMPLOYEES_COLUMNS,
  DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS,
} from "@/lib/db/table-select-columns";
import { clampTextOrNull, TEXT_LONG, TEXT_MEDIUM } from "@/lib/validation/text-field-limits";
import { normalizeCellValue, isCellEmpty } from "@/lib/dipendenti/timesheet-totals";
import { validateCellValue } from "@/lib/dipendenti/timesheet-validation";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import { resolveTipoById } from "@/lib/dipendenti/tipi-assenza-model";
import type { TimesheetCellValue } from "@/lib/dipendenti/types";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditContext, auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import type { DipendenteRecord } from "@/lib/dipendenti/dipendente-record";
import { monthDateRange } from "@/lib/dipendenti/timesheet-month";
import { planEmployeeBootstrap } from "@/lib/dipendenti/timesheet-bootstrap";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
  TimesheetEntryUpsert,
  TimesheetMonthKey,
} from "@/lib/dipendenti/types";

const ENTITA = "dipendenti";

async function sb() {
  return getBrowserSupabase();
}

function oggettoTimesheetEntry(row: Pick<DipendenteTimesheetEntryRow, "employee_display_name_snapshot" | "work_date">) {
  const parts = [row.employee_display_name_snapshot?.trim(), row.work_date?.trim()].filter(Boolean);
  return parts.length ? auditContext(parts.join(" — ")) : undefined;
}

function parseWorkDate(raw: string): string | null {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return null;
}

function buildPayload(
  input: TimesheetEntryUpsert,
  normalized: TimesheetCellValue,
  tipiAssenza: readonly TipoAssenzaConfig[],
  employeeSnapshot: { displayName: string; sourceAddettoId: string | null },
) {
  const tipo = resolveTipoById(tipiAssenza, normalized.tipoAssenzaId);
  const tipoLabel =
    normalized.tipoAssenzaLabel ||
    (tipo?.requiresCustomText ? normalized.motivoCustom : tipo?.label) ||
    null;

  return {
    dipendente_id: input.dipendenteId,
    work_date: input.workDate,
    ore_ordinarie: normalized.oreOrdinarie,
    ore_straordinarie: normalized.oreStraordinarie,
    ore_assenza: normalized.oreAssenza,
    tipo_assenza_id: normalized.oreAssenza > 0 ? normalized.tipoAssenzaId : null,
    tipo_assenza_label: normalized.oreAssenza > 0 ? tipoLabel : null,
    motivo_assenza:
      normalized.oreAssenza > 0 && tipo?.requiresCustomText
        ? clampTextOrNull(normalized.motivoCustom, TEXT_MEDIUM)
        : normalized.oreAssenza > 0
          ? tipoLabel
          : null,
    note: clampTextOrNull(normalized.note, TEXT_LONG),
    employee_display_name_snapshot: employeeSnapshot.displayName,
    employee_source_addetto_id_snapshot: employeeSnapshot.sourceAddettoId,
  };
}

export const dipendentiTimesheetService = {
  async listEmployees(): Promise<ServiceResult<DipendenteTimesheetEmployeeRow[]>> {
    try {
      const c = await sb();
      const { data, error } = await c
        .from("dipendenti_timesheet_employees")
        .select(DIPENDENTI_TIMESHEET_EMPLOYEES_COLUMNS)
        .order("display_name", { ascending: true });
      if (error) return err(error.message);
      return success((data ?? []) as DipendenteTimesheetEmployeeRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async syncFromAddettiRecords(
    dipendentiRecords: readonly DipendenteRecord[],
  ): Promise<ServiceResult<DipendenteTimesheetEmployeeRow[]>> {
    try {
      const listRes = await dipendentiTimesheetService.listEmployees();
      if (!listRes.success) return listRes;
      const existing = listRes.data ?? [];
      const plan = planEmployeeBootstrap(existing, dipendentiRecords);
      const c = await sb();

      if (plan.inserts.length > 0) {
        const { error } = await c.from("dipendenti_timesheet_employees").insert(
          plan.inserts.map((ins) => ({
            display_name: ins.displayName,
            source_addetto_name: ins.sourceAddettoName,
            source_addetto_id: ins.sourceAddettoId,
            in_settings: ins.inSettings,
            employee_type: ins.employeeType,
            attivo: ins.attivo,
          })),
        );
        if (error) return err(error.message);
      }

      const mirrorChunks = plan.mirrorUpdates;
      for (let i = 0; i < mirrorChunks.length; i += 20) {
        const chunk = mirrorChunks.slice(i, i + 20);
        await Promise.all(
          chunk.map(async (upd) => {
            const { error } = await c
              .from("dipendenti_timesheet_employees")
              .update({
                in_settings: upd.inSettings,
                employee_type: upd.employeeType,
                attivo: upd.attivo,
              })
              .eq("id", upd.id);
            if (error) throw new Error(error.message);
          }),
        );
      }

      const displayChunks = plan.displayUpdates;
      for (let i = 0; i < displayChunks.length; i += 20) {
        const chunk = displayChunks.slice(i, i + 20);
        await Promise.all(
          chunk.map(async (upd) => {
            const { error } = await c
              .from("dipendenti_timesheet_employees")
              .update({ display_name: upd.displayName })
              .eq("id", upd.id)
              .eq("in_settings", true);
            if (error) throw new Error(error.message);
          }),
        );
      }

      return dipendentiTimesheetService.listEmployees();
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** @deprecated Usare syncFromAddettiRecords con DipendenteRecord[]. */
  async syncFromAddetti(addetti: readonly string[]): Promise<ServiceResult<DipendenteTimesheetEmployeeRow[]>> {
    const records: DipendenteRecord[] = addetti.map((nome) => ({
      id: `legacy-${nome.trim().toLowerCase()}`,
      nome: nome.trim(),
      cognome: null,
      colorKey: null,
      employeeType: "ADDETTO",
      attivo: true,
    }));
    return dipendentiTimesheetService.syncFromAddettiRecords(records);
  },

  async listEntriesForMonth(monthKey: TimesheetMonthKey): Promise<ServiceResult<DipendenteTimesheetEntryRow[]>> {
    const { from, to } = monthDateRange(monthKey);
    return dipendentiTimesheetService.listEntriesForRange(from, to);
  },

  /** Mesi (YYYY-MM) con almeno una entry salvata — per filtri anno/mese toolbar. */
  async listMonthKeysWithEntries(): Promise<ServiceResult<TimesheetMonthKey[]>> {
    try {
      const c = await sb();
      const { data, error } = await c.rpc("list_timesheet_month_keys");
      if (error) return err(error.message);
      const rows = (data ?? []) as { month_key?: string }[];
      const keys = rows
        .map((row) => row.month_key)
        .filter((k): k is string => typeof k === "string" && /^\d{4}-\d{2}$/.test(k));
      return success(keys as TimesheetMonthKey[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** ID dipendenti con almeno una presenza registrata (qualsiasi periodo). */
  async listEmployeeIdsWithEntries(): Promise<ServiceResult<string[]>> {
    try {
      const c = await sb();
      const { data, error } = await c.rpc("list_timesheet_employee_ids_with_entries");
      if (error) return err(error.message);
      const rows = (data ?? []) as { dipendente_id?: string }[];
      const ids = rows
        .map((row) => row.dipendente_id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0);
      return success(ids);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async listEntriesForRange(from: string, to: string): Promise<ServiceResult<DipendenteTimesheetEntryRow[]>> {
    try {
      const c = await sb();
      const { data, error } = await c
        .from("dipendenti_timesheet_entries")
        .select(DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS)
        .gte("work_date", from)
        .lte("work_date", to);
      if (error) return err(error.message);
      return success((data ?? []) as DipendenteTimesheetEntryRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async upsertEntry(
    input: TimesheetEntryUpsert,
    tipiAssenza: readonly TipoAssenzaConfig[],
  ): Promise<ServiceResult<DipendenteTimesheetEntryRow | null>> {
    try {
      const workDate = parseWorkDate(input.workDate);
      if (!workDate) return err("Data non valida.");

      const tipo = resolveTipoById(tipiAssenza, input.tipoAssenzaId);
      const normalized = normalizeCellValue({
        oreOrdinarie: input.oreOrdinarie,
        oreStraordinarie: input.oreStraordinarie,
        oreAssenza: input.oreAssenza,
        tipoAssenzaId: input.tipoAssenzaId,
        tipoAssenzaLabel: input.tipoAssenzaLabel ?? tipo?.label ?? "",
        motivoCustom: input.motivoCustom ?? "",
        note: input.note ?? "",
      });

      const c = await sb();

      const { data: employee, error: empErr } = await c
        .from("dipendenti_timesheet_employees")
        .select("display_name, source_addetto_id")
        .eq("id", input.dipendenteId)
        .maybeSingle();
      if (empErr) return err(empErr.message);
      if (!employee) return err("Dipendente non trovato nel registro timesheet.");

      const { data: existing, error: findErr } = await c
        .from("dipendenti_timesheet_entries")
        .select(DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS)
        .eq("dipendente_id", input.dipendenteId)
        .eq("work_date", workDate)
        .maybeSingle();
      if (findErr) return err(findErr.message);

      if (isCellEmpty(normalized)) {
        if (existing?.id) {
          const delRes = await dipendentiTimesheetService.deleteEntry(input.dipendenteId, workDate);
          if (!delRes.success) return delRes;
        }
        return success(null);
      }

      const validation = validateCellValue(normalized, tipiAssenza);
      if (!validation.ok) return err(validation.errors[0] ?? "Dati non validi.");

      const payload = buildPayload(
        { ...input, workDate },
        normalized,
        tipiAssenza,
        {
          displayName: employee.display_name,
          sourceAddettoId: employee.source_addetto_id,
        },
      );

      if (existing?.id) {
        const { data, error } = await c
          .from("dipendenti_timesheet_entries")
          .update(payload)
          .eq("id", existing.id)
          .select(DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS)
          .single();
        if (error) return err(error.message);
        const saved = data as DipendenteTimesheetEntryRow;
        await writeModificaLog(c, {
          entita: ENTITA,
          entita_id: existing.id,
          azione: "UPDATE",
          payload: auditDiff(existing, saved, oggettoTimesheetEntry(saved)),
        });
        return success(saved);
      }

      const { data, error } = await c.from("dipendenti_timesheet_entries").insert(payload).select(DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS).single();
      if (error) return err(error.message);
      const saved = data as DipendenteTimesheetEntryRow;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: saved.id,
        azione: "CREATE",
        payload: auditSnapshot(saved, oggettoTimesheetEntry(saved)),
      });
      return success(saved);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async deleteEntry(dipendenteId: string, workDate: string): Promise<ServiceResult<null>> {
    try {
      const parsed = parseWorkDate(workDate);
      if (!parsed) return err("Data non valida.");
      const c = await sb();
      const { data: existing, error: e0 } = await c
        .from("dipendenti_timesheet_entries")
        .select(DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS)
        .eq("dipendente_id", dipendenteId)
        .eq("work_date", parsed)
        .maybeSingle();
      if (e0) return err(e0.message);
      const { error } = await c
        .from("dipendenti_timesheet_entries")
        .delete()
        .eq("dipendente_id", dipendenteId)
        .eq("work_date", parsed);
      if (error) return err(error.message);
      if (existing) {
        const row = existing as DipendenteTimesheetEntryRow;
        await writeModificaLog(c, {
          entita: ENTITA,
          entita_id: row.id,
          azione: "DELETE",
          payload: auditSnapshot(row, oggettoTimesheetEntry(row)),
        });
      }
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
