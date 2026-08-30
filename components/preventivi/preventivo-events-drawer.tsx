"use client";

import { Drawer } from "@/components/design-system";
import type { PreventivoEventViewModel } from "@/lib/preventivi/preventivo-events-types";

function fmtEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PreventivoEventsDrawer({
  open,
  onClose,
  numero,
  events,
  isLoading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  numero: string;
  events: readonly PreventivoEventViewModel[];
  isLoading?: boolean;
  error?: string | null;
}) {
  if (!open) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Timeline preventivo ${numero}`}
      ariaLabel={`Timeline eventi preventivo ${numero}`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 min-w-0">
        {isLoading ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento eventi…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun evento registrato.</p>
        ) : (
          <ol className="space-y-3">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="rounded-lg border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[color:var(--cab-text)]">{ev.label}</p>
                  <time className="shrink-0 text-xs tabular-nums text-[color:var(--cab-text-muted)]">
                    {fmtEventTime(ev.createdAt)}
                  </time>
                </div>
                <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">Attore: {ev.actorType}</p>
                {Object.keys(ev.snapshot).length > 0 ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-[color:var(--cab-primary)]">Snapshot stato</summary>
                    <pre className="mt-1 max-h-40 overflow-auto rounded bg-zinc-100 p-2 text-[10px] dark:bg-zinc-900">
                      {JSON.stringify(ev.snapshot, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </Drawer>
  );
}
