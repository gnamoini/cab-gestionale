"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { LoadingSpinner } from "@/components/design-system/loading";
import type { ClientPreventivoPortalPayload } from "@/lib/preventivi/preventivo-client-portal-types";
import { openPdfStreamInNewTab } from "@/lib/pdf/request-pdf-artifact";
import { dsGapMd, dsStackPage } from "@/lib/ui/design-system";

function clientPreventivoQueryKey(lavorazioneId: string) {
  return ["client_lavorazione_preventivo", lavorazioneId] as const;
}

function formatCountdown(seconds: number | null): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

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
  const qc = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<"accept" | "reject" | null>(null);

  const preventivoQ = useQuery({
    queryKey: clientPreventivoQueryKey(lavorazioneId),
    queryFn: async (): Promise<ClientPreventivoPortalPayload> => {
      const res = await fetch(`/api/lavorazioni/${encodeURIComponent(lavorazioneId)}/preventivo`, {
        credentials: "same-origin",
      });
      const body = (await res.json()) as ClientPreventivoPortalPayload & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Preventivo non disponibile");
      return body;
    },
    refetchInterval: (q) => {
      const rem = q.state.data?.acceptanceStatus.remainingSeconds;
      return rem != null && rem > 0 ? 60_000 : false;
    },
  });

  const respondM = useMutation({
    mutationFn: async (action: "accept" | "reject") => {
      const res = await fetch(
        `/api/lavorazioni/${encodeURIComponent(lavorazioneId)}/preventivo/respond`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Operazione non riuscita");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: clientPreventivoQueryKey(lavorazioneId) });
    },
  });

  const onConfirm = useCallback(async () => {
    if (!confirmAction) return;
    await respondM.mutateAsync(confirmAction);
    setConfirmAction(null);
  }, [confirmAction, respondM]);

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

  const { acceptanceStatus: acc } = data;

  return (
    <div className={`flex min-w-0 flex-col ${dsGapMd}`}>
      <GestionaleInfoCard
        compact
        title={`Preventivo ${data.numero}${data.versione > 1 ? ` v${data.versione}` : ""}`}
        subtitle={
          <div className={`flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300`}>
            <span>{acc.displayLabel}</span>
            {data.inviatoAt ? (
              <span className="text-xs text-zinc-500">
                Inviato: {formatTimelineDate(data.inviatoAt)}
              </span>
            ) : null}
            {acc.status === "pending" && acc.remainingSeconds != null ? (
              <span className="text-xs text-amber-700 dark:text-amber-400">
                Tempo rimanente: {formatCountdown(acc.remainingSeconds)}
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
              onClick={() => void openPdfStreamInNewTab(data.streamPath)}
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

      {acc.canRespond ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            disabled={respondM.isPending}
            onClick={() => setConfirmAction("accept")}
          >
            ACCETTA PREVENTIVO
          </button>
          <button
            type="button"
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            disabled={respondM.isPending}
            onClick={() => setConfirmAction("reject")}
          >
            RIFIUTA PREVENTIVO
          </button>
        </div>
      ) : null}

      <GestionaleConfirmDialog
        open={confirmAction === "accept"}
        onCancel={() => setConfirmAction(null)}
        title="Accettare il preventivo?"
        message="Confermando, autorizzi l'esecuzione dei lavori secondo il preventivo indicato."
        confirmLabel="Accetta"
        onConfirm={() => void onConfirm()}
        pending={respondM.isPending}
      />
      <GestionaleConfirmDialog
        open={confirmAction === "reject"}
        onCancel={() => setConfirmAction(null)}
        title="Rifiutare il preventivo?"
        message="Il preventivo verrà segnato come rifiutato. Potrai contattare l'officina per eventuali modifiche."
        confirmLabel="Rifiuta"
        destructive
        onConfirm={() => void onConfirm()}
        pending={respondM.isPending}
      />
    </div>
  );
}
