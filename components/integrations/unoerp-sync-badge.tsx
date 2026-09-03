"use client";

import { Tooltip } from "@/components/ui";

function label(status: string | undefined): { text: string; title: string; cls: string } {
  if (!status) {
    return {
      text: "UnoERP · da sincronizzare",
      title: "Nessun mapping UnoERP",
      cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    };
  }
  if (status === "SYNCED" || status === "VERIFIED" || status === "CREATE_RECOVERED") {
    return { text: "UnoERP · ok", title: "Sincronizzato", cls: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" };
  }
  if (status === "BLOCKED" || status === "CONFLICT" || status === "MANUAL_REVIEW") {
    return { text: "UnoERP · errore", title: status, cls: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100" };
  }
  return { text: "UnoERP · in coda", title: status, cls: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100" };
}

export function UnoerpSyncBadge({
  status,
  unoerpRecordId,
  lastSyncedAt,
  onResync,
}: {
  status?: string;
  unoerpRecordId?: string | null;
  lastSyncedAt?: string | null;
  onResync?: () => void;
}) {
  const l = label(status);
  const extra = [unoerpRecordId ? `ID ${unoerpRecordId}` : null, lastSyncedAt ? `sync ${lastSyncedAt}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <span className="inline-flex items-center gap-1">
      <Tooltip content={extra ? `${l.title} · ${extra}` : l.title}>
        <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${l.cls}`}>
          {l.text}
        </span>
      </Tooltip>
      {onResync && status && status !== "SYNCED" && unoerpRecordId ? (
        <button
          type="button"
          className="text-[9px] font-semibold uppercase text-zinc-500 underline"
          onClick={onResync}
        >
          Risincronizza
        </button>
      ) : null}
    </span>
  );
}
