"use client";

import { useState } from "react";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { hasSignatureDataUrl } from "@/lib/media/signature-pad";
import { dsBtnNeutral, dsTypoCaption } from "@/lib/ui/design-system";

export function RichiedenteFirmaDisplay({
  dataUrl,
  consultable = false,
  compact = false,
  /** Solo pulsante testuale (header card / righe compatte). */
  buttonOnly = false,
  label = "richiedente",
}: {
  dataUrl?: string | null;
  /** Apre modale ingrandita per consultazione. */
  consultable?: boolean;
  compact?: boolean;
  buttonOnly?: boolean;
  /** Etichetta accessibilità (es. "addetto officina"). */
  label?: string;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const src = dataUrl?.trim() ?? "";
  const hasFirma = hasSignatureDataUrl(src);

  if (!hasFirma && !buttonOnly) return null;

  const thumbClass = compact ? "h-8 max-w-[6rem]" : "h-10 max-w-[8rem]";
  const buttonClass = buttonOnly ? `${dsBtnNeutral} min-h-9 shrink-0 text-xs` : dsBtnNeutral;

  return (
    <>
      <div className="flex items-center gap-2 min-w-0 flex-nowrap sm:flex-wrap">
        {!buttonOnly && hasFirma ? (
          <button
            type="button"
            className={`overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-white p-1 ${
              consultable ? "cursor-zoom-in transition-shadow hover:shadow-[var(--cab-shadow-md)]" : ""
            }`}
            disabled={!consultable}
            aria-label={consultable ? `Visualizza firma ${label}` : `Firma ${label}`}
            onClick={() => consultable && setViewOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element, cab-perf/no-img-without-next-image -- inline signature data URL */}
            <img src={src} alt={`Firma ${label}`} className={`object-contain ${thumbClass}`} />
          </button>
        ) : null}
        {buttonOnly || consultable ? (
          <button
            type="button"
            className={buttonClass}
            disabled={!hasFirma}
            aria-label={hasFirma ? `Visualizza firma ${label}` : "Firma non disponibile"}
            aria-disabled={!hasFirma}
            onClick={() => hasFirma && setViewOpen(true)}
          >
            Visualizza firma
          </button>
        ) : null}
      </div>

      {consultable && hasFirma && viewOpen ? (
        <GestionaleModalShell
          modalSize="formSmall"
          onRequestClose={() => setViewOpen(false)}
          title={`Firma ${label}`}
          titleId="richiedente-firma-view-title"
        >
          <div className="space-y-3 p-4">
            <p className={dsTypoCaption}>Firma acquisita alla scheda ingresso.</p>
            <div className="overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element, cab-perf/no-img-without-next-image -- inline signature data URL */}
              <img src={src} alt={`Firma ${label} ingrandita`} className="mx-auto max-h-[min(40vh,280px)] w-full object-contain" />
            </div>
          </div>
          <div className="flex justify-end border-t border-[color:var(--cab-border)] p-3">
            <button type="button" className={dsBtnNeutral} onClick={() => setViewOpen(false)}>
              Chiudi
            </button>
          </div>
        </GestionaleModalShell>
      ) : null}
    </>
  );
}
