"use client";

import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { LoadingSpinner } from "@/components/design-system/loading/loading-spinner";
import { CLIENT_PORTAL_DOCUMENT_SLOTS } from "@/lib/lavorazioni/client-portal-documents";
import { lavorazioneDocumentByTipo } from "@/lib/lavorazioni/lavorazione-documents";
import { dsGapMd, dsTableActionTextBtn } from "@/lib/ui/design-system";
import { useClientLavorazioneDocumentsQuery } from "@/src/hooks/gestionale/use-client-lavorazione-media-queries";
import type { LavorazioneDocumentRow } from "@/src/types/supabase-tables";

function ClientDocumentSlotCard({
  label,
  doc,
  url,
  onOpen,
  onDownload,
}: {
  label: string;
  doc: LavorazioneDocumentRow | undefined;
  url: string | undefined;
  onOpen: () => void;
  onDownload: () => void;
}) {
  const subtitle = doc ? (
    <span className="block truncate font-medium text-[color:var(--cab-text)]" title={doc.filename}>
      {doc.filename}
    </span>
  ) : (
    "Nessun documento caricato"
  );

  const actions =
    doc && url ? (
      <>
        <button type="button" className={dsTableActionTextBtn} onClick={onOpen}>
          Apri
        </button>
        <button type="button" className={dsTableActionTextBtn} onClick={onDownload}>
          Scarica
        </button>
      </>
    ) : null;

  return <GestionaleInfoCard compact title={label} subtitle={subtitle} actions={actions} />;
}

export function ClientLavorazioneDocumentsPanel({
  lavorazioneId,
  embedded = false,
}: {
  lavorazioneId: string;
  /** Senza card esterna (es. dentro panoramica dettaglio). */
  embedded?: boolean;
}) {
  const docsQ = useClientLavorazioneDocumentsQuery(lavorazioneId);
  const loading = docsQ.isLoading && docsQ.data == null;
  const rows = docsQ.data?.rows ?? [];
  const urls = docsQ.data?.urls ?? {};

  if (loading) {
    const loadingCard = (
      <GestionaleInfoCard
        compact
        title="Documenti"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <LoadingSpinner size="sm" label="Caricamento documenti…" />
            Caricamento documenti…
          </span>
        }
      />
    );
    if (embedded) return loadingCard;
    return <div className={`flex flex-col ${dsGapMd}`}>{loadingCard}</div>;
  }

  const body = (
    <div className={`flex flex-col ${dsGapMd}`}>
      {CLIENT_PORTAL_DOCUMENT_SLOTS.map((slot) => (
        <ClientDocumentSlotCard
          key={slot.tipo}
          label={slot.label}
          doc={lavorazioneDocumentByTipo(rows, slot.tipo)}
          url={urls[slot.tipo]}
          onOpen={() => {
            const u = urls[slot.tipo];
            if (u) window.open(u, "_blank", "noopener,noreferrer");
          }}
          onDownload={() => {
            const doc = lavorazioneDocumentByTipo(rows, slot.tipo);
            const u = urls[slot.tipo];
            if (!doc || !u) return;
            const a = document.createElement("a");
            a.href = u;
            a.download = doc.filename;
            a.rel = "noopener";
            a.click();
          }}
        />
      ))}
    </div>
  );

  return body;
}

export function ClientLavorazioneDocumentsDialog({
  open,
  onClose,
  lavorazioneId,
  refLabel,
}: {
  open: boolean;
  onClose: () => void;
  lavorazioneId: string;
  refLabel?: string;
}) {
  if (!open) return null;

  return (
    <LavorazioniModalShell
      onRequestClose={onClose}
      title="Documenti lavorazione"
      subtitle={refLabel}
      titleId="client-lav-docs-title"
    >
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-3 gestionale-scrollbar">
        <ClientLavorazioneDocumentsPanel lavorazioneId={lavorazioneId} />
      </div>
    </LavorazioniModalShell>
  );
}
