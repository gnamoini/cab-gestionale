import assert from "node:assert/strict";
import {
  ddtPdfQrCacheKey,
  resolveDdtLavorazioneId,
  resolveDdtPdfQrTarget,
} from "@/lib/ddt/ddt-pdf-qr";
import type { DdtDetail } from "@/lib/ddt/types";

const origin = "https://cab.example.test";

const withLavorazione = {
  document: { lavorazione_id: "lav-abc-123" },
  rows: [],
  links: [],
} as unknown as DdtDetail;

assert.equal(resolveDdtLavorazioneId(withLavorazione), "lav-abc-123");
const lavTarget = resolveDdtPdfQrTarget(withLavorazione, origin);
assert.equal(lavTarget.kind, "lavorazione");
assert.equal(lavTarget.url, `${origin}/lavorazioni-clienti/lav-abc-123`);
assert.equal(lavTarget.caption, "Portale clienti");

const fromLink = {
  document: { lavorazione_id: null },
  rows: [],
  links: [{ source_type: "lavorazione", source_id: "lav-from-link" }],
} as unknown as DdtDetail;
assert.equal(resolveDdtLavorazioneId(fromLink), "lav-from-link");

const soloRicambi = {
  document: { lavorazione_id: null },
  rows: [],
  links: [{ source_type: "preventivo", source_id: "prev-1" }],
} as unknown as DdtDetail;
const siteTarget = resolveDdtPdfQrTarget(soloRicambi, origin);
assert.equal(siteTarget.kind, "site");
assert.equal(siteTarget.url, origin);
assert.equal(siteTarget.caption, "cab.example.test");
assert.equal(ddtPdfQrCacheKey(soloRicambi), "site");
assert.equal(ddtPdfQrCacheKey(withLavorazione), "lav-abc-123");

console.log("ddt-pdf-qr.test.ts: ok");
