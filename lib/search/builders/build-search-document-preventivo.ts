import { preventivoStatoLabel } from "@/lib/preventivi/preventivi-advanced-filters";
import { preventivoTipoDocumentoLabel } from "@/lib/preventivi/preventivi-tipo-documento";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { buildSearchDocumentFromFields } from "@/lib/search/build-document";

export function buildSearchDocumentPreventivo(row: PreventivoRecord): string {
  return buildSearchDocumentFromFields(
    [
      { kind: "document", value: row.numero },
      { kind: "customer", value: row.cliente },
      { kind: "customer", value: row.cantiere },
      { kind: "customer", value: row.utilizzatore },
      { kind: "description", value: row.macchinaRiassunto },
      { kind: "plate", value: row.targa },
      { kind: "document", value: row.matricola },
      { kind: "document", value: row.nScuderia },
      { kind: "brand", value: row.marcaAttrezzatura },
      { kind: "model", value: row.modelloAttrezzatura },
      { kind: "code", value: row.lavorazioneId },
      { kind: "description", value: row.descrizioneLavorazioniCliente },
    ],
    [
      row.statoWorkflow,
      preventivoStatoLabel(row.statoWorkflow),
      row.statoCliente ? preventivoStatoLabel(row.statoCliente) : "",
      row.tipoDocumento,
      preventivoTipoDocumentoLabel(row.tipoDocumento),
      preventivoTipoDocumentoLabel(row.tipoDocumento, "short"),
    ],
  );
}
