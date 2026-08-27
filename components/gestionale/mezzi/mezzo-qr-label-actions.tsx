"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { tryOpenViaTemporaryAnchor } from "@/lib/browser/popup-guard";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { dsSystemBannerActions } from "@/lib/ui/design-system";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";

type MezzoQrLabelActionsProps = {
  mezzoId: string;
  targa: string;
  canRead: boolean;
  canWrite: boolean;
  compact?: boolean;
  onClose?: () => void;
};

export function MezzoQrLabelActions({
  mezzoId,
  targa,
  canRead,
  canWrite,
  compact = false,
  onClose,
}: MezzoQrLabelActionsProps) {
  const gestToast = useGestionaleToast();
  const pdfOpeningRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const renderUrl = useCallback(
    (format: "png" | "pdf") =>
      `/api/mezzo-labels/mezzi/${encodeURIComponent(mezzoId)}/render?format=${format}`,
    [mezzoId],
  );

  const handlePreview = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const res = await fetch(renderUrl("png"));
      if (!res.ok) throw new Error("Anteprima non disponibile");
      const blob = await res.blob();
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch {
      gestToast.error("Anteprima etichetta non riuscita.");
    } finally {
      setLoading(false);
    }
  }, [canRead, gestToast, renderUrl]);

  const handleOpenPdf = useCallback(() => {
    if (!canRead || pdfOpeningRef.current) return;
    const id = mezzoId.trim();
    if (!id) {
      gestToast.error("Mezzo non valido.");
      return;
    }

    pdfOpeningRef.current = true;
    setOpeningPdf(true);

    const pdfPath = renderUrl("pdf");

    try {
      // ponytail: un solo tab — API inline via anchor (no window.open about:blank)
      tryOpenViaTemporaryAnchor(pdfPath);
      onClose?.();
    } catch {
      gestToast.error("Impossibile aprire il PDF etichetta.");
    } finally {
      pdfOpeningRef.current = false;
      setOpeningPdf(false);
    }
  }, [canRead, gestToast, mezzoId, onClose, renderUrl]);

  const handleRegenerate = useCallback(async () => {
    if (!canWrite) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/mezzo-labels/mezzi/${encodeURIComponent(mezzoId)}/regenerate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Rigenerazione non riuscita");
      gestToast.success("QR rigenerato. Le etichette precedenti non sono più valide.");
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setConfirmRegen(false);
    } catch {
      gestToast.error("Rigenerazione QR non riuscita.");
    } finally {
      setRegenerating(false);
    }
  }, [canWrite, gestToast, mezzoId]);

  if (!canRead) return null;

  const busy = loading || openingPdf || regenerating;

  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-3 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3"}>
      {!compact ? (
        <p className="text-xs font-medium text-[color:var(--cab-text-muted)]">
          Etichetta portachiavi 50×22 mm con QR per nuova Scheda di Ingresso.
        </p>
      ) : null}

      {previewUrl ? (
        <div className="flex justify-center rounded border border-[color:var(--cab-border)] bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element, cab-perf/no-img-without-next-image */}
          <img
            src={previewUrl}
            alt="Anteprima etichetta QR mezzo"
            className="h-auto w-full max-w-[280px]"
            style={{ aspectRatio: "50 / 22" }}
          />
        </div>
      ) : null}

      <div className={dsSystemBannerActions}>
        <LoadingButton
          type="button"
          variant="secondary"
          size="sm"
          loading={loading}
          disabled={busy}
          onClick={() => void handlePreview()}
        >
          Anteprima
        </LoadingButton>
        <LoadingButton
          type="button"
          variant="primary"
          size="sm"
          loading={openingPdf}
          disabled={busy}
          onClick={handleOpenPdf}
        >
          Stampa etichetta QR
        </LoadingButton>
        {canWrite ? (
          <LoadingButton
            type="button"
            variant="ghost"
            size="sm"
            loading={regenerating}
            disabled={busy}
            onClick={() => setConfirmRegen(true)}
          >
            Rigenera QR
          </LoadingButton>
        ) : (
          <LoadingButton type="button" variant="ghost" size="sm" disabled title={READONLY_PERMISSION_HINT}>
            Rigenera QR
          </LoadingButton>
        )}
      </div>

      <GestionaleConfirmDialog
        open={confirmRegen}
        title="Rigenerare il QR?"
        message="Il QR attuale verrà revocato. Dovrai ristampare le etichette fisiche ancora in uso."
        confirmLabel="Rigenera QR"
        destructive
        pending={regenerating}
        onConfirm={() => void handleRegenerate()}
        onCancel={() => setConfirmRegen(false)}
      />
    </div>
  );
}
