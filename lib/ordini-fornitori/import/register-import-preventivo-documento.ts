"use client";

import { gestionaleToDocumentoInsert, uploadDocumentoFile } from "@/lib/documenti/documenti-db-mapper";
import { inferTipoFileFromNome } from "@/lib/documenti/documento-tipo-file";
import { documentiEntry } from "@/lib/domain/documenti-entry";
import type { DocumentoGestionale } from "@/lib/types/gestionale";
import { mergeDocumentIntelligenceMeta } from "@/lib/documents/document-meta";

export async function registerImportPreventivoDocumento(file: File): Promise<{ documentoId: string; contentHash: string }> {
  const upload = await uploadDocumentoFile(file, "preventivo_fornitore");
  if (!upload.success || !upload.data) {
    throw new Error(upload.error ?? "Upload non riuscito.");
  }

  const sessionId = crypto.randomUUID();
  const contentHash = upload.data.intelligence?.contentHash ?? "";
  const payload: Omit<DocumentoGestionale, "id"> = {
    nome: file.name,
    categoria: "altro",
    marca: "—",
    macchina: "—",
    marcaKey: "",
    modelloKey: "",
    applicabilita: "marca",
    note: "Preventivo fornitore — import ordine",
    autoreCaricamento: "",
    caricatoIl: new Date().toISOString(),
    ultimaModifica: new Date().toISOString(),
    dimensioneKb: Math.max(1, Math.round(file.size / 1024)),
    fileEstensione: file.name.split(".").pop()?.toLowerCase() ?? "",
    tipoFile: inferTipoFileFromNome(file.name),
    urlDocumento: upload.data.path,
    urlBlob: "",
  };

  const insert = gestionaleToDocumentoInsert(payload, upload.data.path, upload.data.intelligence);
  const baseMeta = {
    ...(insert.meta as Record<string, unknown>),
    importStatus: "pending_import",
    importSessionId: sessionId,
  };
  const meta = upload.data.intelligence
    ? mergeDocumentIntelligenceMeta(baseMeta, upload.data.intelligence)
    : baseMeta;

  const res = await documentiEntry.create({ ...insert, meta });
  if (!res.success || !res.data) {
    throw new Error(res.error ?? "Registrazione documento non riuscita.");
  }

  return { documentoId: res.data.id, contentHash };
}
