"use client";

import { LAVORAZIONE_DOCUMENTS_COLUMNS } from "@/lib/db/table-select-columns";
import { requestLavorazioneDocumentUploadPolicy } from "@/lib/documenti/document-upload-policy-client";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { removeDocumentoStoragePathsBestEffort } from "@/lib/documenti/delete-documento-fully";
import { STORAGE_BUCKETS, storageUpload } from "@/src/services/storage.service";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneDocumentRow, LavorazioneDocumentTipo } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import { logService } from "@/src/services/log.service";

const ENTITA = "lavorazioni";

export const lavorazioneDocumentsService = {
  async listByLavorazione(lavorazioneId: string): Promise<ServiceResult<LavorazioneDocumentRow[]>> {
    try {
      const id = lavorazioneId.trim();
      if (!id) return success([]);
      const sb = await getBrowserSupabase();
      const { data, error } = await sb
        .from("lavorazione_documents")
        .select(LAVORAZIONE_DOCUMENTS_COLUMNS)
        .eq("lavorazione_id", id)
        .order("uploaded_at", { ascending: false });
      if (error) return err(error.message);
      return success((data ?? []) as LavorazioneDocumentRow[]);
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
      const id = lavorazioneId.trim();
      if (!id) return err("Lavorazione non valida.");

      const policy = await requestLavorazioneDocumentUploadPolicy({
        lavorazioneId: id,
        tipo,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/pdf",
      });
      if (!policy.ok) return err(policy.message);

      const path = policy.path;
      const sb = await getBrowserSupabase();
      const { data: userData } = await sb.auth.getUser();
      const userId = userData.user?.id ?? null;

      const existing = await sb
        .from("lavorazione_documents")
        .select("storage_path")
        .eq("lavorazione_id", id)
        .eq("tipo", tipo)
        .maybeSingle();

      if (existing.error) return err(existing.error.message);

      const oldPath = (existing.data?.storage_path as string | undefined)?.trim() ?? "";

      await storageUpload(STORAGE_BUCKETS.documenti, path, file, {
        contentType: "application/pdf",
        upsert: true,
        cacheControl: "31536000",
      });

      if (oldPath && oldPath !== path) {
        await removeDocumentoStoragePathsBestEffort([oldPath]);
      }

      const row = {
        lavorazione_id: id,
        tipo,
        storage_path: path,
        filename: file.name.trim() || (tipo === "ddt" ? "ddt.pdf" : "preventivo.pdf"),
        uploaded_at: new Date().toISOString(),
        uploaded_by: userId,
      };

      const { data, error } = await sb.from("lavorazione_documents").upsert(row).select(LAVORAZIONE_DOCUMENTS_COLUMNS).single();
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
      const id = lavorazioneId.trim();
      if (!id) return err("Lavorazione non valida.");

      const sb = await getBrowserSupabase();
      const { data: existing, error: fetchErr } = await sb
        .from("lavorazione_documents")
        .select(LAVORAZIONE_DOCUMENTS_COLUMNS)
        .eq("lavorazione_id", id)
        .eq("tipo", tipo)
        .maybeSingle();

      if (fetchErr) return err(fetchErr.message);
      if (!existing) return success(null);

      const path = (existing as LavorazioneDocumentRow).storage_path;
      await removeDocumentoStoragePathsBestEffort([path]);

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

      trackRuntimeEvent(RuntimeEvents.lavorazioneDocumentsDelete, { lavorazioneId: id, tipo });
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Rimuove tutti i PDF collegati (es. prima eliminazione logica lavorazione). */
  async purgeForLavorazione(lavorazioneId: string): Promise<ServiceResult<null>> {
    try {
      const id = lavorazioneId.trim();
      if (!id) return success(null);
      const sb = await getBrowserSupabase();
      const { data, error: fetchErr } = await sb
        .from("lavorazione_documents")
        .select("storage_path, tipo")
        .eq("lavorazione_id", id);
      if (fetchErr) return err(fetchErr.message);
      const paths = (data ?? []).map((r) => r.storage_path as string).filter(Boolean);
      if (paths.length > 0) {
        await removeDocumentoStoragePathsBestEffort(paths);
      }
      const { error } = await sb.from("lavorazione_documents").delete().eq("lavorazione_id", id);
      if (error) return err(error.message);
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
