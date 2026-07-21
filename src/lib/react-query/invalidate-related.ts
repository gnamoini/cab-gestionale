"use client";

import type { SettingsRenameKind } from "@/lib/settings/settings-rename-types";
import { scheduleReportBroadcastRefresh } from "@/lib/report/report-refresh";
import { settingsRenameKindsAffectReport } from "@/lib/report/report-universe-constants";
import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import {
  cabSyncEventForEntity,
  dispatchGestionaleAction,
} from "@/lib/sync/gestionale-sync-dispatch";
import { invalidateEntity } from "@/lib/cache/minimal-invalidation-contract";
import { refreshSchedeBundlesForMezzoId } from "@/lib/schede/schede-bundle-cache-patch";
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
  invalidateReportUniverse,
} from "@/lib/report/invalidate-report-universe";
export {
  REPORT_UNIVERSE_GESTIONALE_TABLES,
  settingsRenameKindsAffectReport,
} from "@/lib/report/report-universe-constants";
export {
  dispatchGestionaleAction,
  dispatchGestionaleLocalMutation,
  cabSyncEventForEntity,
} from "@/lib/sync/gestionale-sync-dispatch";

export async function invalidateAfterMezzoMutations(
  qc: QueryClient,
  mezzoId?: string,
  dbVersion?: string,
) {
  if (mezzoId) {
    await invalidateEntity({
      queryClient: qc,
      entityType: "mezzo",
      entityId: mezzoId,
      scope: "full",
      dbVersion,
    });
    void refreshSchedeBundlesForMezzoId(qc, mezzoId);
    return;
  }
  await invalidateOperationalTruth({ queryClient: qc, domain: "mezzi", skipReportBroadcast: true });
  scheduleReportBroadcastRefresh(qc);
}

export async function invalidateAfterLavorazioneMutations(
  qc: QueryClient,
  cabSyncEvents?: CabSyncEvent[],
  lavorazioneId?: string,
  dbVersion?: string,
) {
  if (lavorazioneId) {
    await invalidateEntity({
      queryClient: qc,
      entityType: "lavorazione",
      entityId: lavorazioneId,
      scope: "full",
      cabSyncEvents,
      dbVersion,
    });
    return;
  }
  await invalidateOperationalTruth({ queryClient: qc, domain: "lavorazioni", cabSyncEvents, skipReportBroadcast: true });
  scheduleReportBroadcastRefresh(qc);
}

/** Post-create lavorazione: MIC entity-scoped + sync scheda (SSOT con useLavorazioneCreateMutation). */
export async function commitLavorazioneCreateSuccess(
  qc: QueryClient,
  lavorazioneId: string,
  dbVersion?: string,
): Promise<void> {
  const id = lavorazioneId.trim();
  if (!id) return;
  await invalidateAfterLavorazioneMutations(
    qc,
    [cabSyncEventForEntity("lavorazioni", id, "entity_created", "lavorazioni")],
    id,
    dbVersion,
  );
  dispatchGestionaleAction(qc, ["scheda_lavorazione"], { source: "local_mutation" });
}

export async function invalidateAfterMagazzinoOrMovimenti(qc: QueryClient, cabSyncEvents?: CabSyncEvent[]) {
  await invalidateOperationalTruth({ queryClient: qc, domain: "magazzino", cabSyncEvents, skipReportBroadcast: true });
  scheduleReportBroadcastRefresh(qc);
  void qc.invalidateQueries({ queryKey: ["dashboard", "health-score"] });
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
      case "mag_produttore":
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
  if (settingsRenameKindsAffectReport(kinds)) {
    scheduleReportBroadcastRefresh(qc);
  }
}
