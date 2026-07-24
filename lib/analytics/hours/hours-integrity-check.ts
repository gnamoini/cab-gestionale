import { computeActualLaborHoursFromContenuto } from "@/lib/lavorazioni/compute-actual-labor-hours-from-contenuto";
import type { LavorazioneRow, SchedaLavorazioneRow } from "@/src/types/supabase-tables";
import type { HoursIntegrityIssue, HoursIntegritySummary } from "@/lib/analytics/hours/types";
import { normalizeAddettoMappingKey } from "@/lib/analytics/hours/normalize-addetto-mapping-key";
import { buildAddettiEmployeeMappingIndex } from "@/lib/analytics/hours/resolve-employee-from-mapping";
import type { AddettiEmployeeMappingRow } from "@/src/types/supabase-tables";

type IntegrityInput = {
  lavorazioni: readonly Pick<LavorazioneRow, "id" | "actual_labor_hours" | "actual_labor_hours_source">[];
  schedeInterventi: readonly Pick<SchedaLavorazioneRow, "lavorazione_id" | "contenuto">[];
  mappings?: readonly AddettiEmployeeMappingRow[];
};

function collectAddettiFromContenuto(contenuto: Record<string, unknown>): string[] {
  const names: string[] = [];
  const doc =
    contenuto.doc && typeof contenuto.doc === "object" && !Array.isArray(contenuto.doc)
      ? (contenuto.doc as Record<string, unknown>)
      : contenuto;
  if (doc.tipo !== "lavorazioni") return names;
  const campi = doc.campi;
  if (!campi || typeof campi !== "object" || Array.isArray(campi)) return names;
  const righe = (campi as { righe?: unknown }).righe;
  if (!Array.isArray(righe)) return names;
  for (const riga of righe) {
    if (!riga || typeof riga !== "object") continue;
    const addetti = (riga as { addettiAssegnati?: unknown }).addettiAssegnati;
    if (!Array.isArray(addetti)) continue;
    for (const a of addetti) {
      if (!a || typeof a !== "object") continue;
      const nome = String((a as { addetto?: unknown }).addetto ?? "").trim();
      const ore = Number((a as { oreImpiegate?: unknown }).oreImpiegate);
      if (nome && Number.isFinite(ore) && ore > 0) names.push(nome);
    }
  }
  return names;
}

export function hoursIntegrityCheck(input: IntegrityInput): HoursIntegritySummary {
  const issues: HoursIntegrityIssue[] = [];
  const schedeByLav = new Map(input.schedeInterventi.map((s) => [s.lavorazione_id, s]));
  const mappingIndex = buildAddettiEmployeeMappingIndex(input.mappings ?? []);
  const unmappedAddetti = new Set<string>();

  let okCount = 0;
  let warningCount = 0;
  let mismatchCount = 0;
  let missingCount = 0;
  let unmappedCount = 0;

  for (const lav of input.lavorazioni) {
    const scheda = schedeByLav.get(lav.id);
    const denorm = Math.round(Number(lav.actual_labor_hours ?? 0) * 100) / 100;

    if (!scheda) {
      if (denorm > 0) {
        issues.push({
          lavorazioneId: lav.id,
          status: "warning",
          message: "actual_labor_hours > 0 senza scheda interventi",
        });
        warningCount += 1;
      } else {
        missingCount += 1;
        issues.push({
          lavorazioneId: lav.id,
          status: "missing",
          message: "Lavorazione senza scheda interventi",
        });
      }
      continue;
    }

    const jsonbHours = computeActualLaborHoursFromContenuto(scheda.contenuto);
    if (denorm !== jsonbHours) {
      mismatchCount += 1;
      issues.push({
        lavorazioneId: lav.id,
        status: "mismatch",
        message: `denorm=${denorm} jsonb=${jsonbHours}`,
      });
    } else if (lav.actual_labor_hours_source === "safety_net_trigger") {
      warningCount += 1;
      issues.push({
        lavorazioneId: lav.id,
        status: "warning",
        message: "Aggiornato da safety_net_trigger",
      });
    } else {
      okCount += 1;
    }

    for (const nome of collectAddettiFromContenuto(scheda.contenuto)) {
      const key = normalizeAddettoMappingKey(nome);
      if (!mappingIndex.has(key)) {
        unmappedAddetti.add(nome);
      }
    }
  }

  unmappedCount = unmappedAddetti.size;
  for (const nome of unmappedAddetti) {
    issues.push({
      lavorazioneId: "—",
      status: "unmapped",
      message: `Addetto senza mapping confermato: ${nome}`,
    });
  }

  const totalRecords = input.lavorazioni.length;
  const validatedPct =
    totalRecords > 0 ? Math.round((okCount / totalRecords) * 1000) / 10 : 100;

  return {
    totalRecords,
    okCount,
    warningCount,
    mismatchCount,
    missingCount,
    unmappedCount,
    validatedPct,
    issues,
  };
}
