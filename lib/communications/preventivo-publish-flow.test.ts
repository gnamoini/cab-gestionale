import assert from "node:assert/strict";
import { COMMUNICATION_POLICY_CATALOG } from "@/lib/communications/policy/communication-policy-catalog";
import { COMMUNICATION_TEMPLATE_KEYS } from "@/lib/communications/domain/communication-template-keys";
import { DEFAULT_COMMUNICATION_TEMPLATES } from "@/lib/communications/template/default-templates";

const publishedPolicy = COMMUNICATION_POLICY_CATALOG.find(
  (p) => p.domainEvent === "preventivo.status_changed" && p.templateKey === "estimate.published",
);
assert.ok(publishedPolicy);
assert.equal(publishedPolicy?.conditions.payload?.to, "inviato");
assert.deepEqual(publishedPolicy?.attachmentTypes, ["preventivo"]);

for (const key of ["estimate.reminder", "estimate.accepted", "estimate.rejected"]) {
  assert.equal((COMMUNICATION_TEMPLATE_KEYS as readonly string[]).includes(key), false);
  assert.equal(key in DEFAULT_COMMUNICATION_TEMPLATES, false);
}

assert.ok((COMMUNICATION_TEMPLATE_KEYS as readonly string[]).includes("estimate.approved"));
assert.ok("estimate.approved" in DEFAULT_COMMUNICATION_TEMPLATES);

const removedPolicies = COMMUNICATION_POLICY_CATALOG.filter((p) =>
  ["estimate.reminder", "estimate.accepted", "estimate.rejected"].includes(p.templateKey),
);
assert.equal(removedPolicies.length, 0);

console.log("preventivo-publish-flow.test.ts OK");
