"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchOrdineFornitoreInTransitDetailClient } from "@/lib/ordini-fornitori/ordine-fornitore-in-transit-client";
import { ordineFornitoreStatusLabel } from "@/lib/ordini-fornitori/ordine-fornitore-status-ui";
import type { OrdineFornitoreInTransitDetailRow } from "@/lib/ordini-fornitori/ordine-fornitore-in-transit";

export function OrdineFornitoreInTransitPopoverContent({ ricambioId }: { ricambioId: string }) {
  const [rows, setRows] = useState<OrdineFornitoreInTransitDetailRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setLoading(true);
    fetchOrdineFornitoreInTransitDetailClient(ricambioId).then((res) => {
      if (cancelled) return;
      setRows(res.success ? (res.data ?? []) : []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [ricambioId]);

  if (loading) return <p className="text-xs text-[color:var(--cab-text-muted)]">Caricamento…</p>;
  if (rows.length === 0) {
    return <p className="text-xs text-[color:var(--cab-text-muted)]">Nessun ordine in consegna.</p>;
  }

  return (
    <ul className="space-y-1 text-xs">
      {rows.map((r) => (
        <li key={r.rigaId} className="flex items-center gap-x-2 gap-y-0.5 min-w-0 flex-nowrap sm:flex-wrap">
          <Link
            href={`/ordini-fornitori?ordine=${encodeURIComponent(r.ordineId)}`}
            className="font-mono text-[color:var(--cab-primary)] hover:underline"
          >
            {r.numero}
          </Link>
          <span className="font-mono tabular-nums">{r.qtyInTransit} pz</span>
          <span className="text-[color:var(--cab-text-muted)]">{ordineFornitoreStatusLabel(r.status)}</span>
        </li>
      ))}
    </ul>
  );
}
