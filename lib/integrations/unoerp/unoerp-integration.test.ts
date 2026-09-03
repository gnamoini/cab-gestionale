import assert from "node:assert/strict";
import { resolveCustomer } from "@/lib/integrations/unoerp/customer-resolver";
import { resolveMappedItem } from "@/lib/integrations/unoerp/item-resolver";
import { runPreflight, writerMayProceed } from "@/lib/integrations/unoerp/preflight/preflight-gate";
import { assertOwnedByCab } from "@/lib/integrations/unoerp/ownership/document-ownership";
import { isStaleJob } from "@/lib/integrations/unoerp/verification/stale-job";
import { verifyDdtNumber } from "@/lib/integrations/unoerp/verification/numbering-verifier";
import { centsToDecimalString, toCents, totalsMatch } from "@/lib/integrations/unoerp/monetary/decimal-policy";
import { assertPayloadAllowlist } from "@/lib/integrations/unoerp/allowlist/document-allowlist";
import { buildCorrelationKey, parseCorrelationKey } from "@/lib/integrations/unoerp/correlation-key";
import { classifyReconcile } from "@/lib/integrations/unoerp/reconciliation/reconcile-document";
import { fingerprintInfo } from "@/lib/integrations/unoerp/schema/schema-fingerprint";
import { assertSafeUnoerpAct } from "@/lib/integrations/unoerp/safety.server";
import { planConsuntivoSync } from "@/lib/integrations/unoerp/services/consuntivi.service";
import { getDocumentTypeRegistryEntry, assertRegistryDispatchSafe } from "@/lib/integrations/unoerp/document-type-registry.server";
import { UNOERP_ALLOWED_ACTS } from "@/lib/integrations/unoerp/types";
import type { PreventivoRecord } from "@/lib/preventivi/types";

assert.ok(!UNOERP_ALLOWED_ACTS.includes("delete" as never));

assert.throws(() => assertSafeUnoerpAct("delete"));
assert.throws(() => assertSafeUnoerpAct("cancel"));
assert.doesNotThrow(() => assertSafeUnoerpAct("create"));

const identity = { cabCustomerId: "c1", partitaIva: "IT123", codiceFiscale: null, codiceClienteUnoerp: null };
assert.equal(resolveCustomer({ identity, mapping: null, vatMatches: [], cfMatches: [], codeMatches: [] }).ok, false);
assert.equal(resolveCustomer({ identity, mapping: null, vatMatches: ["a", "b"], cfMatches: [], codeMatches: [] }).ok, false);
const mapped = resolveCustomer({
  identity,
  mapping: { cabCustomerId: "c1", unoerpCustomerId: "871", unoerpVat: "IT123", unoerpTaxId: null },
  vatMatches: ["999"],
  cfMatches: [],
  codeMatches: [],
});
assert.equal(mapped.ok, true);
if (mapped.ok) assert.equal(mapped.unoerpCustomerId, "871");

const drift = resolveCustomer({
  identity: { ...identity, partitaIva: "IT999" },
  mapping: { cabCustomerId: "c1", unoerpCustomerId: "871", unoerpVat: "IT123", unoerpTaxId: null },
  vatMatches: ["other"],
  cfMatches: [],
  codeMatches: [],
});
assert.equal(drift.ok, false);

assert.equal(resolveMappedItem({ mapping: null, currentCabCode: "X" }).ok, false);
assert.equal(
  resolveMappedItem({ mapping: { cabItemId: "i", unoerpItemId: "u", cabCode: "A" }, currentCabCode: "B" }).ok,
  false,
);

const pre = runPreflight({
  documentType: "preventivo",
  operation: "CREATE",
  payload: { extra: 1 },
  customerResolved: true,
  itemsResolved: true,
  vatResolved: true,
  correlationFieldKnown: true,
});
assert.equal(pre.decision, "BLOCKED");
assert.equal(writerMayProceed(pre), false);

const allow = assertPayloadAllowlist("preventivo", "CREATE", { foo: 1 });
assert.equal(allow.ok, false);

assert.equal(isStaleJob(10, 11), true);
assert.equal(isStaleJob(12, 11), false);

const owned = assertOwnedByCab({
  link: null,
  requested: {
    cabDocumentId: "a",
    cabDocumentType: "preventivo",
    unoerpModule: "m",
    unoerpFile: "f",
    unoerpRecordId: "1",
  },
});
assert.equal(owned.ok, false);

assert.equal(
  verifyDdtNumber({
    cab: { anno: 2026, serie: "A", numero: 154 },
    unoerp: { anno: 2026, serie: "B", numero: 154 },
  }).ok,
  false,
);
assert.equal(
  verifyDdtNumber({
    cab: { anno: 2026, serie: "A", numero: 154 },
    unoerp: { anno: 2026, serie: "A", numero: 154 },
  }).ok,
  true,
);

assert.equal(centsToDecimalString(10010), "100.10");
assert.equal(toCents(100.1), 10010);
assert.equal(totalsMatch(100.1, 100.1), true);

const key = buildCorrelationKey("preventivo", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
assert.equal(parseCorrelationKey(key)?.type, "preventivo");

assert.equal(getDocumentTypeRegistryEntry("consuntivo").resolved, false);
assert.doesNotThrow(() => assertRegistryDispatchSafe("consuntivo"));

const dummy = { tipoDocumento: "consuntivo", id: "x" } as PreventivoRecord;
const cons = planConsuntivoSync(dummy, 1, "CREATE");
assert.equal(cons.status, "BLOCKED");

const fp = fingerprintInfo({ info: { primary_key: "id_articoli", fieldset: { tipo: {}, alpha_cod: {} } } });
assert.ok(fp.length > 0);

assert.equal(
  classifyReconcile({
    expected: {
      documentType: "ddt",
      cabId: "1",
      sourceVersion: 1,
      customerLabel: "x",
      lines: [],
      totale: "0.00",
      ddt: { anno: 2026, serie: "A", numero: 154 },
    },
    actual: { numero: 155 },
    unoerpMasterChanged: false,
  }),
  "IDENTITY_DRIFT",
);

console.log("unoerp-integration.test.ts: ok");
