/**
 * Audit: GestionaleCollapsibleSection SSOT in design-system.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const collapsible = read("components/design-system/gestionale-collapsible-section.tsx");
const ricambioUi = read("components/gestionale/magazzino/ricambio-modal-ui.tsx");
const dsIndex = read("components/design-system/index.ts");

assert.match(collapsible, /export function GestionaleCollapsibleSection/);
assert.match(collapsible, /grid-rows-\[1fr\]/);
assert.match(collapsible, /aria-expanded/);
assert.match(collapsible, /scrollCollapsiblePanelIntoViewIfClipped/);
assert.match(ricambioUi, /GestionaleCollapsibleSection/);
assert.match(ricambioUi, /export function RicambioCollapsibleSection/);
assert.match(dsIndex, /GestionaleCollapsibleSection/);

console.log("gestionale-collapsible-section-audit.test.ts OK");
