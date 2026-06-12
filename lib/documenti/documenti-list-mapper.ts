import { documentoStoragePathFromStored } from "@/lib/documenti/storage-path-from-stored";
import { resolveDocumentoTipoFile } from "@/lib/documenti/documento-tipo-file";
import { readDocumentIntelligenceMeta } from "@/lib/documents/document-meta";
import type { DocumentoListRow } from "@/lib/documents/documento-list-dto";
import type { DocumentoRow } from "@/src/types/supabase-tables";

const CAT_LABEL: Record<DocumentoRow["categoria"], string> = {
  listino: "listini",
  manuale: "manuali",
  catalogo: "cataloghi",
  certificazione: "certificazioni",
  altro: "altro",
};

function mimeFromTipo(tipo: ReturnType<typeof resolveDocumentoTipoFile>): string {
  switch (tipo) {
    case "pdf":
      return "application/pdf";
    case "immagine":
      return "image/jpeg";
    case "excel":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "word":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "testo":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

/** Maps DB row → metadata-only list DTO (no signed URLs / blobs). */
export function documentoRowToListRow(row: DocumentoRow): DocumentoListRow {
  const meta = row.meta ?? {};
  const nome =
    typeof meta.nome === "string" && meta.nome.trim() ? meta.nome.trim() : row.url_file.split("/").pop() ?? "Documento";
  const tipoFile = resolveDocumentoTipoFile({ urlFile: row.url_file, nome, meta });
  const storageKey = documentoStoragePathFromStored(row.url_file) ?? row.url_file.trim();
  const metaApp = meta.applicabilita;
  let applicabilita: DocumentoListRow["applicabilita"];
  const marcaDb = row.marca?.trim() ?? "";
  const senzaMarca = !marcaDb || marcaDb === "—";
  if (!senzaMarca) {
    if (metaApp === "marca" || metaApp === "modello") applicabilita = metaApp;
    else if (row.modello?.trim()) applicabilita = "modello";
    else applicabilita = "marca";
  }
  const sizeKb = typeof meta.dimensioneKb === "number" ? meta.dimensioneKb : 0;
  const intelligence = readDocumentIntelligenceMeta(meta as Record<string, unknown>);
  const previewCapable = tipoFile === "pdf" || tipoFile === "immagine";
  const hasPreview = Boolean(intelligence.thumbnailKey) || previewCapable;
  return {
    id: row.id,
    name: nome,
    mimeType: mimeFromTipo(tipoFile),
    sizeBytes: Math.max(0, Math.round(sizeKb * 1024)),
    createdAt: row.created_at,
    owner: typeof meta.autoreCaricamento === "string" ? meta.autoreCaricamento : "—",
    storageKey,
    previewAvailable: hasPreview,
    hasPreview,
    categoria: CAT_LABEL[row.categoria] ?? "altro",
    marca: senzaMarca ? "" : row.marca,
    modello: row.modello,
    applicabilita,
  };
}
