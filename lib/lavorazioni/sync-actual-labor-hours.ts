import type { SupabaseClient } from "@supabase/supabase-js";
import { LAVORAZIONI_ACTUAL_HOURS_COLUMNS } from "@/lib/db/table-select-columns";
import { computeActualLaborHoursFromContenuto } from "@/lib/lavorazioni/compute-actual-labor-hours-from-contenuto";
import { auditDiff, writeModificaLog } from "@/src/services/internal/audit-log";

export type ActualLaborHoursSource =
  | "scheda_save"
  | "backfill"
  | "manual_adjustment"
  | "migration"
  | "safety_net_trigger";

const ENTITA = "lavorazioni";

type LavorazioneHoursRow = {
  id: string;
  actual_labor_hours: number;
  actual_labor_hours_source: ActualLaborHoursSource | null;
  actual_labor_hours_updated_at: string | null;
};

/**
 * SSOT scrittura colonna denorm: chiamato dal save scheda (primario).
 * Il trigger DB è solo safety net per drift.
 */
export async function syncActualLaborHoursForLavorazione(
  client: SupabaseClient,
  lavorazioneId: string,
  contenutoInterventi: Record<string, unknown> | null,
  source: ActualLaborHoursSource = "scheda_save",
): Promise<{ ok: true; hours: number } | { ok: false; error: string }> {
  const id = lavorazioneId.trim();
  if (!id) return { ok: false, error: "ID lavorazione mancante." };

  const hours = contenutoInterventi ? computeActualLaborHoursFromContenuto(contenutoInterventi) : 0;
  const now = new Date().toISOString();

  const { data: before, error: readErr } = await client
    .from("lavorazioni")
    .select(LAVORAZIONI_ACTUAL_HOURS_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (readErr) return { ok: false, error: readErr.message };
  if (!before) return { ok: false, error: "Lavorazione non trovata." };

  const prev = before as LavorazioneHoursRow;
  const roundedHours = Math.round(hours * 100) / 100;

  if (
    Math.round(Number(prev.actual_labor_hours) * 100) / 100 === roundedHours &&
    prev.actual_labor_hours_source === source
  ) {
    return { ok: true, hours: roundedHours };
  }

  const patch = {
    actual_labor_hours: roundedHours,
    actual_labor_hours_source: source,
    actual_labor_hours_updated_at: now,
  };

  const { data: after, error: updErr } = await client
    .from("lavorazioni")
    .update(patch)
    .eq("id", id)
    .select(LAVORAZIONI_ACTUAL_HOURS_COLUMNS)
    .single();

  if (updErr) return { ok: false, error: updErr.message };

  const afterRow = after as LavorazioneHoursRow;
  await writeModificaLog(client, {
    entita: ENTITA,
    entita_id: id,
    azione: "UPDATE",
    payload: auditDiff(
      {
        actual_labor_hours: prev.actual_labor_hours,
        actual_labor_hours_source: prev.actual_labor_hours_source,
      },
      {
        actual_labor_hours: afterRow.actual_labor_hours,
        actual_labor_hours_source: afterRow.actual_labor_hours_source,
      },
    ),
  });

  return { ok: true, hours: roundedHours };
}
