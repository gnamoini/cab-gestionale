import assert from "node:assert/strict";
import { buildClientPortalMezzoQrHref } from "@/lib/lavorazioni/client-portal-access";
import { buildNuovaLavorazioneWithMezzoTokenHref } from "@/lib/navigation/dashboard-log-links";

const token = "CAB-8K4J9P2X7M";

assert.equal(
  buildNuovaLavorazioneWithMezzoTokenHref(token, "qr"),
  `/lavorazioni?createNuova=1&mezzoToken=${encodeURIComponent(token)}&mezzoSource=qr`,
);

assert.equal(
  buildClientPortalMezzoQrHref(token),
  `/lavorazioni-clienti?mezzoToken=${encodeURIComponent(token)}`,
);

console.log("resolve-destination.test.ts OK");
