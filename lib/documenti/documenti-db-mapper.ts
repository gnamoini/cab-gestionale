import type { DocumentoGestionale } from "@/lib/types/gestionale";
import type { DocumentoInsert, DocumentoUpdate } from "@/src/services/documenti.service";
import type { CategoriaDocumento, DocumentoRow } from "@/src/types/supabase-tables";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensurePermission } from "@/src/lib/auth/permission-guards";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const DOCUMENTI_STORAGE_BUCKET = "documenti";

const UI_TO_DB_CATEGORIA: Record<DocumentoGestionale["categoria"], CategoriaDocumento> = {
  listini: "listino",
  manuali: "manuale",
  cataloghi: "catalogo",
  altro: "altro",
};

function sanitizeFileName(name: string): string {
  const base = name.trim().replace(/[/\\?%*:|"<>]/g, "-") || "documento";
  return base.slice(0, 180);
}

export function gestionaleToDocumentoInsert(
  doc: Omit<DocumentoGestionale, "id">,
  urlFile: string,
): DocumentoInsert {
  const marca = (doc.marcaKey ?? doc.marca).trim() || "—";
  const modello =
    doc.applicabilita === "marca"
      ? null
      : (doc.modelloKey ?? doc.macchina)?.trim() && (doc.modelloKey ?? doc.macchina) !== "—"
        ? (doc.modelloKey ?? doc.macchina)!.trim()
        : null;
  return {
    mezzo_id: doc.mezzoId?.trim() || null,
    marca,
    modello,
    categoria: UI_TO_DB_CATEGORIA[doc.categoria] ?? "altro",
    url_file: urlFile.trim(),
    meta: {
      nome: doc.nome.trim(),
      note: doc.note?.trim() || undefined,
      autoreCaricamento: doc.autoreCaricamento?.trim() || undefined,
      dimensioneKb: doc.dimensioneKb,
      applicabilita: doc.applicabilita,
      marcaKey: doc.marcaKey,
      modelloKey: doc.modelloKey,
      fileEstensione: doc.fileEstensione,
      uploadedAt: doc.caricatoIl || new Date().toISOString(),
    },
  };
}

export function gestionaleToDocumentoUpdate(doc: DocumentoGestionale, urlFile?: string): DocumentoUpdate {
  const base = gestionaleToDocumentoInsert(doc, urlFile ?? doc.urlDocumento ?? "");
  return base;
}

export async function uploadDocumentoBlob(
  blobUrl: string,
  fileName: string,
): Promise<ServiceResult<string>> {
  try {
    const res = await fetch(blobUrl);
    if (!res.ok) return err("Impossibile leggere il file caricato.");
    const blob = await res.blob();
    const file = new File([blob], sanitizeFileName(fileName), { type: blob.type || "application/octet-stream" });
    return uploadDocumentoFile(file);
  } catch (e) {
    return serviceFailFromError(e);
  }
}

export async function uploadDocumentoFile(file: File): Promise<ServiceResult<string>> {
  try {
    const allowed = await ensurePermission("uploadDocuments");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    const c = await getBrowserSupabase();
    const path = `${crypto.randomUUID()}/${sanitizeFileName(file.name)}`;
    const { error } = await c.storage.from(DOCUMENTI_STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) return err(error.message);
    const { data } = c.storage.from(DOCUMENTI_STORAGE_BUCKET).getPublicUrl(path);
    const url = data.publicUrl?.trim();
    if (!url) return err("URL file non disponibile dopo il caricamento.");
    return success(url);
  } catch (e) {
    return serviceFailFromError(e);
  }
}

/** Risolve URL apribile: http(s), blob sessione, o path storage Supabase. */
export function resolveDocumentoFileUrl(row: Pick<DocumentoRow, "url_file">, doc?: DocumentoGestionale): string | null {
  const blob = doc?.urlBlob?.trim();
  if (blob && /^blob:/i.test(blob)) return blob;
  const raw = row.url_file?.trim() || doc?.urlDocumento?.trim() || "";
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^blob:/i.test(raw)) return raw;
  try {
    const c = getBrowserSupabase();
    const { data } = c.storage.from(DOCUMENTI_STORAGE_BUCKET).getPublicUrl(raw.replace(/^\//, ""));
    return data.publicUrl || null;
  } catch {
    return null;
  }
}
