import type { InvoiceDraftLinkInput, InvoiceDraftRowInput } from "@/lib/fatturazione/types";
import { buildPreventivoOutputRighe } from "@/lib/preventivi/preventivi-struttura";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { PreventivoBillingStatusRow } from "@/src/types/supabase-tables";

function mapSezioneToTipo(sezione: string): InvoiceDraftRowInput["tipo"] {
  switch (sezione) {
    case "manodopera":
      return "manodopera";
    case "ricambi":
      return "ricambio";
    case "collaudo":
    case "lavorazioni":
      return "lavorazione";
    default:
      return "libera";
  }
}

export function preventivoToInvoiceDraftRows(
  preventivo: PreventivoRecord,
  preventivoId: string,
): InvoiceDraftRowInput[] {
  const output = buildPreventivoOutputRighe(preventivo);
  const rows: InvoiceDraftRowInput[] = [];
  for (const line of output) {
    if (line.sezione === "ricambi" && "riga" in line) {
      const r = line.riga;
      const qty = Math.max(0, r.quantita);
      const prezzo = Math.max(0, r.prezzoUnitario);
      if (qty <= 0 && prezzo <= 0) continue;
      rows.push({
        tipo: "ricambio",
        descrizione: r.descrizione.trim() || "Ricambio",
        quantita: qty || 1,
        prezzo_unitario: prezzo,
        sconto_percent: r.scontoPercent ?? 0,
        iva_percent: 22,
        ricambio_id: r.ricambioId,
        preventivo_id: preventivoId,
        lavorazione_id: preventivo.lavorazioneId ?? null,
        meta: { codice_oe: r.codiceOE ?? null },
      });
      continue;
    }
    const qty = Math.max(0, line.quantita);
    const prezzo = Math.max(0, line.prezzoUnitario);
    const tot = Math.max(0, line.totale);
    if (tot <= 0 && prezzo <= 0) continue;
    rows.push({
      tipo: mapSezioneToTipo(line.sezione),
      descrizione: line.descrizione.trim() || line.sezione,
      quantita: qty || 1,
      prezzo_unitario: prezzo || tot,
      sconto_percent: 0,
      iva_percent: 22,
      preventivo_id: preventivoId,
      lavorazione_id: preventivo.lavorazioneId ?? null,
      meta: { sezione: line.sezione },
    });
  }
  return rows;
}

export function buildPreventivoInvoiceLink(
  preventivoId: string,
  allocatedTotale: number,
  allocatedImponibile = 0,
  allocatedIva = 0,
): InvoiceDraftLinkInput {
  return {
    source_type: "preventivo",
    source_id: preventivoId,
    allocated_totale: allocatedTotale,
    allocated_imponibile: allocatedImponibile,
    allocated_iva: allocatedIva,
  };
}

export function preventivoBillingResiduo(
  billing: PreventivoBillingStatusRow | undefined,
  preventivoTotale: number,
): number {
  if (billing) return Math.max(0, billing.residuo);
  return Math.max(0, preventivoTotale);
}
