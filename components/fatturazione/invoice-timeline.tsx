"use client";

import { useCallback, useEffect, useState } from "react";
import { INVOICE_EVENTS_COLUMNS } from "@/lib/db/table-select-columns";
import {
  formatInvoiceEventLabel,
  INVOICE_TIMELINE_PAGE_SIZE,
  sortInvoiceEventsAsc,
} from "@/lib/fatturazione/invoice-events";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { InvoiceEventRow } from "@/src/types/supabase-tables";
import { dsTypoCaption, dsTypoSmall } from "@/lib/ui/design-system";

type TimelineCursor = { created_at: string; id: string };

export function InvoiceTimeline({ invoiceId }: { invoiceId: string }) {
  const [events, setEvents] = useState<InvoiceEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<TimelineCursor | null>(null);

  const fetchPage = useCallback(
    async (before?: TimelineCursor) => {
      const c = getBrowserSupabase();
      let q = c
        .from("invoice_events")
        .select(INVOICE_EVENTS_COLUMNS)
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(INVOICE_TIMELINE_PAGE_SIZE);

      if (before) {
        q = q.or(
          `and(created_at.eq.${before.created_at},id.lt.${before.id}),created_at.lt.${before.created_at}`,
        );
      }

      const { data, error } = await q;
      const page = (error ? [] : (data ?? [])) as InvoiceEventRow[];
      return page;
    },
    [invoiceId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const page = await fetchPage();
      if (cancelled) return;
      const sorted = sortInvoiceEventsAsc(page);
      setEvents(sorted);
      setHasMore(page.length >= INVOICE_TIMELINE_PAGE_SIZE);
      const oldest = sorted[0];
      setCursor(oldest ? { created_at: oldest.created_at, id: oldest.id } : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const page = await fetchPage(cursor);
    const merged = sortInvoiceEventsAsc([...page, ...events]);
    setEvents(merged);
    setHasMore(page.length >= INVOICE_TIMELINE_PAGE_SIZE);
    const oldest = merged[0];
    setCursor(oldest ? { created_at: oldest.created_at, id: oldest.id } : null);
    setLoadingMore(false);
  };

  if (loading) return <p className={dsTypoSmall}>Caricamento timeline…</p>;
  if (events.length === 0) return <p className={dsTypoSmall}>Nessun evento registrato.</p>;

  return (
    <div className="space-y-3">
      <ol className="space-y-3 border-l border-[color:var(--cab-border)] pl-4">
        {events.map((ev) => (
          <li key={ev.id} className="relative">
            <span className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-[color:var(--cab-primary)]" />
            <p className="text-sm font-medium text-[color:var(--cab-text)]">{formatInvoiceEventLabel(ev)}</p>
            <p className={dsTypoCaption}>
              {new Date(ev.created_at).toLocaleString("it-IT")} · {ev.event_category}
            </p>
          </li>
        ))}
      </ol>
      {hasMore ? (
        <button type="button" className={dsTypoSmall} onClick={() => void loadMore()} disabled={loadingMore}>
          {loadingMore ? "Caricamento…" : "Carica altri"}
        </button>
      ) : null}
    </div>
  );
}
