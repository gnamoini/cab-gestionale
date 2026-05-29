"use client";

import { Tooltip } from "@/components/design-system/tooltip";
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { dispatchGestionaleLocalMutation } from "@/src/lib/react-query/invalidate-related";
import {
  deleteStoredImage,
  listStoredImages,
  MAX_IMAGES_PER_RECORD,
  uploadStoredImage,
  type ImageScope,
  type StoredImage,
} from "@/lib/media/image-storage";
import { prefetchStorageBuckets } from "@/src/services/storage.service";
import { GestionaleFileInput } from "@/components/gestionale/upload";
import { useFileUpload } from "@/hooks/use-file-upload";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { dsBtnDanger, dsBtnNeutral, dsScrollbar } from "@/lib/ui/design-system";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
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
  auditLog = true,
  onImageEvent,
}: {
  scope: ImageScope;
  recordId: string;
  title?: string;
  canEdit?: boolean;
  maxImages?: number;
  /** Se false, nessuna riga in log_modifiche finché il record non è persistito (es. draft nuovo ricambio). */
  auditLog?: boolean;
  onImageEvent?: (event: RecordImageLogEvent) => void;
}) {
  const qc = useQueryClient();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const gestToast = useGestionaleToast();
  const [images, setImages] = useState<StoredImage[]>([]);
  const [preview, setPreview] = useState<StoredImage | null>(null);
  const [loading, setLoading] = useState(false);
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
      if (!auditLog) return null;
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
    [auditLog, onImageEvent, recordId, scope],
  );

  const imageUpload = useFileUpload({
    label: title,
    successToast: false,
    run: async (file) => {
      if (images.length >= maxImages) {
        throw new Error(`Limite massimo ${maxImages} immagini raggiunto`);
      }
      const uploaded = await uploadStoredImage(scope, recordId, file);
      const logError = await writeImageLog("image_uploaded", uploaded);
      await refresh();
      if (scope === "lavorazioni") dispatchGestionaleLocalMutation(qc, ["log_modifiche"]);
      if (logError) {
        throw new Error(`Foto caricata, ma log non registrato: ${logError}`);
      }
      return uploaded;
    },
  });

  async function removeImage(img: StoredImage) {
    const ok = await confirm({
      title: "Eliminare foto?",
      message: "La foto verrà rimossa in modo permanente.",
      destructive: true,
      confirmLabel: "Elimina",
    });
    if (!ok) return;
    setError(null);
    try {
      await deleteStoredImage(img.path);
      const logError = await writeImageLog("image_deleted", { name: img.name, path: img.path });
      if (preview?.path === img.path) setPreview(null);
      await refresh();
      if (scope === "lavorazioni") dispatchGestionaleLocalMutation(qc, ["log_modifiche"]);
      if (logError) {
        gestToast.warning("Foto rimossa, ma registrazione nel log non riuscita.");
      } else {
        gestToast.successOnce("record-image-delete", GESTIONALE_TOAST.successDeleted);
      }
    } catch (e) {
      gestToast.errorOnce("record-image-delete", e);
    }
  }

  const limitReached = images.length >= maxImages;
  const canUpload = canEdit && !limitReached && imageUpload.canSelect;
  const uploadTitle = limitReached ? `Limite massimo ${maxImages} immagini raggiunto` : "Aggiungi foto";
  const uploadError = imageUpload.error ?? error;

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
          <GestionaleFileInput
            accept="image/*"
            disabled={!canUpload}
            buttonLabel="Aggiungi foto"
            title={uploadTitle}
            phase={imageUpload.phase}
            fileName={imageUpload.file?.name}
            error={imageUpload.error}
            onRetry={imageUpload.retry}
            onChange={imageUpload.onFileInputChange}
            showInlineStatus={false}
          />
        </div>
      </div>
      {uploadError ? (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          {uploadError}
        </p>
      ) : null}
      {images.length > 0 ? (
        <div className={`mt-2.5 flex gap-2 overflow-x-auto pb-1 ${dsScrollbar}`}>
          {images.map((img) => (
            <div key={img.path} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <Tooltip content="Apri">
                <button type="button" className="block h-full w-full" onClick={() => setPreview(img)} aria-label="Apri foto">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Signed Storage URLs are short-lived and already lazy-loaded thumbnails. */}
                  <img src={img.signedUrl} alt={img.name} loading="lazy" className="h-full w-full object-cover" />
                </button>
              </Tooltip>
              {canEdit ? (
                <Tooltip content="Elimina">
                  <button
                    type="button"
                    className="absolute right-1 top-1 hidden rounded bg-black/60 px-1 text-[11px] font-bold text-white group-hover:block"
                    onClick={() => void removeImage(img)}
                    aria-label="Elimina foto"
                  >
                    ×
                  </button>
                </Tooltip>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2.5 text-[11px] text-zinc-500">Nessuna foto caricata.</p>
      )}
      {preview ? (
        <GestionaleModalShell
          onRequestClose={() => setPreview(null)}
          maxWidthClass="max-w-4xl"
          layerClassName="!bg-black/70"
        >
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- Preview uses short-lived Supabase signed URLs. */}
            <img src={preview.signedUrl} alt={preview.name} className="max-h-[min(72dvh,640px)] rounded-xl object-contain shadow-2xl" />
            <div className="mt-3 flex w-full justify-end gap-2 border-t border-[color:var(--cab-border)] pt-3">
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
        </GestionaleModalShell>
      ) : null}
      {confirmDialog}
    </section>
  );
}
