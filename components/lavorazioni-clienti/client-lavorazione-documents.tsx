"use client";

import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { LoadingSpinner } from "@/components/design-system/loading/loading-spinner";
import { lavorazioneDocumentDeliveryUrl } from "@/lib/documents/document-delivery-url";
import { CLIENT_PORTAL_DOCUMENT_SLOTS } from "@/lib/lavorazioni/client-portal-documents";
import { lavorazioneDocumentByTipo } from "@/lib/lavorazioni/lavorazione-documents";
import { dsBtnNeutral, dsGapMd, dsTableActionTextBtn } from "@/lib/ui/design-system";
import { useClientLavorazioneDocumentsQuery } from "@/src/hooks/gestionale/use-client-lavorazione-media-queries";
import type { LavorazioneDocumentRow } from "@/src/types/supabase-tables";

function ClientDocumentSlotCard({
  label,
  doc,
  onOpen,
  onDownload,
}: {
  label: string;
  doc: LavorazioneDocumentRow | undefined;
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

  const actions = doc ? (
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
          onOpen={() => {
            const doc = lavorazioneDocumentByTipo(rows, slot.tipo);
            if (!doc) return;
            window.open(lavorazioneDocumentDeliveryUrl(doc, "preview"), "_blank", "noopener,noreferrer");
          }}
          onDownload={() => {
            const doc = lavorazioneDocumentByTipo(rows, slot.tipo);
            if (!doc) return;
            const a = document.createElement("a");
            a.href = lavorazioneDocumentDeliveryUrl(doc, "download");
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
      modalSize="info"
      onRequestClose={onClose}
      title="Documenti lavorazione"
      subtitle={refLabel}
      titleId="client-lav-docs-title"
      footer={
        <button type="button" className={`${dsBtnNeutral} min-h-11 w-full sm:ml-auto sm:w-auto`} onClick={onClose}>
          Chiudi
        </button>
      }
    >
      <GestionaleModalScrollBody>
        <ClientLavorazioneDocumentsPanel lavorazioneId={lavorazioneId} />
      </GestionaleModalScrollBody>
    </LavorazioniModalShell>
  );
}
