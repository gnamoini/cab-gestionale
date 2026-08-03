"use client";

import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { LoadingSpinner } from "@/components/design-system/loading/loading-spinner";
import type { ClientLavorazioneDocumentsPayload } from "@/lib/official-documents/types";
import { openPdfStreamInNewTab } from "@/lib/pdf/request-pdf-artifact";
import { dsGapMd, dsTableActionTextBtn } from "@/lib/ui/design-system";
import { useQuery } from "@tanstack/react-query";

function clientDocumentsQueryKey(lavorazioneId: string) {
  return ["client_lavorazione_official_documents", lavorazioneId] as const;
}

function ClientOfficialDocumentsBody({ lavorazioneId }: { lavorazioneId: string }) {
  const docsQ = useQuery({
    queryKey: clientDocumentsQueryKey(lavorazioneId),
    queryFn: async (): Promise<ClientLavorazioneDocumentsPayload> => {
      const res = await fetch(
        `/api/lavorazioni/${encodeURIComponent(lavorazioneId)}/official-documents?surface=client`,
        { credentials: "same-origin" },
      );
      const body = (await res.json()) as ClientLavorazioneDocumentsPayload & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Documenti non disponibili");
      return body;
    },
  });

  if (docsQ.isLoading) {
    return (
      <GestionaleInfoCard
        compact
        title="Documenti"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <LoadingSpinner size="sm" label="Caricamento documenti…" />
            Caricamento…
          </span>
        }
      />
    );
  }

  if (docsQ.isError) {
    return (
      <GestionaleInfoCard
        compact
        title="Documenti"
        subtitle={
          <button
            type="button"
            className="text-left text-sm text-red-600 underline dark:text-red-400"
            onClick={() => void docsQ.refetch()}
          >
            Errore — riprova
          </button>
        }
      />
    );
  }

  const items = [...(docsQ.data?.preventivi ?? []), ...(docsQ.data?.ddt ?? [])];
  if (items.length === 0) {
    return <GestionaleInfoCard compact title="Documenti" subtitle="Nessun documento disponibile" />;
  }

  return (
    <>
      {items.map((doc) => (
        <GestionaleInfoCard
          key={`${doc.kind}-${doc.label}`}
          compact
          title={doc.label}
          actions={
            <button
              type="button"
              className={dsTableActionTextBtn}
              onClick={() => {
                void openPdfStreamInNewTab(doc.streamPath);
              }}
            >
              Apri
            </button>
          }
        />
      ))}
    </>
  );
}

export function ClientLavorazioneDocumentsPanel({
  lavorazioneId,
  embedded = false,
}: {
  lavorazioneId: string;
  embedded?: boolean;
}) {
  const body = <ClientOfficialDocumentsBody lavorazioneId={lavorazioneId} />;
  if (embedded) return body;
  return <div className={`flex min-w-0 flex-col ${dsGapMd}`}>{body}</div>;
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
    >
      <GestionaleModalScrollBody>
        <ClientLavorazioneDocumentsPanel lavorazioneId={lavorazioneId} />
      </GestionaleModalScrollBody>
    </LavorazioniModalShell>
  );
}
