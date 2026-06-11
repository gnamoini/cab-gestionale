/**
 * Global interception — resolveFormIdFromDomTarget, install/cleanup.
 */
import assert from "node:assert/strict";
import {
  installFormUxGlobalInterceptors,
  resolveFormIdFromDomTarget,
  resetFormUxBoundaryGate,
} from "@/lib/form-ux-migration/form-ux-boundary-gate";

resetFormUxBoundaryGate();

assert.equal(resolveFormIdFromDomTarget(null), null);

if (typeof document !== "undefined") {
  const form = document.createElement("form");
  form.setAttribute("data-form-ux-id", "ricambio");
  const button = document.createElement("button");
  button.type = "submit";
  form.appendChild(button);
  document.body.appendChild(form);

  assert.equal(resolveFormIdFromDomTarget(button), "ricambio");
  assert.equal(resolveFormIdFromDomTarget(form), "ricambio");

  const unmarked = document.createElement("form");
  document.body.appendChild(unmarked);
  assert.equal(resolveFormIdFromDomTarget(unmarked), null);

  const cleanup = installFormUxGlobalInterceptors();
  const cleanup2 = installFormUxGlobalInterceptors();
  assert.equal(typeof cleanup, "function");
  assert.equal(typeof cleanup2, "function");
  cleanup();

  document.body.removeChild(form);
  document.body.removeChild(unmarked);
}

console.log("form-ux-global-interception.test.ts OK");
