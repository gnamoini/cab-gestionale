import type { DocumentoGestionale } from "@/lib/types/gestionale";
import type { DocumentoInsert, DocumentoUpdate } from "@/src/services/documenti.service";
import type { CategoriaDocumento, DocumentoRow } from "@/src/types/supabase-tables";
import { ensurePageWrite } from "@/src/lib/auth/permission-guards";
import { mapStorageError } from "@/src/lib/storage/storage-errors";
import {
  classifyDocumentoStorageOpenError,
  type DocumentoFileOpenResult,
} from "@/lib/documenti/documento-file-access";
import { documentoStoragePathFromStored } from "@/lib/documenti/storage-path-from-stored";
import { requestArchiveDocumentUploadPolicy } from "@/lib/documenti/document-upload-policy-client";
import { sha256HexFromFile } from "@/lib/documents/document-content-hash";
import type { DocumentIntelligenceMeta } from "@/lib/documents/document-meta";
import { mergeDocumentIntelligenceMeta } from "@/lib/documents/document-meta";
import type { DocumentSparePartsMeta } from "@/lib/documents/document-spare-parts-meta";
import { mergeDocumentSparePartsMeta } from "@/lib/documents/document-spare-parts-meta";
import { normalizeStorageObjectPath, sanitizeStorageFileName } from "@/src/lib/storage/storage-paths";

export { documentoStoragePathFromStored } from "@/lib/documenti/storage-path-from-stored";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { STORAGE_BUCKETS, storageCreateSignedUrl, storageUpload } from "@/src/services/storage.service";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const UI_TO_DB_CATEGORIA: Record<DocumentoGestionale["categoria"], CategoriaDocumento> = {
  listini: "listino",
  manuali: "manuale",
  cataloghi: "catalogo",
  certificazioni: "certificazione",
  altro: "altro",
};

const DOCUMENTO_SIGNED_URL_TTL_SEC = 3600;

export function gestionaleToDocumentoInsert(
  doc: Omit<DocumentoGestionale, "id">,
  storagePath: string,
  intelligence?: DocumentIntelligenceMeta,
): DocumentoInsert {
  const marcaRaw = (doc.marcaKey ?? doc.marca).trim();
  const marca = marcaRaw && marcaRaw !== "—" ? marcaRaw : "—";
  const modello =
    doc.applicabilita === "marca"
      ? null
      : (doc.modelloKey ?? doc.macchina)?.trim() && (doc.modelloKey ?? doc.macchina) !== "—"
        ? (doc.modelloKey ?? doc.macchina)!.trim()
        : null;
  return {
    mezzo_id: null,
    marca,
    modello,
    categoria: UI_TO_DB_CATEGORIA[doc.categoria] ?? "altro",
    url_file: normalizeStorageObjectPath(storagePath),
    meta: {
      nome: doc.nome.trim(),
      note: doc.note?.trim() || undefined,
      autoreCaricamento: doc.autoreCaricamento?.trim() || undefined,
      autoreCaricamentoUserId: doc.autoreCaricamentoUserId?.trim() || undefined,
      dimensioneKb: doc.dimensioneKb,
      applicabilita: doc.applicabilita,
      marcaKey: marcaRaw && marcaRaw !== "—" ? marcaRaw : undefined,
      modelloKey:
        doc.applicabilita === "modello"
          ? (doc.modelloKey ?? doc.macchina)?.trim() && (doc.modelloKey ?? doc.macchina) !== "—"
            ? (doc.modelloKey ?? doc.macchina)!.trim()
            : undefined
          : undefined,
      fileEstensione: doc.fileEstensione,
      tipoFile: doc.tipoFile,
      mimeType:
        typeof doc.mimeType === "string" && doc.mimeType.trim() ? doc.mimeType.trim() : undefined,
      uploadedAt: doc.caricatoIl || new Date().toISOString(),
      ...(intelligence ? mergeDocumentIntelligenceMeta({}, intelligence) : {}),
      ...mergeDocumentSparePartsMeta({}, sparePartsMetaFromGestionale(doc)),
    },
  };
}

function sparePartsMetaFromGestionale(doc: Omit<DocumentoGestionale, "id">): DocumentSparePartsMeta {
  return {
    aiSparePartsEnabled: doc.aiSparePartsEnabled,
    aiPriceEnabled: doc.aiPriceEnabled,
    aiDocumentKind: doc.aiDocumentKind,
    aiSourceType: doc.aiSourceType,
    aiYear: doc.aiYear,
    aiLanguage: doc.aiLanguage,
  };
}

