"use client";

import { useCallback, useMemo, useState } from "react";
import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
import { isGestionaleDirtySyncEnabled } from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import { getActiveSyncContexts } from "@/lib/sync/gestionale-sync-scope";
import { isDirtyRelevantForScope } from "@/lib/sync/gestionale-dirty-state";
import { useGestionaleDirty } from "@/src/context/gestionale-dirty-context";
import { dsSystemBannerPrimaryBtn } from "@/lib/ui/design-system";

function resolveBannerCopy(
  entries: ReturnType<typeof useGestionaleDirty>["dirtyEntries"],
): { title: string; description: string } {
  const scopes = getActiveSyncContexts();
  const entitySpecific = entries.some((entry) =>
    scopes.some((scope) => {
      const visible = scope.visibleEntities ?? [];
      return visible.some(
        (v) => v.table === entry.table && v.entityId === entry.entityId && entry.entityId,
      );
    }),
  );

  if (entitySpecific) {
    return {
      title: "Dati aggiornati",
      description: "Questa lavorazione è stata modificata da un altro utente.",
    };
  }

  const domain = entries[0]?.domain;
  if (domain === "lavorazioni") {
    return {
      title: "Nuovi dati disponibili",
      description: "Un altro operatore ha modificato le lavorazioni.",
    };
  }
  if (domain === "dashboard") {
    return {
      title: "Dashboard non aggiornata",
      description: "Nuove attività e metriche disponibili.",
    };
  }
  if (domain === "magazzino") {
    return {
      title: "Magazzino aggiornato",
      description: "Giacenze o movimenti modificati da un altro utente.",
    };
  }
  if (domain === "report") {
    return {
      title: "Report non aggiornato",
      description: "I dati del report potrebbero non essere allineati.",
    };
  }

  return {
    title: "Nuovi dati disponibili",
    description: "Un altro operatore ha modificato i dati di questa sezione.",
  };
}

export function DataStaleBanner() {
  const { dirtyEntries, hasDirty, flush } = useGestionaleDirty();
  const [applying, setApplying] = useState(false);

  const relevantEntries = useMemo(() => {
    const scopes = getActiveSyncContexts();
    return dirtyEntries.filter((entry) =>
      scopes.some((scope) => isDirtyRelevantForScope(entry, scope)),
    );
  }, [dirtyEntries]);

  const copy = useMemo(() => resolveBannerCopy(relevantEntries), [relevantEntries]);

  const handleRefresh = useCallback(async () => {
    setApplying(true);
    try {
      await flush("user_requested");
    } finally {
      setApplying(false);
    }
  }, [flush]);

  if (!isGestionaleDirtySyncEnabled() || !hasDirty || relevantEntries.length === 0) {
    return null;
  }

  return (
    <SystemBannerShell ariaLabel="Dati aggiornati disponibili" role="status">
      <SystemBannerLayout
        title={copy.title}
        description={copy.description}
        actions={
          <button
            type="button"
            disabled={applying}
            className={dsSystemBannerPrimaryBtn}
            onClick={() => void handleRefresh()}
          >
            {applying ? "Aggiornamento…" : "Aggiorna"}
          </button>
        }
      />
    </SystemBannerShell>
  );
}
