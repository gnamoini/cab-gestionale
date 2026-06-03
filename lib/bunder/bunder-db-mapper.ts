import type { BunderCommercialDocument } from "@/lib/bunder/types";
import type { BunderDocumentRow } from "@/src/types/supabase-tables";

export function bunderDocumentToRow(doc: BunderCommercialDocument): Omit<BunderDocumentRow, "created_at" | "updated_at"> {
  return {
    id: doc.id,
    kind: doc.kind,
    numero_progressivo: doc.numeroProgressivo,
    data_documento: doc.dataDocumento,
    azienda_destinatario: doc.aziendaDestinatario,
    payload: doc as unknown as Record<string, unknown>,
    created_by: doc.createdBy,
    last_edited_by: doc.lastEditedBy || doc.createdBy,
  };
}

export function bunderRowToDocument(row: BunderDocumentRow): BunderCommercialDocument {
  const payload = row.payload as Partial<BunderCommercialDocument> | null;
  if (payload && typeof payload === "object" && payload.id === row.id) {
    return payload as BunderCommercialDocument;
  }
  return {
    id: row.id,
    kind: row.kind as BunderCommercialDocument["kind"],
    numeroProgressivo: row.numero_progressivo,
    dataDocumento: row.data_documento,
    luogo: String((payload as { luogo?: string })?.luogo ?? "Milano"),
    aziendaDestinatario: row.azienda_destinatario,
    indirizzo: String((payload as { indirizzo?: string })?.indirizzo ?? ""),
    cap: String((payload as { cap?: string })?.cap ?? ""),
    citta: String((payload as { citta?: string })?.citta ?? ""),
    referente: String((payload as { referente?: string })?.referente ?? ""),
    oggetto: String((payload as { oggetto?: string })?.oggetto ?? ""),
    settore: String((payload as { settore?: string })?.settore ?? ""),
    intro: String((payload as { intro?: string })?.intro ?? ""),
    righe: Array.isArray((payload as { righe?: unknown })?.righe) ? ((payload as { righe: BunderCommercialDocument["righe"] }).righe) : [],
    condizioni: (payload as { condizioni?: BunderCommercialDocument["condizioni"] })?.condizioni ?? {
      iva: "Esclusa",
      resa: "",
      trasporto: "",
      assemblaggio: "",
      consegna: "",
      pagamento: "",
      garanzia: "",
      validitaOfferta: "",
    },
    clausoleLegali: String((payload as { clausoleLegali?: string })?.clausoleLegali ?? ""),
    chiusura: String((payload as { chiusura?: string })?.chiusura ?? ""),
    noteFirma: String((payload as { noteFirma?: string })?.noteFirma ?? ""),
    riferimentoInterno: String((payload as { riferimentoInterno?: string })?.riferimentoInterno ?? ""),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastEditedBy: row.last_edited_by,
  };
}
