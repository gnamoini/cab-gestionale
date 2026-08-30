"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { MagazzinoLabelQtyStepper } from "@/components/gestionale/magazzino/magazzino-label-qty-stepper";
import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  DEFAULT_LABEL_PRESET,
  MANUAL_LABEL_PRESET_IDS,
  labelPresetOptionLabel,
} from "@/lib/inventory-labels/domain/templates";
import { tryOpenViaTemporaryAnchor } from "@/lib/browser/popup-guard";
import { dsInput, dsLabel } from "@/lib/ui/design-system";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type ManualLabelForm = {
  marca: string;
  descrizione: string;
  codice: string;
};

const EMPTY_FORM: ManualLabelForm = { marca: "", descrizione: "", codice: "" };

function hasManualLabelInput(form: ManualLabelForm): boolean {
  return Boolean(form.marca.trim() || form.descrizione.trim() || form.codice.trim());
}

export function MagazzinoManualLabelModal({ onClose }: { onClose: () => void }) {
  const gestToast = useGestionaleToast();
  const [form, setForm] = useState<ManualLabelForm>(EMPTY_FORM);
  const [preset, setPreset] = useState(DEFAULT_LABEL_PRESET);
  const [quantity, setQuantity] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [printing, setPrinting] = useState(false);

  const busy = loading || openingPdf || printing;
  const canRender = hasManualLabelInput(form) && !busy;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const buildBody = useCallback(
    (format: "png" | "svg" | "pdf") => ({
      marca: form.marca.trim(),
      descrizione: form.descrizione.trim(),
      codice: form.codice.trim(),
      preset,
      format,
      quantity: format === "pdf" ? quantity : 1,
    }),
    [form, preset, quantity],
  );

  async function postRender(format: "png" | "svg" | "pdf"): Promise<Blob> {
    const res = await fetch("/api/inventory-labels/manual/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBody(format)),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Generazione etichetta non riuscita");
    }
    return res.blob();
  }


  function revokePreview() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function updateField<K extends keyof ManualLabelForm>(key: K, value: ManualLabelForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    revokePreview();
  }

  async function handlePreview() {
    if (!canRender) return;
    setLoading(true);
    try {
      const blob = await postRender("png");
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch {
      gestToast.error("Anteprima etichetta non riuscita.");
    } finally {
      setLoading(false);
    }
  }

  function buildManualLabelPdfUrl(): string {
    const sp = new URLSearchParams({
      format: "pdf",
      preset,
      quantity: String(quantity),
      marca: form.marca.trim(),
      descrizione: form.descrizione.trim(),
      codice: form.codice.trim(),
    });
    return `/api/inventory-labels/manual/render?${sp.toString()}`;
  }

  function handleOpenPdf() {
    if (!canRender) return;
    setOpeningPdf(true);
    try {
      tryOpenViaTemporaryAnchor(buildManualLabelPdfUrl());
    } catch {
      gestToast.error("Impossibile aprire il PDF etichetta.");
    } finally {
      setOpeningPdf(false);
    }
  }

  async function handlePrint() {
    if (!canRender) return;
    setPrinting(true);
    try {
      const blob = await postRender("png");
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
    } finally {
      setPrinting(false);
    }
  }

  return (
    <GestionaleModalShell
      modalSize="formSmall"
      onRequestClose={onClose}
      title="Etichetta manuale"
      titleId="manual-label-title"
      footer={
        <p className="text-center text-xs text-[color:var(--cab-text-muted)]">
          Il ricambio non viene salvato in magazzino.
        </p>
      }
    >
      <div className={`${gestionaleModalBodyFlexClass} min-h-0 gap-4`}>
        <GestionaleModalScrollBody className="space-y-3">
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            Inserisci i dati da stampare sull&apos;etichetta. Almeno un campo è obbligatorio.
          </p>

          <label className="flex flex-col gap-1">
            <span className={dsLabel}>Marca</span>
            <input
              type="text"
              className={dsInput}
              value={form.marca}
              onChange={(e) => updateField("marca", e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={dsLabel}>Descrizione</span>
            <input
              type="text"
              className={dsInput}
              value={form.descrizione}
              onChange={(e) => updateField("descrizione", e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={dsLabel}>Codice</span>
            <input
              type="text"
              className={`${dsInput} font-mono`}
              value={form.codice}
              onChange={(e) => updateField("codice", e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={dsLabel}>Formato etichetta</span>
            <select
              className={`${dsInput} min-h-10`}
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value);
                revokePreview();
              }}
              disabled={busy}
            >
              {MANUAL_LABEL_PRESET_IDS.map((id) => (
                <option key={id} value={id}>
                  {labelPresetOptionLabel(id)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={dsLabel}>Quantità etichette (PDF)</span>
            <MagazzinoLabelQtyStepper
              value={quantity}
              onChange={(next) => setQuantity(Math.max(1, next))}
              disabled={busy}
              ariaLabel="Quantità etichette manuali"
            />
          </label>

          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element, cab-perf/no-img-without-next-image -- blob label preview URL
            <img
              src={previewUrl}
              alt="Anteprima etichetta"
              className="mx-auto max-h-40 border border-zinc-200 dark:border-zinc-700"
            />
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={erpBtnNeutral}
              disabled={!canRender}
              onClick={() => void handlePreview()}
            >
              {loading ? "Caricamento…" : "Anteprima"}
            </button>
            <button
              type="button"
              className={erpBtnNeutral}
              disabled={!canRender}
              onClick={() => void handleOpenPdf()}
            >
              {openingPdf ? "Apertura…" : "PDF"}
            </button>
            <LoadingButton
              type="button"
              className={`${erpBtnNeutral} col-span-2`}
              disabled={!canRender}
              loading={printing}
              loadingLabel="Stampa…"
              onClick={() => void handlePrint()}
            >
              Stampa
            </LoadingButton>
          </div>
        </GestionaleModalScrollBody>
      </div>
    </GestionaleModalShell>
  );
}
