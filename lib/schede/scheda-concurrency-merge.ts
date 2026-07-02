import { mergeSchedaIngressoFields } from "@/lib/schede/scheda-ingresso-reuse";
import {
  copySchedaIngressoFieldFromClient,
  schedaIngressoFieldHasClientValue,
} from "@/lib/schede/scheda-ingresso-typed-fields";
import type { LavorazioneSchedeBundle } from "@/types/schede";
import type { SchedaIngressoFields } from "@/types/schede";

export type SchedaConcurrencyResolution = "keep-client" | "use-server" | "merge-fields";

/** Preferisce valori non vuoti del client su base server. */
export function mergeSchedaIngressoFieldsPreferClient(
  server: SchedaIngressoFields,
  client: SchedaIngressoFields,
): SchedaIngressoFields {
  const base = mergeSchedaIngressoFields(server, client);
  const next = { ...base };
  for (const key of Object.keys(client) as (keyof SchedaIngressoFields)[]) {
    if (!schedaIngressoFieldHasClientValue(key, client)) continue;
    copySchedaIngressoFieldFromClient(next, client, key);
  }
  return next;
}

export function resolveSchedaConcurrencyBundle(
  resolution: SchedaConcurrencyResolution,
  clientBundle: LavorazioneSchedeBundle,
  serverBundle: LavorazioneSchedeBundle,
): LavorazioneSchedeBundle {
  if (resolution === "use-server") return serverBundle;

  const clientIngresso = clientBundle.ingresso;
  const serverIngresso = serverBundle.ingresso;

  if (resolution === "keep-client") {
    return {
      ...serverBundle,
      ingresso: clientIngresso ?? serverIngresso,
      lavorazioni: clientBundle.lavorazioni ?? serverBundle.lavorazioni,
      ricambi: clientBundle.ricambi ?? serverBundle.ricambi,
      codice: clientBundle.codice ?? serverBundle.codice,
    };
  }

  if (!clientIngresso?.campi || !serverIngresso?.campi) {
    return resolution === "merge-fields" && clientIngresso
      ? { ...serverBundle, ingresso: clientIngresso }
      : serverBundle;
  }

  const mergedCampi = mergeSchedaIngressoFieldsPreferClient(
    serverIngresso.campi,
    clientIngresso.campi,
  );

  return {
    ...serverBundle,
    ingresso: {
      ...serverIngresso,
      campi: mergedCampi,
      updatedAt: clientIngresso.updatedAt,
      updatedBy: clientIngresso.updatedBy,
    },
    lavorazioni: clientBundle.lavorazioni ?? serverBundle.lavorazioni,
    ricambi: clientBundle.ricambi ?? serverBundle.ricambi,
  };
}
