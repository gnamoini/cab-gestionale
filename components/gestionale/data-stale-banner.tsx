"use client";

import { useMemo } from "react";
import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
import { isGestionaleDirtySyncEnabled } from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import { useGestionaleDirty } from "@/src/context/gestionale-dirty-context";
import { dsSystemBannerPrimaryBtn } from "@/lib/ui/design-system";
import type { DirtyEntry } from "@/lib/sync/gestionale-dirty-state";

function resolveBannerCopy(entries: DirtyEntry[]): { title: string; description: string } {
  const entitySpecific = entries.some((entry) => Boolean(entry.entityId));

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
  if (domain === "portale") {
    return {
      title: "Nuovi dati disponibili",
      description: "Le lavorazioni sono state aggiornate.",
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
  const { dirtyEntries, hasDirty } = useGestionaleDirty();

  const copy = useMemo(() => resolveBannerCopy(dirtyEntries), [dirtyEntries]);

  if (!isGestionaleDirtySyncEnabled() || !hasDirty) {
    return null;
  }

  return (
    <SystemBannerShell ariaLabel="Dati aggiornati disponibili" role="status" placement="inShell">
      <SystemBannerLayout
        title={copy.title}
        description={copy.description}
        actions={
          <button
            type="button"
            className={dsSystemBannerPrimaryBtn}
            onClick={() => window.location.reload()}
          >
            Aggiorna pagina
          </button>
        }
      />
    </SystemBannerShell>
  );
}