export type DocumentoUploadResult = {
  path: string;
  intelligence?: DocumentIntelligenceMeta;
};

export function gestionaleToDocumentoUpdate(doc: DocumentoGestionale, storagePath?: string): DocumentoUpdate {
  const path = storagePath ?? doc.urlDocumento ?? "";
  return gestionaleToDocumentoInsert(doc, path);
}

export async function uploadDocumentoBlob(
  blobUrl: string,
  fileName: string,
  categoria?: string,
): Promise<ServiceResult<DocumentoUploadResult>> {
  try {
    const res = await fetch(blobUrl);
    if (!res.ok) return err("Impossibile leggere il file caricato.");
    const blob = await res.blob();
    const file = new File([blob], sanitizeStorageFileName(fileName, "documento"), {
      type: blob.type || "application/octet-stream",
    });
    return uploadDocumentoFile(file, categoria);
  } catch (e) {
    return serviceFailFromError(e);
  }
}

export async function uploadDocumentoFile(file: File, categoria?: string): Promise<ServiceResult<DocumentoUploadResult>> {
  try {
    const allowed = await ensurePageWrite("documenti");
    if (!allowed.success) {
      trackRuntimeEvent(RuntimeEvents.documentiUploadFailed, { reason: "permission_denied" });
      return err(allowed.error ?? "Permesso richiesto.");
    }

    const contentHash = await sha256HexFromFile(file);
    const policy = await requestArchiveDocumentUploadPolicy({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      contentHash,
      categoria,
    });
    if (!policy.ok) {
      trackRuntimeEvent(RuntimeEvents.documentiUploadFailed, { reason: "policy_denied" });
      return err(policy.message);
    }
    const path = policy.path;
    if (!policy.deduplicated) {
      await storageUpload(STORAGE_BUCKETS.documenti, path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type || undefined,
      });
    }

    const intelligence: DocumentIntelligenceMeta = {
      contentHash: policy.contentHash ?? contentHash,
      semanticClass: policy.semanticClass,
    };

    trackRuntimeEvent(RuntimeEvents.documentiUploadSuccess, {
      pathLength: path.length,
      deduplicated: policy.deduplicated,
    });
    return success({ path, intelligence });
  } catch (e) {
    trackRuntimeEvent(RuntimeEvents.documentiUploadFailed, {
      reason: e instanceof Error ? e.message.slice(0, 200) : "upload_error",
    });
    return err(mapStorageError(e, STORAGE_BUCKETS.documenti));
  }
}

/**
 * @deprecated Use `archiveDocumentDeliveryUrl` + GET `/api/documents/:id` instead.
 * Kept for legacy callers during migration.
 */
export async function resolveDocumentoFileUrlSignedResult(
  row: Pick<DocumentoRow, "url_file">,
  doc?: DocumentoGestionale,
): Promise<DocumentoFileOpenResult> {
  const blob = doc?.urlBlob?.trim();
  if (blob && /^blob:/i.test(blob)) return { ok: true, href: blob };

  const raw = row.url_file?.trim() || doc?.urlDocumento?.trim() || "";
  if (!raw) {
    return { ok: false, code: "no_path", message: "File non collegato al documento." };
  }

  const path = documentoStoragePathFromStored(raw);
  if (!path) {
    const legacy = /^https?:\/\//i.test(raw);
    return {
      ok: false,
      code: legacy ? "legacy_unparsed" : "no_path",
      message: legacy
        ? "URL archivio obsoleto. Ricarica il documento."
        : "Percorso file non valido in archivio.",
    };
  }

  try {
    const href = await storageCreateSignedUrl(STORAGE_BUCKETS.documenti, path, DOCUMENTO_SIGNED_URL_TTL_SEC);
    return { ok: true, href };
  } catch (e) {
    const code = classifyDocumentoStorageOpenError(e);
    return {
      ok: false,
      code,
      message: mapStorageError(e, STORAGE_BUCKETS.documenti),
    };
  }
}

export async function resolveDocumentoFileUrlSigned(
  row: Pick<DocumentoRow, "url_file">,
  doc?: DocumentoGestionale,
): Promise<string | null> {
  const result = await resolveDocumentoFileUrlSignedResult(row, doc);
  return result.ok ? result.href : null;
}
