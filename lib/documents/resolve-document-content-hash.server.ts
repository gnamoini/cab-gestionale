import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { documentoStoragePathFromStored } from "@/lib/documenti/storage-path-from-stored";
import { sha256HexFromBuffer } from "@/lib/documents/document-content-hash.server";
import { downloadDocumentoBytesWithClient } from "@/lib/documents/document-delivery-storage.server";
import { mergeDocumentIntelligenceMeta, readDocumentIntelligenceMeta } from "@/lib/documents/document-meta";

export type ResolveDocumentContentHashResult =
  | { ok: true; contentHash: string; persisted: boolean }
  | { ok: false; error: string };

/** Calcola e persiste contentHash se assente (documenti legacy). */
export async function resolveDocumentContentHashForIndexing(
  sb: SupabaseClient,
  documentoId: string,
  doc: { meta: Record<string, unknown> | null; url_file: string },
): Promise<ResolveDocumentContentHashResult> {
  const meta = (doc.meta as Record<string, unknown>) ?? {};
  const existing = readDocumentIntelligenceMeta(meta).contentHash;
  if (existing) return { ok: true, contentHash: existing, persisted: false };

  const path = documentoStoragePathFromStored(doc.url_file);
  if (!path) {
    return { ok: false, error: "Percorso file non valido o URL legacy non supportato." };
  }

  const bytes = await downloadDocumentoBytesWithClient(sb, path);
  if (!bytes) {
    return { ok: false, error: "Impossibile leggere il file dal deposito. Verifica che il PDF sia collegato." };
  }

  const contentHash = sha256HexFromBuffer(bytes);
  const nextMeta = mergeDocumentIntelligenceMeta(meta, { contentHash });
  const { error } = await sb.from("documenti").update({ meta: nextMeta }).eq("id", documentoId);
  if (error) {
    return { ok: false, error: "Impossibile aggiornare i metadati del documento." };
  }

  return { ok: true, contentHash, persisted: true };
}
