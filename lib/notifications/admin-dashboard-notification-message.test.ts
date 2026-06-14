import assert from "node:assert/strict";
import {
  getAdminNotificationOpenLinkLabel,
  toAdminNotificationLogViewModel,
} from "@/lib/notifications/admin-dashboard-notification-message";
import { buildAdminDashboardTestNotification } from "@/lib/notifications/admin-dashboard-notifications";

const at = "2026-06-01T10:00:00.000Z";

const lavorazioneVm = toAdminNotificationLogViewModel({
  kind: "lavorazione_created",
  lavorazioneId: "lav-1",
  titolo: "LAV-001",
  cliente: "Cliente Alpha",
  mezzo: "Fiat Ducato",
  targa: "AB123CD",
  createdBy: "Mario Rossi",
  createdAt: at,
});
assert.equal(lavorazioneVm.tipoRiga, "NUOVA LAVORAZIONE");
assert.equal(lavorazioneVm.oggettoRiga, "Cliente Alpha");
assert.match(lavorazioneVm.modificaRiga, /Mezzo: Fiat Ducato/);
assert.match(lavorazioneVm.modificaRiga, /Targa: AB123CD/);
assert.equal(lavorazioneVm.autore, "Mario Rossi");

const magVm = toAdminNotificationLogViewModel({
  kind: "magazzino_sotto_scorta",
  id: "mag-1",
  ricambioId: "ric-1",
  marca: "Bosch",
  descrizione: "Filtro olio",
  scorta: 1,
  scortaMinima: 5,
  createdAt: at,
});
assert.equal(magVm.tipoRiga, "SOTTO SCORTA");
assert.equal(magVm.oggettoRiga, "Filtro olio");
assert.match(magVm.modificaRiga, /Scorta: 1 \(min\. 5\)/);

const promVm = toAdminNotificationLogViewModel({
  kind: "dashboard_promemoria_reminder",
  id: "prm-1",
  promemoriaId: "p-1",
  eventDateYmd: "2026-06-01",
  title: "Revisione mezzo",
  message: "Promemoria: Revisione mezzo previsto per oggi.",
  createdAt: at,
});
assert.equal(promVm.tipoRiga, "PROMEMORIA");
assert.equal(promVm.oggettoRiga, "Revisione mezzo");
assert.match(promVm.modificaRiga, /Revisione mezzo previsto/);

const testRow = buildAdminDashboardTestNotification();
assert.equal(getAdminNotificationOpenLinkLabel(testRow), null);
assert.equal(getAdminNotificationOpenLinkLabel({ kind: "lavorazione_created", lavorazioneId: "x", titolo: "", cliente: "", mezzo: "", targa: null, createdBy: null, createdAt: at }), "Apri lavorazione");

console.log("admin-dashboard-notification-message.test.ts: OK");
