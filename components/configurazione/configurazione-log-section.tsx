"use client";

import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import { appSettingsAuditService } from "@/src/services/app-settings-audit.service";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import type { AppSettingsAuditRow } from "@/src/types/supabase-tables";

function vmFromAuditRow(row: AppSettingsAuditRow): GestionaleLogViewModel {
  const at = row.updated_at;
  return {
    tone: "update",
    tipoRiga: `IMPOSTAZIONI · ${row.module}`,
    oggettoRiga: row.key,
    modificaRiga: "Modifica configurazione amministrativa",
    autore: row.updated_by ? `Utente ${row.updated_by.slice(0, 8)}…` : "Sistema",
    atIso: at,
  };
}

type ConfigurazioneLogSectionProps = {
  max?: number;
  className?: string;
  paged?: boolean;
};

export function ConfigurazioneLogSection({
  max = 40,
  className,
  paged = false,
}: ConfigurazioneLogSectionProps = {}) {
  const [rows, setRows] = useState<AppSettingsAuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void appSettingsAuditService.list({ limit: 500 }).then((res) => {
      if (cancelled) return;
      setRows(res.success ? (res.data ?? []) : []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const entries = useMemo(() => rows.map(vmFromAuditRow), [rows]);
  const pageSize = 12;
  const pagination = useClientPagination(entries.length, pageSize);
  const { resetPage } = pagination;

  useEffect(() => {
    if (!paged) return;
    resetPage();
  }, [paged, entries.length, pageSize, resetPage]);

  const visibleEntries = useMemo(() => {
    if (paged) return pagination.sliceItems(entries);
    return entries.slice(0, max);
  }, [paged, entries, max, pagination]);

  const list = (
    <div className={gestionaleLogScrollEmbeddedClass}>
      {loading ? (
        <p className="text-muted-foreground px-3 py-4 text-sm">Caricamento storico…</p>
      ) : visibleEntries.length === 0 ? (
        <GestionaleLogEmpty message="Nessuna modifica configurazione registrata." />
      ) : (
        <GestionaleLogList>
          {visibleEntries.map((vm, i) => (
            <GestionaleLogEntryFourLines key={`${vm.atIso}-${i}`} vm={vm} />
          ))}
        </GestionaleLogList>
      )}
    </div>
  );

  if (paged) {
    return (
      <div className={`flex min-h-0 min-w-0 flex-1 flex-col gap-2 ${className ?? ""}`}>
        {list}
        {pagination.showPager ? (
          <TablePagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            onPageChange={pagination.setPage}
            label={pagination.label}
          />
        ) : null}
      </div>
    );
  }

  return (
    <section
      className={`flex min-h-0 flex-1 flex-col gap-2 ${className ?? ""}`}
      aria-label="Storico configurazione"
    >
      {list}
    </section>
  );
}

export const ConfigurazioneLogListEmbedded = ConfigurazioneLogSection;
