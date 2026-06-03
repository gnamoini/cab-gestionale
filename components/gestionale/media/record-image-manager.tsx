"use client";

import { Tooltip } from "@/components/design-system/tooltip";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { HubIconPhoto } from "@/components/design-system/hub-table-action-icons";
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
import { LoadingSpinner } from "@/components/design-system/loading";
import { GestionaleFileInput, GestionaleUploadDropExpand } from "@/components/gestionale/upload";
import { useFileUpload } from "@/hooks/use-file-upload";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { cabModalZStacked } from "@/lib/ui/mobile-modal-behavior";
import { dsBtnNeutral, dsBtnDanger, dsHubModalFieldLabel, dsHubModalNestedCard, dsHubModalSection, dsHubModalSectionTitle, dsScrollbar, dsTableActionTextBtn, dsTableActionTextBtnPrimary } from "@/lib/ui/design-system";
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

function recordImageSectionShellClass(embedded: boolean, flatInInfoCard: boolean): string {
  if (flatInInfoCard) return "min-w-0";
  return embedded ? dsHubModalNestedCard : dsHubModalSection;
}

export function RecordImageManager({
  scope,
  recordId,
  title = "Foto",
  canEdit = true,
  maxImages = MAX_IMAGES_PER_RECORD,
  auditLog = true,
  embedded = false,
  flatInInfoCard = false,
  hideTitle = false,
  hubCardLayout = false,
  onImageEvent,
}: {
  scope: ImageScope;
  recordId: string;
  title?: string;
  canEdit?: boolean;
  maxImages?: number;
  /** Se false, nessuna riga in log_modifiche finché il record non è persistito (es. draft nuovo ricambio). */
  auditLog?: boolean;
  /** Senza card esterna (es. dentro LavorazioneMediaPanel). */
  embedded?: boolean;
  /** Dentro GestionaleInfoCard hub: niente card annidata, layout compatto. */
  flatInInfoCard?: boolean;
  /** Titolo esterno sulla card (es. sezione Foto hub). */
  hideTitle?: boolean;
  /** Card hub compatta con azioni in header (tab Documenti lavorazione). */
  hubCardLayout?: boolean;
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

  const handleDropFile = useCallback(
    (file: File) => {
      imageUpload.selectFile(file);
      void imageUpload.upload(file);
    },
    [imageUpload],
  );

  const dropExpandProps = {
    accept: "image/*" as const,
    disabled: !canUpload,
    dropTitle: "Rilascia per caricare",
    dropHint: `Immagini · max ${maxImages}`,
    overlay: !!hubCardLayout,
    validateFile: () =>
      images.length >= maxImages ? `Limite massimo ${maxImages} immagini raggiunto` : null,
    onFile: handleDropFile,
  };

  const titleClass = flatInInfoCard || embedded ? dsHubModalFieldLabel : dsHubModalSectionTitle;
  const ShellTag = flatInInfoCard ? "div" : "section";
  const uploadBtnClass = hubCardLayout || flatInInfoCard ? dsTableActionTextBtnPrimary : dsBtnNeutral;
  const uploadBtnExtra = hubCardLayout || flatInInfoCard ? "" : " px-2.5 py-1.5 text-xs";

  const uploadButton =
    canEdit ? (
      <GestionaleFileInput
        accept="image/*"
        disabled={!canUpload}
        buttonClassName={`${uploadBtnClass} shrink-0${uploadBtnExtra}`}
        buttonLabel={
          <span className="inline-flex items-center gap-1">
            <HubIconPhoto />
            {hubCardLayout ? "Aggiungi" : "Aggiungi foto"}
          </span>
        }
        title={uploadTitle}
        phase={imageUpload.phase}
        fileName={imageUpload.file?.name}
        error={imageUpload.error}
        onRetry={imageUpload.retry}
        onChange={imageUpload.onFileInputChange}
        showInlineStatus={false}
      />
    ) : null;

  const subtitleContent =
    loading || imageUpload.phase === "uploading" ? (
      <span className="inline-flex items-center gap-1.5">
        <LoadingSpinner size="sm" label="Caricamento foto…" />
        Caricamento foto…
      </span>
    ) : (
      `${images.length}/${maxImages} immagini`
    );

  const bodyContent = (
    <>
      {uploadError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          {uploadError}
        </p>
      ) : null}
      {images.length > 0 ? (
        <div className={`flex gap-2 overflow-x-auto pb-1 ${dsScrollbar}${uploadError ? " mt-2" : ""}`}>
          {images.map((img) => (
            <div
              key={img.path}
              className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)]"
            >
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
      ) : !uploadError ? (
        <p className="text-[11px] text-[color:var(--cab-text-muted)]">Nessuna foto caricata.</p>
      ) : null}
    </>
  );

  if (hubCardLayout) {
    return (
      <>
        <GestionaleUploadDropExpand {...dropExpandProps}>
          <GestionaleInfoCard compact title="Foto" subtitle={subtitleContent} actions={uploadButton}>
            {bodyContent}
          </GestionaleInfoCard>
        </GestionaleUploadDropExpand>
        {preview ? (
          <GestionaleModalShell
            onRequestClose={() => setPreview(null)}
            maxWidthClass="max-w-4xl"
            title="Anteprima foto"
            layerClassName={`!bg-black/70 ${cabModalZStacked}`}
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center p-4">
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
      </>
    );
  }

  return (
    <>
      <GestionaleUploadDropExpand {...dropExpandProps}>
        <ShellTag className={recordImageSectionShellClass(embedded, flatInInfoCard)} aria-label={title}>
          <div className="flex min-w-0 items-start justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              {hideTitle ? null : <p className={titleClass}>{title}</p>}
              <p className={`${hideTitle ? "" : "mt-1 "}flex items-center gap-1.5 text-[11px] text-[color:var(--cab-text-muted)]`}>
                {loading || imageUpload.phase === "uploading" ? (
                  <>
                    <LoadingSpinner size="sm" label="Caricamento foto…" />
                    Caricamento foto…
                  </>
                ) : (
                  `${images.length}/${maxImages} immagini`
                )}
              </p>
            </div>
            {canEdit ? uploadButton : null}
          </div>
          {uploadError ? (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              {uploadError}
            </p>
          ) : null}
          {images.length > 0 ? (
            <div className={`mt-3 flex gap-2 overflow-x-auto pb-1 ${dsScrollbar}`}>
              {images.map((img) => (
                <div
                  key={img.path}
                  className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)]"
                >
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
            <p className="mt-2 text-[11px] text-[color:var(--cab-text-muted)]">Nessuna foto caricata.</p>
          )}
        </ShellTag>
      </GestionaleUploadDropExpand>
      {preview ? (
        <GestionaleModalShell
          onRequestClose={() => setPreview(null)}
          maxWidthClass="max-w-4xl"
          title="Anteprima foto"
          layerClassName={`!bg-black/70 ${cabModalZStacked}`}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center p-4">
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
    </>
  );
}
