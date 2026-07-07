"use client";

import { DdtStatusBadge, formatDdtDate } from "@/components/ddt/ddt-status-badge";
import { ddtDisplayNumber } from "@/lib/ddt/ddt-list-ui-filters";
import {
  preventivoEditorActionBtn,
  preventivoEditorBody,
  preventivoEditorHint,
  preventivoEditorPanelClass,
} from "@/components/preventivi/preventivo-editor-ui";
import type { DdtDocumentRow } from "@/src/types/supabase-tables";
import { LoadingButton } from "@/components/design-system";

export function DdtPreventivoPanel({
  activeDdt,
  loading,
  busy,
  canWrite,
  onOpenDrawer,
  onGenerate,
  onRegenerate,
  onPrintPdf,
}: {
  activeDdt: DdtDocumentRow | null;
  loading?: boolean;
  busy?: boolean;
  canWrite: boolean;
  onOpenDrawer: () => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onPrintPdf: () => void;
}) {
  const canPrint = activeDdt != null && activeDdt.status !== "bozza" && activeDdt.status !== "annullato";

  return (
    <div className="space-y-2" aria-label="DDT">
      <div className="flex flex-wrap justify-end gap-2">
        {activeDdt ? (
          <>
            <LoadingButton type="button" className={preventivoEditorActionBtn} loading={busy} onClick={onOpenDrawer}>
              Apri dettaglio
            </LoadingButton>
            {canPrint ? (
              <LoadingButton type="button" className={preventivoEditorActionBtn} loading={busy} onClick={onPrintPdf}>
                Stampa PDF
              </LoadingButton>
            ) : null}
            {canWrite ? (
              <LoadingButton type="button" className={preventivoEditorActionBtn} loading={busy} onClick={onRegenerate}>
                Rigenera DDT
              </LoadingButton>
            ) : null}
          </>
        ) : canWrite ? (
          <LoadingButton
            type="button"
            className={preventivoEditorActionBtn}
            loading={busy || loading}
            onClick={onGenerate}
          >
            Genera DDT
          </LoadingButton>
        ) : null}
      </div>
      {loading ? (
        <p className={preventivoEditorHint}>Caricamento DDT…</p>
      ) : activeDdt ? (
        <div className={`${preventivoEditorPanelClass} p-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-mono ${preventivoEditorBody} font-semibold`}>{ddtDisplayNumber(activeDdt)}</p>
            <DdtStatusBadge status={activeDdt.status} />
          </div>
          <p className={`mt-1 ${preventivoEditorHint}`}>Data documento: {formatDdtDate(activeDdt.data_documento)}</p>
        </div>
      ) : (
        <p className={preventivoEditorHint}>Nessun DDT attivo per questo preventivo.</p>
      )}
    </div>
  );
}
