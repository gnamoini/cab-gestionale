import type { DocumentoGestionale } from "@/lib/types/gestionale";
import type { DocumentoInsert, DocumentoUpdate } from "@/src/services/documenti.service";
import type { CategoriaDocumento, DocumentoRow } from "@/src/types/supabase-tables";
import { ensurePermission } from "@/src/lib/auth/permission-guards";
import { mapStorageError } from "@/src/lib/storage/storage-errors";
import { documentoStoragePathFromStored } from "@/lib/documenti/storage-path-from-stored";
import {
  buildDocumentoStoragePath,
  normalizeStorageObjectPath,
  sanitizeStorageFileName,
} from "@/src/lib/storage/storage-paths";

export { documentoStoragePathFromStored } from "@/lib/documenti/storage-path-from-stored";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { STORAGE_BUCKETS, storageCreateSignedUrl, storageUpload } from "@/src/services/storage.service";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const UI_TO_DB_CATEGORIA: Record<DocumentoGestionale["categoria"], CategoriaDocumento> = {
  listini: "listino",
  manuali: "manuale",
  cataloghi: "catalogo",
  altro: "altro",
};

const DOCUMENTO_SIGNED_URL_TTL_SEC = 3600;

export function gestionaleToDocumentoInsert(
  doc: Omit<DocumentoGestionale, "id">,
  storagePath: string,
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
      uploadedAt: doc.caricatoIl || new Date().toISOString(),
    },
  };
}

export function gestionaleToDocumentoUpdate(doc: DocumentoGestionale, storagePath?: string): DocumentoUpdate {
  const path = storagePath ?? doc.urlDocumento ?? "";
  return gestionaleToDocumentoInsert(doc, path);
}

export async function uploadDocumentoBlob(
  blobUrl: string,
  fileName: string,
): Promise<ServiceResult<string>> {
  try {
    const res = await fetch(blobUrl);
    if (!res.ok) return err("Impossibile leggere il file caricato.");
    const blob = await res.blob();
    const file = new File([blob], sanitizeStorageFileName(fileName, "documento"), {
      type: blob.type || "application/octet-stream",
    });
    return uploadDocumentoFile(file);
  } catch (e) {
    return serviceFailFromError(e);
  }
}

export async function uploadDocumentoFile(file: File): Promise<ServiceResult<string>> {
  try {
    const allowed = await ensurePermission("uploadDocuments");
    if (!allowed.success) {
      trackRuntimeEvent(RuntimeEvents.documentiUploadFailed, { reason: "permission_denied" });
      return err(allowed.error ?? "Permesso richiesto.");
    }

    const path = buildDocumentoStoragePath(file.name);
    await storageUpload(STORAGE_BUCKETS.documenti, path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    trackRuntimeEvent(RuntimeEvents.documentiUploadSuccess, { pathLength: path.length });
    return success(path);
  } catch (e) {
    trackRuntimeEvent(RuntimeEvents.documentiUploadFailed, {
      reason: e instanceof Error ? e.message.slice(0, 200) : "upload_error",
    });
    return err(mapStorageError(e, STORAGE_BUCKETS.documenti));
  }
}

/** URL firmato (unica modalità di accesso file persistiti su bucket `documenti`). */
export async function resolveDocumentoFileUrlSigned(
  row: Pick<DocumentoRow, "url_file">,
  doc?: DocumentoGestionale,
): Promise<string | null> {
  const blob = doc?.urlBlob?.trim();
  if (blob && /^blob:/i.test(blob)) return blob;

  const raw = row.url_file?.trim() || doc?.urlDocumento?.trim() || "";
  const path = documentoStoragePathFromStored(raw);
  if (!path) return null;

  try {
    return await storageCreateSignedUrl(STORAGE_BUCKETS.documenti, path, DOCUMENTO_SIGNED_URL_TTL_SEC);
  } catch {
    return null;
  }
}
