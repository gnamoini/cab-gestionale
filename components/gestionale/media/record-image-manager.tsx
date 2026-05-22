"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncClientPortalAfterGestionaleChange } from "@/src/lib/react-query/invalidate-related";
import {
  deleteStoredImage,
  listStoredImages,
  MAX_IMAGES_PER_RECORD,
  uploadStoredImage,
  type ImageScope,
  type StoredImage,
} from "@/lib/media/image-storage";
import { prefetchStorageBuckets } from "@/src/services/storage.service";
import { dsBtnDanger, dsBtnNeutral, dsScrollbar } from "@/lib/ui/design-system";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { logService } from "@/src/services/log.service";

type ImageLogAction = "image_uploaded" | "image_deleted";

export type RecordImageLogEvent = {
  action: ImageLogAction;
  scope: ImageScope;
  recordId: string;
  imageName: string;
  path: string;
  at: string;
};

function logEntitaForScope(scope: ImageScope): string {
  if (scope === "magazzino") return "magazzino_ricambi";
  if (scope === "lavorazioni") return "lavorazioni";
  return "mezzi";
}

function IconFoto() {
  return (
    <svg className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.4-2h5.2L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 15.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function RecordImageManager({
  scope,
  recordId,
  title = "Foto",
  canEdit = true,
  maxImages = MAX_IMAGES_PER_RECORD,
  onImageEvent,
}: {
  scope: ImageScope;
  recordId: string;
  title?: string;
  canEdit?: boolean;
  maxImages?: number;
  onImageEvent?: (event: RecordImageLogEvent) => void;
}) {
  const qc = useQueryClient();
  const inputId = useId();
  const [images, setImages] = useState<StoredImage[]>([]);
  const [preview, setPreview] = useState<StoredImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setImages(await listStoredImages(scope, recordId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile caricare le immagini.");
    } finally {
      setLoading(false);
    }
  }, [recordId, scope]);

  useEffect(() => {
    void prefetchStorageBuckets();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  const writeImageLog = useCallback(
    async (action: ImageLogAction, image: { name: string; path: string }): Promise<string | null> => {
      const at = new Date().toISOString();
      const supabase = getBrowserSupabase();
      const { data } = await supabase.auth.getUser();
      const logged = await logService.create({
        entita: logEntitaForScope(scope),
        entita_id: recordId,
        azione: action,
        autore_id: data.user?.id ?? null,
        payload: {
          event: action,
          scope,
          record_id: recordId,
          image_name: image.name,
          path: image.path,
        },
      });
      if (!logged.success) return logged.error ?? "Registrazione log immagine non riuscita.";
      onImageEvent?.({ action, scope, recordId, imageName: image.name, path: image.path, at });
      return null;
    },
    [onImageEvent, recordId, scope],
  );

  async function onFile(file: File | undefined) {
    if (!file || uploading) return;
    if (images.length >= maxImages) {
      setError(`Limite massimo ${maxImages} immagini raggiunto`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadStoredImage(scope, recordId, file);
      const logError = await writeImageLog("image_uploaded", uploaded);
      await refresh();
      if (scope === "lavorazioni") void syncClientPortalAfterGestionaleChange(qc);
      if (logError) setError(`Foto caricata, ma log non registrato: ${logError}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload non riuscito.");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(img: StoredImage) {
    if (!window.confirm("Eliminare questa foto?")) return;
    setError(null);
    try {
      await deleteStoredImage(img.path);
      const logError = await writeImageLog("image_deleted", { name: img.name, path: img.path });
      if (preview?.path === img.path) setPreview(null);
      await refresh();
      if (scope === "lavorazioni") void syncClientPortalAfterGestionaleChange(qc);
      if (logError) setError(`Foto rimossa, ma log non registrato: ${logError}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eliminazione non riuscita.");
    }
  }

  const limitReached = images.length >= maxImages;
  const canUpload = canEdit && !limitReached && !uploading;
  const uploadTitle = limitReached ? `Limite massimo ${maxImages} immagini raggiunto` : "Aggiungi foto";

  return (
    <section className="rounded-lg border border-zinc-100 bg-white/80 px-3 py-2.5 dark:border-zinc-700/80 dark:bg-zinc-900/50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <IconFoto />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">{title}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {loading ? "Caricamento..." : `${images.length}/${maxImages} immagini`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <label
            className={`${dsBtnNeutral} ${canUpload ? "cursor-pointer" : "cursor-not-allowed opacity-55"}`}
            title={uploadTitle}
          >
            Aggiungi foto
            <input
              id={inputId}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={!canUpload}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                void onFile(file);
              }}
            />
          </label>
        </div>
      </div>
      {error ? (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          {error}
        </p>
      ) : null}
      {images.length > 0 ? (
        <div className={`mt-2.5 flex gap-2 overflow-x-auto pb-1 ${dsScrollbar}`}>
          {images.map((img) => (
            <div key={img.path} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <button type="button" className="block h-full w-full" onClick={() => setPreview(img)} title="Apri foto">
                {/* eslint-disable-next-line @next/next/no-img-element -- Signed Storage URLs are short-lived and already lazy-loaded thumbnails. */}
                <img src={img.signedUrl} alt={img.name} loading="lazy" className="h-full w-full object-cover" />
              </button>
              {canEdit ? (
                <button
                  type="button"
                  className="absolute right-1 top-1 hidden rounded bg-black/60 px-1 text-[11px] font-bold text-white group-hover:block"
                  onClick={() => void removeImage(img)}
                  title="Elimina foto"
                  aria-label="Elimina foto"
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2.5 text-[11px] text-zinc-500">Nessuna foto caricata.</p>
      )}
      {preview ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onMouseDown={() => setPreview(null)}>
          <div className="max-h-[92vh] max-w-4xl" onMouseDown={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Preview uses short-lived Supabase signed URLs. */}
            <img src={preview.signedUrl} alt={preview.name} className="max-h-[82vh] rounded-xl object-contain shadow-2xl" />
            <div className="mt-3 flex justify-end gap-2">
              {canEdit ? (
                <button type="button" className={dsBtnDanger} onClick={() => void removeImage(preview)}>
                  Elimina
                </button>
              ) : null}
              <button type="button" className={dsBtnNeutral} onClick={() => setPreview(null)}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
