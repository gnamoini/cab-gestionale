"use client";

import type { SettingsRenameKind } from "@/lib/settings/settings-rename-types";
import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import {
  cabSyncEventForEntity,
  dispatchGestionaleAction,
} from "@/lib/sync/gestionale-sync-dispatch";
import { invalidateOperationalTruth } from "@/src/lib/runtime/truth-layer/invalidate-operational-truth";
import type { QueryClient } from "@tanstack/react-query";

export { QK, SCHEDE_STORE_QUERY_KEY } from "@/src/lib/react-query/query-keys";
export {
  collectQueryKeysForGestionaleTables,
  executeInvalidateGestionaleTables,
} from "@/src/lib/react-query/invalidate-targets";
export {
  enqueueInvalidateGestionaleTables,
  enqueueInvalidateQueryKeys,
  invalidateGestionaleTablesTargeted,
} from "@/src/lib/react-query/invalidate-batch";
export {
  dispatchGestionaleAction,
  dispatchGestionaleLocalMutation,
  cabSyncEventForEntity,
} from "@/lib/sync/gestionale-sync-dispatch";

export async function invalidateAfterMezzoMutations(qc: QueryClient) {
  await invalidateOperationalTruth({ queryClient: qc, domain: "mezzi" });
}

export async function invalidateAfterLavorazioneMutations(qc: QueryClient, cabSyncEvents?: CabSyncEvent[]) {
  await invalidateOperationalTruth({ queryClient: qc, domain: "lavorazioni", cabSyncEvents });
}

export async function invalidateAfterMagazzinoOrMovimenti(qc: QueryClient, cabSyncEvents?: CabSyncEvent[]) {
  await invalidateOperationalTruth({ queryClient: qc, domain: "magazzino", cabSyncEvents });
}

export function invalidateAfterPreventiviMutations(
  qc: QueryClient,
  id?: string,
  type: "entity_created" | "entity_updated" | "entity_deleted" = "entity_updated",
): void {
  const events = id ? [cabSyncEventForEntity("preventivi", id, type, "preventivi")] : undefined;
  dispatchGestionaleAction(qc, ["preventivi"], { source: "local_mutation", cabSyncEvents: events });
}

function gestionaleTablesForRenameKinds(kinds: readonly SettingsRenameKind[]): string[] {
  const tables = new Set<string>();
  for (const kind of kinds) {
    switch (kind) {
      case "cliente":
        tables.add("mezzi");
        tables.add("preventivi");
        tables.add("scheda_lavorazione");
        tables.add("profiles");
        tables.add("lavorazioni");
        break;
      case "utilizzatore":
      case "cantiere":
        tables.add("mezzi");
        tables.add("scheda_lavorazione");
        tables.add("lavorazioni");
        break;
      case "addetto":
        tables.add("scheda_lavorazione");
        tables.add("lavorazioni");
        break;
      case "mag_marca":
        tables.add("magazzino_ricambi");
        tables.add("lavorazioni");
        break;
      case "mag_categoria":
      case "mag_fornitore":
        tables.add("magazzino_ricambi");
        break;
      case "tipo_attrezzatura":
      case "tipo_telaio":
        tables.add("mezzi");
        break;
      case "hierarchy_marca_attrezzature":
      case "hierarchy_modello_attrezzature":
      case "hierarchy_marca_telai":
      case "hierarchy_modello_telai":
        tables.add("mezzi");
        tables.add("documenti");
        tables.add("magazzino_ricambi");
        break;
      default:
        break;
    }
  }
  return [...tables];
}

/** Dopo propagazione rinomina impostazioni: invalida cache operative toccate dal service. */
export function invalidateAfterSettingsRenamePropagation(
  qc: QueryClient,
  kinds: readonly SettingsRenameKind[],
): void {
  const tables = gestionaleTablesForRenameKinds(kinds);
  if (tables.length === 0) return;
  dispatchGestionaleAction(qc, tables, {
    source: "local_mutation",
  });
  if (tables.some((t) => t === "lavorazioni" || t === "magazzino_ricambi" || t === "movimenti_ricambi")) {
    bumpReportDataRefresh();
  }
}
