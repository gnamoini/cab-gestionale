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
}: {
  dataUrl?: string | null;
  /** Apre modale ingrandita per consultazione. */
  consultable?: boolean;
  compact?: boolean;
  buttonOnly?: boolean;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const src = dataUrl?.trim() ?? "";
  const hasFirma = hasSignatureDataUrl(src);

  if (!hasFirma && !buttonOnly) return null;

  const thumbClass = compact ? "h-8 max-w-[6rem]" : "h-10 max-w-[8rem]";
  const buttonClass = buttonOnly ? `${dsBtnNeutral} min-h-9 shrink-0 text-xs` : dsBtnNeutral;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {!buttonOnly && hasFirma ? (
          <button
            type="button"
            className={`overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-white p-1 ${
              consultable ? "cursor-zoom-in transition-shadow hover:shadow-[var(--cab-shadow-md)]" : ""
            }`}
            disabled={!consultable}
            aria-label={consultable ? "Visualizza firma richiedente" : "Firma richiedente"}
            onClick={() => consultable && setViewOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Firma richiedente" className={`object-contain ${thumbClass}`} />
          </button>
        ) : null}
        {buttonOnly || consultable ? (
          <button
            type="button"
            className={buttonClass}
            disabled={!hasFirma}
            aria-label={hasFirma ? "Visualizza firma richiedente" : "Firma non disponibile"}
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
          title="Firma richiedente"
          titleId="richiedente-firma-view-title"
        >
          <div className="space-y-3 p-4">
            <p className={dsTypoCaption}>Firma acquisita alla scheda ingresso.</p>
            <div className="overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Firma richiedente ingrandita" className="mx-auto max-h-[min(40vh,280px)] w-full object-contain" />
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
