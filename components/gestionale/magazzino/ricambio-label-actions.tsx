"use client";

import { useCallback, useEffect, useState } from "react";
import { DisabledElementTooltip } from "@/components/ui";
import { erpBtnNeutral, erpBtnSubtleNew } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { DEFAULT_LABEL_PRESET, LABEL_PRESET_IDS } from "@/lib/inventory-labels";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";

type LabelMeta = {
  token: string;
  qrUrl: string;
};

export function RicambioLabelActions({
  ricambioId,
  codice,
  canRead,
  canWrite,
}: {
  ricambioId: string;
  codice: string;
  canRead: boolean;
  canWrite: boolean;
}) {
  const gestToast = useGestionaleToast();
  const [expanded, setExpanded] = useState(false);
  const [preset, setPreset] = useState(DEFAULT_LABEL_PRESET);
  const [meta, setMeta] = useState<LabelMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory-labels/ricambi/${encodeURIComponent(ricambioId)}`);
      if (!res.ok) throw new Error("Caricamento etichetta non riuscito");
      const data = (await res.json()) as LabelMeta;
      setMeta(data);
      return data;
    } catch {
      gestToast.error("Impossibile caricare i dati etichetta.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [gestToast, ricambioId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function ensureExpanded() {
    setExpanded(true);
    if (!meta) await loadMeta();
  }

  function renderUrl(format: "png" | "svg" | "pdf") {
    const sp = new URLSearchParams({ format, preset });
    return `/api/inventory-labels/ricambi/${encodeURIComponent(ricambioId)}/render?${sp.toString()}`;
  }

  async function handlePreview() {
    await ensureExpanded();
    setLoading(true);
    try {
      const res = await fetch(renderUrl("png"));
      if (!res.ok) throw new Error("Anteprima non disponibile");
      const blob = await res.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      gestToast.error("Anteprima etichetta non riuscita.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenPdf() {
    void (async () => {
      await ensureExpanded();
      openUrlInNewTab(renderUrl("pdf"), {
        blockedMessage: "Impossibile aprire il PDF. Consenti i pop-up per questo sito.",
      });
    })();
  }

  async function handleDownload(format: "png" | "svg") {
    await ensureExpanded();
    try {
      const res = await fetch(renderUrl(format));
      if (!res.ok) throw new Error("Download non riuscito");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const safe = codice.replace(/[^a-zA-Z0-9_-]/g, "") || ricambioId.slice(0, 8);
      a.download = `etichetta-${safe}.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
      gestToast.successOnce(`label-dl-${format}`, `Download ${format.toUpperCase()} avviato.`);
    } catch {
      gestToast.error(`Download ${format.toUpperCase()} non riuscito.`);
    }
  }

  function handlePrint() {
    void (async () => {
      await ensureExpanded();
      try {
        const res = await fetch(renderUrl("png"));
        if (!res.ok) throw new Error("Stampa non riuscita");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const frame = document.createElement("iframe");
        frame.style.position = "fixed";
        frame.style.right = "0";
        frame.style.bottom = "0";
        frame.style.width = "0";
        frame.style.height = "0";
        frame.style.border = "0";
        frame.src = url;
        document.body.appendChild(frame);
        frame.onload = () => {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          window.setTimeout(() => {
            document.body.removeChild(frame);
            URL.revokeObjectURL(url);
          }, 1000);
        };
      } catch {
        gestToast.error("Stampa etichetta non riuscita.");
      }
    })();
  }

  async function handleRegenerate() {
    if (!canWrite) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory-labels/ricambi/${encodeURIComponent(ricambioId)}/regenerate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Rigenerazione fallita");
      const data = (await res.json()) as LabelMeta;
      setMeta(data);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      gestToast.successOnce("label-regen", "Nuovo QR generato. Ristampa l'etichetta.");
    } catch {
      gestToast.error("Rigenerazione QR non riuscita.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <DisabledElementTooltip content={canRead ? "Etichetta QR" : READONLY_PERMISSION_HINT} disabled={!canRead}>
        <button
          type="button"
          className={`${erpBtnSubtleNew} min-h-11 w-full justify-center disabled:opacity-45`}
          disabled={!canRead || loading}
          onClick={() => void ensureExpanded()}
        >
          {expanded ? "Etichetta" : "Genera etichetta"}
        </button>
      </DisabledElementTooltip>

      {expanded ? (
        <div className="max-h-[40vh] space-y-2 overflow-y-auto rounded-lg border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] p-3">
          <label className="flex flex-col gap-1 text-xs text-[color:var(--cab-text-muted)]">
            Formato etichetta
            <select
              className="min-h-10 rounded-md border border-[color:var(--cab-border)] bg-white px-2 text-sm dark:bg-zinc-900"
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value);
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }
              }}
            >
              {LABEL_PRESET_IDS.map((id) => (
                <option key={id} value={id}>
                  {id.replace("-default", " mm")}
                </option>
              ))}
            </select>
          </label>

          {meta?.qrUrl ? (
            <p className="break-all font-mono text-[10px] text-[color:var(--cab-text-muted)]">{meta.qrUrl}</p>
          ) : null}

          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Anteprima etichetta" className="mx-auto max-h-40 border border-zinc-200 dark:border-zinc-700" />
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button type="button" className={erpBtnNeutral} disabled={loading} onClick={() => void handlePreview()}>
              Visualizza
            </button>
            <button type="button" className={erpBtnNeutral} disabled={loading} onClick={() => void handleDownload("png")}>
              PNG
            </button>
            <button type="button" className={erpBtnNeutral} disabled={loading} onClick={handleOpenPdf}>
              PDF
            </button>
            <button type="button" className={erpBtnNeutral} disabled={loading} onClick={() => void handleDownload("svg")}>
              SVG
            </button>
            <button type="button" className={erpBtnNeutral} disabled={loading} onClick={handlePrint}>
              Stampa
            </button>
            <button
              type="button"
              className={erpBtnNeutral}
              disabled={loading || !canWrite}
              onClick={() => void handleRegenerate()}
            >
              Rigenera QR
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
