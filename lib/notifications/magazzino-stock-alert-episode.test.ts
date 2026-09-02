import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatMagazzinoSottoScortaNotificationBody,
  MAGAZZINO_SOTTO_SCORTA_NOTIFICATION_TITLE,
} from "@/lib/magazzino/magazzino-sotto-scorta-notification-copy";
import { parseMagazzinoStockAlertOutboxPayload } from "@/lib/magazzino/magazzino-stock-alert-outbox-payload";
import {
  didCrossBelowMin,
  isStockBelowMin,
  isStockSufficient,
  shouldNotifyStockCrossing,
} from "@/lib/magazzino/ricambio-stock-crossing";
import { magazzinoSottoScortaDedupKey } from "@/lib/notifications/notification-dedup-keys";

const EPISODE = "550e8400-e29b-41d4-a716-446655440000";
const RICAMBIO = "660e8400-e29b-41d4-a716-446655440001";

test("parseMagazzinoStockAlertOutboxPayload requires episode_id", () => {
  assert.equal(
    parseMagazzinoStockAlertOutboxPayload({
      ricambio_id: RICAMBIO,
      quantita: 2,
      scorta_minima: 3,
      prev_quantita: 5,
      prev_scorta_minima: 3,
      curr_quantita: 2,
      curr_scorta_minima: 3,
    }),
    null,
  );
});

test("parseMagazzinoStockAlertOutboxPayload accepts full snapshot", () => {
  const parsed = parseMagazzinoStockAlertOutboxPayload({
    episode_id: EPISODE,
    ricambio_id: RICAMBIO,
    codice: "FH-12345",
    nome: "Filtro idraulico",
    marca: "Bosch",
    quantita: 0,
    scorta_minima: 3,
    prev_quantita: 5,
    prev_scorta_minima: 3,
    curr_quantita: 0,
    curr_scorta_minima: 3,
  });
  assert.ok(parsed);
  assert.equal(parsed?.episode_id, EPISODE);
  assert.equal(parsed?.ricambio_id, RICAMBIO);
  assert.equal(parsed?.codice, "FH-12345");
  assert.equal(parsed?.quantita, 0);
});

test("dedup key is per ricambio episode", () => {
  assert.equal(
    magazzinoSottoScortaDedupKey(RICAMBIO, EPISODE),
    `mag:${RICAMBIO}:below:${EPISODE}`,
  );
});

test("stock transition helpers — sufficiente vs sotto", () => {
  assert.equal(isStockSufficient({ scorta: 5, scortaMinima: 3 }), true);
  assert.equal(isStockBelowMin({ scorta: 2, scortaMinima: 3 }), true);
  assert.equal(didCrossBelowMin({ scorta: 5, scortaMinima: 3 }, { scorta: 2, scortaMinima: 3 }), true);
  assert.equal(didCrossBelowMin({ scorta: 2, scortaMinima: 3 }, { scorta: 1, scortaMinima: 3 }), false);
});

test("soglia alzata senza cambio qty: sufficiente→sotto", () => {
  assert.equal(
    didCrossBelowMin({ scorta: 5, scortaMinima: 3 }, { scorta: 5, scortaMinima: 6 }),
    true,
  );
});

test("soglia abbassata senza cambio qty: sotto→sufficiente", () => {
  assert.equal(isStockBelowMin({ scorta: 2, scortaMinima: 3 }), true);
  assert.equal(isStockSufficient({ scorta: 2, scortaMinima: 1 }), true);
});

test("5→0 in un step è un crossing notificabile (toast client)", () => {
  assert.equal(
    shouldNotifyStockCrossing({ scorta: 5, scortaMinima: 3 }, { scorta: 0, scortaMinima: 3 }),
    true,
  );
});

test("notification copy — titolo unico e qty zero", () => {
  assert.equal(MAGAZZINO_SOTTO_SCORTA_NOTIFICATION_TITLE, "Ricambio sotto scorta");
  const body = formatMagazzinoSottoScortaNotificationBody({
    nome: "Filtro idraulico",
    codice: "FH-12345",
    quantita: 0,
    scortaMinima: 3,
  });
  assert.match(body, /Filtro idraulico — Cod\. FH-12345/);
  assert.match(body, /Disponibili: 0 — Soglia minima: 3/);
});
