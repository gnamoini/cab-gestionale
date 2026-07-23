"use client";

import {
  CAPTURE_ASSIGN_CALLOUT_CLASS,
  LavorazioneAssignLabelLines,
} from "@/components/document-capture/capture-lavorazione-assign-label";
import type { LavorazioneAssignRowParts } from "@/lib/document-capture/capture-manual-assign-state";

export function CaptureSheetLavorazioneIdentBanner({
  parts,
  fallbackIdent,
}: {
  parts?: LavorazioneAssignRowParts | null;
  fallbackIdent?: string;
}) {
  if (parts && (parts.headlineLine || parts.identLine)) {
    return (
      <div className={`min-w-0 p-3 ${CAPTURE_ASSIGN_CALLOUT_CLASS}`} data-capture-ident-banner>
        <LavorazioneAssignLabelLines parts={parts} />
      </div>
    );
  }

  const ident = fallbackIdent?.trim();
  if (!ident || ident === "—") return null;

  return (
    <p className="text-xs text-[color:var(--cab-text-muted)]">
      Identificazione: <span className="font-medium text-[color:var(--cab-text)]">{ident}</span>
    </p>
  );
}
