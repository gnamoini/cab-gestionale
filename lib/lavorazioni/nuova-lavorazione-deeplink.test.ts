import assert from "node:assert/strict";
import {
  buildNuovaLavorazioneWithMezzoIdHref,
  buildNuovaLavorazioneWithMezzoTokenHref,
  Q_CREATE_NUOVA_LAVORAZIONE,
  Q_LAVORAZIONI_MEZZO_ID,
  Q_MEZZO_QR_TOKEN,
} from "@/lib/navigation/dashboard-log-links";

const tokenHref = buildNuovaLavorazioneWithMezzoTokenHref("CAB-ABCDEFGHJK", "qr");
const tokenUrl = new URL(tokenHref, "https://example.com");
assert.equal(tokenUrl.searchParams.get(Q_CREATE_NUOVA_LAVORAZIONE), "1");
assert.equal(tokenUrl.searchParams.get(Q_MEZZO_QR_TOKEN), "CAB-ABCDEFGHJK");
assert.equal(tokenUrl.searchParams.get(Q_LAVORAZIONI_MEZZO_ID), null);

const idHref = buildNuovaLavorazioneWithMezzoIdHref("550e8400-e29b-41d4-a716-446655440000", "manual");
const idUrl = new URL(idHref, "https://example.com");
assert.equal(idUrl.searchParams.get(Q_LAVORAZIONI_MEZZO_ID), "550e8400-e29b-41d4-a716-446655440000");
assert.equal(idUrl.searchParams.get(Q_MEZZO_QR_TOKEN), null);

console.log("lavorazioni/nuova-lavorazione-deeplink.test.ts OK");
