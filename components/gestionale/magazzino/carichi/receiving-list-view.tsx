"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { gestionalePageToolbarActionsClass } from "@/components/gestionale/page-header-toolbar";
import { inventoryReceivingListQueryKey } from "@/lib/inventory-receiving/inventory-receiving-list-query-keys";
import { abandonInventoryReceivingPending } from "@/lib/inventory-receiving/inventory-receiving-import-client";
import { InventoryReceivingPendingBanner } from "@/components/gestionale/magazzino/carichi/inventory-receiving-pending-banner";
import { inventoryDocumentStatusLabel } from "@/lib/inventory-receiving/documents/inventory-receiving-status";
import { fetchInventoryReceivingPending } from "@/lib/inventory-receiving/inventory-receiving-import-client";
import type { InventoryDocumentRow } from "@/src/types/supabase-tables";
import { dsStackPage } from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { MagazzinoCarichiCaptureLauncher } from "@/components/gestionale/magazzino/carichi/magazzino-carichi-capture-launcher";
import { useGestionaleSyncScope } from "@/src/hooks/gestionale/use-gestionale-sync-scope";
import { usePermissions } from "@/src/hooks/use-permissions";

export function ReceivingListView() {
  useGestionaleSyncScope({
    scopeId: "magazzino-carichi-view",
    domain: "magazzino",
    route: "/magazzino/carichi",
    tables: [
      "magazzino_ricambi",
      "movimenti_ricambi",
      "inventory_documents",
      "inventory_document_lines",
    ],
  });
  const perm = usePermissions("magazzino_carichi");
  const listQuery = useQuery({
    queryKey: inventoryReceivingListQueryKey(),
    queryFn: async () => {
      const listRes = await fetch("/api/magazzino/receiving");
      const body = (await listRes.json()) as { documents?: InventoryDocumentRow[]; error?: string };
      if (!listRes.ok) throw new Error(body.error ?? "Errore caricamento carichi.");
      return body.documents ?? [];
    },
    staleTime: 30_000,
  });
  const docs = listQuery.data ?? [];
  const [pending, setPending] = useState<Awaited<ReturnType<typeof fetchInventoryReceivingPending>>>([]);
  const loading = listQuery.isLoading && listQuery.data === undefined;

  const load = useCallback(async () => {
    try {
      const [_, pendingItems] = await Promise.all([listQuery.refetch(), fetchInventoryReceivingPending()]);
      setPending(pendingItems);
    } catch {
      /* refetch errors surfaced by query */
    }
  }, [listQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <GestionaleSectionGate module="magazzino_carichi">
      <div className={layoutPageRoot}>
        {perm.canWrite ? (
          <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
            <div className={gestionalePageToolbarActionsClass}>
              <MagazzinoCarichiCaptureLauncher size="md" className="h-11 shrink-0" />
            </div>
          </div>
        ) : null}
        <div className={dsStackPage}>
          <InventoryReceivingPendingBanner
            items={pending}
            onDismissPending={(item) => void abandonInventoryReceivingPending(item).then(() => load())}
          />
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            <Link href="/magazzino" className="underline">
              ← Magazzino
            </Link>
          </p>
          {loading ? (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun DDT caricato.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[color:var(--cab-border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--cab-table-head)] text-left">
                  <tr>
                    <th className="px-3 py-2">DDT</th>
                    <th className="px-3 py-2">Fornitore</th>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Stato</th>
                    <th className="px-3 py-2">AI</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-t border-[color:var(--cab-border)]">
                      <td className="px-3 py-2">
                        <Link href={`/magazzino/carichi/nuovo?documentId=${d.id}`} className="font-medium underline">
                          {d.document_number ?? d.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{d.supplier_label ?? "—"}</td>
                      <td className="px-3 py-2">{d.document_date ?? "—"}</td>
                      <td className="px-3 py-2">{inventoryDocumentStatusLabel(d.status)}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {d.document_ai_confidence != null ? `${Math.round(d.document_ai_confidence * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </GestionaleSectionGate>
  );
}
