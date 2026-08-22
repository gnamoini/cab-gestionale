import assert from "node:assert/strict";
import {
  buildTermsAndConditionsHref,
  sanitizeTermsAndConditionsReturnPath,
} from "@/lib/legal/terms-and-conditions-return";

assert.equal(buildTermsAndConditionsHref("/login"), "/termini-e-condizioni?from=%2Flogin");
assert.equal(
  buildTermsAndConditionsHref("/lavorazioni-clienti"),
  "/termini-e-condizioni?from=%2Flavorazioni-clienti",
);
assert.equal(sanitizeTermsAndConditionsReturnPath("/dashboard"), "/dashboard");
assert.equal(sanitizeTermsAndConditionsReturnPath("/termini-e-condizioni"), null);
assert.equal(sanitizeTermsAndConditionsReturnPath("https://evil.test"), null);

console.log("terms-and-conditions-return: OK");
