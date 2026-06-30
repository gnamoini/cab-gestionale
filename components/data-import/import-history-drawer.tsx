"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/design-system";
import { fetchImportBatches } from "@/lib/data-import/data-import-client";
import type { ImportEntity } from "@/lib/data-import/core/types";
import { gestionaleLogDrawerPanelClass } from "@/components/gestionale/gestionale-log-ui";

export function ImportHistoryDrawer({
  entity,
  open,
  onClose,
}: {
  entity: ImportEntity;
  open: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void fetchImportBatches(entity)
      .then((b) => setRows(b as Array<Record<string, unknown>>))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [entity, open]);

  return (
    <Drawer open={open} onClose={onClose} title="Storico importazioni" ariaLabel="Storico importazioni">
      <div className={gestionaleLogDrawerPanelClass}>
        <div className="overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna importazione registrata.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {rows.map((b) => {
                const stats = (b.stats ?? {}) as Record<string, number>;
                return (
                  <li key={String(b.id)} className="rounded border border-[color:var(--cab-border)] p-3">
                    <p className="font-medium">{String(b.file_name ?? "—")}</p>
                    <p className="text-xs text-[color:var(--cab-text-muted)]">
                      {String(b.status)} · {String(b.created_at ?? "").slice(0, 16)}
                    </p>
                    <p className="text-xs tabular-nums">
                      +{stats.created ?? 0} / ~{stats.updated ?? 0} / skip {stats.skipped ?? 0} / err {stats.errors ?? 0}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Drawer>
  );
}
