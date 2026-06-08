import assert from "node:assert/strict";
import {
  containsSmokeAuditToken,
  extractSmokeAuditTokens,
  isSmokeDocumentFilename,
  isSmokeRicambioCodice,
} from "@/lib/smoke/smoke-data-markers";

assert.equal(containsSmokeAuditToken("Cliente AUDIT-20260608-120000"), true);
assert.equal(containsSmokeAuditToken("AUDIT-manuale"), false);
assert.equal(containsSmokeAuditToken("AUDIT-20260608"), false);

assert.equal(isSmokeRicambioCodice("E2E-1717843200000"), true);
assert.equal(isSmokeRicambioCodice("E2E-ABC"), false);
assert.equal(isSmokeRicambioCodice("FILTRO-01"), false);

assert.equal(isSmokeDocumentFilename("smoke-doc.txt"), true);
assert.equal(isSmokeDocumentFilename("manuale.pdf"), false);

assert.deepEqual(extractSmokeAuditTokens(`foo AUDIT-20260608-120000 bar`), ["AUDIT-20260608-120000"]);

console.log("smoke-data-markers.test.ts OK");
