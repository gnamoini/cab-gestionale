/**
 * Tooltip consistency audit — WARN su duplicati con testo visibile.
 */
import assert from "node:assert/strict";
import { scanTooltipRedundantInSource } from "@/lib/lint/rules/tooltip-redundant";

const duplicateSample = `
export function X() {
  return (
    <Tooltip content="Salva">
      <button type="button">Salva</button>
    </Tooltip>
  );
}
`;

const iconOnlyPass = `
export function X() {
  return (
    <Tooltip content="Chiudi">
      <button type="button" aria-label="Chiudi"><span /></button>
    </Tooltip>
  );
}
`;

const contextualPass = `
export function X() {
  return (
    <Tooltip content="Importa ricambi da documento DDT e avvia il matching automatico">
      <button type="button">Importa</button>
    </Tooltip>
  );
}
`;

const dupFindings = scanTooltipRedundantInSource("sample.tsx", duplicateSample);
assert.equal(dupFindings.length, 1, "expected duplicate finding");
assert.equal(dupFindings[0]?.problem, "TooltipRedundant");

const iconFindings = scanTooltipRedundantInSource("sample.tsx", iconOnlyPass);
assert.equal(iconFindings.length, 0, "icon-only should pass");

const ctxFindings = scanTooltipRedundantInSource("sample.tsx", contextualPass);
assert.equal(ctxFindings.length, 0, "contextual should pass");

console.log("lib/regression/tooltip-consistency-audit.test.ts OK");
