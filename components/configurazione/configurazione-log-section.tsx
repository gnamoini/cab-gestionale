"use client";

import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import {
  CONFIGURAZIONE_LOG_STORAGE_KEY,
  loadConfigurazioneLog,
  migrateLegacyDashboardSettingsLogsToConfigurazione,
  type ConfigurazioneLogStored,
} from "@/lib/configurazione/configurazione-log-storage";
import { CAB_CONFIGURAZIONE_LOG_REFRESH } from "@/lib/sistema/cab-events";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";

function vmFromStored(e: ConfigurazioneLogStored) {
  const { id: _id, ...vm } = e;
  return vm;
}

const GROUP_WINDOW_MS = 120_000;

function groupConfigurazioneEntries(entries: ConfigurazioneLogStored[]): ConfigurazioneLogStored[] {
  if (entries.length === 0) return [];
  const out: ConfigurazioneLogStored[] = [];
  let buf: ConfigurazioneLogStored[] = [];

  function flush() {
    if (buf.length === 0) return;
    if (buf.length === 1) {
      out.push(buf[0]);
    } else {
      const first = buf[0];
      const last = buf[buf.length - 1];
      const base = first.modificaRiga.replace(/\s*\(\d+\s+cambi\)\s*$/i, "").trim();
      out.push({
        ...last,
        id: `grp-${first.id}-${buf.length}-${last.atIso}`,
        modificaRiga: `${base} (${buf.length} sezioni)`,
      });
    }
    buf = [];
  }

  for (const e of entries) {
    const prev = buf[buf.length - 1];
    if (
      prev &&
      prev.tipoRiga === e.tipoRiga &&
      prev.autore === e.autore &&
      Math.abs(new Date(e.atIso).getTime() - new Date(prev.atIso).getTime()) <= GROUP_WINDOW_MS
    ) {
      buf.push(e);
    } else {
      flush();
      buf = [e];
    }
  }
  flush();
  return out;
}

function useConfigurazioneLogEntries(): ConfigurazioneLogStored[] {
  const [entries, setEntries] = useState<ConfigurazioneLogStored[]>([]);

  useEffect(() => {
    function refresh() {
      migrateLegacyDashboardSettingsLogsToConfigurazione();
      setEntries(loadConfigurazioneLog());
    }
    refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === CONFIGURAZIONE_LOG_STORAGE_KEY) refresh();
    };
    window.addEventListener(CAB_CONFIGURAZIONE_LOG_REFRESH, refresh);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CAB_CONFIGURAZIONE_LOG_REFRESH, refresh);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return entries;
}

export function ConfigurazioneLogListEmbedded({
  max = 40,
  className,
  paged = false,
}: {
  max?: number;
  className?: string;
  paged?: boolean;
}) {
  const entries = useConfigurazioneLogEntries();
  const grouped = useMemo(() => groupConfigurazioneEntries(entries), [entries]);

  const pageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(
    grouped.length,
    pageSize,
  );

  useEffect(() => {
    if (!paged) return;
    resetPage();
  }, [paged, grouped.length, pageSize, resetPage]);

  const slice = useMemo(() => {
    if (paged) return sliceItems(grouped);
    return grouped.slice(0, max);
  }, [paged, grouped, max, sliceItems, page]);

  const list = (
    <>
      {slice.length === 0 ? (
        <GestionaleLogEmpty message="Nessuna modifica registrata. Ogni salvataggio in Configurazione viene tracciato qui." />
      ) : (
        <GestionaleLogList>
          {slice.map((e) => (
            <li key={e.id} className="list-none">
              <GestionaleLogEntryFourLines vm={vmFromStored(e)} />
            </li>
          ))}
        </GestionaleLogList>
      )}
    </>
  );

  if (paged) {
    return (
      <div className={`flex min-h-0 min-w-0 flex-1 flex-col gap-2 ${className ?? ""}`}>
        <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 min-w-0 flex-1 pr-1`}>{list}</div>
        {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
      </div>
    );
  }

  return <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 min-w-0 flex-1 pr-1 ${className ?? ""}`}>{list}</div>;
}
