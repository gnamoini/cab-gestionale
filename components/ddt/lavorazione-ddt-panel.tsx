"use client";

import { useEffect, useState } from "react";
import { formatDdtDate } from "@/components/ddt/ddt-status-badge";
import { ddtDisplayNumber } from "@/lib/ddt/ddt-list-ui-filters";
import { fetchDdtByLavorazioneId } from "@/lib/ddt/ddt-fetch";
import { openDdtPdfInNewTab } from "@/lib/ddt/ddt-pdf";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { DdtDocumentRow } from "@/src/types/supabase-tables";
import { dsBtnNeutralForm, dsHubModalSection, dsHubModalSectionTitle } from "@/lib/ui/design-system";

export function LavorazioneDdtPanel({ lavorazioneId }: { lavorazioneId: string }) {
  const [documents, setDocuments] = useState<DdtDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await fetchDdtByLavorazioneId(await getBrowserSupabase(), lavorazioneId);
      if (!cancelled) {
        setDocuments(res.success && res.data ? res.data : []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lavorazioneId]);

  return (
    <section className={dsHubModalSection} aria-label="Documenti di trasporto">
      <h3 className={dsHubModalSectionTitle}>Documenti di trasporto</h3>
      {loading ? (
        <p className="mt-2 text-sm text-[color:var(--cab-text-muted)]">Caricamento…</p>
      ) : documents.length === 0 ? (
        <p className="mt-2 text-sm text-[color:var(--cab-text-muted)]">Nessun DDT generato per questa lavorazione.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 rounded border border-[color:var(--cab-border)] p-2 min-w-0 flex-nowrap sm:flex-wrap">
              <div>
                <p className="font-mono text-xs font-semibold">{ddtDisplayNumber(d)}</p>
                <p className="text-xs text-[color:var(--cab-text-muted)]">
                  {formatDdtDate(d.data_documento)} · {d.cliente_label}
                </p>
              </div>
              {d.status !== "annullato" ? (
                <button
                  type="button"
                  className={dsBtnNeutralForm}
                  onClick={() => {
                    void openDdtPdfInNewTab(d.id);
                  }}
                >
                  Apri
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
