import {
  buildClienteFiscalePdfFields,
  type PreventivoClientePdfOptions,
} from "@/lib/pdf/anagrafica-pdf-fields";
import { fmtDateIt, type PdfField } from "@/lib/pdf/core/pdf-base-template";
import { pdfFieldFromValue } from "@/lib/pdf/gestionale-section-table";
import type { DdtDocumentRow } from "@/src/types/supabase-tables";

function snapshotStr(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function formatLuogoConsegna(snapshot: Record<string, unknown> | undefined): string | undefined {
  if (!snapshot) return undefined;
  const parts = [
    snapshot.indirizzo,
    [snapshot.cap, snapshot.citta, snapshot.provincia].filter(Boolean).join(" "),
  ].filter(Boolean);
  const formatted = parts.map(String).join(" — ").trim();
  return formatted || undefined;
}

function mergePdfFieldsDeduped(primary: readonly PdfField[], secondary: readonly PdfField[]): PdfField[] {
  const seen = new Set(primary.map((f) => `${f.label}\0${f.value}`));
  const out: PdfField[] = [...primary];
  for (const field of secondary) {
    const key = `${field.label}\0${field.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(field);
  }
  return out;
}

/** Destinatario DDT — stesso schema del preventivo (no richiedente). */
export function buildDdtDestinatarioPdfFields(
  d: DdtDocumentRow,
  opts?: PreventivoClientePdfOptions,
): PdfField[] {
  const cust = d.customer_snapshot as Record<string, unknown>;
  const operativi = [
    pdfFieldFromValue("Cliente", d.cliente_label),
    pdfFieldFromValue("Cantiere", snapshotStr(cust.cantiere)),
    pdfFieldFromValue("Utilizzatore", snapshotStr(cust.utilizzatore)),
  ].filter((f): f is PdfField => f !== null);

  const anag = opts?.clienteAnagrafica;
  if (!anag?.id) return operativi;
  const fiscali = buildClienteFiscalePdfFields(anag, { codiceFiscale: opts?.codiceFiscale });
  return mergePdfFieldsDeduped(fiscali, operativi);
}

/** Oggetto intervento da snapshot DDT — griglia 3 colonne come preventivo. */
export function buildDdtOggettoInterventoPdfFields(d: DdtDocumentRow): PdfField[] {
  const mezzo = d.mezzo_snapshot as Record<string, unknown>;
  const attSnap = (d.attrezzatura_snapshot ?? {}) as Record<string, unknown>;
  const targetType =
    d.target_type ?? (snapshotStr(attSnap.marca) || snapshotStr(attSnap.modello) ? "attrezzatura" : null);

  const fields: PdfField[] = [];

  if (targetType === "attrezzatura" || snapshotStr(attSnap.marca) || snapshotStr(attSnap.modello)) {
    for (const field of [
      pdfFieldFromValue("Tipo attrezzatura", snapshotStr(attSnap.tipoAttrezzatura) ?? snapshotStr(mezzo.attrezzatura)),
      pdfFieldFromValue("Marca", snapshotStr(attSnap.marca) ?? snapshotStr(mezzo.marca)),
      pdfFieldFromValue("Modello", snapshotStr(attSnap.modello) ?? snapshotStr(mezzo.modello)),
      pdfFieldFromValue("Matricola", snapshotStr(attSnap.matricola) ?? snapshotStr(mezzo.matricola)),
    ]) {
      if (field) fields.push(field);
    }
  }

  if (targetType === "telaio" || snapshotStr(mezzo.targa) || snapshotStr(mezzo.telaio)) {
    for (const field of [
      pdfFieldFromValue("Tipo telaio", snapshotStr(mezzo.tipo_telaio) ?? snapshotStr(mezzo.tipoTelaio)),
      pdfFieldFromValue("Marca telaio", snapshotStr(mezzo.marca_telaio) ?? snapshotStr(mezzo.marcaTelaio) ?? snapshotStr(mezzo.marca)),
      pdfFieldFromValue("Modello telaio", snapshotStr(mezzo.modello_telaio) ?? snapshotStr(mezzo.modelloTelaio) ?? snapshotStr(mezzo.telaio) ?? snapshotStr(mezzo.modello)),
      pdfFieldFromValue("Targa", snapshotStr(mezzo.targa)),
    ]) {
      if (field) fields.push(field);
    }
  }

  if (fields.length > 0) return fields;

  const legacyAtt = [snapshotStr(mezzo.marca), snapshotStr(mezzo.modello), snapshotStr(mezzo.matricola)]
    .filter(Boolean)
    .join(" ");
  if (legacyAtt) return [{ label: "Attrezzatura", value: legacyAtt }];
  const legacyTel = snapshotStr(mezzo.telaio) ?? snapshotStr(mezzo.targa);
  if (legacyTel) return [{ label: "Mezzo", value: legacyTel }];
  return fields;
}

/** Campi DDT aggiuntivi rispetto al preventivo. */
export function buildDdtTrasportoPdfFields(d: DdtDocumentRow): PdfField[] {
  const cust = d.customer_snapshot as Record<string, unknown>;
  const rifPreventivo = snapshotStr(cust.preventivo_numero);

  return [
    pdfFieldFromValue("Luogo consegna", formatLuogoConsegna(d.luogo_consegna as Record<string, unknown>)),
    pdfFieldFromValue("Causale trasporto", snapshotStr(d.causale_trasporto)),
    pdfFieldFromValue("Vettore", snapshotStr(d.vettore)),
    pdfFieldFromValue("Data consegna prevista", d.data_consegna ? fmtDateIt(d.data_consegna) : undefined),
    pdfFieldFromValue("Rif. preventivo", rifPreventivo),
  ].filter((f): f is PdfField => f !== null);
}
