"use client";

import { useEffect, useState } from "react";
import {
  HubIconCopy,
  HubIconDownload,
  HubIconShare,
} from "@/components/design-system/hub-table-action-icons";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { clientLavorazioniPublicUrl } from "@/lib/lavorazioni/client-portal-access";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

function qrPngFilename(refLabel: string): string {
  return `lavorazione-${refLabel.replace(/[^a-zA-Z0-9_-]/g, "")}-qr.png`;
}

async function qrDataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const blob = await fetch(dataUrl).then((res) => res.blob());
  return new File([blob], filename, { type: blob.type || "image/png" });
}

export function ClientLavorazioneQrDialog({
  open,
  onClose,
  lavorazioneId,
  refLabel,
}: {
  open: boolean;
  onClose: () => void;
  lavorazioneId: string;
  refLabel: string;
}) {
  const gestToast = useGestionaleToast();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const url = open ? clientLavorazioniPublicUrl(lavorazioneId) : "";

  useEffect(() => {
    if (!open || !url) return;
    let cancelled = false;
    void (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const png = await QRCode.toDataURL(url, { margin: 2, width: 256, errorCorrectionLevel: "M" });
        if (!cancelled) setDataUrl(png);
      } catch {
        if (!cancelled) setDataUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  if (!open) return null;

  const shareText = `Lavorazione ${refLabel}\n${url}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      gestToast.successOnce("qr-copy-link", "Link copiato negli appunti.");
    } catch {
      gestToast.warning("Copia non disponibile: seleziona e copia il link mostrato sotto.");
    }
  }

  function downloadQr() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = qrPngFilename(refLabel);
    a.click();
  }

  async function shareQr() {
    if (!url || !dataUrl) return;

    if (typeof navigator.share !== "function") {
      await copyLink();
      gestToast.info("Condividi non disponibile su questo dispositivo: link copiato.");
      return;
    }

    try {
      const file = await qrDataUrlToFile(dataUrl, qrPngFilename(refLabel));
      const withFiles: ShareData = {
        title: `QR lavorazione ${refLabel}`,
        text: shareText,
        files: [file],
      };
      if (navigator.canShare?.(withFiles)) {
        await navigator.share(withFiles);
        return;
      }

      await navigator.share({
        title: `QR lavorazione ${refLabel}`,
        text: shareText,
        url,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      gestToast.warning("Condivisione non riuscita.");
    }
  }

  return (
    <LavorazioniModalShell modalSize="info" modalHeight="standard" onRequestClose={onClose} title="QR lavorazione">
      <GestionaleModalScrollBody className="flex flex-col items-center gap-4">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- client QR data URL preview
          <img
            src={dataUrl}
            alt={`QR code lavorazione ${refLabel}`}
            className="h-64 w-64 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-2"
          />
        ) : (
          <div className="flex h-64 w-64 items-center justify-center rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] text-sm text-[color:var(--cab-text-muted)]">
            Generazione QR…
          </div>
        )}
        <div className="flex w-full min-w-0 max-w-sm flex-col gap-2">
          <button
            type="button"
            className={`${dsBtnNeutral} min-h-11 w-full gap-2 px-4`}
            onClick={() => void copyLink()}
            disabled={!url}
          >
            <HubIconCopy className="h-4 w-4 shrink-0 opacity-90" />
            Copia link
          </button>
          <button
            type="button"
            className={`${dsBtnNeutral} min-h-11 w-full gap-2 px-4`}
            onClick={() => void shareQr()}
            disabled={!url || !dataUrl}
          >
            <HubIconShare className="h-4 w-4 shrink-0 opacity-90" />
            Condividi
          </button>
          <button
            type="button"
            className={`${dsBtnPrimary} min-h-11 w-full gap-2 px-4`}
            onClick={downloadQr}
            disabled={!dataUrl}
          >
            <HubIconDownload className="h-4 w-4 shrink-0 opacity-90" />
            Scarica PNG
          </button>
        </div>
        <p className="max-w-sm break-all text-center text-xs text-[color:var(--cab-text-muted)]">{url}</p>
      </GestionaleModalScrollBody>
    </LavorazioniModalShell>
  );
}
