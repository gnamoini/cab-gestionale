import assert from "node:assert/strict";
import {
  buildPrivacyPolicyHref,
  sanitizePrivacyPolicyReturnPath,
} from "@/lib/legal/privacy-policy-return";

assert.equal(buildPrivacyPolicyHref("/login"), "/privacy-policy?from=%2Flogin");
assert.equal(
  buildPrivacyPolicyHref("/lavorazioni-clienti"),
  "/privacy-policy?from=%2Flavorazioni-clienti",
);
assert.equal(sanitizePrivacyPolicyReturnPath("/dashboard"), "/dashboard");
assert.equal(sanitizePrivacyPolicyReturnPath("/privacy-policy"), null);
assert.equal(sanitizePrivacyPolicyReturnPath("https://evil.test"), null);

console.log("privacy-policy-return: OK");
