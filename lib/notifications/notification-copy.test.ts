import assert from "node:assert/strict";
import {
  clearCabSyncToastSuppressions,
  isCabSyncToastSuppressed,
  markCabSyncToastSuppressed,
} from "@/lib/notifications/cab-sync-toast-suppress";
import { gestionaleCabSyncToastMessage } from "@/lib/sync/gestionale-notification-dispatch";
import { formatDashboardPromemoriaReminderToastMessage } from "@/lib/dashboard/dashboard-promemoria-reminder";

const REMOTE = " da un altro dispositivo";

assert.equal(
  gestionaleCabSyncToastMessage({
    type: "entity_updated",
    entity: "lavorazioni",
    id: "lav-1",
  }),
  `Lavorazione aggiornata${REMOTE}`,
);

assert.equal(
  gestionaleCabSyncToastMessage({
    type: "entity_created",
    entity: "lavorazioni",
    id: "lav-1",
  }),
  null,
);

assert.equal(
  gestionaleCabSyncToastMessage({
    type: "entity_updated",
    entity: "magazzino_ricambi",
    id: "ric-1",
  }),
  `Ricambio aggiornato${REMOTE}`,
);

assert.equal(
  gestionaleCabSyncToastMessage({
    type: "entity_created",
    entity: "pdf_artifacts",
    id: "doc-1",
  }),
  `Documento ufficiale generato${REMOTE}`,
);

assert.equal(
  gestionaleCabSyncToastMessage({
    type: "entity_updated",
    entity: "scheda_lavorazione",
    id: "sch-1",
  }),
  `Scheda lavorazione aggiornata${REMOTE}`,
);

assert.equal(
  gestionaleCabSyncToastMessage({
    type: "entity_created",
    entity: "movimenti_ricambi",
    id: "mov-1",
  }),
  "Movimento magazzino registrato",
);

clearCabSyncToastSuppressions();
const magEvent = {
  type: "entity_updated" as const,
  entity: "magazzino_ricambi" as const,
  id: "ric-1",
};
assert.equal(isCabSyncToastSuppressed(magEvent), false);
markCabSyncToastSuppressed("magazzino_ricambi", "entity_updated", "ric-1");
assert.equal(isCabSyncToastSuppressed(magEvent), true);

assert.equal(
  formatDashboardPromemoriaReminderToastMessage(["Promemoria: Evento A previsto per oggi."]),
  "Promemoria: Evento A previsto per oggi.",
);
assert.equal(
  formatDashboardPromemoriaReminderToastMessage(["A", "B"]),
  "Hai 2 promemoria oggi. Apri la Dashboard per i dettagli.",
);

console.log("notification-copy.test.ts: ok");
