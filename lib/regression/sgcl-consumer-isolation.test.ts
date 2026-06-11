/**
 * SGCL Phase 3 — consumers must not import GAML/UGP decision APIs.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "lib/form-ux-migration");

const CONSUMERS = [
  "form-ux-orchestrator.ts",
  "form-ux-submit-router.ts",
  "form-ux-boundary-gate.ts",
  "form-ux-platform-config.ts",
  "form-ux-enforcement-policy.ts",
] as const;

const FORBIDDEN_IMPORTS = [
  "form-ux-governance-authority",
  "form-ux-governance-plane",
] as const;

const FORBIDDEN_SYMBOLS = [
  "getFormUxAuthoritativeDecision",
  "getFormUxAuthorityAdoptionPhase",
  "getFormUxDecision",
  "getFormUxGovernanceAdoptionPhase",
  "getFormUxDecisionInternal",
] as const;

for (const file of CONSUMERS) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  for (const forbidden of FORBIDDEN_IMPORTS) {
    assert.doesNotMatch(
      src,
      new RegExp(forbidden.replace(/\//g, "\\/")),
      `${file} must not import ${forbidden}`,
    );
  }
  for (const symbol of FORBIDDEN_SYMBOLS) {
    assert.doesNotMatch(src, new RegExp(symbol), `${file} must not reference ${symbol}`);
  }
}

console.log("sgcl-consumer-isolation.test.ts OK");
