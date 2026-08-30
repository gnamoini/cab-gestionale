"use client";

import { useCallback, useEffect, useState } from "react";
import { LIST_DIVIDER_UL } from "@/lib/ui/list-primitives";
import { DocumentCaptureTimeline } from "@/components/document-capture/document-capture-timeline";
import { LoadingSpinner } from "@/components/design-system/loading";
import { dsBtnNeutral } from "@/lib/ui/design-system";

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending_upload: "In attesa upload",
    uploaded: "Caricato",
    analyzing: "Analisi…",
    review: "In revisione",
    dry_run: "Dry-run pronto",
    applied: "Applicato",
    failed: "Errore",
    expired_upload: "Upload scaduto",
    archived: "Archiviato",
  };
  return map[status] ?? status;
}

type CaptureRow = {
  id: string;
  status: string;
  file_name: string;
  finalized_at: string | null;
  document_category: string;
  uploaded_at: string;
};

type Props = {
  lavorazioneId?: string;
  refreshKey?: number;
};

export function DocumentCaptureHistoryPanel({ lavorazioneId, refreshKey = 0 }: Props) {
  const [rows, setRows] = useState<CaptureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = lavorazioneId ? `?lavorazioneId=${encodeURIComponent(lavorazioneId)}` : "";
      const res = await fetch(`/api/document-capture${qs}`);
      if (!res.ok) return;
      const body = (await res.json()) as { captures?: CaptureRow[] };
      setRows(body.captures ?? []);
    } finally {
      setLoading(false);
    }
  }, [lavorazioneId]);

   
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    void load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-[color:var(--cab-muted-fg)]">
        <LoadingSpinner size="sm" />
        Caricamento acquisizioni…
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="py-2 text-sm text-[color:var(--cab-muted-fg)]">Nessun documento acquisito.</p>;
  }

  return (
    <ul className={`${LIST_DIVIDER_UL} rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)]`}>
      {rows.map((row) => (
        <li key={row.id} className="p-3 text-sm">
          <div className="flex items-center justify-between gap-2 min-w-0 flex-nowrap sm:flex-wrap">
            <div>
              <p className="font-medium">{row.file_name}</p>
              <p className="text-xs text-[color:var(--cab-muted-fg)]">
                <span className="rounded bg-[color:var(--cab-surface-muted)] px-1.5 py-0.5">{statusLabel(row.status)}</span>
                {" · "}
                {new Date(row.uploaded_at).toLocaleString("it-IT")}
              </p>
            </div>
            <div className="flex gap-2 min-w-0 flex-nowrap sm:flex-wrap">
              {row.finalized_at ? (
                <a
                  className={dsBtnNeutral}
                  href={`/api/document-capture/${row.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Anteprima
                </a>
              ) : null}
              <button
                type="button"
                className={dsBtnNeutral}
                onClick={() => setExpandedId((cur) => (cur === row.id ? null : row.id))}
              >
                Timeline
              </button>
            </div>
          </div>
          {expandedId === row.id ? <DocumentCaptureTimeline captureId={row.id} /> : null}
        </li>
      ))}
    </ul>
  );
}
