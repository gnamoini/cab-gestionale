import type { DdtCreateInput, DdtLinkInput, DdtMezzoSnapshot, DdtRowInput, PreventivoDdtSelectableLine } from "@/lib/ddt/types";
import { buildPreventivoOutputRighe } from "@/lib/preventivi/preventivi-struttura";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { PreventivoDdtFulfillmentRow } from "@/src/types/supabase-tables";

function fulfillmentForRef(
  fulfillment: readonly PreventivoDdtFulfillmentRow[],
  preventivoId: string,
  sourceRef: string,
): { delivered: number; ordered: number } {
  const row = fulfillment.find((f) => f.preventivo_id === preventivoId && f.source_ref === sourceRef);
  if (row) {
    return {
      delivered: Number(row.qty_consegnata) || 0,
      ordered: Number(row.qty_preventivo) || 0,
    };
  }
  return { delivered: 0, ordered: 0 };
}

export function buildPreventivoDdtSelectableLines(
  preventivo: PreventivoRecord,
  preventivoId: string,
  fulfillment: readonly PreventivoDdtFulfillmentRow[] = [],
): PreventivoDdtSelectableLine[] {
  const output = buildPreventivoOutputRighe(preventivo);
  const lines: PreventivoDdtSelectableLine[] = [];

  for (let i = 0; i < output.length; i++) {
    const line = output[i]!;
    if (line.sezione === "ricambi" && "riga" in line) {
      const r = line.riga;
      const sourceRef = r.id || `ricambi:${i}`;
      const qtyOrdered = Math.max(0, r.quantita) || 1;
      const { delivered } = fulfillmentForRef(fulfillment, preventivoId, sourceRef);
      lines.push({
        source_ref: sourceRef,
        source_type: "preventivo_riga",
        descrizione: r.descrizione.trim() || r.codiceOE || "Articolo",
        codice: r.codiceOE ?? null,
        qty_ordered: qtyOrdered,
        qty_delivered: delivered,
        qty_residual: Math.max(0, qtyOrdered - delivered),
        unita_misura: "pz",
        sezione: "ricambi",
      });
      continue;
    }

    const qtyOrdered = Math.max(0, line.quantita) || 1;
    const sourceRef = `${line.sezione}:${line.ordine ?? i}`;
    const { delivered } = fulfillmentForRef(fulfillment, preventivoId, sourceRef);
    lines.push({
      source_ref: sourceRef,
      source_type: "preventivo_output",
      descrizione: line.descrizione.trim() || line.sezione,
      codice: null,
      qty_ordered: qtyOrdered,
      qty_delivered: delivered,
      qty_residual: Math.max(0, qtyOrdered - delivered),
      unita_misura: "pz",
      sezione: line.sezione,
    });
  }

  return lines.filter((l) => l.qty_ordered > 0);
}

export function buildMezzoSnapshotFromPreventivo(p: PreventivoRecord): DdtMezzoSnapshot {
  return {
    targa: p.targa ?? null,
    matricola: p.matricola ?? null,
    telaio: p.modelloTelaio ?? p.marcaTelaio ?? null,
    attrezzatura: p.macchinaRiassunto ?? p.tipoAttrezzatura ?? null,
    cantiere: p.cantiere ?? null,
    utilizzatore: p.utilizzatore ?? null,
    marca: p.marcaAttrezzatura ?? null,
    modello: p.modelloAttrezzatura ?? null,
  };
}

export function buildDdtDraftFromPreventivo(input: {
  preventivo: PreventivoRecord;
  preventivoId: string;
  mezzoId?: string | null;
  selectedLines: Array<{ source_ref: string; quantita: number }>;
  causale_trasporto?: string;
  vettore?: string;
  luogo_consegna?: DdtCreateInput["luogo_consegna"];
  data_consegna?: string | null;
  note?: string;
  confirm?: boolean;
}): DdtCreateInput {
  const selectable = buildPreventivoDdtSelectableLines(input.preventivo, input.preventivoId);
  const byRef = new Map(selectable.map((l) => [l.source_ref, l]));

  const rows: DdtRowInput[] = [];
  for (const sel of input.selectedLines) {
    const line = byRef.get(sel.source_ref);
    if (!line || sel.quantita <= 0) continue;
    if (sel.quantita > line.qty_residual + 0.0001) {
      throw new Error(`Quantità eccessiva per riga: ${line.descrizione}`);
    }
    rows.push({
      source_type: line.source_type,
      source_ref: line.source_ref,
      preventivo_id: input.preventivoId,
      descrizione: line.descrizione,
      codice: line.codice,
      quantita: sel.quantita,
      unita_misura: line.unita_misura,
      meta: {
        sezione: line.sezione,
        qty_ordered: line.qty_ordered,
      },
    });
  }

  if (rows.length === 0) {
    throw new Error("Selezionare almeno una riga con quantità valida.");
  }

  const links: DdtLinkInput[] = [
    { source_type: "preventivo", source_id: input.preventivoId },
  ];
  if (input.preventivo.lavorazioneId) {
    links.push({ source_type: "lavorazione", source_id: input.preventivo.lavorazioneId });
  }

  return {
    confirm: input.confirm ?? true,
    status: input.confirm ? "confermato" : "bozza",
    data_documento: new Date().toISOString().slice(0, 10),
    data_consegna: input.data_consegna ?? null,
    cliente_label: input.preventivo.cliente.trim(),
    customer_snapshot: {
      cliente: input.preventivo.cliente,
      cantiere: input.preventivo.cantiere ?? null,
      utilizzatore: input.preventivo.utilizzatore ?? null,
      preventivo_numero: input.preventivo.numero ?? null,
    },
    luogo_consegna: input.luogo_consegna ?? {},
    preventivo_id: input.preventivoId,
    lavorazione_id: input.preventivo.lavorazioneId ?? null,
    mezzo_id: input.mezzoId ?? null,
    mezzo_snapshot: buildMezzoSnapshotFromPreventivo(input.preventivo),
    causale_trasporto: input.causale_trasporto ?? "Consegna merci",
    vettore: input.vettore ?? null,
    note: input.note ?? null,
    origine: "preventivo",
    rows,
    links,
  };
}

/** Draft automatico: tutte le righe strutturate del preventivo, senza wizard. */
export function buildDdtDraftFromPreventivoAuto(input: {
  preventivo: PreventivoRecord;
  preventivoId: string;
  mezzoId?: string | null;
  luogo_consegna?: DdtCreateInput["luogo_consegna"];
}): DdtCreateInput {
  const selectable = buildPreventivoDdtSelectableLines(input.preventivo, input.preventivoId, []);
  const selectedLines = selectable.map((line) => ({
    source_ref: line.source_ref,
    quantita: line.qty_ordered,
  }));
  return buildDdtDraftFromPreventivo({
    preventivo: input.preventivo,
    preventivoId: input.preventivoId,
    mezzoId: input.mezzoId,
    selectedLines,
    confirm: true,
    causale_trasporto: "Consegna merci",
    luogo_consegna: input.luogo_consegna,
  });
}
