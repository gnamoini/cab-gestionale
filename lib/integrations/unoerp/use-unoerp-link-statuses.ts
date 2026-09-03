"use client";

import { useEffect, useMemo, useState } from "react";

export type UnoerpLinkStatusRow = {
  cab_document_id: string;
  unoerp_record_id: string | null;
  unoerp_document_number: string | null;
  sync_status: string;
  last_synced_at: string | null;
  last_error_message: string | null;
};

export function useUnoerpLinkStatuses(type: "preventivo" | "consuntivo" | "ddt", ids: string[]) {
  const key = useMemo(() => `${type}:${ids.slice(0, 80).join(",")}`, [type, ids]);
  const [byId, setById] = useState<Map<string, UnoerpLinkStatusRow>>(new Map());

  useEffect(() => {
    const slice = key.split(":")[1] ?? "";
    if (!slice) {
      setById(new Map());
      return;
    }
    let cancelled = false;
    void fetch(`/api/integrations/unoerp/status?type=${encodeURIComponent(type)}&ids=${encodeURIComponent(slice)}`, {
      credentials: "same-origin",
    })
      .then((r) => (r.ok ? r.json() : { rows: [] }))
      .then((body: { rows?: UnoerpLinkStatusRow[] }) => {
        if (cancelled) return;
        const m = new Map<string, UnoerpLinkStatusRow>();
        for (const row of body.rows ?? []) m.set(row.cab_document_id, row);
        setById(m);
      })
      .catch(() => {
        if (!cancelled) setById(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [key, type]);

  return byId;
}
