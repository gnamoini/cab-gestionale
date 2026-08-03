"use client";

import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { LoadingSpinner } from "@/components/design-system/loading/loading-spinner";
import type { StaffLavorazioneDocumentsPayload } from "@/lib/official-documents/types";
import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";
import { dsGapMd, dsTableActionTextBtn } from "@/lib/ui/design-system";
import { useQuery } from "@tanstack/react-query";

function staffDocumentsQueryKey(lavorazioneId: string) {
  return ["lavorazione_official_documents", lavorazioneId] as const;
}

export function LavorazioneOfficialDocumentsPanel({
  lavorazioneId,
  hubCardLayout = false,
}: {
  lavorazioneId: string;
  hubCardLayout?: boolean;
}) {
  const q = useQuery({
    queryKey: staffDocumentsQueryKey(lavorazioneId),
    queryFn: async (): Promise<StaffLavorazioneDocumentsPayload> => {
      const res = await fetch(`/api/lavorazioni/${encodeURIComponent(lavorazioneId)}/official-documents?surface=staff`, {
        credentials: "same-origin",
      });
      const body = (await res.json()) as StaffLavorazioneDocumentsPayload & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Documenti non disponibili");
      return body;
    },
  });

  if (q.isLoading) {
    return (
      <GestionaleInfoCard
        compact={hubCardLayout}
        title="Documenti ufficiali"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <LoadingSpinner size="sm" label="Caricamento" />
            Caricamento…
          </span>
        }
      />
    );
  }

  if (q.isError || !q.data) {
    return (
      <GestionaleInfoCard
        compact={hubCardLayout}
        title="Documenti ufficiali"
        subtitle={
          <button type="button" className="text-left text-sm text-red-600 underline" onClick={() => void q.refetch()}>
            Errore — riprova
          </button>
        }
      />
    );
  }

  const items = [...q.data.preventivi, ...q.data.ddt];
  if (items.length === 0) {
    return (
      <GestionaleInfoCard compact={hubCardLayout} title="Documenti ufficiali" subtitle="Nessun documento generato" />
    );
  }

  return (
    <div className={hubCardLayout ? "contents" : `flex min-w-0 flex-col ${dsGapMd}`}>
      {items.map((doc) => (
        <GestionaleInfoCard
          key={`${doc.kind}-${doc.kind === "preventivo" ? doc.id : doc.id}`}
          compact={hubCardLayout}
          title={doc.kind === "preventivo" ? `Preventivo ${doc.numero}` : doc.numero ? `DDT ${doc.numero}` : "DDT"}
          subtitle={doc.kind === "preventivo" ? doc.cliente : doc.clienteLabel}
          actions={
            <button
              type="button"
              className={dsTableActionTextBtn}
              onClick={() => {
                void openPdfArtifact(doc.kind === "preventivo" ? "preventivo" : "ddt", { id: doc.id });
              }}
            >
              Apri
            </button>
          }
        />
      ))}
    </div>
  );
}
