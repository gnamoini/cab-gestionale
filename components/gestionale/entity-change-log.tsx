"use client";

import { useMemo } from "react";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogDrawerPanelClass,
  gestionaleLogScrollClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { buildLogModificheDisplayEntries, logAutoreLabel } from "@/lib/gestionale-log/log-modifiche-view-model";
import type { AuditEventType } from "@/lib/audit/types";

export type EntityChangeLogMode = "timeline" | "compact" | "drawer" | "full";

export type EntityChangeLogProps = {
  entity: string;
  id?: string;
  mode?: EntityChangeLogMode;
  title?: string;
  limit?: number;
  eventTypes?: readonly AuditEventType[];
  expandableDiff?: boolean;
  showSnapshot?: boolean;
  className?: string;
};

function useEntityChangeLogEntries(props: EntityChangeLogProps) {
  const gestOpts = useGestionaleQueryOpts();
  const limit = props.limit ?? 50;
  const q = useLogListQuery(
    {
      entita: props.entity,
      entita_id: props.id,
      limit,
    },
    { ...gestOpts, enabled: Boolean(props.entity) },
  );

  const entries = useMemo(() => {
    const rows = q.data ?? [];
    const filtered =
      props.eventTypes && props.eventTypes.length > 0
        ? rows.filter((r) => {
            const et = (r as { event_type?: string }).event_type ?? "DATA_CHANGE";
            return props.eventTypes!.includes(et as AuditEventType);
          })
        : rows;
    return buildLogModificheDisplayEntries(filtered, (row) => logAutoreLabel(row, null, "Tu"));
  }, [q.data, props.eventTypes]);

  return { entries, isLoading: q.isLoading };
}

function EntityChangeLogBody({
  props,
  scrollClass,
}: {
  props: EntityChangeLogProps;
  scrollClass: string;
}) {
  const { entries, isLoading } = useEntityChangeLogEntries(props);

  if (isLoading && entries.length === 0) {
    return <p className="text-muted-foreground px-3 py-4 text-sm">Caricamento storico…</p>;
  }
  if (entries.length === 0) {
    return <GestionaleLogEmpty message="Nessuna modifica registrata." />;
  }

  return (
    <div className={scrollClass}>
      <GestionaleLogList>
        {entries.map((e) => (
          <GestionaleLogEntryFourLines key={e.id} vm={e.vm} />
        ))}
      </GestionaleLogList>
    </div>
  );
}

/** SSOT storico modifiche per entità — legge `log_modifiche`. */
export function EntityChangeLog(props: EntityChangeLogProps) {
  const mode = props.mode ?? "timeline";
  const title = props.title ?? "Storico modifiche";

  if (mode === "drawer") {
    return (
      <div className={gestionaleLogDrawerPanelClass} aria-label={title}>
        <EntityChangeLogBody props={props} scrollClass={gestionaleLogScrollEmbeddedClass} />
      </div>
    );
  }

  const scrollClass =
    mode === "full" ? "gestionale-scrollbar min-h-0 flex-1 overflow-y-auto" : gestionaleLogScrollClass;

  return (
    <section className={props.className} aria-label={title}>
      {mode !== "compact" ? (
        <h3 className="text-foreground mb-2 text-sm font-semibold">{title}</h3>
      ) : null}
      <EntityChangeLogBody props={props} scrollClass={scrollClass} />
    </section>
  );
}
