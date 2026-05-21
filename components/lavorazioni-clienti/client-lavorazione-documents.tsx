"use client";

import { LavorazioniModalShell, LavorazioniModalTitleBar } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { ShellCard } from "@/components/gestionale/shell-card";
import { CLIENT_PORTAL_DOCUMENT_SLOTS } from "@/lib/lavorazioni/client-portal-documents";
import { lavorazioneDocumentByTipo } from "@/lib/lavorazioni/lavorazione-documents";
import { dsBtnNeutral } from "@/lib/ui/design-system";
import { useClientLavorazioneDocumentsQuery } from "@/src/hooks/gestionale/use-client-lavorazione-media-queries";
import type { LavorazioneDocumentRow } from "@/src/types/supabase-tables";

function IconPdf() {
  return (
    <svg className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function ClientDocumentRow({
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
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/40">
      <div className="flex min-w-0 items-center gap-2">
        <IconPdf />
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{label}</p>
          {doc ? (
            <p className="truncate text-xs text-zinc-500" title={doc.filename}>
              {doc.filename}
            </p>
          ) : (
            <p className="text-xs text-zinc-500">Nessun documento caricato</p>
          )}
        </div>
      </div>
      {doc && url ? (
        <div className="flex shrink-0 gap-1.5">
          <button type="button" className={dsBtnNeutral} onClick={onOpen}>
            Apri
          </button>
          <button type="button" className={dsBtnNeutral} onClick={onDownload}>
            Scarica
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ClientLavorazioneDocumentsPanel({
  lavorazioneId,
  embedded = false,
}: {
  lavorazioneId: string;
  /** Senza card esterna (es. dentro pannello Documenti unificato). */
  embedded?: boolean;
}) {
  const docsQ = useClientLavorazioneDocumentsQuery(lavorazioneId);
  const loading = docsQ.isLoading && docsQ.data == null;
  const rows = docsQ.data?.rows ?? [];
  const urls = docsQ.data?.urls ?? {};

  if (loading) return <p className="text-sm text-zinc-500">Caricamento documenti…</p>;

  const body = (
    <div className="space-y-2">
      {CLIENT_PORTAL_DOCUMENT_SLOTS.map((slot) => (
        <ClientDocumentRow
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

  if (embedded) return body;

  return (
    <ShellCard>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Documenti</p>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Nessun documento disponibile per questa lavorazione.</p>
      ) : (
        body
      )}
    </ShellCard>
  );
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
    <LavorazioniModalShell onRequestClose={onClose} titleId="client-lav-docs-title">
      <LavorazioniModalTitleBar title="Documenti lavorazione" titleId="client-lav-docs-title" onRequestClose={onClose}>
        {refLabel ? <p className="mt-1 text-xs text-zinc-500">{refLabel}</p> : null}
      </LavorazioniModalTitleBar>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 gestionale-scrollbar">
        <ClientLavorazioneDocumentsPanel lavorazioneId={lavorazioneId} />
      </div>
    </LavorazioniModalShell>
  );
}
