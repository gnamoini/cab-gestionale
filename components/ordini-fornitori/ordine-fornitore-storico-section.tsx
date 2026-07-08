"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
} from "@/components/gestionale/gestionale-log-ui";
import { GestionaleCollapsibleSection } from "@/components/design-system";
import {
  buildLogModificheDisplayEntries,
  logAutoreLabel,
} from "@/lib/gestionale-log/log-modifiche-view-model";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";

export function OrdineFornitoreStoricoSection({ ordineId }: { ordineId: string }) {
  const { user } = useAuth();
  const authorName = user?.nome?.trim() || user?.email?.split("@")[0]?.trim() || "Operatore";
  const logQuery = useLogListQuery(
    { entita: "ordini_fornitori", entita_id: ordineId, limit: 100 },
    { enabled: Boolean(ordineId.trim()) },
  );

  const logEntries = useMemo(
    () =>
      buildLogModificheDisplayEntries(logQuery.data ?? [], (row) =>
        logAutoreLabel(row, user?.id ?? null, authorName),
      ),
    [authorName, logQuery.data, user?.id],
  );

  return (
    <GestionaleCollapsibleSection title="Cronologia modifiche" defaultCollapsed={false} variant="form">
      {logQuery.isLoading && logEntries.length === 0 ? (
        <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento cronologia…</p>
      ) : logEntries.length === 0 ? (
        <GestionaleLogEmpty message="Nessuna modifica registrata." />
      ) : (
        <GestionaleLogList>
          {logEntries.map((entry) => (
            <li key={entry.id} className="list-none">
              <GestionaleLogEntryFourLines vm={entry.vm} />
            </li>
          ))}
        </GestionaleLogList>
      )}
    </GestionaleCollapsibleSection>
  );
}
