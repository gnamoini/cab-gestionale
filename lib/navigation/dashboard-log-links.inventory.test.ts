import assert from "node:assert/strict";
import {
  buildMagazzinoOpenRicambioHref,
  Q_OPEN_RICAMBIO,
  Q_OPEN_SOURCE,
} from "@/lib/navigation/dashboard-log-links";

const href = buildMagazzinoOpenRicambioHref("ric-uuid-1", "qr");
assert.ok(href.includes(`${Q_OPEN_RICAMBIO}=ric-uuid-1`));
assert.ok(href.includes(`${Q_OPEN_SOURCE}=qr`));
assert.ok(href.startsWith("/magazzino?"));

console.log("dashboard-log-links inventory open OK");
