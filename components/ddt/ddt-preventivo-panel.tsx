"use client";

import { DdtStatusBadge, formatDdtDate } from "@/components/ddt/ddt-status-badge";
import { ddtDisplayNumber } from "@/lib/ddt/ddt-list-ui-filters";
import { dsBtnNeutralForm, dsHubModalSection, dsHubModalSectionTitle } from "@/lib/ui/design-system";
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
    <section className={dsHubModalSection} aria-label="DDT">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={dsHubModalSectionTitle}>Documento di trasporto (DDT)</h3>
        <div className="flex flex-wrap gap-2">
          {activeDdt ? (
            <>
              <LoadingButton type="button" className={dsBtnNeutralForm} loading={busy} onClick={onOpenDrawer}>
                Apri dettaglio
              </LoadingButton>
              {canPrint ? (
                <LoadingButton type="button" className={dsBtnNeutralForm} loading={busy} onClick={onPrintPdf}>
                  Stampa PDF
                </LoadingButton>
              ) : null}
              {canWrite ? (
                <LoadingButton type="button" className={dsBtnNeutralForm} loading={busy} onClick={onRegenerate}>
                  Rigenera DDT
                </LoadingButton>
              ) : null}
            </>
          ) : canWrite ? (
            <LoadingButton type="button" className={dsBtnNeutralForm} loading={busy || loading} onClick={onGenerate}>
              Genera DDT
            </LoadingButton>
          ) : null}
        </div>
      </div>
      {loading ? (
        <p className="mt-2 text-sm text-[color:var(--cab-text-muted)]">Caricamento DDT…</p>
      ) : activeDdt ? (
        <div className="mt-2 rounded border border-[color:var(--cab-border)] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-semibold">{ddtDisplayNumber(activeDdt)}</p>
            <DdtStatusBadge status={activeDdt.status} />
          </div>
          <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
            Data documento: {formatDdtDate(activeDdt.data_documento)}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[color:var(--cab-text-muted)]">
          Nessun DDT attivo per questo preventivo.
        </p>
      )}
    </section>
  );
}
