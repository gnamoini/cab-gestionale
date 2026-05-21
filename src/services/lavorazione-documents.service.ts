"use client";

import { buildLavorazioneDocumentStoragePath } from "@/src/lib/storage/storage-paths";
import { STORAGE_BUCKETS, storageCreateSignedUrl, storageRemove, storageUpload } from "@/src/services/storage.service";
import { ensurePermission } from "@/src/lib/auth/permission-guards";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneDocumentRow, LavorazioneDocumentTipo } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import { logService } from "@/src/services/log.service";

const ENTITA = "lavorazioni";
const SIGNED_URL_TTL = 60 * 60;

async function signedUrlForPath(path: string): Promise<string> {
  return storageCreateSignedUrl(STORAGE_BUCKETS.documenti, path, SIGNED_URL_TTL);
}

export type LavorazioneDocumentWithUrl = LavorazioneDocumentRow & { signedUrl: string };

export const lavorazioneDocumentsService = {
  async listByLavorazione(lavorazioneId: string): Promise<ServiceResult<LavorazioneDocumentRow[]>> {
    try {
      const id = lavorazioneId.trim();
      if (!id) return success([]);
      const sb = await getBrowserSupabase();
      const { data, error } = await sb
        .from("lavorazione_documents")
        .select("*")
        .eq("lavorazione_id", id)
        .order("uploaded_at", { ascending: false });
      if (error) return err(error.message);
      return success((data ?? []) as LavorazioneDocumentRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async listWithUrls(lavorazioneId: string): Promise<ServiceResult<LavorazioneDocumentWithUrl[]>> {
    const res = await this.listByLavorazione(lavorazioneId);
    if (!res.success) return err(res.error ?? "Errore caricamento documenti.");
    try {
      const rows = res.data ?? [];
      const withUrls = await Promise.all(
        rows.map(async (row) => ({
          ...row,
          signedUrl: await signedUrlForPath(row.storage_path),
        })),
      );
      return success(withUrls);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async upload(
    lavorazioneId: string,
    tipo: LavorazioneDocumentTipo,
    file: File,
  ): Promise<ServiceResult<LavorazioneDocumentRow>> {
    try {
      const allowed = await ensurePermission("editWorkOrders");
      if (!allowed.success) return err(allowed.error ?? "Permesso negato.");

      const id = lavorazioneId.trim();
      if (!id) return err("Lavorazione non valida.");

      const path = buildLavorazioneDocumentStoragePath(id, tipo);
      const sb = await getBrowserSupabase();
      const { data: userData } = await sb.auth.getUser();
      const userId = userData.user?.id ?? null;

      const existing = await sb
        .from("lavorazione_documents")
        .select("storage_path")
        .eq("lavorazione_id", id)
        .eq("tipo", tipo)
        .maybeSingle();

      if (existing.data?.storage_path) {
        try {
          await storageRemove(STORAGE_BUCKETS.documenti, [existing.data.storage_path as string]);
        } catch {
          /* sostituzione: ignora errore rimozione vecchio file */
        }
      }

      await storageUpload(STORAGE_BUCKETS.documenti, path, file, {
        contentType: "application/pdf",
        upsert: true,
      });

      const row = {
        lavorazione_id: id,
        tipo,
        storage_path: path,
        filename: file.name.trim() || (tipo === "ddt" ? "ddt.pdf" : "preventivo.pdf"),
        uploaded_at: new Date().toISOString(),
        uploaded_by: userId,
      };

      const { data, error } = await sb.from("lavorazione_documents").upsert(row).select("*").single();
      if (error) return err(error.message);

      await logService.create({
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        autore_id: userId,
        payload: {
          event: "lavorazione_document_uploaded",
          tipo,
          filename: row.filename,
          path,
        },
      });

      return success(data as LavorazioneDocumentRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async remove(lavorazioneId: string, tipo: LavorazioneDocumentTipo): Promise<ServiceResult<null>> {
    try {
      const allowed = await ensurePermission("editWorkOrders");
      if (!allowed.success) return err(allowed.error ?? "Permesso negato.");

      const id = lavorazioneId.trim();
      if (!id) return err("Lavorazione non valida.");

      const sb = await getBrowserSupabase();
      const { data: existing, error: fetchErr } = await sb
        .from("lavorazione_documents")
        .select("*")
        .eq("lavorazione_id", id)
        .eq("tipo", tipo)
        .maybeSingle();

      if (fetchErr) return err(fetchErr.message);
      if (!existing) return success(null);

      const path = (existing as LavorazioneDocumentRow).storage_path;
      try {
        await storageRemove(STORAGE_BUCKETS.documenti, [path]);
      } catch {
        /* continua eliminazione metadati */
      }

      const { error } = await sb.from("lavorazione_documents").delete().eq("lavorazione_id", id).eq("tipo", tipo);
      if (error) return err(error.message);

      const { data: userData } = await sb.auth.getUser();
      await logService.create({
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        autore_id: userData.user?.id ?? null,
        payload: { event: "lavorazione_document_deleted", tipo, path },
      });

      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Rimuove tutti i PDF collegati (es. prima eliminazione logica lavorazione). */
  async purgeForLavorazione(lavorazioneId: string): Promise<void> {
    const id = lavorazioneId.trim();
    if (!id) return;
    const sb = await getBrowserSupabase();
    const { data } = await sb.from("lavorazione_documents").select("storage_path, tipo").eq("lavorazione_id", id);
    const paths = (data ?? []).map((r) => r.storage_path as string).filter(Boolean);
    if (paths.length > 0) {
      try {
        await storageRemove(STORAGE_BUCKETS.documenti, paths);
      } catch {
        /* best effort */
      }
    }
    await sb.from("lavorazione_documents").delete().eq("lavorazione_id", id);
  },
};
