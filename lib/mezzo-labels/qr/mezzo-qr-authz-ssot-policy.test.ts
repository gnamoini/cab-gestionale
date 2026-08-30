import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const resolveRoute = readFileSync("app/api/mezzo-labels/resolve/route.ts", "utf8");
const qrRoute = readFileSync("app/m/q/[token]/route.ts", "utf8");

assert.match(resolveRoute, /authorizeMezzoQrAccess/);
assert.doesNotMatch(resolveRoute, /resolveMezzoQrToken/);
assert.match(qrRoute, /resolveMezzoQrDestination/);
assert.doesNotMatch(qrRoute, /buildNuovaLavorazioneWithMezzoTokenHref/);

console.log("mezzo-qr-authz-ssot-policy.test.ts OK");
