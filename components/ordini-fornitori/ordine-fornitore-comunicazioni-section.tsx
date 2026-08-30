"use client";

import { useEffect, useState } from "react";
import { GestionaleCollapsibleSection } from "@/components/design-system";
import type { OrdineFornitoreEmailStatus } from "@/lib/ordini-fornitori/ordine-fornitore-email-status.server";

export function OrdineFornitoreComunicazioniSection({ ordineId }: { ordineId: string }) {
  const [status, setStatus] = useState<OrdineFornitoreEmailStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ordineId.trim()) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch lifecycle sets loading on ordine change
    setLoading(true);
    void fetch(`/api/ordini-fornitori/${ordineId}/email-status`)
      .then(async (res) => {
        const json = (await res.json()) as OrdineFornitoreEmailStatus & { error?: string };
        if (!cancelled && res.ok) setStatus(json);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ordineId]);

  return (
    <GestionaleCollapsibleSection title="Comunicazioni email" defaultCollapsed={false} variant="form">
      {loading && !status ? (
        <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento comunicazioni…</p>
      ) : !status?.logs.length && !status?.hasDraft ? (
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna email inviata.</p>
      ) : (
        <div className="space-y-3">
          {status?.hasDraft ? (
            <p className="text-sm font-medium text-[color:var(--cab-accent)]">
              Bozza email {status.draftStatus === "sending" ? "in invio" : "presente"}
            </p>
          ) : null}
          <ul className="space-y-2">
            {status?.logs.map((log) => (
              <li
                key={log.id}
                className="rounded-md border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)] p-3 text-sm"
              >
                <div className="flex flex-nowrap sm:flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{log.subject || "—"}</span>
                  <span className="text-[color:var(--cab-text-muted)]">
                    {new Date(log.createdAt).toLocaleString("it-IT")}
                  </span>
                </div>
                <p className="mt-1 text-[color:var(--cab-text-muted)]">
                  {log.actualRecipientEmail || log.intendedRecipientEmail || "—"} · {log.status}
                </p>
                {log.errorMessage ? (
                  <p className="mt-1 text-[color:var(--cab-danger)]">{log.errorMessage}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </GestionaleCollapsibleSection>
  );
}
