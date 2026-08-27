"use client";

import { useQuery } from "@tanstack/react-query";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { LoadingSpinner } from "@/components/design-system/loading";
import type { ClientPreventivoPortalPayload } from "@/lib/preventivi/preventivo-client-portal-types";
import { openPdfStreamFromUserClick } from "@/lib/pdf/request-pdf-artifact";
import { dsGapMd, dsStackPage } from "@/lib/ui/design-system";
import { clientLavorazionePreventivoKey } from "@/src/lib/react-query/query-keys";

function formatTimelineDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ClientLavorazionePreventivoPanel({ lavorazioneId }: { lavorazioneId: string }) {
  const preventivoQ = useQuery({
    queryKey: clientLavorazionePreventivoKey(lavorazioneId),
    queryFn: async (): Promise<ClientPreventivoPortalPayload> => {
      const res = await fetch(`/api/lavorazioni/${encodeURIComponent(lavorazioneId)}/preventivo`, {
        credentials: "same-origin",
      });
      const body = (await res.json()) as ClientPreventivoPortalPayload & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Preventivo non disponibile");
      return body;
    },
  });

  if (preventivoQ.isLoading) {
    return (
      <GestionaleInfoCard
        compact
        title="Preventivo"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <LoadingSpinner size="sm" label="Caricamento preventivo…" />
            Caricamento…
          </span>
        }
      />
    );
  }

  if (preventivoQ.isError) {
    return null;
  }

  const data = preventivoQ.data;
  if (!data) return null;

  return (
    <div className={`flex min-w-0 flex-col ${dsGapMd}`}>
      <GestionaleInfoCard
        compact
        title={`Preventivo ${data.numero}${data.versione > 1 ? ` v${data.versione}` : ""}`}
        subtitle={
          <div className={`flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300`}>
            <span>{data.displayLabel}</span>
            {data.inviatoAt ? (
              <span className="text-xs text-zinc-500">
                Inviato: {formatTimelineDate(data.inviatoAt)}
              </span>
            ) : null}
            <span className="font-medium">
              Totale:{" "}
              {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(data.totale)}
            </span>
          </div>
        }
        actions={
          data.streamPath ? (
            <button
              type="button"
              className="text-sm font-medium text-[color:var(--cab-accent)] underline"
              onClick={() => openPdfStreamFromUserClick(data.streamPath)}
            >
              Apri PDF
            </button>
          ) : null
        }
      />

      {data.timeline.length > 0 ? (
        <ul className={`${dsStackPage} text-sm text-zinc-600 dark:text-zinc-400`}>
          {data.timeline.map((entry) => (
            <li key={`${entry.eventType}-${entry.at}`} className="flex gap-2">
              <span className="shrink-0 tabular-nums text-xs text-zinc-500">
                {formatTimelineDate(entry.at)}
              </span>
              <span>{entry.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
