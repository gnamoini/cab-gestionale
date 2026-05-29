"use client";

import { useEffect, useState } from "react";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { clientLavorazioniPublicUrl } from "@/lib/lavorazioni/client-portal-access";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

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
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    const target = clientLavorazioniPublicUrl(lavorazioneId);
    setUrl(target);
    let cancelled = false;
    void (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const png = await QRCode.toDataURL(target, { margin: 2, width: 256, errorCorrectionLevel: "M" });
        if (!cancelled) setDataUrl(png);
      } catch {
        if (!cancelled) setDataUrl(null);
      }
    })();
    return () => {
      cancelled = true;
      setDataUrl(null);
    };
  }, [open, lavorazioneId]);

  if (!open) return null;

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
    a.download = `lavorazione-${refLabel.replace(/[^a-zA-Z0-9_-]/g, "")}-qr.png`;
    a.click();
  }

  return (
    <LavorazioniModalShell onRequestClose={onClose} title="QR lavorazione">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col items-center gap-4 p-6">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt={`QR code lavorazione ${refLabel}`} className="h-64 w-64 rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-700" />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center rounded-xl border border-dashed border-zinc-300 text-sm text-zinc-500 dark:border-zinc-600">
              Generazione QR…
            </div>
          )}
          <p className="max-w-sm break-all text-center text-xs text-zinc-500 dark:text-zinc-400">{url}</p>
        </div>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <button type="button" className={dsBtnNeutral} onClick={() => void copyLink()} disabled={!url}>
          Copia link
        </button>
        <button type="button" className={dsBtnPrimary} onClick={downloadQr} disabled={!dataUrl}>
          Scarica PNG
        </button>
      </footer>
    </LavorazioniModalShell>
  );
}
