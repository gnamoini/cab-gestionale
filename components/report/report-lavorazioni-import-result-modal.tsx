"use client";

import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { erpBtnAccent } from "@/components/report/report-buttons";
import type { ReportManualEntriesImportResult } from "@/lib/report/report-manual-entries-import-types";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";

export function ReportLavorazioniImportResultModal({
  result,
  onClose,
}: {
  result: ReportManualEntriesImportResult;
  onClose: () => void;
}) {
  return (
    <GestionaleModalShell
      modalSize="formMedium"
      title="Import Excel completato"
      titleId="report-lavorazioni-import-result-title"
      onRequestClose={onClose}
    >
      <div className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
        <GestionaleModalScrollBody className="space-y-3">
          <p className="text-sm text-[color:var(--cab-text)]">
            Importati <span className="font-semibold tabular-nums">{result.imported}</span> periodi nuovi e aggiornati{" "}
            <span className="font-semibold tabular-nums">{result.updated}</span>.
            {result.skipped > 0 ? (
              <>
                {" "}
                Righe saltate: <span className="font-semibold tabular-nums">{result.skipped}</span>.
              </>
            ) : null}
          </p>
          {result.warnings.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-[color:var(--cab-text-muted)]">Avvisi</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-[color:var(--cab-text-muted)]">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.errors.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-[color:var(--cab-danger)]">Errori riga</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-[color:var(--cab-danger)]">
                {result.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </GestionaleModalScrollBody>
        <div className="flex shrink-0 justify-end border-t border-[color:var(--cab-border)] p-4">
          <button type="button" className={erpBtnAccent} onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </GestionaleModalShell>
  );
}
