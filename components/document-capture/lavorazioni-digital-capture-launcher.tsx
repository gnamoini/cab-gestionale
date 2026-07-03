"use client";

import { useState } from "react";
import { GestionaleModalShell, GestionaleModalScrollBody } from "@/components/gestionale/gestionale-modal";
import {
  GestionaleAiActionButton,
  type GestionaleAiActionButtonSize,
} from "@/components/design-system/gestionale-ai-action-button";
import { SchedaBlankPdfActions } from "@/components/document-capture/scheda-blank-pdf-actions";
import { LavorazioniCaptureDropOverlay } from "@/components/document-capture/lavorazioni-capture-drop-overlay";
import { DocumentCaptureHistoryPanel } from "@/components/document-capture/document-capture-history-panel";

type Props = {
  enabled: boolean;
  size?: GestionaleAiActionButtonSize;
  className?: string;
};

export function LavorazioniDigitalCaptureLauncher({ enabled, size = "md", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!enabled) return null;

  return (
    <>
      <GestionaleAiActionButton variant="primary" size={size} className={className} onClick={() => setOpen(true)}>
        <span className="hidden sm:inline">Acquisizione AI</span>
        <span className="sm:hidden">Acquisizione</span>
      </GestionaleAiActionButton>
      {open ? (
        <GestionaleModalShell
          modalSize="formLarge"
          onRequestClose={() => setOpen(false)}
          title="Acquisizione digitale schede"
          titleId="lav-digital-capture-title"
        >
          <GestionaleModalScrollBody className="space-y-4">
            <SchedaBlankPdfActions />
            <LavorazioniCaptureDropOverlay
              enabled
              onUploaded={() => setRefreshKey((k) => k + 1)}
            />
            <DocumentCaptureHistoryPanel refreshKey={refreshKey} />
          </GestionaleModalScrollBody>
        </GestionaleModalShell>
      ) : null}
    </>
  );
}
