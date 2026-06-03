"use client";

import { PageToolbarCtaLabel } from "@/components/design-system";
import { gestionalePageToolbarActionsClass } from "@/components/gestionale/page-header-toolbar";
import { dsPageToolbarBtn } from "@/lib/ui/design-system";

function PdfExportIcon({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

export function DipendentiPdfToolbar({
  filterEmployeeId,
  exporting = false,
  onExportComplessivo,
  onExportDipendente,
}: {
  filterEmployeeId: string;
  exporting?: boolean;
  onExportComplessivo: () => void;
  onExportDipendente: () => void;
}) {
  const needsAddetto = !filterEmployeeId;
  return (
    <div
      className={`${gestionalePageToolbarActionsClass} min-w-0`}
      role="group"
      aria-label="Export PDF presenze"
    >
      <button
        type="button"
        className={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3`}
        disabled={exporting}
        aria-busy={exporting}
        onClick={onExportComplessivo}
      >
        <PdfExportIcon />
        <PageToolbarCtaLabel short="PDF tutti" full="PDF complessivo" />
      </button>
      <button
        type="button"
        className={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3 ${needsAddetto && !exporting ? "opacity-55" : ""}`}
        disabled={exporting}
        aria-busy={exporting}
        aria-disabled={needsAddetto || undefined}
        title={
          needsAddetto ? "Seleziona un addetto nei filtri per esportare il PDF dipendente" : undefined
        }
        onClick={onExportDipendente}
      >
        <PdfExportIcon />
        <PageToolbarCtaLabel short="PDF uno" full="PDF dipendente" />
      </button>
    </div>
  );
}
