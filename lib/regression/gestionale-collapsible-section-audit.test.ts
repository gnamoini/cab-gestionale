/**
 * Audit: GestionaleCollapsibleSection + header/chevron SSOT (riferimento Lavorazioni).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function grepSvgChevronPaths(): string[] {
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === ".next" || ent.name === "regression") continue;
        walk(full);
      } else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) {
        const rel = path.relative(ROOT, full).replace(/\\/g, "/");
        const src = fs.readFileSync(full, "utf8");
        if (src.includes("M6 9l6 6 6-6") && !rel.includes("gestionale-collapsible-chevron")) {
          hits.push(rel);
        }
      }
    }
  };
  walk(ROOT);
  return hits;
}

const collapsible = read("components/design-system/gestionale-collapsible-section.tsx");
const header = read("components/design-system/gestionale-collapsible-header.tsx");
const panel = read("components/design-system/gestionale-collapsible-panel.tsx");
const chevron = read("components/design-system/gestionale-collapsible-chevron.tsx");
const ricambioUi = read("components/gestionale/magazzino/ricambio-modal-ui.tsx");
const dsIndex = read("components/design-system/index.ts");
const shellCard = read("components/gestionale/shell-card.tsx");
const preventiviModal = read("components/preventivi/preventivi-editor-modal.tsx");

assert.match(collapsible, /export function GestionaleCollapsibleSection/);
assert.match(collapsible, /GestionaleCollapsiblePanel/);
assert.doesNotMatch(collapsible, /scrollCollapsiblePanelIntoViewIfClipped/);
assert.doesNotMatch(collapsible, /scrollGestionaleFieldIntoView/);
assert.doesNotMatch(collapsible, /GestionaleCollapsibleChevronBox/);

assert.match(header, /export function GestionaleCollapsibleHeader/);
assert.match(header, /gestionaleCollapsibleShellHeaderBtnClass/);
assert.match(header, /gestionaleCollapsibleShellHeaderShellRadiusClass/);
assert.match(header, /if \(form\) \{[\s\S]*return trigger;/);
assert.match(collapsible, /gestionaleCollapsibleSectionBodyPadClass/);
assert.match(collapsible, /gestionaleCollapsibleSectionFormClass[\s\S]*?overflow-hidden/);
assert.doesNotMatch(
  collapsible.match(/export const gestionaleCollapsibleSectionFormClass =[\s\S]*?;/)?.[0] ?? "",
  /\bp-3\b/,
);
assert.match(panel, /export function GestionaleCollapsiblePanel/);
assert.match(panel, /GestionaleCollapsibleHeader/);
assert.match(panel, /gestionaleCollapsibleEase/);
assert.match(panel, /gestionaleCollapsiblePanelBodyClass/);
assert.match(panel, /collapseAnimated/);
assert.match(header, /aria-expanded/);

assert.match(chevron, /export function GestionaleCollapsibleChevronBox/);
assert.match(chevron, /export function GestionaleCollapsibleChevronIcon/);
assert.match(chevron, /M6 9l6 6 6-6/);

assert.match(ricambioUi, /GestionaleCollapsibleSection/);
assert.match(ricambioUi, /export function RicambioCollapsibleSection/);

assert.match(dsIndex, /GestionaleCollapsibleChevronBox/);
assert.match(dsIndex, /GestionaleCollapsibleSection/);
assert.match(dsIndex, /GestionaleCollapsibleHeader/);
assert.match(dsIndex, /GestionaleCollapsiblePanel/);

assert.match(shellCard, /GestionaleCollapsiblePanel/);
assert.match(shellCard, /collapsePrefsHydrated/);
assert.match(shellCard, /persistScope/);
assert.match(shellCard, /persistKey/);
assert.doesNotMatch(shellCard, /GestionaleCollapsibleChevronBox/);

assert.match(preventiviModal, /GestionaleCollapsibleSection/);
assert.doesNotMatch(preventiviModal, /GestionaleCollapsibleChevronBox/);
assert.doesNotMatch(preventiviModal, /GestionaleCollapsibleChevronIcon/);
assert.doesNotMatch(preventiviModal, /GestionaleCollapsibleHeader/);
assert.doesNotMatch(preventiviModal, /scrollIntoView/);
assert.doesNotMatch(preventiviModal, /scrollCollapsiblePanelIntoViewIfClipped/);
assert.doesNotMatch(preventiviModal, /\.focus\(/);

assert.doesNotMatch(collapsible, /useLayoutEffect/);
assert.doesNotMatch(collapsible, /scrollIntoView/);
assert.doesNotMatch(header, /scrollIntoView/);
assert.doesNotMatch(header, /\.focus\(/);
assert.match(panel, /gestionaleCollapsibleEase/);
assert.doesNotMatch(shellCard, /gestionaleCollapsibleEase/);
assert.doesNotMatch(shellCard, /gestionaleCollapsibleShellHeaderBtnClass/);

const duplicateChevronSvgs = grepSvgChevronPaths();
assert.equal(
  duplicateChevronSvgs.length,
  0,
  `chevron SVG path must live only in gestionale-collapsible-chevron.tsx; found in: ${duplicateChevronSvgs.join(", ")}`,
);

console.log("gestionale-collapsible-section-audit.test.ts OK");
