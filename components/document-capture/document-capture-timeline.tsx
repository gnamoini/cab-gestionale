"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/design-system/loading";

type EventRow = {
  id: string;
  event_type: string;
  created_at: string;
  payload: Record<string, unknown>;
};

export function DocumentCaptureTimeline({ captureId }: { captureId: string }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/document-capture/${captureId}/events`);
        if (!res.ok) return;
        const body = (await res.json()) as { events?: EventRow[] };
        if (!cancelled) setEvents(body.events ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [captureId]);

  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs">
        <LoadingSpinner size="sm" />
        Timeline…
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="mt-2 text-xs text-[color:var(--cab-muted-fg)]">Nessun evento.</p>;
  }

  return (
    <ol className="mt-2 space-y-1 border-l border-[color:var(--cab-border)] pl-3 text-xs">
      {events.map((ev) => (
        <li key={ev.id}>
          <span className="font-medium">{ev.event_type}</span>
          <span className="text-[color:var(--cab-muted-fg)]">
            {" "}
            · {new Date(ev.created_at).toLocaleString("it-IT")}
          </span>
        </li>
      ))}
    </ol>
  );
}
